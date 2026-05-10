import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, description, trigger, schedule, isActive, steps } = body

    // Check if workflow exists
    const existing = await db.workflow.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Validate trigger if provided
    if (trigger) {
      const validTriggers = ['manual', 'scheduled', 'event']
      if (!validTriggers.includes(trigger)) {
        return NextResponse.json(
          { error: `Invalid trigger. Must be one of: ${validTriggers.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (trigger !== undefined) updateData.trigger = trigger
    if (schedule !== undefined) updateData.schedule = schedule
    if (isActive !== undefined) updateData.isActive = isActive

    // Update workflow fields
    if (Object.keys(updateData).length > 0) {
      await db.workflow.update({
        where: { id },
        data: updateData,
      })
    }

    // If steps are provided, delete old steps and create new ones
    if (steps && Array.isArray(steps)) {
      // Delete existing steps
      await db.workflowStep.deleteMany({
        where: { workflowId: id },
      })

      // Create new steps
      if (steps.length > 0) {
        await db.workflowStep.createMany({
          data: steps.map((step: { type: string; name: string; config?: string; order?: number }) => ({
            workflowId: id,
            type: step.type || 'agent',
            name: step.name || 'Untitled Step',
            config: step.config ? (typeof step.config === 'string' ? step.config : JSON.stringify(step.config)) : '{}',
            order: step.order ?? 0,
          })),
        })
      }
    }

    // Return updated workflow with steps and recent runs
    const updated = await db.workflow.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    return NextResponse.json({ workflow: updated })
  } catch (error) {
    console.error('Workflow update error:', error)
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if workflow exists
    const existing = await db.workflow.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Delete the workflow (cascading deletes will handle steps and runs)
    await db.workflow.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Workflow deleted successfully' })
  } catch (error) {
    console.error('Workflow deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 })
  }
}
