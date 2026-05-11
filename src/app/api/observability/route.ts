import { NextRequest, NextResponse } from 'next/server'
import {
  getDashboardData,
  getTokenUsageStats,
  getTraces,
  cleanupOldEvents,
  trackEvent,
  trackTokenUsage,
} from '@/lib/observability'

// GET /api/observability?organizationId=...&type=dashboard|tokens|traces&days=7
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const type = searchParams.get('type') || 'dashboard'
    const days = searchParams.get('days')
      ? parseInt(searchParams.get('days')!, 10)
      : undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined

    if (!organizationId) {
      return NextResponse.json({ data: null })
    }

    switch (type) {
      case 'dashboard': {
        const timeRange = searchParams.get('days')
          ? `${searchParams.get('days')}d`
          : undefined
        const data = await getDashboardData(organizationId, timeRange)
        return NextResponse.json({ data })
      }

      case 'tokens': {
        const stats = await getTokenUsageStats(organizationId, days)
        return NextResponse.json({ stats })
      }

      case 'traces': {
        const traces = await getTraces(organizationId, limit)
        return NextResponse.json({ traces })
      }

      case 'cleanup': {
        const deletedCount = await cleanupOldEvents(days)
        return NextResponse.json({ deletedCount })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: dashboard, tokens, traces, cleanup' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Observability GET error:', error)
    return NextResponse.json({ data: null })
  }
}

// POST /api/observability — Track events or token usage
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'trackEvent': {
        const { organizationId, userId, eventType, source, status, message, data, traceId, spanId, duration } = body
        if (!eventType || !source || !message) {
          return NextResponse.json(
            { error: 'eventType, source, and message are required' },
            { status: 400 }
          )
        }
        const eventId = await trackEvent({
          organizationId,
          userId,
          eventType,
          source,
          status,
          message,
          data,
          traceId,
          spanId,
          duration,
        })
        return NextResponse.json({ eventId }, { status: 201 })
      }

      case 'trackTokenUsage': {
        const { organizationId, userId, agentType, model, promptTokens, completionTokens, totalTokens, requestType } = body
        if (promptTokens === undefined || completionTokens === undefined || totalTokens === undefined || !requestType) {
          return NextResponse.json(
            { error: 'promptTokens, completionTokens, totalTokens, and requestType are required' },
            { status: 400 }
          )
        }
        await trackTokenUsage({
          organizationId,
          userId,
          agentType,
          model,
          promptTokens: Number(promptTokens),
          completionTokens: Number(completionTokens),
          totalTokens: Number(totalTokens),
          requestType,
        })
        return NextResponse.json({ success: true }, { status: 201 })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: trackEvent, trackTokenUsage' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Observability POST error:', error)
    return NextResponse.json(
      { error: 'Failed to track observability data' },
      { status: 500 }
    )
  }
}
