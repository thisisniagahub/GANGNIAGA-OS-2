'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Activity,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { useAuthStore } from '@/lib/stores/auth-store'

// ============================================
// Types
// ============================================

interface DashboardData {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsByStatus: Record<string, number>
  avgResponseTime: number
  totalTokenUsage: number
  tokenUsageByAgent: Record<string, number>
  recentErrors: Array<{
    id: string
    eventType: string
    source: string
    message: string
    data: Record<string, unknown>
    createdAt: string
    duration: number | null
    traceId: string | null
  }>
  topSlowOperations: Array<{
    id: string
    eventType: string
    source: string
    message: string
    duration: number | null
    createdAt: string
  }>
  eventTrend: Array<{ date: string; count: number }>
}

interface TokenStats {
  totalTokens: number
  totalCost: number
  byAgent: Record<string, { tokens: number; cost: number }>
  byRequestType: Record<string, { tokens: number; cost: number }>
  dailyUsage: Array<{ date: string; tokens: number }>
}

type TimeRange = '1d' | '7d' | '30d' | '90d'

// ============================================
// Color constants
// ============================================

const STATUS_COLORS: Record<string, string> = {
  info: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  critical: '#dc2626',
}

const EVENT_TYPE_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16',
]

const AGENT_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16',
]

// ============================================
// Helper functions
// ============================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    agent_execution: 'Agent Exec',
    workflow_step: 'Workflow Step',
    tool_execution: 'Tool Exec',
    pipeline_step: 'Pipeline Step',
    browser_action: 'Browser Action',
    api_request: 'API Request',
    export_job: 'Export Job',
  }
  return labels[type] || type
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'error':
    case 'critical':
      return 'destructive'
    case 'warning':
      return 'secondary'
    default:
      return 'outline'
  }
}

// ============================================
// Main Component
// ============================================

