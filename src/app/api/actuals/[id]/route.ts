// GangNiaga AI — Alert Detail API
// PATCH /api/actuals/[id] — Dismiss a financial alert

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { dismissAlert } from '@/lib/actuals'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params
    const body = await req.json()
    const { actionTaken } = body

    // Dismiss the alert
    const result = await dismissAlert(id, actionTaken)

    if (!result) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 },
      )
    }

    // Verify the alert belongs to the user's organization
    if (result.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Alert does not belong to your organization' },
        { status: 403 },
      )
    }

    return NextResponse.json({
      message: 'Alert dismissed successfully',
      alert: result,
    })
  } catch (error) {
    console.error('Alert dismiss error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to dismiss alert' },
      { status: 500 },
    )
  }
}
