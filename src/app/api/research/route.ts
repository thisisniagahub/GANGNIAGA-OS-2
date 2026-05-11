import { NextRequest, NextResponse } from 'next/server'
import {
  getVerifiedSources,
  searchBenchmarks,
  createCitation,
  generateResearchReport,
  seedDefaultSources,
  seedDefaultBenchmarks,
} from '@/lib/research'
import { trackEvent } from '@/lib/observability'

// ============================================
// GET /api/research
// List sources, benchmarks, and citations
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'sources'

    switch (action) {
      case 'sources': {
        const geography = searchParams.get('geography') || undefined
        const category = searchParams.get('category') || undefined
        const sources = await getVerifiedSources(geography, category)
        return NextResponse.json({ sources, total: sources.length })
      }

      case 'benchmarks': {
        const industry = searchParams.get('industry')
        if (!industry) {
          return NextResponse.json(
            { error: 'Industry parameter is required for benchmarks' },
            { status: 400 }
          )
        }
        const geography = searchParams.get('geography') || undefined
        const metric = searchParams.get('metric') || undefined
        const benchmarks = await searchBenchmarks(industry, geography, metric)
        return NextResponse.json({ benchmarks, total: benchmarks.length })
      }

      case 'citations': {
        const organizationId = searchParams.get('organizationId')
        if (!organizationId) {
          return NextResponse.json(
            { error: 'organizationId parameter is required for citations' },
            { status: 400 }
          )
        }

        // Import db directly for citation listing
        const { db } = await import('@/lib/db')
        const citations = await db.researchCitation.findMany({
          where: { organizationId },
          include: { source: true },
          orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ citations, total: citations.length })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: sources, benchmarks, citations' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Research GET error:', error)
    return NextResponse.json({ sources: [], total: 0 })
  }
}

// ============================================
// POST /api/research
// Generate report, create citation, seed data
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'generate_report': {
        const { topic, geography, industry } = body

        if (!topic || !geography || !industry) {
          return NextResponse.json(
            { error: 'topic, geography, and industry are required' },
            { status: 400 }
          )
        }

        const report = await generateResearchReport(topic, geography, industry)

        // Track event
        await trackEvent({
          eventType: 'api_request',
          source: 'research',
          status: 'info',
          message: `Research report generated: ${topic}`,
          data: { topic, geography, industry, confidence: report.confidence },
        }).catch(() => {})

        return NextResponse.json({ report })
      }

      case 'create_citation': {
        const { sourceId, claim, citation, dataPoint, confidence } = body

        if (!sourceId || !claim || !citation) {
          return NextResponse.json(
            { error: 'sourceId, claim, and citation are required' },
            { status: 400 }
          )
        }

        const citationEntry = await createCitation(
          sourceId,
          claim,
          citation,
          dataPoint,
          confidence || 0.5
        )

        // Track event
        await trackEvent({
          eventType: 'api_request',
          source: 'research',
          status: 'info',
          message: `Citation created for source: ${sourceId}`,
          data: { sourceId, claim, confidence: confidence || 0.5 },
        }).catch(() => {})

        return NextResponse.json({ citation: citationEntry }, { status: 201 })
      }

      case 'seed_sources': {
        const result = await seedDefaultSources()

        // Track event
        await trackEvent({
          eventType: 'api_request',
          source: 'research',
          status: 'info',
          message: `Research sources seeded: ${result.seeded} new, ${result.skipped} existing`,
          data: result,
        }).catch(() => {})

        return NextResponse.json({
          message: 'Sources seeded successfully',
          seeded: result.seeded,
          skipped: result.skipped,
        })
      }

      case 'seed_benchmarks': {
        const result = await seedDefaultBenchmarks()

        // Track event
        await trackEvent({
          eventType: 'api_request',
          source: 'research',
          status: 'info',
          message: `Industry benchmarks seeded: ${result.seeded} new, ${result.skipped} existing`,
          data: result,
        }).catch(() => {})

        return NextResponse.json({
          message: 'Benchmarks seeded successfully',
          seeded: result.seeded,
          skipped: result.skipped,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: generate_report, create_citation, seed_sources, seed_benchmarks' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Research POST error:', error)

    const message = error instanceof Error ? error.message : 'Failed to process research request'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
