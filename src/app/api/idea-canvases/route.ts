import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withApiHandler, getAuthUser, logAction } from '@/lib/middleware'
import { trackEvent, trackTokenUsage } from '@/lib/observability'
import { validateIdea, persistValidation, generateValidationQuestions } from '@/lib/idea-validation'

// POST — Create an idea canvas with optional AI validation
export const POST = withApiHandler({
  resource: 'plans',
  action: 'write',
  rateLimitEndpoint: 'plans',
  auditAction: 'idea_canvas.create',
}, async (req, user) => {
  const body = await req.json()
  const {
    organizationId,
    title,
    problem,
    solution,
    targetMarket,
    competitiveLandscape,
    businessModel,
    uniqueValue,
    channels,
    costStructure,
    revenueStreams,
    validateWithAI,
    industry,
  } = body

  if (!organizationId || !title) {
    return NextResponse.json({ error: 'Organization ID and title are required' }, { status: 400 })
  }

  // Verify the user belongs to the specified organization
  if (user.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Organization ID does not match your membership' }, { status: 403 })
  }

  // Create the idea canvas
  const canvas = await db.ideaCanvas.create({
    data: {
      userId: user.id,
      organizationId,
      title,
      problem: problem || '',
      solution: solution || '',
      targetMarket: targetMarket || '',
      competitiveLandscape: competitiveLandscape || '',
      businessModel: businessModel || '',
      uniqueValue: uniqueValue || '',
      channels: channels || '',
      costStructure: costStructure || '',
      revenueStreams: revenueStreams || '',
      status: 'draft',
      metadata: JSON.stringify({ industry: industry || 'Technology' }),
    },
  })

  // If AI validation is requested, run it
  if (validateWithAI) {
    try {
      // Update status to validating
      await db.ideaCanvas.update({
        where: { id: canvas.id },
        data: { status: 'validating' },
      })

      const report = await validateIdea({
        title: canvas.title,
        problem: canvas.problem,
        solution: canvas.solution,
        targetMarket: canvas.targetMarket,
        competitiveLandscape: canvas.competitiveLandscape,
        businessModel: canvas.businessModel,
        uniqueValue: canvas.uniqueValue,
        channels: canvas.channels,
        costStructure: canvas.costStructure,
        revenueStreams: canvas.revenueStreams,
        industry: industry || 'Technology',
        organizationId,
      })

      // Persist validation results
      await persistValidation(canvas.id, report)

      // Track token usage
      await trackTokenUsage({
        organizationId,
        userId: user.id,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: Math.ceil(JSON.stringify(report).length / 4),
        requestType: 'idea_validation',
      }).catch(() => {})
    } catch (error) {
      console.error('AI validation failed during canvas creation:', error)
      // Reset status back to draft if validation fails
      await db.ideaCanvas.update({
        where: { id: canvas.id },
        data: { status: 'draft' },
      })
    }
  }

  // Return the canvas with validations
  const fullCanvas = await db.ideaCanvas.findUnique({
    where: { id: canvas.id },
    include: {
      validations: { orderBy: { order: 'asc' } },
      benchmarks: true,
    },
  })

  // Audit log
  await logAction(user.id, 'idea_canvas.create', 'idea_canvases', {
    canvasId: canvas.id,
    title,
    validateWithAI: !!validateWithAI,
  })

  // Track event
  await trackEvent({
    organizationId,
    userId: user.id,
    eventType: 'api_request',
    source: 'api',
    status: 'info',
    message: `Idea canvas created: ${title}`,
    data: { canvasId: canvas.id, validateWithAI: !!validateWithAI },
  }).catch(() => {})

  return NextResponse.json({ canvas: fullCanvas })
})

// GET — List idea canvases by organization with graceful degradation for serverless
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ canvases: [] })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const status = searchParams.get('status')

    if (!organizationId) {
      return NextResponse.json({ canvases: [] })
    }

    // Verify org membership
    if (user.organizationId !== organizationId) {
      return NextResponse.json({ canvases: [] })
    }

    // Build where clause
    const where: Record<string, unknown> = { organizationId }
    if (status) {
      where.status = status
    }

    const canvases = await db.ideaCanvas.findMany({
      where,
      include: {
        validations: {
          select: {
            id: true,
            category: true,
            riskLevel: true,
            score: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ canvases })
  } catch (error) {
    console.error('Idea canvases fetch error:', error)
    return NextResponse.json({ canvases: [] })
  }
}
