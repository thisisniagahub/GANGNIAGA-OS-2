import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/middleware'

// GET — Get a single plan review with findings
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params

    const review = await db.planReview.findUnique({
      where: { id },
      include: {
        findings: {
          orderBy: [
            { severity: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Verify org membership
    if (review.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'You do not have access to this review' },
        { status: 403 }
      )
    }

    // Parse JSON fields for convenience
    const metadata = safeParseJSON(review.metadata)
    const discrepancies = safeParseJSON(review.discrepancies)
    const recommendations = safeParseJSON(review.recommendations)
    const redFlags = safeParseJSON(review.redFlags)
    const strengths = safeParseJSON(review.strengths)

    // Group findings by type
    const findingsByType = {
      discrepancy: review.findings.filter((f) => f.type === 'discrepancy'),
      red_flag: review.findings.filter((f) => f.type === 'red_flag'),
      strength: review.findings.filter((f) => f.type === 'strength'),
      recommendation: review.findings.filter((f) => f.type === 'recommendation'),
      data_gap: review.findings.filter((f) => f.type === 'data_gap'),
    }

    // Group findings by severity
    const findingsBySeverity = {
      critical: review.findings.filter((f) => f.severity === 'critical'),
      high: review.findings.filter((f) => f.severity === 'high'),
      medium: review.findings.filter((f) => f.severity === 'medium'),
      low: review.findings.filter((f) => f.severity === 'low'),
      info: review.findings.filter((f) => f.severity === 'info'),
    }

    // Summary statistics
    const stats = {
      totalFindings: review.findings.length,
      resolvedFindings: review.findings.filter((f) => f.resolved).length,
      unresolvedFindings: review.findings.filter((f) => !f.resolved).length,
      criticalFindings: findingsBySeverity.critical.length,
      highFindings: findingsBySeverity.high.length,
    }

    return NextResponse.json({
      review: {
        ...review,
        discrepancies,
        recommendations,
        redFlags,
        strengths,
        metadata,
        lenderQuestions: metadata.lenderQuestions || [],
      },
      findingsByType,
      findingsBySeverity,
      stats,
    })
  } catch (error) {
    console.error('Plan review fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plan review' },
      { status: 500 }
    )
  }
}

// PATCH — Update review status or resolve findings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params
    const body = await req.json()
    const { status, resolveFindings, unresolveFindings } = body

    const review = await db.planReview.findUnique({
      where: { id },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Verify org membership
    if (review.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'You do not have access to this review' },
        { status: 403 }
      )
    }

    // Update review status if provided
    if (status) {
      const validStatuses = ['pending', 'reviewing', 'completed', 'needs_revision']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }

      await db.planReview.update({
        where: { id },
        data: { status },
      })
    }

    // Resolve specific findings
    if (resolveFindings && Array.isArray(resolveFindings)) {
      for (const findingId of resolveFindings) {
        await db.planReviewFinding.updateMany({
          where: {
            id: findingId,
            reviewId: id,
          },
          data: { resolved: true },
        })
      }
    }

    // Unresolve specific findings
    if (unresolveFindings && Array.isArray(unresolveFindings)) {
      for (const findingId of unresolveFindings) {
        await db.planReviewFinding.updateMany({
          where: {
            id: findingId,
            reviewId: id,
          },
          data: { resolved: false },
        })
      }
    }

    // Return the updated review with findings
    const updatedReview = await db.planReview.findUnique({
      where: { id },
      include: {
        findings: {
          orderBy: [
            { severity: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    })

    return NextResponse.json({ review: updatedReview })
  } catch (error) {
    console.error('Plan review update error:', error)
    return NextResponse.json(
      { error: 'Failed to update plan review' },
      { status: 500 }
    )
  }
}

// ---- Helper ----

function safeParseJSON(str: string): unknown {
  try {
    return JSON.parse(str || '{}')
  } catch {
    return {}
  }
}
