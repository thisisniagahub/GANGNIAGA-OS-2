import { NextRequest, NextResponse } from 'next/server'
import {
  approveExecution,
  rejectExecution,
  getApproval,
  listPendingApprovals,
} from '@/lib/tools'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

/**
 * GET /api/tools/approvals
 *
 * List pending tool execution approvals.
 * Optional query params: ?userId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || undefined

    const approvals = listPendingApprovals(userId)

    return NextResponse.json({
      approvals: approvals.map((a) => ({
        id: a.id,
        toolName: a.toolName,
        input: a.input,
        userId: a.userId,
        agentTaskId: a.agentTaskId,
        organizationId: a.organizationId,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      })),
      count: approvals.length,
    })
  } catch (error) {
    console.error('[API /tools/approvals] GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to list approvals' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/tools/approvals
 *
 * Approve or reject a pending tool execution.
 *
 * Body:
 *   approvalId — string (required)
 *   action     — 'approve' | 'reject' (required)
 *   reason     — string (optional, required for reject)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { approvalId, action, reason } = body

    if (!approvalId || !action) {
      return NextResponse.json(
        { error: 'approvalId and action (approve/reject) are required' },
        { status: 400 },
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 },
      )
    }

    // Verify the approval exists
    const approval = getApproval(approvalId)
    if (!approval) {
      return NextResponse.json(
        { error: `Approval ${approvalId} not found` },
        { status: 404 },
      )
    }

    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: `Approval is already ${approval.status}` },
        { status: 400 },
      )
    }

    // Resolve user ID for audit
    let userId: string | undefined
    try {
      const cookieStore = await cookies()
      userId = cookieStore.get('session_user')?.value
    } catch {
      // Ignore
    }

    if (action === 'approve') {
      await approveExecution(approvalId)

      // Create audit log
      try {
        await db.auditLog.create({
          data: {
            userId: userId || approval.userId,
            organizationId: approval.organizationId,
            action: `tool.${approval.toolName}.approved`,
            resource: 'tool_approvals',
            resourceId: approvalId,
            status: 'success',
            details: JSON.stringify({
              approvalId,
              toolName: approval.toolName,
              approvedBy: userId,
            }),
            metadata: '{}',
          },
        })
      } catch {
        // Don't block on audit log failure
      }

      // If approved, re-execute the tool automatically
      const tools = await import('@/lib/tools')

      const executeRequest: tools.ToolExecutionRequest = {
        toolName: approval.toolName,
        agentTaskId: approval.agentTaskId,
        input: approval.input,
        userId: approval.userId,
        organizationId: approval.organizationId,
        requiresApproval: false, // Already approved, bypass approval check
      }

      const result = await tools.executeTool(executeRequest)

      return NextResponse.json({
        approved: true,
        approvalId,
        executionResult: result,
      })
    } else {
      // Reject
      await rejectExecution(approvalId, reason || 'Rejected by user')

      // Create audit log
      try {
        await db.auditLog.create({
          data: {
            userId: userId || approval.userId,
            organizationId: approval.organizationId,
            action: `tool.${approval.toolName}.rejected`,
            resource: 'tool_approvals',
            resourceId: approvalId,
            status: 'success',
            details: JSON.stringify({
              approvalId,
              toolName: approval.toolName,
              rejectedBy: userId,
              reason: reason || 'Rejected by user',
            }),
            metadata: '{}',
          },
        })
      } catch {
        // Don't block on audit log failure
      }

      return NextResponse.json({
        approved: false,
        approvalId,
        reason: reason || 'Rejected by user',
      })
    }
  } catch (error) {
    console.error('[API /tools/approvals] POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 },
    )
  }
}
