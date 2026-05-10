import { db } from '@/lib/db'
import { executeAgentTask, AGENT_DEFINITIONS } from '@/lib/agents'
import { executeTool } from '@/lib/tools'
import { executePipeline } from '@/lib/agents/pipeline'
import { trackEvent, trackTokenUsage } from '@/lib/observability'
import { logAction, logError } from '@/lib/middleware'

// ============================================
// WORKFLOW EXECUTION ENGINE
// DAG-based orchestration with step-level execution
// ============================================

// Resolve DAG execution order using topological sort (Kahn's algorithm)
function resolveStepDAG(steps: any[]): string[][] {
  // Build adjacency and in-degree maps
  const stepMap = new Map<string, { id: string; dependsOn: string[] }>()
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>() // stepId -> steps that depend on it

  for (const step of steps) {
    let dependsOn: string[] = []
    try {
      dependsOn = typeof step.dependsOn === 'string'
        ? JSON.parse(step.dependsOn || '[]')
        : Array.isArray(step.dependsOn) ? step.dependsOn : []
    } catch {
      dependsOn = []
    }

    // Support numeric indices — resolve to step IDs
    const resolvedDependsOn = dependsOn.map((dep: string | number) => {
      if (typeof dep === 'number' && steps[dep]) {
        return steps[dep].id
      }
      return String(dep)
    })

    stepMap.set(step.id, { id: step.id, dependsOn: resolvedDependsOn })
    inDegree.set(step.id, resolvedDependsOn.length)
    adjacency.set(step.id, [])

    // Initialize in-degree for steps not yet in the map
    for (const dep of resolvedDependsOn) {
      if (!inDegree.has(dep)) {
        inDegree.set(dep, 0)
      }
      if (!adjacency.has(dep)) {
        adjacency.set(dep, [])
      }
    }
  }

  // Build adjacency list: dep -> [steps that depend on it]
  for (const [, step] of stepMap) {
    for (const dep of step.dependsOn) {
      const neighbors = adjacency.get(dep) || []
      neighbors.push(step.id)
      adjacency.set(dep, neighbors)
    }
  }

  // Kahn's algorithm
  const levels: string[][] = []
  let queue: string[] = []

  // Start with all steps that have in-degree 0
  for (const [stepId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(stepId)
    }
  }

  const visited = new Set<string>()

  while (queue.length > 0) {
    // All items in the current queue can run in parallel
    levels.push([...queue])
    const nextQueue: string[] = []

    for (const stepId of queue) {
      visited.add(stepId)
      const neighbors = adjacency.get(stepId) || []
      for (const neighbor of neighbors) {
        const currentDegree = inDegree.get(neighbor) || 0
        inDegree.set(neighbor, currentDegree - 1)
        if (currentDegree - 1 === 0 && !visited.has(neighbor)) {
          nextQueue.push(neighbor)
        }
      }
    }

    queue = nextQueue
  }

  // Handle disconnected/cycle steps — add any unvisited steps as last level
  const unvisited = steps.filter(s => !visited.has(s.id))
  if (unvisited.length > 0) {
    levels.push(unvisited.map(s => s.id))
  }

  return levels
}

// Resolve template variables in step config (e.g. {{step_0.output}}, {{stepId.field}})
function resolveTemplate(template: string, previousOutputs: Record<string, any>): string {
  if (!template || typeof template !== 'string') return template || ''

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
    const trimmedPath = path.trim()

    // Support patterns:
    // {{step_0.output}}       — by index
    // {{stepId.field}}        — by step ID
    // {{step_0.output.field}} — nested access

    const parts = trimmedPath.split('.')
    if (parts.length < 2) return match

    const [identifier, ...fieldParts] = parts

    // Try to find the output by step index or step ID
    let output = previousOutputs[identifier]

    if (output === undefined) {
      // Try matching by step index (step_0, step_1, etc.)
      const indexMatch = identifier.match(/^step_(\d+)$/)
      if (indexMatch) {
        const index = parseInt(indexMatch[1], 10)
        const keys = Object.keys(previousOutputs)
        if (index < keys.length) {
          output = previousOutputs[keys[index]]
        }
      }
    }

    if (output === undefined) return match

    // Navigate nested fields
    let result = output
    for (const field of fieldParts) {
      if (result && typeof result === 'object') {
        result = result[field]
      } else {
        return match
      }
    }

    if (result === undefined) return match
    return typeof result === 'string' ? result : JSON.stringify(result)
  })
}