export function ObservabilityPage() {
  const { organization } = useAuthStore()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    if (!organization?.id) return
    setIsLoading(true)
    try {
      const [dashRes, tokenRes] = await Promise.all([
        fetch(`/api/observability?organizationId=${organization.id}&type=dashboard&days=${timeRange === '1d' ? '1' : timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'}`),
        fetch(`/api/observability?organizationId=${organization.id}&type=tokens&days=${timeRange === '1d' ? '1' : timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'}`),
      ])

      if (dashRes.ok) {
        const dashJson = await dashRes.json()
        setDashboardData(dashJson.data)
      }
      if (tokenRes.ok) {
        const tokenJson = await tokenRes.json()
        setTokenStats(tokenJson.stats)
      }
    } catch (error) {
      console.error('Failed to fetch observability data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id, timeRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchData()
    setIsRefreshing(false)
  }

  // Derived data for charts
  const eventTypeChartData = dashboardData
    ? Object.entries(dashboardData.eventsByType).map(([type, count]) => ({
        name: getEventTypeLabel(type),
        count,
      }))
    : []

  const eventStatusChartData = dashboardData
    ? Object.entries(dashboardData.eventsByStatus).map(([status, count]) => ({
        name: status,
        value: count,
        color: STATUS_COLORS[status] || '#6b7280',
      }))
    : []

  const tokenByAgentChartData = tokenStats
    ? Object.entries(tokenStats.byAgent).map(([agent, data], i) => ({
        name: agent,
        tokens: data.tokens,
        cost: data.cost,
        fill: AGENT_COLORS[i % AGENT_COLORS.length],
      }))
    : []

  const tokenTrendData = tokenStats?.dailyUsage || []

  const errorRate = dashboardData && dashboardData.totalEvents > 0
    ? (((dashboardData.eventsByStatus.error || 0) + (dashboardData.eventsByStatus.critical || 0)) / dashboardData.totalEvents * 100)
    : 0

  const timeRangeLabels: Record<TimeRange, string> = {
    '1d': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Observability</h2>
          <p className="text-sm text-muted-foreground">
            {timeRangeLabels[timeRange]} monitoring for {organization?.name || 'your organization'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-8 w-28 mb-1" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <OverviewCard
              title="Total Events"
              value={formatNumber(dashboardData?.totalEvents || 0)}
              description={timeRangeLabels[timeRange]}
              icon={Activity}
              trend="up"
              change=""
            />
            <OverviewCard
              title="Avg Response Time"
              value={formatDuration(dashboardData?.avgResponseTime || 0)}
              description="Across all operations"
              icon={Clock}
              trend={(dashboardData?.avgResponseTime || 0) < 2000 ? 'up' : 'down'}
              change=""
            />
            <OverviewCard
              title="Token Usage"
              value={formatNumber(dashboardData?.totalTokenUsage || 0)}
              description={`Est. cost: ${formatCost(tokenStats?.totalCost || 0)}`}
              icon={Zap}
              trend="up"
              change=""
            />
            <OverviewCard
              title="Error Rate"
              value={`${errorRate.toFixed(1)}%`}
              description={`${(dashboardData?.eventsByStatus.error || 0) + (dashboardData?.eventsByStatus.critical || 0)} errors`}
              icon={AlertTriangle}
              trend={errorRate > 5 ? 'down' : 'up'}
              change=""
            />
          </>
        )}
      </div>

      {/* Event Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Events by Type */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Events by Type</CardTitle>
            </div>
            <CardDescription>Distribution of event categories</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : eventTypeChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventTypeChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Events" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="No event data" description="Events will appear as your agents and workflows execute." />
            )}
          </CardContent>
        </Card>

        {/* Events by Status */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Events by Status</CardTitle>
            </div>
            <CardDescription>Health distribution across all events</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : eventStatusChartData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventStatusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {eventStatusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value.toLocaleString(), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {eventStatusChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground capitalize">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="No event data" description="Events will appear as your agents and workflows execute." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Token by Agent */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Token Usage by Agent</CardTitle>
            </div>
            <CardDescription>Breakdown by agent type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : tokenByAgentChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tokenByAgentChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'cost' ? formatCost(value) : formatNumber(value),
                        name === 'cost' ? 'Cost' : 'Tokens',
                      ]}
                    />
                    <Bar dataKey="tokens" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Tokens" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="No token data" description="Token usage will appear as AI operations execute." icon={Zap} />
            )}
          </CardContent>
        </Card>

        {/* Token Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Token Usage Trend</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-1.5">
              Daily token consumption
              {tokenStats && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Total: {formatNumber(tokenStats.totalTokens)} tokens
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : tokenTrendData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tokenTrendData.map(d => ({ ...d, date: d.date.slice(5) }))}>
                    <defs>
                      <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [formatNumber(value), 'Tokens']}
                    />
                    <Area
                      type="monotone"
                      dataKey="tokens"
                      stroke="hsl(var(--chart-1))"
                      fillOpacity={1}
                      fill="url(#colorTokens)"
                      strokeWidth={2}
                      name="Tokens"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="No token trend data" description="Daily usage will appear as AI operations accumulate." icon={TrendingUp} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Cost Summary */}
      {tokenStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <span className="text-xs text-muted-foreground font-medium">Total Tokens</span>
            <span className="text-sm font-bold">{formatNumber(tokenStats.totalTokens)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <span className="text-xs text-muted-foreground font-medium">Est. Cost</span>
            <span className="text-sm font-bold">{formatCost(tokenStats.totalCost)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <span className="text-xs text-muted-foreground font-medium">Agent Types</span>
            <span className="text-sm font-bold">{Object.keys(tokenStats.byAgent).length}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <span className="text-xs text-muted-foreground font-medium">Request Types</span>
            <span className="text-sm font-bold">{Object.keys(tokenStats.byRequestType).length}</span>
          </div>
        </div>
      )}

      {/* Bottom Row: Recent Errors & Slow Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Errors */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <CardTitle className="text-base">Recent Errors</CardTitle>
            </div>
            <CardDescription>Error and critical events</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="w-4 h-4 rounded shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardData?.recentErrors && dashboardData.recentErrors.length > 0 ? (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] h-8">Time</TableHead>
                      <TableHead className="text-[11px] h-8">Type</TableHead>
                      <TableHead className="text-[11px] h-8">Source</TableHead>
                      <TableHead className="text-[11px] h-8">Message</TableHead>
                      <TableHead className="text-[11px] h-8">Trace ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.recentErrors.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell className="text-[11px] whitespace-nowrap py-2">
                          {getTimeAgo(error.createdAt)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant={getStatusBadgeVariant('error')} className="text-[10px] px-1.5 py-0">
                            {getEventTypeLabel(error.eventType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] py-2">{error.source}</TableCell>
                        <TableCell className="text-[11px] py-2 max-w-[200px] truncate">
                          {error.message}
                        </TableCell>
                        <TableCell className="text-[11px] font-mono py-2">
                          {error.traceId ? error.traceId.slice(0, 12) + '...' : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                message="No recent errors"
                description="Everything is running smoothly!"
                icon={AlertTriangle}
              />
            )}
          </CardContent>
        </Card>

        {/* Slow Operations */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Slowest Operations</CardTitle>
            </div>
            <CardDescription>Operations with longest duration</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="w-4 h-4 rounded shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardData?.topSlowOperations && dashboardData.topSlowOperations.length > 0 ? (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] h-8">Time</TableHead>
                      <TableHead className="text-[11px] h-8">Type</TableHead>
                      <TableHead className="text-[11px] h-8">Source</TableHead>
                      <TableHead className="text-[11px] h-8">Message</TableHead>
                      <TableHead className="text-[11px] h-8">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.topSlowOperations.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell className="text-[11px] whitespace-nowrap py-2">
                          {getTimeAgo(op.createdAt)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {getEventTypeLabel(op.eventType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] py-2">{op.source}</TableCell>
                        <TableCell className="text-[11px] py-2 max-w-[200px] truncate">
                          {op.message}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={(op.duration || 0) > 10000 ? 'destructive' : (op.duration || 0) > 3000 ? 'secondary' : 'outline'}
                            className="text-[10px] px-1.5 py-0 font-mono"
                          >
                            {formatDuration(op.duration)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                message="No slow operations"
                description="All operations are performing well."
                icon={Timer}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function OverviewCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  change,
}: {
  title: string
  value: string
  description: string
  icon: React.ElementType
  trend: 'up' | 'down'
  change: string
}) {
  const isPositive = trend === 'up'
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          {change && (
            <Badge
              variant="secondary"
              className={`text-[10px] ${
                isPositive
                  ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30'
                  : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30'
              }`}
            >
              {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
              {change}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{title} · {description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({
  message,
  description,
  icon: Icon = AlertCircle,
}: {
  message: string
  description: string
  icon?: React.ElementType
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
    </div>
  )
}
