import { db } from '@/lib/db'
import { executeAgentTask } from './orchestrator'

// ============================================
// Pipeline Step Definition (Input)
// ============================================

interface PipelineStepInput {
  agentType: string
  name: string
  description?: string
  inputTemplate: Record<string, any>
  config?: Record<string, any>
  dependsOn?: string[] // step IDs or indices (0-based)
}

// ============================================
// Create Pipeline
// ============================================

export async function createPipeline(params: {
  name: string
  description?: string
  organizationId: string
  steps: PipelineStepInput[]
  triggerType?: string
  schedule?: string
}): Promise<{ pipelineId: string }> {
  const {
    name,
    description,
    organizationId,
    steps,
    triggerType = 'manual',
    schedule,
  } = params

  // Validate that all agent types exist
  const validAgentTypes = [
    'cfo',
    'ceo',
    'research',
    'growth',
    'operations',
    'fundraising',
    'browser',
    'reporting',
  ]

  for (const step of steps) {
    if (!validAgentTypes.includes(step.agentType)) {
      throw new Error(
        `Invalid agent type in step "${step.name}": ${step.agentType}. Must be one of: ${validAgentTypes.join(', ')}`
      )
    }
  }

  // Create the pipeline with nested steps
  const pipeline = await db.agentPipeline.create({
    data: {
      name,
      description,
      organizationId,
      status: 'draft',
      triggerType,
      schedule,
      metadata: '{}',
      steps: {
        create: steps.map((step, index) => ({
          agentType: step.agentType,
          name: step.name,
          description: step.description,
          inputTemplate: JSON.stringify(step.inputTemplate),
          config: JSON.stringify(step.config || {}),
          order: index,
          dependsOn: JSON.stringify(step.dependsOn || []),
          isActive: true,
        })),
      },
    },
    include: {
      steps: true,
    },
  })

  // Create audit log
  await db.auditLog.create({
    data: {
      organizationId,
      action: 'pipeline.create',
      resource: 'agent_pipelines',
      resourceId: pipeline.id,
      status: 'success',
      details: JSON.stringify({
        name,
        stepCount: steps.length,
        agentTypes: steps.map((s) => s.agentType),
      }),
    },
  })

  return { pipelineId: pipeline.id }
}

// ============================================
// Execute Pipeline
// ============================================

