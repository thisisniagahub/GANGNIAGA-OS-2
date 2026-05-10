import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { title, description, status, sections } = body

    // Check if the plan exists
    const existingPlan = await db.businessPlan.findUnique({
      where: { id },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['draft', 'review', 'approved', 'archived']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Build update data object
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status

    // Update plan fields if any are provided
    if (Object.keys(updateData).length > 0) {
      await db.businessPlan.update({
        where: { id },
        data: updateData,
      })
    }

    // Update section contents if provided
    if (sections && Array.isArray(sections)) {
      for (const section of sections) {
        if (section.id && section.content !== undefined) {
          await db.planSection.update({
            where: { id: section.id },
            data: { content: section.content },
          })
        }
      }
    }

    // Return the updated plan with sections
    const updatedPlan = await db.businessPlan.findUnique({
      where: { id },
      include: { sections: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({ plan: updatedPlan })
  } catch (error) {
    console.error('Plan update error:', error)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if the plan exists
    const existingPlan = await db.businessPlan.findUnique({
      where: { id },
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Delete the plan (cascading deletes will handle sections)
    await db.businessPlan.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Plan deleted successfully' })
  } catch (error) {
    console.error('Plan deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
