import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withApiHandler, requireAuth, getAuthUser, logAction } from '@/lib/middleware'
import { trackEvent, trackTokenUsage } from '@/lib/observability'
import { executeAgentTask, AGENT_DEFINITIONS } from '@/lib/agents'

// POST — Execute an agent task with middleware
export const POST = withApiHandler({
  resource: 'agents',
  action: 'execute',
  rateLimitEndpoint: 'agents',
  auditAction: 'agent.execute',
}, async (req, user) => {
  const body = await req.json()
  const { agentType, task } = body

  if (!agentType || !task) {
    return NextResponse.json(
      { error: 'Agent type and task are required' },
      { status: 400 }
    )
  }

  // Validate agent type
  if (!AGENT_DEFINITIONS[agentType]) {
    return NextResponse.json(
      { error: `Invalid agent type. Must be one of: ${Object.keys(AGENT_DEFINITIONS).join(', ')}` },
      { status: 400 }
    )
  }

  const userId = user.id
  const organizationId = user.organizationId

  // Use the agent orchestrator's executeAgentTask
  const result = await executeAgentTask({
    agentType,
    task,
    userId,
    organizationId,
  })

  // Track token usage
  await trackTokenUsage({
    organizationId,
    userId,
    agentType,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: Math.ceil((task.length + (result.result?.length || 0)) / 4),
    requestType: 'agent_task',
  }).catch(() => {})

  // Track observability event
  await trackEvent({
    organizationId,
    userId,
    eventType: 'agent_execution',
    source: 'agent',
    status: 'info',
    message: `Agent task executed: ${agentType}`,
    data: {
      agentType,
      sessionId: result.sessionId,
      taskId: result.taskId,
      toolExecutions: result.toolExecutions?.length || 0,
    },
  }).catch(() => {})

  // Audit log (orchestrator already creates one, but we add a higher-level one)
  await logAction(userId, 'agent.execute', 'agent_tasks', {
    agentType,
    taskId: result.taskId,
    sessionId: result.sessionId,
  })

  // Get the updated task from DB for the response
  const updatedTask = await db.agentTask.findUnique({
    where: { id: result.taskId },
  })

  return NextResponse.json({ task: updatedTask, response: result.result }, { status: 201 })
})

// GET — List agent sessions with middleware
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || user?.id

    if (!userId) {
      return NextResponse.json({ sessions: [] })
    }

    const sessions = await db.agentSession.findMany({
      where: { userId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Agent sessions fetch error:', error)
    return NextResponse.json({ sessions: [] })
  }
}
