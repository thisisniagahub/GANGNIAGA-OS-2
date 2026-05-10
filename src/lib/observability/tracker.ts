import { db } from '@/lib/db'

// ==========================================
// OBSERVABILITY TRACKER
// Execution monitoring and distributed tracing
// ==========================================

// Track an API/execution event
export async function trackEvent(params: {
  organizationId?: string
  userId?: string
  eventType: string // 'agent_execution' | 'workflow_step' | 'pipeline_step' | 'browser_action' | 'tool_execution' | 'api_request' | 'export_job'
  source: string    // 'api' | 'agent' | 'workflow' | 'pipeline' | 'browser' | 'tool' | 'export'
  status?: string   // 'info' | 'warning' | 'error' | 'critical'
  message: string
  data?: Record<string, unknown>
  traceId?: string
  spanId?: string
  duration?: number
}): Promise<string> {
  try {
    const event = await db.observabilityEvent.create({
      data: {
        organizationId: params.organizationId || null,
        userId: params.userId || null,
        eventType: params.eventType,
        source: params.source,
        status: params.status || 'info',
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : '{}',
        traceId: params.traceId || null,
        spanId: params.spanId || null,
        duration: params.duration ?? null,
        metadata: '{}',
      },
    })
    return event.id
  } catch (error) {
    console.error('Failed to track event:', error)
    return ''
  }
}

// Start a trace (for distributed tracing)
export function startTrace(name: string): {
  traceId: string
  startSpan: (name: string) => { spanId: string; end: (data?: Record<string, unknown>) => Promise<void> }
  end: (data?: Record<string, unknown>) => Promise<void>
} {
  const traceId = generateId()
  const startTime = Date.now()

  const activeSpans: { spanId: string; name: string; startTime: number }[] = []

  const startSpan = (spanName: string) => {
    const spanId = generateId()
    const spanStartTime = Date.now()
    activeSpans.push({ spanId, name: spanName, startTime: spanStartTime })

    return {
      spanId,
      end: async (data?: Record<string, unknown>) => {
        const duration = Date.now() - spanStartTime
        await trackEvent({
          eventType: 'pipeline_step',
          source: 'pipeline',
          status: 'info',
          message: `Span: ${spanName}`,
          data: { traceName: name, spanName, ...data },
          traceId,
          spanId,
          duration,
        })
      },
    }
  }

  const end = async (data?: Record<string, unknown>) => {
    const duration = Date.now() - startTime
    await trackEvent({
      eventType: 'pipeline_step',
      source: 'pipeline',
      status: 'info',
      message: `Trace: ${name}`,
      data: {
        traceName: name,
        totalSpans: activeSpans.length,
        totalDuration: duration,
        ...data,
      },
      traceId,
      duration,
    })
  }

  return { traceId, startSpan, end }
}

// Track AI token usage
export async function trackTokenUsage(params: {
  organizationId?: string
  userId?: string
  agentType?: string
  model?: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  requestType: string // 'chat' | 'plan_generate' | 'forecast_analyze' | 'report_generate' | 'agent_task' | 'pipeline_step'
}): Promise<void> {
  try {
    await db.tokenUsage.create({
      data: {
        organizationId: params.organizationId || null,
        userId: params.userId || null,
        agentType: params.agentType || null,
        model: params.model || 'default',
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.totalTokens,
        requestType: params.requestType,
        metadata: '{}',
      },
    })
  } catch (error) {
    console.error('Failed to track token usage:', error)
  }
}