// Internal: Execute a single workflow step
async function executeWorkflowStep(
  step: any,
  runId: string,
  previousOutputs: Record<string, any>,
  organizationId: string
): Promise<{
  stepRunId: string
  status: string
  output: any
  duration: number
}> {
  const startTime = Date.now()

  // Create WorkflowStepRun
  const stepRun = await db.workflowStepRun.create({
    data: {
      workflowRunId: runId,
      stepId: step.id,
      status: 'running',
      input: step.config || '{}',
      startedAt: new Date(),
    },
  })

  let output: any = null
  let status: string = 'completed'
  let error: string | null = null

  try {
    // Parse step config
    let config: Record<string, any> = {}
    try {
      config = typeof step.config === 'string'
        ? JSON.parse(step.config || '{}')
        : step.config || {}
    } catch {
      config = {}
    }

    // Resolve template variables in config
    if (config.task) {
      config.task = resolveTemplate(String(config.task), previousOutputs)
    }
    if (config.query) {
      config.query = resolveTemplate(String(config.query), previousOutputs)
    }
    if (config.message) {
      config.message = resolveTemplate(String(config.message), previousOutputs)
    }
    if (config.input) {
      config.input = resolveTemplate(String(config.input), previousOutputs)
    }

    // Execute based on step type
    switch (step.type) {
      case 'agent':
        output = await executeAgentStep(config, previousOutputs, organizationId)
        break
      case 'tool':
        output = await executeToolStep(config, previousOutputs)
        break
      case 'condition':
        output = await executeConditionStep(config, previousOutputs)
        break
      case 'delay':
        await executeDelayStep(config)
        output = { delayed: true, ms: Math.min(config.ms || 1000, 30000) }
        break
      case 'notification':
        output = await executeNotificationStep(config, organizationId)
        break
      case 'pipeline':
        output = await executePipelineStep(config, organizationId)
        break
      default:
        output = { message: `Unknown step type: ${step.type}` }
        status = 'completed'
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    status = 'failed'
    error = errorMessage
    output = { error: errorMessage }

    await logError('system', 'workflow.step.execute', 'workflow_step_runs', errorMessage)
  }

  const duration = Date.now() - startTime

  // Update step run
  await db.workflowStepRun.update({
    where: { id: stepRun.id },
    data: {
      status,
      output: typeof output === 'string' ? output : JSON.stringify(output),
      error,
      duration,
      completedAt: new Date(),
      metadata: JSON.stringify({ stepName: step.name, stepType: step.type }),
    },
  })

  // Track observability event
  await trackEvent({
    organizationId,
    eventType: 'workflow_step',
    source: 'workflow',
    status: status === 'failed' ? 'error' : 'info',
    message: `Workflow step ${step.name} (${step.type}) ${status}`,
    data: { stepId: step.id, runId, stepType: step.type, duration },
    duration,
  }).catch(() => {})

  return {
    stepRunId: stepRun.id,
    status,
    output,
    duration,
  }
}

// Internal: Execute agent step
async function executeAgentStep(
  config: any,
  _previousOutputs: any,
  organizationId: string
): Promise<any> {
  const agentType = config.agentType || 'cfo'
  const task = config.task || config.input || 'No task specified'
  const userId = config.userId || 'system'

  // Validate agent type
  if (!AGENT_DEFINITIONS[agentType]) {
    return { error: `Invalid agent type: ${agentType}` }
  }

  const result = await executeAgentTask({
    agentType,
    task,
    userId,
    organizationId,
    context: config.context || {},
  })

  // Track token usage
  await trackTokenUsage({
    organizationId,
    userId,
    agentType,
    promptTokens: 0, // Estimated
    completionTokens: 0, // Estimated
    totalTokens: (result.result?.length || 0) / 4, // Rough estimate: ~4 chars per token
    requestType: 'workflow_step',
  }).catch(() => {})

  return {
    sessionId: result.sessionId,
    taskId: result.taskId,
    result: result.result,
    toolExecutions: result.toolExecutions?.map((t: any) => ({
      tool: t.tool,
      status: t.status,
    })),
  }
}

// Internal: Execute tool step
async function executeToolStep(config: any, _previousOutputs: any): Promise<any> {
  const toolName = config.tool || config.toolName
  if (!toolName) {
    return { error: 'Tool name is required for tool steps' }
  }

  const toolInput = config.params || config.input || {}

  try {
    const result = await executeTool({
      toolName,
      agentTaskId: `workflow_${Date.now()}`,
      input: toolInput,
      userId: config.userId || 'system',
      organizationId: config.organizationId,
    })
    return result
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Tool execution failed' }
  }
}

// Internal: Execute condition step (if/else branching)
async function executeConditionStep(
  config: any,
  previousOutputs: any
): Promise<{ shouldContinue: boolean; branch: string }> {
  const { expression, operator, left, right, trueBranch, falseBranch } = config

  let shouldContinue = false
  let branch = falseBranch || 'else'

  if (expression) {
    // Evaluate a simple expression
    // Supports: "field > value", "field == value", "field != value"
    const resolvedExpr = resolveTemplate(expression, previousOutputs)
    try {
      // Simple safe evaluation — only allow comparison operators
      const comparisonPattern = /^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/
      const match = resolvedExpr.match(comparisonPattern)
      if (match) {
        const [, leftVal, op, rightVal] = match
        const l = isNaN(Number(leftVal)) ? leftVal.trim() : Number(leftVal)
        const r = isNaN(Number(rightVal)) ? rightVal.trim() : Number(rightVal)

        switch (op) {
          case '==': shouldContinue = l == r; break
          case '!=': shouldContinue = l != r; break
          case '>':  shouldContinue = l > r; break
          case '<':  shouldContinue = l < r; break
          case '>=': shouldContinue = l >= r; break
          case '<=': shouldContinue = l <= r; break
        }
      } else {
        // Truthy check
        shouldContinue = !!resolvedExpr && resolvedExpr !== 'false' && resolvedExpr !== '0'
      }
    } catch {
      shouldContinue = false
    }
  } else if (operator && left !== undefined && right !== undefined) {
    // Structured condition with operator
    const resolvedLeft = resolveTemplate(String(left), previousOutputs)
    const resolvedRight = resolveTemplate(String(right), previousOutputs)
    const l = isNaN(Number(resolvedLeft)) ? resolvedLeft : Number(resolvedLeft)
    const r = isNaN(Number(resolvedRight)) ? resolvedRight : Number(resolvedRight)

    switch (operator) {
      case 'eq': case '==': shouldContinue = l == r; break
      case 'neq': case '!=': shouldContinue = l != r; break
      case 'gt': case '>': shouldContinue = l > r; break
      case 'lt': case '<': shouldContinue = l < r; break
      case 'gte': case '>=': shouldContinue = l >= r; break
      case 'lte': case '<=': shouldContinue = l <= r; break
      case 'contains': shouldContinue = String(l).includes(String(r)); break
      default: shouldContinue = false
    }
  } else {
    // No condition specified — continue by default
    shouldContinue = true
  }

  if (shouldContinue) {
    branch = trueBranch || 'then'
  }

  return { shouldContinue, branch }
}

// Internal: Execute delay step
async function executeDelayStep(config: any): Promise<void> {
  const ms = Math.min(config.ms || config.duration || 1000, 30000) // Max 30s for safety
  await new Promise(resolve => setTimeout(resolve, ms))
}

// Internal: Execute notification step
async function executeNotificationStep(
  config: any,
  organizationId: string
): Promise<any> {
  const { userId, title, message, type } = config

  if (!title || !message) {
    return { error: 'Title and message are required for notification steps' }
  }

  // If userId is specified, create a targeted notification
  if (userId) {
    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'info',
      },
    })
    return { notificationId: notification.id, sent: true }
  }

  // Otherwise, notify all org members
  const memberships = await db.membership.findMany({
    where: { organizationId, isActive: true },
    select: { userId: true },
  })

  const notifications = []
  for (const membership of memberships) {
    const notification = await db.notification.create({
      data: {
        userId: membership.userId,
        title,
        message,
        type: type || 'info',
      },
    })
    notifications.push({ notificationId: notification.id })
  }

  return { notificationsSent: notifications.length, sent: true }
}