export async function executePipeline(
  pipelineId: string,
  triggeredBy?: string
): Promise<{
  runId: string
  status: string
  results: any[]
}> {
  // Get pipeline with steps
  const pipeline = await db.agentPipeline.findUnique({
    where: { id: pipelineId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  if (pipeline.steps.length === 0) {
    throw new Error(`Pipeline has no steps: ${pipelineId}`)
  }

  // 1. Create an AgentPipelineRun
  const pipelineRun = await db.agentPipelineRun.create({
    data: {
      pipelineId,
      status: 'running',
      triggeredBy,
      startedAt: new Date(),
      metadata: JSON.stringify({
        pipelineName: pipeline.name,
        stepCount: pipeline.steps.length,
      }),
    },
  })

  // 2. Resolve DAG execution order
  const executionLevels = resolveExecutionOrder(pipeline.steps)

  // Track outputs from each step for dependency resolution
  const stepOutputs: Record<string, any> = {}
  const results: any[] = []

  try {
    // 3. Execute steps level by level (parallel within a level)
    for (let levelIndex = 0; levelIndex < executionLevels.length; levelIndex++) {
      const level = executionLevels[levelIndex]

      // Execute all steps in this level in parallel
      const levelResults = await Promise.allSettled(
        level.map(async (step) => {
          // 4. Create PipelineStepRun
          const stepRun = await db.pipelineStepRun.create({
            data: {
              pipelineRunId: pipelineRun.id,
              stepId: step.id,
              agentType: step.agentType,
              status: 'running',
              startedAt: new Date(),
              metadata: JSON.stringify({
                stepName: step.name,
                level: levelIndex,
              }),
            },
          })

          try {
            // 5. Resolve input template with previous step outputs
            const template = safeJsonParse(step.inputTemplate, {})
            const resolvedInput = resolveInputTemplate(template, stepOutputs)

            // Build the task string from the resolved input
            const taskString = buildTaskString(step.name, step.description, resolvedInput)

            // Resolve userId from the triggeredBy or pipeline org
            let userId = triggeredBy || 'system'
            if (!userId || userId === 'system') {
              const anyUser = await db.user.findFirst()
              userId = anyUser?.id || 'system'
            }

            // Execute the agent task
            const agentResult = await executeAgentTask({
              agentType: step.agentType,
              task: taskString,
              userId,
              organizationId: pipeline.organizationId,
              context: resolvedInput,
            })

            // 6. Record output
            const output = agentResult.result
            stepOutputs[step.id] = {
              agentType: step.agentType,
              output,
              taskId: agentResult.taskId,
            }

            // Update step run
            await db.pipelineStepRun.update({
              where: { id: stepRun.id },
              data: {
                status: 'completed',
                output: output.slice(0, 5000), // Limit output size
                completedAt: new Date(),
                duration:
                  stepRun.startedAt
                    ? Date.now() - new Date(stepRun.startedAt).getTime()
                    : null,
                metadata: JSON.stringify({
                  stepName: step.name,
                  level: levelIndex,
                  taskId: agentResult.taskId,
                  toolExecutions: agentResult.toolExecutions.length,
                }),
              },
            })

            return {
              stepId: step.id,
              stepName: step.name,
              agentType: step.agentType,
              status: 'completed',
              output: output.slice(0, 2000),
              taskId: agentResult.taskId,
            }
          } catch (stepError) {
            console.error(
              `Pipeline step failed: ${step.name} (${step.agentType})`,
              stepError
            )

            // Update step run as failed
            await db.pipelineStepRun.update({
              where: { id: stepRun.id },
              data: {
                status: 'failed',
                error: String(stepError).slice(0, 1000),
                completedAt: new Date(),
                duration:
                  stepRun.startedAt
                    ? Date.now() - new Date(stepRun.startedAt).getTime()
                    : null,
              },
            })

            return {
              stepId: step.id,
              stepName: step.name,
              agentType: step.agentType,
              status: 'failed',
              error: String(stepError),
            }
          }
        })
      )

      // Collect results from this level
      for (const result of levelResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            status: 'failed',
            error: String(result.reason),
          })
        }
      }
    }

    // 7. Update PipelineRun status when complete
    const hasFailed = results.some((r) => r.status === 'failed')
    const finalStatus = hasFailed ? 'failed' : 'completed'

    await db.agentPipelineRun.update({
      where: { id: pipelineRun.id },
      data: {
        status: finalStatus,
        result: JSON.stringify({
          totalSteps: pipeline.steps.length,
          completedSteps: results.filter((r) => r.status === 'completed').length,
          failedSteps: results.filter((r) => r.status === 'failed').length,
          stepResults: results,
        }),
        completedAt: new Date(),
      },
    })

    // 8. Create AuditLog entries
    await db.auditLog.create({
      data: {
        organizationId: pipeline.organizationId,
        userId: triggeredBy,
        action: 'pipeline.execute',
        resource: 'agent_pipeline_runs',
        resourceId: pipelineRun.id,
        status: hasFailed ? 'failure' : 'success',
        details: JSON.stringify({
          pipelineName: pipeline.name,
          totalSteps: pipeline.steps.length,
          completedSteps: results.filter((r) => r.status === 'completed').length,
          failedSteps: results.filter((r) => r.status === 'failed').length,
        }),
      },
    })

    return {
      runId: pipelineRun.id,
      status: finalStatus,
      results,
    }
  } catch (pipelineError) {
    // Handle catastrophic pipeline failure
    console.error('Pipeline execution failed:', pipelineError)

    await db.agentPipelineRun.update({
      where: { id: pipelineRun.id },
      data: {
        status: 'failed',
        result: JSON.stringify({
          error: String(pipelineError),
          results,
        }),
        completedAt: new Date(),
      },
    })

    await db.auditLog.create({
      data: {
        organizationId: pipeline.organizationId,
        userId: triggeredBy,
        action: 'pipeline.execute',
        resource: 'agent_pipeline_runs',
        resourceId: pipelineRun.id,
        status: 'failure',
        details: JSON.stringify({
          pipelineName: pipeline.name,
          error: String(pipelineError),
        }),
      },
    })

    return {
      runId: pipelineRun.id,
      status: 'failed',
      results,
    }
  }
}

