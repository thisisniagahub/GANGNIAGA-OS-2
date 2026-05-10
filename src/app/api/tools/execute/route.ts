import { NextRequest, NextResponse } from 'next/server'
import { executeTool, type ToolExecutionRequest } from '@/lib/tools'
import { getAllToolNames, getTool, validateToolInput } from '@/lib/tools'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

/**
 * POST /api/tools/execute
 *
 * Execute a registered tool with full lifecycle management.
 *
 * Body:
 *   toolName        — string (required)
 *   agentTaskId     — string (required, must reference an existing AgentTask)
 *   input           — Record<string, any> (required)
 *   organizationId  — string (optional)
 *   requiresApproval — boolean (optional, overrides per-tool default)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { toolName, agentTaskId, input, organizationId, requiresApproval } =
      body

    // ── Validate required fields ──────────────────────────────────────────
    if (!toolName || !agentTaskId || !input) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: toolName, agentTaskId, and input are required',
        },
        { status: 400 },
      )
    }

    // ── Validate tool name ────────────────────────────────────────────────
    const toolDef = getTool(toolName)
    if (!toolDef) {
      return NextResponse.json(
        {
          error: `Unknown tool: ${toolName}`,
          availableTools: getAllToolNames(),
        },
        { status: 400 },
      )
    }

    // ── Validate input schema ─────────────────────────────────────────────
    const validation = validateToolInput(toolName, input)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Input validation failed',
          details: validation.errors,
        },
        { status: 400 },
      )
    }

    // ── Resolve user ID ───────────────────────────────────────────────────
    let userId: string | undefined
    try {
      const cookieStore = await cookies()
      userId = cookieStore.get('session_user')?.value
    } catch {
      // Cookie access might fail in some contexts
    }

    if (!userId) {
      // Fallback: find any existing user
      const anyUser = await db.user.findFirst()
      userId = anyUser?.id || 'unknown'
    }

    // ── Verify the agent task exists ──────────────────────────────────────
    const agentTask = await db.agentTask.findUnique({
      where: { id: agentTaskId },
    })
    if (!agentTask) {
      return NextResponse.json(
        { error: `Agent task ${agentTaskId} not found` },
        { status: 404 },
      )
    }

    // ── Execute the tool ──────────────────────────────────────────────────
    const request: ToolExecutionRequest = {
      toolName,
      agentTaskId,
      input,
      userId,
      organizationId,
      requiresApproval,
    }

    const result = await executeTool(request)

    // Determine HTTP status based on result
    const statusCode = result.success
      ? 200
      : result.output?.status === 'pending_approval'
        ? 202 // Accepted — pending approval
        : 400

    return NextResponse.json(result, { status: statusCode })
  } catch (error) {
    console.error('[API /tools/execute] Error:', error)
    return NextResponse.json(
      { error: 'Tool execution failed' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/tools/execute
 *
 * List all available tools with their definitions.
 * Optional query params: ?category=analytics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const { TOOL_DEFINITIONS, getToolsByCategory, getAllToolNames } =
      await import('@/lib/tools')

    if (category) {
      const tools = getToolsByCategory(category)
      return NextResponse.json({ tools, category, count: tools.length })
    }

    const toolNames = getAllToolNames()
    const tools = toolNames.map((name) => {
      const def = TOOL_DEFINITIONS[name]
      return {
        name: def.name,
        description: def.description,
        category: def.category,
        requiredPermissions: def.requiredPermissions,
        rateLimited: def.rateLimited ?? false,
        maxExecutionsPerMinute: def.maxExecutionsPerMinute,
        timeout: def.timeout ?? 30000,
        sandboxed: def.sandboxed ?? false,
        requiresApproval: def.requiresApproval ?? false,
      }
    })

    return NextResponse.json({ tools, count: tools.length })
  } catch (error) {
    console.error('[API /tools/execute] GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to list tools' },
      { status: 500 },
    )
  }
}