// Internal: Execute pipeline step (trigger an agent pipeline)
async function executePipelineStep(
  config: any,
  organizationId: string
): Promise<any> {
  const { pipelineId, triggeredBy } = config

  if (!pipelineId) {
    return { error: 'Pipeline ID is required for pipeline steps' }
  }

  try {
    const result = await executePipeline(
      pipelineId,
      triggeredBy || 'workflow'
    )
    return result
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Pipeline execution failed' }
  }
}

// ============================================
// MAIN EXPORT: Execute a Workflow Run
// ============================================

export async function executeWorkflowRun(
  workflowId: string,
  triggeredBy?: string
): Promise<{
  runId: string
  status: string
  stepResults: any[]
}> {
  // 1. Get workflow with steps from DB
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId },
    include: { steps: { orderBy: { order: 'asc' } } },
  })

  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`)
  }

  if (!workflow.isActive) {
    throw new Error(`Workflow is not active: ${workflowId}`)
  }

  // 2. Create a WorkflowRun record
  const run = await db.workflowRun.create({
    data: {
      workflowId,
      status: 'running',
      triggeredBy: triggeredBy || 'manual',
      startedAt: new Date(),
      metadata: JSON.stringify({
        stepCount: workflow.steps.length,
        workflowName: workflow.name,
      }),
    },
  })

  const stepResults: any[] = []
  const previousOutputs: Record<string, any> = {}
  let overallStatus = 'completed'

  // Track workflow start
  await trackEvent({
    organizationId: workflow.organizationId,
    eventType: 'workflow_step',
    source: 'workflow',
    status: 'info',
    message: `Workflow "${workflow.name}" started`,
    data: {
      workflowId,
      runId: run.id,
      stepCount: workflow.steps.length,
      triggeredBy,
    },
  }).catch(() => {})

  try {
    // 3. Resolve DAG execution order (topological sort)
    const executionLevels = resolveStepDAG(workflow.steps)

    // 4. Execute steps level by level (parallel within a level)
    for (const level of executionLevels) {
      // Execute all steps in this level in parallel
      const levelPromises = level.map(async (stepId) => {
        const step = workflow.steps.find(s => s.id === stepId)
        if (!step) return null

        // Skip inactive steps
        if (step.isActive === false) return null

        const result = await executeWorkflowStep(
          step,
          run.id,
          previousOutputs,
          workflow.organizationId
        )

        // Store output for subsequent steps
        previousOutputs[stepId] = result.output

        // Also store by index for template resolution
        const stepIndex = workflow.steps.findIndex(s => s.id === stepId)
        if (stepIndex >= 0) {
          previousOutputs[`step_${stepIndex}`] = result.output
        }

        return result
      })

      const levelResults = await Promise.allSettled(levelPromises)

      for (const result of levelResults) {
        if (result.status === 'fulfilled' && result.value) {
          stepResults.push(result.value)
          if (result.value.status === 'failed') {
            overallStatus = 'failed'
          }
        } else if (result.status === 'rejected') {
          stepResults.push({
            status: 'failed',
            output: { error: result.reason?.message || 'Step failed' },
            duration: 0,
          })
          overallStatus = 'failed'
        }
      }

      // If any step in the level failed, stop execution
      if (overallStatus === 'failed') {
        break
      }
    }
  } catch (err) {
    overallStatus = 'failed'
    await logError('system', 'workflow.run', 'workflow_runs', err instanceof Error ? err.message : 'Unknown error')
  }

  // 5. Update WorkflowRun on completion
  await db.workflowRun.update({
    where: { id: run.id },
    data: {
      status: overallStatus,
      completedAt: new Date(),
      result: JSON.stringify({
        stepResults: stepResults.map(r => ({
          stepRunId: r.stepRunId,
          status: r.status,
          duration: r.duration,
        })),
        totalDuration: stepResults.reduce((sum, r) => sum + (r.duration || 0), 0),
      }),
    },
  })

  // 6. Create AuditLog entry
  await logAction(
    triggeredBy || 'system',
    overallStatus === 'completed' ? 'workflow.run.completed' : 'workflow.run.failed',
    'workflows',
    {
      workflowId,
      runId: run.id,
      stepCount: workflow.steps.length,
      overallStatus,
      triggeredBy,
    }
  )

  // Track workflow completion
  await trackEvent({
    organizationId: workflow.organizationId,
    eventType: 'workflow_step',
    source: 'workflow',
    status: overallStatus === 'completed' ? 'info' : 'error',
    message: `Workflow "${workflow.name}" ${overallStatus}`,
    data: {
      workflowId,
      runId: run.id,
      overallStatus,
      stepResultsCount: stepResults.length,
    },
    duration: stepResults.reduce((sum, r) => sum + (r.duration || 0), 0),
  }).catch(() => {})

  return {
    runId: run.id,
    status: overallStatus,
    stepResults,
  }
}

// ============================================
// Cancel a running workflow
// ============================================

export async function cancelWorkflowRun(runId: string): Promise<void> {
  const run = await db.workflowRun.findUnique({
    where: { id: runId },
    include: { stepRuns: true },
  })

  if (!run) {
    throw new Error(`Workflow run not found: ${runId}`)
  }

  if (run.status !== 'running' && run.status !== 'pending') {
    throw new Error(`Cannot cancel workflow run with status: ${run.status}`)
  }

  // Update the run status
  await db.workflowRun.update({
    where: { id: runId },
    data: {
      status: 'failed',
      completedAt: new Date(),
      result: JSON.stringify({ cancelled: true, cancelledAt: new Date().toISOString() }),
    },
  })

  // Mark all pending/running step runs as failed
  const pendingStepRuns = run.stepRuns.filter(
    sr => sr.status === 'pending' || sr.status === 'running'
  )

  for (const stepRun of pendingStepRuns) {
    await db.workflowStepRun.update({
      where: { id: stepRun.id },
      data: {
        status: 'failed',
        error: 'Workflow run was cancelled',
        completedAt: new Date(),
      },
    })
  }

  await logAction('system', 'workflow.run.cancelled', 'workflows', {
    runId,
    cancelledSteps: pendingStepRuns.length,
  })
}

// ============================================
// Retry a failed workflow from the failed step
// ============================================

export async function retryWorkflowRun(runId: string): Promise<{
  newRunId: string
  status: string
}> {
  const originalRun = await db.workflowRun.findUnique({
    where: { id: runId },
    include: {
      stepRuns: true,
      workflow: {
        include: { steps: { orderBy: { order: 'asc' } } },
      },
    },
  })

  if (!originalRun) {
    throw new Error(`Workflow run not found: ${runId}`)
  }

  // Execute a new workflow run from the same workflow
  const result = await executeWorkflowRun(
    originalRun.workflowId,
    `retry:${runId}`
  )

  // Audit the retry
  await logAction('system', 'workflow.run.retried', 'workflows', {
    originalRunId: runId,
    newRunId: result.runId,
    workflowId: originalRun.workflowId,
  })

  return {
    newRunId: result.runId,
    status: result.status,
  }
}

// ============================================
// Get workflow run details with step runs
// ============================================

export async function getWorkflowRunDetails(runId: string): Promise<any> {
  const run = await db.workflowRun.findUnique({
    where: { id: runId },
    include: {
      stepRuns: {
        orderBy: { createdAt: 'asc' },
      },
      workflow: {
        include: {
          steps: { orderBy: { order: 'asc' } },
        },
      },
    },
  })

  if (!run) return null

  // Enrich step runs with step metadata
  const enrichedStepRuns = run.stepRuns.map(sr => {
    const step = run.workflow.steps.find(s => s.id === sr.stepId)
    return {
      ...sr,
      stepName: step?.name || 'Unknown Step',
      stepType: step?.type || 'unknown',
      stepOrder: step?.order ?? 0,
    }
  })

  return {
    ...run,
    stepRuns: enrichedStepRuns,
  }
}

// ============================================
// List workflow runs for a workflow
// ============================================

export async function listWorkflowRuns(
  workflowId: string,
  limit?: number
): Promise<any[]> {
  const effectiveLimit = limit || 20

  return db.workflowRun.findMany({
    where: { workflowId },
    include: {
      stepRuns: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: effectiveLimit,
  })
}