// ============================================
// Resolve DAG Execution Order (Topological Sort)
// ============================================

function resolveExecutionOrder(
  steps: { id: string; dependsOn: string; order: number; isActive: boolean }[]
): { id: string; agentType: string; name: string; description: string | null; inputTemplate: string; config: string; dependsOn: string; order: number; isActive: boolean }[][] {
  // Filter to active steps only
  const activeSteps = steps.filter((s) => s.isActive)

  if (activeSteps.length === 0) return []

  // Build adjacency list
  const stepMap = new Map(activeSteps.map((s) => [s.id, s]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const step of activeSteps) {
    inDegree.set(step.id, 0)
    adjacency.set(step.id, [])
  }

  // Parse dependencies and build graph
  for (const step of activeSteps) {
    const deps = safeJsonParse(step.dependsOn, []) as string[]

    for (const dep of deps) {
      // Support both step IDs and numeric indices
      let depId = dep
      if (/^\d+$/.test(dep)) {
        const depIndex = parseInt(dep, 10)
        if (depIndex >= 0 && depIndex < activeSteps.length) {
          depId = activeSteps[depIndex].id
        }
      }

      if (stepMap.has(depId)) {
        adjacency.get(depId)?.push(step.id)
        inDegree.set(step.id, (inDegree.get(step.id) || 0) + 1)
      }
    }
  }

  // Kahn's algorithm for topological sort (level-by-level)
  const levels: any[][] = []
  let queue: string[] = []

  // Start with nodes that have no dependencies
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id)
    }
  }

  const processed = new Set<string>()

  while (queue.length > 0) {
    // Current level: all nodes in queue can run in parallel
    const level = queue
      .filter((id) => !processed.has(id))
      .map((id) => stepMap.get(id)!)
      .filter(Boolean)

    if (level.length === 0) break

    levels.push(level)

    for (const step of level) {
      processed.add(step.id)
    }

    // Find next level candidates
    const nextQueue: string[] = []
    for (const step of level) {
      const dependents = adjacency.get(step.id) || []
      for (const depId of dependents) {
        // Decrease in-degree
        const currentDegree = (inDegree.get(depId) || 1) - 1
        inDegree.set(depId, currentDegree)

        if (currentDegree === 0 && !processed.has(depId)) {
          nextQueue.push(depId)
        }
      }
    }

    queue = nextQueue
  }

  // Handle any remaining nodes (cycles or disconnected)
  for (const step of activeSteps) {
    if (!processed.has(step.id)) {
      // Place in the last level (best effort)
      if (levels.length === 0) {
        levels.push([step])
      } else {
        levels[levels.length - 1].push(step)
      }
    }
  }

  return levels
}

// ============================================
// Resolve Input Template with Previous Step Outputs
// ============================================

function resolveInputTemplate(
  template: Record<string, any>,
  previousOutputs: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {}

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      // Replace {{stepId.field}} or {{stepIndex.field}} patterns
      resolved[key] = value.replace(
        /\{\{([^}]+)\}\}/g,
        (_match, ref: string) => {
          const parts = ref.trim().split('.')
          const stepRef = parts[0]
          const field = parts.slice(1).join('.')

          // Try to find by step ID
          const stepOutput = previousOutputs[stepRef]
          if (stepOutput) {
            if (field === 'output') return stepOutput.output || ''
            if (field === 'agentType') return stepOutput.agentType || ''
            if (!field) return JSON.stringify(stepOutput)
            // Try to access nested field
            return (stepOutput as any)[field] || ''
          }

          // Try numeric index
          if (/^\d+$/.test(stepRef)) {
            const index = parseInt(stepRef, 10)
            const stepIds = Object.keys(previousOutputs)
            if (index < stepIds.length) {
              const indexedOutput = previousOutputs[stepIds[index]]
              if (field === 'output') return indexedOutput.output || ''
              if (!field) return JSON.stringify(indexedOutput)
              return (indexedOutput as any)[field] || ''
            }
          }

          return _match // Leave unreplaced
        }
      )
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = resolveInputTemplate(value, previousOutputs)
    } else {
      resolved[key] = value
    }
  }

  return resolved
}

// ============================================
// Build Task String from Step Info and Resolved Input
// ============================================

