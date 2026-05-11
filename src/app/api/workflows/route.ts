import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withApiHandler, getAuthUser, logAction } from '@/lib/middleware'
import { trackEvent } from '@/lib/observability'
import { executeWorkflowRun } from '@/lib/workflows'

// GET — List workflows with graceful degradation for serverless
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ workflows: [] })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ workflows: [] })
    }

    // Verify org membership
    if (user.organizationId !== organizationId) {
      return NextResponse.json({ workflows: [] })
    }

    const workflows = await db.workflow.findMany({
      where: { organizationId },
      include: {
        steps: true,
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error('Workflows fetch error:', error)
    return NextResponse.json({ workflows: [] })
  }
}

// POST — Create or execute workflow with middleware
export const POST = withApiHandler({
  resource: 'workflows',
  action: 'write',
  rateLimitEndpoint: 'workflows',
  auditAction: 'workflow.create',
}, async (req, user) => {
  const body = await req.json()
  const { organizationId, name, description, trigger, schedule, steps, action, workflowId, triggeredBy } = body

  // Handle workflow execution action
  if (action === 'execute' && workflowId) {
    try {
      const result = await executeWorkflowRun(workflowId, triggeredBy || user.id)

      // Audit log for execution
      await logAction(user.id, 'workflow.execute', 'workflows', {
        workflowId,
        runId: result.runId,
        status: result.status,
      })

      // Track event
      await trackEvent({
        organizationId: user.organizationId,
        userId: user.id,
        eventType: 'workflow_step',
        source: 'workflow',
        status: result.status === 'completed' ? 'info' : 'error',
        message: `Workflow executed: ${workflowId}`,
        data: { runId: result.runId, status: result.status },
      }).catch(() => {})

      return NextResponse.json({ run: result }, { status: 201 })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Workflow execution failed'
      await logError(user.id, 'workflow.execute', 'workflows', errorMessage)
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }

  // Handle workflow creation
  if (!organizationId || !name || !trigger) {
    return NextResponse.json(
      { error: 'Organization ID, name, and trigger are required' },
      { status: 400 }
    )
  }

  // Verify org membership
  if (user.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Organization ID does not match your membership' }, { status: 403 })
  }

  // Validate trigger type
  const validTriggers = ['manual', 'scheduled', 'event']
  if (!validTriggers.includes(trigger)) {
    return NextResponse.json(
      { error: `Invalid trigger. Must be one of: ${validTriggers.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate and build steps data
  const stepsData = Array.isArray(steps)
    ? steps.map((step: { type: string; name: string; config?: string; order?: number; dependsOn?: string | string[] }) => ({
        type: step.type || 'agent',
        name: step.name || 'Untitled Step',
        config: step.config ? (typeof step.config === 'string' ? step.config : JSON.stringify(step.config)) : '{}',
        order: step.order ?? 0,
        dependsOn: step.dependsOn
          ? (typeof step.dependsOn === 'string' ? step.dependsOn : JSON.stringify(step.dependsOn))
          : '[]',
      }))
    : []

  const workflow = await db.workflow.create({
    data: {
      organizationId,
      name,
      description: description || null,
      trigger,
      schedule: schedule || null,
      isActive: false,
      steps: {
        create: stepsData,
      },
    },
    include: {
      steps: true,
      runs: true,
    },
  })

  // Audit log
  await logAction(user.id, 'workflow.create', 'workflows', {
    workflowId: workflow.id,
    name,
    stepCount: stepsData.length,
  })

  // Track event
  await trackEvent({
    organizationId,
    userId: user.id,
    eventType: 'api_request',
    source: 'api',
    status: 'info',
    message: `Workflow created: ${name}`,
    data: { workflowId: workflow.id, stepCount: stepsData.length },
  }).catch(() => {})

  return NextResponse.json({ workflow }, { status: 201 })
})