// Get observability dashboard data
export async function getDashboardData(
  organizationId: string,
  timeRange?: string
): Promise<{
  totalEvents: number
  eventsByType: Record<string, number>
  eventsByStatus: Record<string, number>
  avgResponseTime: number
  totalTokenUsage: number
  tokenUsageByAgent: Record<string, number>
  recentErrors: Record<string, unknown>[]
  topSlowOperations: Record<string, unknown>[]
  eventTrend: { date: string; count: number }[]
}> {
  const days = parseTimeRangeDays(timeRange)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  // Get events for the time range
  const events = await db.observabilityEvent.findMany({
    where: {
      organizationId,
      createdAt: { gte: cutoffDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  // Get token usage for the time range
  const tokenUsages = await db.tokenUsage.findMany({
    where: {
      organizationId,
      createdAt: { gte: cutoffDate },
    },
  })

  // Calculate event counts by type
  const eventsByType: Record<string, number> = {}
  for (const event of events) {
    eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1
  }

  // Calculate event counts by status
  const eventsByStatus: Record<string, number> = {}
  for (const event of events) {
    eventsByStatus[event.status] = (eventsByStatus[event.status] || 0) + 1
  }

  // Calculate average response time
  const eventsWithDuration = events.filter((e) => e.duration !== null)
  const avgResponseTime =
    eventsWithDuration.length > 0
      ? eventsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / eventsWithDuration.length
      : 0

  // Calculate total token usage
  const totalTokenUsage = tokenUsages.reduce((sum, t) => sum + t.totalTokens, 0)

  // Token usage by agent
  const tokenUsageByAgent: Record<string, number> = {}
  for (const tu of tokenUsages) {
    const key = tu.agentType || 'unknown'
    tokenUsageByAgent[key] = (tokenUsageByAgent[key] || 0) + tu.totalTokens
  }

  // Recent errors (status = error or critical)
  const recentErrors = events
    .filter((e) => e.status === 'error' || e.status === 'critical')
    .slice(0, 20)
    .map((e) => ({
      id: e.id,
      eventType: e.eventType,
      source: e.source,
      message: e.message,
      data: safeParseJSON(e.data),
      createdAt: e.createdAt,
      duration: e.duration,
      traceId: e.traceId,
    }))

  // Top slow operations
  const topSlowOperations = eventsWithDuration
    .sort((a, b) => (b.duration || 0) - (a.duration || 0))
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      eventType: e.eventType,
      source: e.source,
      message: e.message,
      duration: e.duration,
      createdAt: e.createdAt,
    }))

  // Event trend (by day)
  const eventTrend = calculateEventTrend(events, days)

  return {
    totalEvents: events.length,
    eventsByType,
    eventsByStatus,
    avgResponseTime: Math.round(avgResponseTime),
    totalTokenUsage,
    tokenUsageByAgent,
    recentErrors,
    topSlowOperations,
    eventTrend,
  }
}

// Get token usage stats
export async function getTokenUsageStats(
  organizationId: string,
  days?: number
): Promise<{
  totalTokens: number
  totalCost: number // estimated
  byAgent: Record<string, { tokens: number; cost: number }>
  byRequestType: Record<string, { tokens: number; cost: number }>
  dailyUsage: { date: string; tokens: number }[]
}> {
  const effectiveDays = days || 30
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - effectiveDays)

  const tokenUsages = await db.tokenUsage.findMany({
    where: {
      organizationId,
      createdAt: { gte: cutoffDate },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Cost estimation: $0.01 per 1K tokens (simplified average across models)
  const COST_PER_1K_TOKENS = 0.01

  const totalTokens = tokenUsages.reduce((sum, t) => sum + t.totalTokens, 0)
  const totalCost = (totalTokens / 1000) * COST_PER_1K_TOKENS

  // By agent
  const byAgent: Record<string, { tokens: number; cost: number }> = {}
  for (const tu of tokenUsages) {
    const key = tu.agentType || 'unknown'
    if (!byAgent[key]) {
      byAgent[key] = { tokens: 0, cost: 0 }
    }
    byAgent[key].tokens += tu.totalTokens
    byAgent[key].cost += (tu.totalTokens / 1000) * COST_PER_1K_TOKENS
  }

  // By request type
  const byRequestType: Record<string, { tokens: number; cost: number }> = {}
  for (const tu of tokenUsages) {
    const key = tu.requestType || 'unknown'
    if (!byRequestType[key]) {
      byRequestType[key] = { tokens: 0, cost: 0 }
    }
    byRequestType[key].tokens += tu.totalTokens
    byRequestType[key].cost += (tu.totalTokens / 1000) * COST_PER_1K_TOKENS
  }

  // Daily usage
  const dailyMap: Record<string, number> = {}
  for (const tu of tokenUsages) {
    const date = tu.createdAt.toISOString().split('T')[0]
    dailyMap[date] = (dailyMap[date] || 0) + tu.totalTokens
  }
  const dailyUsage = Object.entries(dailyMap)
    .map(([date, tokens]) => ({ date, tokens }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalTokens,
    totalCost: Math.round(totalCost * 100) / 100,
    byAgent,
    byRequestType,
    dailyUsage,
  }
}

// Get execution traces for debugging
export async function getTraces(
  organizationId: string,
  limit?: number
): Promise<Record<string, unknown>[]> {
  const effectiveLimit = limit || 50

  // Get recent events with trace IDs
  const tracedEvents = await db.observabilityEvent.findMany({
    where: {
      organizationId,
      traceId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    take: effectiveLimit * 5, // get more to group by trace
  })

  // Group by traceId
  const traceMap: Record<string, Record<string, unknown>> = {}
  for (const event of tracedEvents) {
    if (!event.traceId) continue
    if (!traceMap[event.traceId]) {
      traceMap[event.traceId] = {
        traceId: event.traceId,
        spans: [] as Record<string, unknown>[],
        startedAt: event.createdAt,
        status: 'info',
        totalDuration: 0,
      }
    }
    const trace = traceMap[event.traceId]

    // Track the earliest timestamp
    if (event.createdAt < (trace.startedAt as Date)) {
      trace.startedAt = event.createdAt
    }

    // Track the worst status
    if (event.status === 'critical') trace.status = 'critical'
    else if (event.status === 'error' && trace.status !== 'critical') trace.status = 'error'
    else if (event.status === 'warning' && trace.status !== 'critical' && trace.status !== 'error') trace.status = 'warning'

    // Sum durations
    trace.totalDuration = (trace.totalDuration as number) + (event.duration || 0)

    // Add span
    ;(trace.spans as Record<string, unknown>[]).push({
      spanId: event.spanId,
      eventType: event.eventType,
      source: event.source,
      message: event.message,
      status: event.status,
      duration: event.duration,
      data: safeParseJSON(event.data),
      createdAt: event.createdAt,
    })
  }

  // Sort by startedAt descending and limit
  const traces = Object.values(traceMap)
    .sort((a, b) => {
      const aTime = a.startedAt instanceof Date ? a.startedAt.getTime() : 0
      const bTime = b.startedAt instanceof Date ? b.startedAt.getTime() : 0
      return bTime - aTime
    })
    .slice(0, effectiveLimit)

  return traces
}

// Clean up old observability data (data retention)
export async function cleanupOldEvents(olderThanDays?: number): Promise<number> {
  const days = olderThanDays || 90
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  try {
    const deletedEvents = await db.observabilityEvent.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    })

    const deletedTokens = await db.tokenUsage.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    })

    return deletedEvents.count + deletedTokens.count
  } catch (error) {
    console.error('Failed to cleanup old events:', error)
    return 0
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function generateId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
}

function parseTimeRangeDays(timeRange?: string): number {
  switch (timeRange) {
    case '1d':
      return 1
    case '7d':
      return 7
    case '30d':
      return 30
    case '90d':
      return 90
    case '1y':
      return 365
    default:
      return 7
  }
}

function calculateEventTrend(
  events: { createdAt: Date }[],
  _days: number
): { date: string; count: number }[] {
  const trendMap: Record<string, number> = {}

  // Initialize all dates in range
  const now = new Date()
  for (let i = _days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    trendMap[dateStr] = 0
  }

  // Count events per day
  for (const event of events) {
    const dateStr = event.createdAt.toISOString().split('T')[0]
    if (dateStr in trendMap) {
      trendMap[dateStr]++
    }
  }

  return Object.entries(trendMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function safeParseJSON(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str || '{}')
  } catch {
    return {}
  }
}
