import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, logAction } from '@/lib/middleware'
import { trackEvent, trackTokenUsage } from '@/lib/observability'
import { validateIdea, persistValidation } from '@/lib/idea-validation'

// GET — Get a single idea canvas by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params

    const canvas = await db.ideaCanvas.findUnique({
      where: { id },
      include: {
        validations: { orderBy: { order: 'asc' } },
        benchmarks: true,
      },
    })

    if (!canvas) {
      return NextResponse.json({ error: 'Idea canvas not found' }, { status: 404 })
    }

    // Verify the user belongs to the canvas's organization
    if (user.organizationId !== canvas.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse the JSON fields for convenience
    const parsedCanvas = {
      ...canvas,
      riskAssessment: safeParseJson(canvas.riskAssessment),
      validationReport: safeParseJson(canvas.validationReport),
      metadata: safeParseJson(canvas.metadata),
    }

    return NextResponse.json({ canvas: parsedCanvas })
  } catch (error) {
    console.error('Idea canvas fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch idea canvas' }, { status: 500 })
  }
}

// PATCH — Update an idea canvas, or trigger AI validation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params
    const body = await req.json()
    const { action } = body

    // Check if the canvas exists
    const existingCanvas = await db.ideaCanvas.findUnique({
      where: { id },
    })

    if (!existingCanvas) {
      return NextResponse.json({ error: 'Idea canvas not found' }, { status: 404 })
    }

    // Verify the user belongs to the canvas's organization
    if (user.organizationId !== existingCanvas.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Handle validation action
    if (action === 'validate') {
      // Update status to validating
      await db.ideaCanvas.update({
        where: { id },
        data: { status: 'validating' },
      })

      try {
        const metadata = safeParseJson(existingCanvas.metadata)
        const industry = metadata?.industry || 'Technology'

        const report = await validateIdea({
          title: existingCanvas.title,
          problem: existingCanvas.problem,
          solution: existingCanvas.solution,
          targetMarket: existingCanvas.targetMarket,
          competitiveLandscape: existingCanvas.competitiveLandscape,
          businessModel: existingCanvas.businessModel,
          uniqueValue: existingCanvas.uniqueValue,
          channels: existingCanvas.channels,
          costStructure: existingCanvas.costStructure,
          revenueStreams: existingCanvas.revenueStreams,
          industry,
          organizationId: existingCanvas.organizationId,
        })

        // Persist validation results
        await persistValidation(id, report)

        // Track token usage
        await trackTokenUsage({
          organizationId: existingCanvas.organizationId,
          userId: user.id,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: Math.ceil(JSON.stringify(report).length / 4),
          requestType: 'idea_validation',
        }).catch(() => {})

        // Audit log
        await logAction(user.id, 'idea_canvas.validate', 'idea_canvases', {
          canvasId: id,
          score: report.overallScore,
          grade: report.grade,
        })

        // Track event
        await trackEvent({
          organizationId: existingCanvas.organizationId,
          userId: user.id,
          eventType: 'api_request',
          source: 'api',
          status: 'info',
          message: `Idea canvas validated: ${existingCanvas.title} (Score: ${report.overallScore}/100)`,
          data: { canvasId: id, score: report.overallScore, grade: report.grade },
        }).catch(() => {})

        // Return the updated canvas with validations
        const validatedCanvas = await db.ideaCanvas.findUnique({
          where: { id },
          include: {
            validations: { orderBy: { order: 'asc' } },
            benchmarks: true,
          },
        })

        return NextResponse.json({
          canvas: {
            ...validatedCanvas,
            riskAssessment: safeParseJson(validatedCanvas?.riskAssessment),
            validationReport: safeParseJson(validatedCanvas?.validationReport),
            metadata: safeParseJson(validatedCanvas?.metadata),
          },
          validationReport: report,
        })
      } catch (error) {
        console.error('AI validation failed:', error)

        // Reset status back
        await db.ideaCanvas.update({
          where: { id },
          data: { status: 'needs_rework' },
        })

        return NextResponse.json(
          { error: 'AI validation failed. Please try again later.', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    // Handle regular field updates
    const updatableFields = [
      'title',
      'problem',
      'solution',
      'targetMarket',
      'competitiveLandscape',
      'businessModel',
      'uniqueValue',
      'channels',
      'costStructure',
      'revenueStreams',
      'status',
    ]

    const updateData: Record<string, unknown> = {}

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['draft', 'validating', 'validated', 'needs_rework', 'archived']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Handle metadata update
    if (body.metadata !== undefined) {
      const existingMeta = safeParseJson(existingCanvas.metadata)
      updateData.metadata = JSON.stringify({ ...existingMeta, ...body.metadata })
    }

    if (Object.keys(updateData).length > 0) {
      await db.ideaCanvas.update({
        where: { id },
        data: updateData,
      })
    }

    // Return the updated canvas with validations
    const updatedCanvas = await db.ideaCanvas.findUnique({
      where: { id },
      include: {
        validations: { orderBy: { order: 'asc' } },
        benchmarks: true,
      },
    })

    // Audit log
    await logAction(user.id, 'idea_canvas.update', 'idea_canvases', {
      canvasId: id,
      updatedFields: Object.keys(updateData),
    })

    return NextResponse.json({
      canvas: {
        ...updatedCanvas,
        riskAssessment: safeParseJson(updatedCanvas?.riskAssessment),
        validationReport: safeParseJson(updatedCanvas?.validationReport),
        metadata: safeParseJson(updatedCanvas?.metadata),
      },
    })
  } catch (error) {
    console.error('Idea canvas update error:', error)
    return NextResponse.json({ error: 'Failed to update idea canvas' }, { status: 500 })
  }
}

// DELETE — Delete an idea canvas
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params

    // Check if the canvas exists
    const existingCanvas = await db.ideaCanvas.findUnique({
      where: { id },
    })

    if (!existingCanvas) {
      return NextResponse.json({ error: 'Idea canvas not found' }, { status: 404 })
    }

    // Verify the user belongs to the canvas's organization
    if (user.organizationId !== existingCanvas.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the canvas (cascading deletes will handle validations and benchmarks)
    await db.ideaCanvas.delete({
      where: { id },
    })

    // Audit log
    await logAction(user.id, 'idea_canvas.delete', 'idea_canvases', {
      canvasId: id,
      title: existingCanvas.title,
    })

    // Track event
    await trackEvent({
      organizationId: existingCanvas.organizationId,
      userId: user.id,
      eventType: 'api_request',
      source: 'api',
      status: 'info',
      message: `Idea canvas deleted: ${existingCanvas.title}`,
      data: { canvasId: id },
    }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Idea canvas deleted successfully' })
  } catch (error) {
    console.error('Idea canvas deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete idea canvas' }, { status: 500 })
  }
}

// ============================================
// HELPERS
// ============================================

function safeParseJson(value: string | null | undefined): unknown {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}