function buildTaskString(
  name: string,
  description: string | null,
  resolvedInput: Record<string, any>
): string {
  let task = `Task: ${name}`
  if (description) {
    task += `\n\nDescription: ${description}`
  }

  const inputEntries = Object.entries(resolvedInput)
  if (inputEntries.length > 0) {
    task += '\n\nInput Data:'
    for (const [key, value] of inputEntries) {
      const valueStr =
        typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      task += `\n- ${key}: ${valueStr}`
    }
  }

  task += '\n\nPlease complete this task based on the information provided above.'
  return task
}

// ============================================
// Get Pipeline Status
// ============================================

export async function getPipelineStatus(pipelineId: string) {
  const pipeline = await db.agentPipeline.findUnique({
    where: { id: pipelineId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
      runs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          stepRuns: {
            orderBy: { startedAt: 'asc' },
          },
        },
      },
    },
  })

  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  // Get the latest run status
  const latestRun = pipeline.runs[0] || null

  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    status: pipeline.status,
    triggerType: pipeline.triggerType,
    schedule: pipeline.schedule,
    steps: pipeline.steps.map((step) => ({
      id: step.id,
      agentType: step.agentType,
      name: step.name,
      description: step.description,
      order: step.order,
      isActive: step.isActive,
      dependsOn: safeJsonParse(step.dependsOn, []),
      config: safeJsonParse(step.config, {}),
      inputTemplate: safeJsonParse(step.inputTemplate, {}),
    })),
    latestRun: latestRun
      ? {
          id: latestRun.id,
          status: latestRun.status,
          triggeredBy: latestRun.triggeredBy,
          startedAt: latestRun.startedAt,
          completedAt: latestRun.completedAt,
          result: safeJsonParse(latestRun.result, {}),
          stepRuns: latestRun.stepRuns,
        }
      : null,
    runCount: pipeline.runs.length,
    recentRuns: pipeline.runs.slice(0, 5).map((run) => ({
      id: run.id,
      status: run.status,
      triggeredBy: run.triggeredBy,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    })),
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
  }
}

// ============================================
// List Pipelines for an Organization
// ============================================

export async function listPipelines(organizationId: string) {
  const pipelines = await db.agentPipeline.findMany({
    where: { organizationId },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
      runs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return pipelines.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    triggerType: p.triggerType,
    schedule: p.schedule,
    stepCount: p.steps.length,
    agentTypes: p.steps.map((s) => s.agentType),
    latestRun: p.runs[0]
      ? {
          id: p.runs[0].id,
          status: p.runs[0].status,
          completedAt: p.runs[0].completedAt,
        }
      : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))
}

// ============================================
// Update Pipeline
// ============================================

export async function updatePipeline(
  pipelineId: string,
  params: {
    name?: string
    description?: string
    status?: string
    triggerType?: string
    schedule?: string
    steps?: PipelineStepInput[]
  }
) {
  const { name, description, status, triggerType, schedule, steps } = params

  // If steps are provided, replace all steps
  if (steps && steps.length > 0) {
    // Delete existing steps
    await db.agentPipelineStep.deleteMany({
      where: { pipelineId },
    })

    // Create new steps
    await db.agentPipeline.update({
      where: { id: pipelineId },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
        ...(triggerType ? { triggerType } : {}),
        ...(schedule !== undefined ? { schedule } : {}),
        steps: {
          create: steps.map((step, index) => ({
            agentType: step.agentType,
            name: step.name,
            description: step.description,
            inputTemplate: JSON.stringify(step.inputTemplate),
            config: JSON.stringify(step.config || {}),
            order: index,
            dependsOn: JSON.stringify(step.dependsOn || []),
            isActive: true,
          })),
        },
      },
    })
  } else {
    await db.agentPipeline.update({
      where: { id: pipelineId },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
        ...(triggerType ? { triggerType } : {}),
        ...(schedule !== undefined ? { schedule } : {}),
      },
    })
  }

  return getPipelineStatus(pipelineId)
}

// ============================================
// Delete Pipeline
// ============================================

export async function deletePipeline(pipelineId: string) {
  // Cascade deletes will handle steps and runs
  await db.agentPipeline.delete({
    where: { id: pipelineId },
  })

  return { deleted: true }
}

// ============================================
// Utility: Safe JSON Parse
// ============================================

function safeJsonParse(str: string | null, fallback: any): any {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}
