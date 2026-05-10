import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateCitation } from '@/lib/research'
import { trackEvent } from '@/lib/observability'

// ============================================
// GET /api/research/[id]
// Fetch a single source or citation by ID
// ============================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'source'

    switch (type) {
      case 'source': {
        const source = await db.researchSource.findUnique({
          where: { id },
          include: {
            citations: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        })

        if (!source) {
          return NextResponse.json(
            { error: 'Source not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({ source })
      }

      case 'citation': {
        const citation = await db.researchCitation.findUnique({
          where: { id },
          include: { source: true },
        })

        if (!citation) {
          return NextResponse.json(
            { error: 'Citation not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({ citation })
      }

      case 'benchmark': {
        const benchmark = await db.industryBenchmark.findUnique({
          where: { id },
        })

        if (!benchmark) {
          return NextResponse.json(
            { error: 'Benchmark not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({ benchmark })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: source, citation, benchmark' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Research [id] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch research item' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/research/[id]
// Validate a citation or update source/benchmark
// ============================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'validate_citation': {
        const result = await validateCitation(id)

        // Track event
        await trackEvent({
          eventType: 'api_request',
          source: 'research',
          status: result.valid ? 'info' : 'warning',
          message: `Citation validation: ${id} — ${result.valid ? 'valid' : 'issues found'}`,
          data: { citationId: id, valid: result.valid, issues: result.issues },
        }).catch(() => {})

        return NextResponse.json(result)
      }

      case 'update_source': {
        const { name, url, verified, rating, isActive, category, geography } = body

        // Check source exists
        const existing = await db.researchSource.findUnique({
          where: { id },
        })

        if (!existing) {
          return NextResponse.json(
            { error: 'Source not found' },
            { status: 404 }
          )
        }

        const updateData: Record<string, unknown> = {}
        if (name !== undefined) updateData.name = name
        if (url !== undefined) updateData.url = url
        if (verified !== undefined) updateData.verified = verified
        if (rating !== undefined) updateData.rating = rating
        if (isActive !== undefined) updateData.isActive = isActive
        if (category !== undefined) updateData.category = category
        if (geography !== undefined) updateData.geography = geography
        updateData.lastUpdated = new Date()

        const updated = await db.researchSource.update({
          where: { id },
          data: updateData,
        })

        // Track event
        await trackEvent({
          eventType: 'api_request',
          source: 'research',
          status: 'info',
          message: `Research source updated: ${id}`,
          data: { sourceId: id, updates: Object.keys(updateData) },
        }).catch(() => {})

        return NextResponse.json({ source: updated })
      }

      case 'update_benchmark': {
        const { value, percentile25, percentile50, percentile75, confidence, source, sourceUrl, sampleSize } = body

        // Check benchmark exists
        const existing = await db.industryBenchmark.findUnique({
          where: { id },
        })

        if (!existing) {
          return NextResponse.json(
            { error: 'Benchmark not found' },
            { status: 404 }
          )
        }

        const updateData: Record<string, unknown> = {}
        if (value !== undefined) updateData.value = value
        if (percentile25 !== undefined) updateData.percentile25 = percentile25
        if (percentile50 !== undefined) updateData.percentile50 = percentile50
        if (percentile75 !== undefined) updateData.percentile75 = percentile75
        if (confidence !== undefined) updateData.confidence = confidence
        if (source !== undefined) updateData.source = source
        if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl
        if (sampleSize !== undefined) updateData.sampleSize = sampleSize

        const updated = await db.industryBenchmark.update({
          where: { id },
          data: updateData,
        })

        // Track event
        await trackEvent({
          eventType: 'api_request',
          source: 'research',
          status: 'info',
          message: `Industry benchmark updated: ${id}`,
          data: { benchmarkId: id, updates: Object.keys(updateData) },
        }).catch(() => {})

        return NextResponse.json({ benchmark: updated })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: validate_citation, update_source, update_benchmark' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Research [id] PATCH error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update research item'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
