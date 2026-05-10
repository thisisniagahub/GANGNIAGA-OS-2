import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withApiHandler, requireAuth, logAction } from '@/lib/middleware'
import { reviewPlan } from '@/lib/plan-review'
import { trackEvent } from '@/lib/observability'

// POST — Create a plan review (triggers AI review pipeline)
export const POST = withApiHandler({
  resource: 'plans',
  action: 'write',
  rateLimitEndpoint: 'reports', // use reports rate limit (5/5min) since reviews are AI-heavy
  auditAction: 'plan_review.create',
}, async (req, user) => {
  const { planId, organizationId, reviewerType } = await req.json()

  if (!planId || !organizationId) {
    return NextResponse.json(
      { error: 'Plan ID and Organization ID are required' },
      { status: 400 }
    )
  }

  // Verify the user belongs to the specified organization
  if (user.organizationId !== organizationId) {
    return NextResponse.json(
      { error: 'Organization ID does not match your membership' },
      { status: 403 }
    )
  }

  // Verify the plan exists and belongs to the organization
  const plan = await db.businessPlan.findUnique({
    where: { id: planId },
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (plan.organizationId !== organizationId) {
    return NextResponse.json(
      { error: 'Plan does not belong to this organization' },
      { status: 403 }
    )
  }

  // Check if there's already a pending/reviewing review for this plan
  const existingReview = await db.planReview.findFirst({
    where: {
      planId,
      status: { in: ['pending', 'reviewing'] },
    },
  })

  if (existingReview) {
    return NextResponse.json(
      { error: 'A review is already in progress for this plan', reviewId: existingReview.id },
      { status: 409 }
    )
  }

  // Create the review record in "reviewing" status
  const validReviewerTypes = ['lender', 'investor', 'auditor', 'internal']
  const effectiveReviewerType = validReviewerTypes.includes(reviewerType) ? reviewerType : 'lender'

  const reviewRecord = await db.planReview.create({
    data: {
      planId,
      organizationId,
      reviewerType: effectiveReviewerType,
      status: 'reviewing',
      overallScore: 0,
      narrativeScore: 0,
      financialScore: 0,
      consistencyScore: 0,
      riskScore: 0,
      fundabilityScore: 0,
      summary: '',
      discrepancies: '[]',
      recommendations: '[]',
      redFlags: '[]',
      strengths: '[]',
      metadata: JSON.stringify({ triggeredBy: user.id, startedAt: new Date().toISOString() }),
    },
  })

  // Run the AI review pipeline in the background (don't await to respond quickly)
  // We'll update the record when it completes
  executeReviewPipeline(reviewRecord.id, planId, organizationId, effectiveReviewerType, user.id).catch((error) => {
    console.error('[PlanReview] Pipeline failed:', error)
  })

  // Audit log
  await logAction(user.id, 'plan_review.create', 'plan_reviews', {
    reviewId: reviewRecord.id,
    planId,
    reviewerType: effectiveReviewerType,
  })

  return NextResponse.json(
    {
      review: {
        id: reviewRecord.id,
        planId,
        status: 'reviewing',
        reviewerType: effectiveReviewerType,
        message: 'Review pipeline started. Poll the review endpoint for updates.',
      },
    },
    { status: 202 }
  )
})

// GET — List plan reviews by organization and/or plan
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const planId = searchParams.get('planId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify org membership
    if (user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Organization ID does not match your membership' },
        { status: 403 }
      )
    }

    const where: Record<string, unknown> = { organizationId }
    if (planId) {
      where.planId = planId
    }

    const reviews = await db.planReview.findMany({
      where,
      include: {
        findings: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Plan reviews fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plan reviews' },
      { status: 500 }
    )
  }
}

// ---- Background Pipeline Execution ----

async function executeReviewPipeline(
  reviewId: string,
  planId: string,
  organizationId: string,
  reviewerType: string,
  userId: string
): Promise<void> {
  try {
    // Run the full AI review pipeline
    const report = await reviewPlan({
      planId,
      organizationId,
      reviewerType: reviewerType as 'lender' | 'investor' | 'auditor' | 'internal',
    })

    // Store findings in the database
    for (const finding of report.findings) {
      await db.planReviewFinding.create({
        data: {
          reviewId,
          type: finding.type,
          severity: finding.severity,
          section: finding.section,
          description: finding.description,
          evidence: finding.evidence || null,
          suggestion: finding.suggestion || null,
          narrativeRef: finding.narrativeRef || null,
          financialRef: finding.financialRef || null,
          resolved: false,
          metadata: '{}',
        },
      })
    }

    // Update the review record with results
    await db.planReview.update({
      where: { id: reviewId },
      data: {
        status: 'completed',
        overallScore: report.scores.overallScore,
        narrativeScore: report.scores.narrativeScore,
        financialScore: report.scores.financialScore,
        consistencyScore: report.scores.consistencyScore,
        riskScore: report.scores.riskScore,
        fundabilityScore: report.scores.fundabilityScore,
        summary: report.summary,
        discrepancies: JSON.stringify(report.discrepancies),
        recommendations: JSON.stringify(report.recommendations),
        redFlags: JSON.stringify(report.redFlags),
        strengths: JSON.stringify(report.strengths),
        metadata: JSON.stringify({
          triggeredBy: userId,
          completedAt: new Date().toISOString(),
          findingCount: report.findings.length,
          lenderQuestions: report.lenderQuestions,
        }),
      },
    })

    // Track completion event
    await trackEvent({
      organizationId,
      userId,
      eventType: 'api_request',
      source: 'plan_review',
      status: 'info',
      message: `Plan review pipeline completed for review ${reviewId}`,
      data: {
        reviewId,
        planId,
        overallScore: report.scores.overallScore,
        findingCount: report.findings.length,
      },
    }).catch(() => {})
  } catch (error) {
    console.error('[PlanReview] Pipeline execution failed:', error)

    // Update review record to reflect failure
    await db.planReview.update({
      where: { id: reviewId },
      data: {
        status: 'needs_revision',
        summary: `Review pipeline encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: JSON.stringify({
          triggeredBy: userId,
          failedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    }).catch(() => {})
  }
}
