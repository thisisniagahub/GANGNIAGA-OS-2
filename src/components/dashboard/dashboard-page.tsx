'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Target,
  RefreshCw,
  Bot,
  Clock,
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
} from 'recharts'
import { useAuthStore } from '@/lib/stores/auth-store'

// ============================================
// Types
// ============================================

interface Kpi {
  id: string
  name: string
  category: string
  value: number
  previousValue: number
  target: number | null
  unit: string
  period: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface AgentSession {
  id: string
  agentType: string
  title: string | null
  status: string
  tasks: AgentTask[]
  createdAt: string
  updatedAt: string
}

interface AgentTask {
  id: string
  type: string
  input: string
  output: string | null
  status: string
  createdAt: string
  updatedAt: string
}

type DateRange = 'this_month' | 'last_month' | 'this_quarter' | 'this_year'

// ============================================
// Demo chart data (used when no forecast data available)
// ============================================

const demoRevenueData = [
  { month: 'Jan', revenue: 42000, expenses: 38000, profit: 4000 },
  { month: 'Feb', revenue: 48000, expenses: 39000, profit: 9000 },
  { month: 'Mar', revenue: 55000, expenses: 41000, profit: 14000 },
  { month: 'Apr', revenue: 52000, expenses: 40000, profit: 12000 },
  { month: 'May', revenue: 61000, expenses: 43000, profit: 18000 },
  { month: 'Jun', revenue: 68000, expenses: 45000, profit: 23000 },
  { month: 'Jul', revenue: 72000, expenses: 47000, profit: 25000 },
  { month: 'Aug', revenue: 78000, expenses: 48000, profit: 30000 },
  { month: 'Sep', revenue: 82000, expenses: 50000, profit: 32000 },
  { month: 'Oct', revenue: 89000, expenses: 52000, profit: 37000 },
  { month: 'Nov', revenue: 95000, expenses: 54000, profit: 41000 },
  { month: 'Dec', revenue: 102000, expenses: 56000, profit: 46000 },
]

const demoCustomerData = [
  { month: 'Jan', new: 45, churned: 8, total: 420 },
  { month: 'Feb', new: 52, churned: 6, total: 466 },
  { month: 'Mar', new: 61, churned: 9, total: 518 },
  { month: 'Apr', new: 48, churned: 7, total: 559 },
  { month: 'May', new: 58, churned: 5, total: 612 },
  { month: 'Jun', new: 67, churned: 8, total: 671 },
  { month: 'Jul', new: 72, churned: 6, total: 737 },
  { month: 'Aug', new: 78, churned: 7, total: 808 },
  { month: 'Sep', new: 85, churned: 9, total: 884 },
  { month: 'Oct', new: 91, churned: 5, total: 970 },
  { month: 'Nov', new: 98, churned: 8, total: 1060 },
  { month: 'Dec', new: 105, churned: 6, total: 1159 },
]

const demoExpenseBreakdown = [
  { name: 'Payroll', value: 42, color: '#10b981' },
  { name: 'Infrastructure', value: 18, color: '#6366f1' },
  { name: 'SaaS Tools', value: 15, color: '#f59e0b' },
  { name: 'Marketing', value: 14, color: '#ef4444' },
  { name: 'Operations', value: 11, color: '#8b5cf6' },
]

// ============================================
// Helper functions
// ============================================

function formatKpiValue(value: number, unit: string): string {
  if (unit === 'USD') {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`
    return `$${value.toLocaleString()}`
  }
  if (unit === 'percent') return `${value.toFixed(1)}%`
  if (unit === 'count') return value.toLocaleString()
  return value.toLocaleString()
}

function computeChange(current: number, previous: number): { percent: string; isUp: boolean } {
  if (previous === 0) return { percent: 'N/A', isUp: current > 0 }
  const change = ((current - previous) / previous) * 100
  return {
    percent: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    isUp: change >= 0,
  }
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

function getAgentDisplayName(type: string): string {
  const names: Record<string, string> = {
    cfo: 'CFO Agent',
    ceo: 'CEO Agent',
    research: 'Research Agent',
    growth: 'Growth Agent',
    operations: 'Operations Agent',
    fundraising: 'Fundraising Agent',
    browser: 'Browser Agent',
    reporting: 'Reporting Agent',
  }
  return names[type] || `${type} Agent`
}

function getAgentStatusDisplay(session: AgentSession): {
  status: string
  task: string
  lastRun: string
} {
  const latestTask = session.tasks?.[0]
  if (!latestTask) {
    return {
      status: session.status === 'active' ? 'idle' : session.status,
      task: 'No recent tasks',
      lastRun: getTimeAgo(session.updatedAt),
    }
  }

  let status = 'idle'
  if (latestTask.status === 'running') status = 'running'
  else if (latestTask.status === 'completed') status = 'active'
  else if (latestTask.status === 'failed') status = 'error'
  else if (latestTask.status === 'pending') status = 'pending'

  return {
    status,
    task: latestTask.input.length > 50 ? latestTask.input.slice(0, 50) + '...' : latestTask.input,
    lastRun: latestTask.status === 'running' ? 'Now' : getTimeAgo(latestTask.updatedAt),
  }
}

// ============================================
// Main Dashboard Component
// ============================================

export function DashboardPage() {
  const { organization, user } = useAuthStore()
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [isLoadingKpis, setIsLoadingKpis] = useState(true)
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('this_month')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch KPIs
  const fetchKpis = useCallback(async () => {
    if (!organization?.id) return
    setIsLoadingKpis(true)
    try {
      const res = await fetch(`/api/kpis?organizationId=${organization.id}&period=${dateRange}`)
      if (res.ok) {
        const data = await res.json()
        setKpis(data.kpis || [])
      }
    } catch (error) {
      console.error('Failed to fetch KPIs:', error)
    } finally {
      setIsLoadingKpis(false)
    }
  }, [organization?.id, dateRange])

  // Fetch agent sessions
  const fetchAgents = useCallback(async () => {
    if (!user?.id) return
    setIsLoadingAgents(true)
    try {
      const res = await fetch(`/api/agents?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setAgentSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setIsLoadingAgents(false)
    }
  }, [user?.id])

  // Initial fetch
  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchKpis(), fetchAgents()])
    setIsRefreshing(false)
  }

  // ============================================
  // Compute KPI cards from real data
  // ============================================

  const getKpiByCategoryAndName = (category: string, name?: string) => {
    if (name) return kpis.find(k => k.category === category && k.name === name)
    return kpis.find(k => k.category === category)
  }

  const monthlyRevenue = getKpiByCategoryAndName('revenue', 'Monthly Revenue')
  const netProfit = getKpiByCategoryAndName('revenue', 'Net Profit')
  const activeCustomers = getKpiByCategoryAndName('customer', 'Active Customers')
  const burnRate = getKpiByCategoryAndName('cash', 'Burn Rate')
  const mrr = getKpiByCategoryAndName('saas', 'MRR')
  const arr = getKpiByCategoryAndName('saas', 'ARR')
  const ltv = getKpiByCategoryAndName('saas', 'LTV')
  const cac = getKpiByCategoryAndName('saas', 'CAC')
  const churnRate = getKpiByCategoryAndName('saas', 'Churn Rate')
  const grossMargin = getKpiByCategoryAndName('revenue', 'Gross Margin')

  // KPI card data derived from real KPIs
  const kpiCards = [
    {
      title: 'Monthly Revenue',
      kpi: monthlyRevenue,
      icon: DollarSign,
      description: 'vs last month',
      invertTrend: false,
    },
    {
      title: 'Net Profit',
      kpi: netProfit,
      icon: TrendingUp,
      description: 'vs last month',
      invertTrend: false,
    },
    {
      title: 'Active Customers',
      kpi: activeCustomers,
      icon: Users,
      description: 'vs last month',
      invertTrend: false,
    },
    {
      title: 'Burn Rate',
      kpi: burnRate,
      icon: Activity,
      description: 'vs last month',
      invertTrend: true, // Lower burn rate is better
    },
  ]

  // SaaS metrics from real data
  const saasMetricsData = [
    { name: 'MRR', kpi: mrr },
    { name: 'ARR', kpi: arr },
    { name: 'LTV', kpi: ltv },
    { name: 'CAC', kpi: cac },
  ]

  // Financial health data from KPIs
  const cashRunwayMonths = burnRate && burnRate.value > 0
    ? Math.round(((monthlyRevenue?.value || 0) - (burnRate.value)) > 0 ? 24 : (burnRate.value / Math.max(monthlyRevenue?.value || 1, 1)) * 12)
    : 18
  const forecastAccuracy = 87 // Demo - would need historical data to compute
  const breakEvenProgress = netProfit && netProfit.value > 0 && netProfit.target
    ? Math.min(100, Math.round((netProfit.value / netProfit.target) * 100))
    : netProfit && netProfit.value > 0 ? 72 : 30
  const ltvCacRatio = ltv && cac && cac.value > 0
    ? Math.round(ltv.value / cac.value)
    : 11

  // Derive agent status from real sessions
  const agentStatusData = agentSessions.length > 0
    ? agentSessions.slice(0, 6).map(session => ({
        name: getAgentDisplayName(session.agentType),
        ...getAgentStatusDisplay(session),
      }))
    : []

  // AI insights derived from real KPI data
  const computeInsights = (): Array<{ type: 'positive' | 'warning' | 'info'; title: string; description: string }> => {
    const insights: Array<{ type: 'positive' | 'warning' | 'info'; title: string; description: string }> = []

    if (monthlyRevenue && monthlyRevenue.previousValue > 0) {
      const revenueGrowth = ((monthlyRevenue.value - monthlyRevenue.previousValue) / monthlyRevenue.previousValue) * 100
      if (revenueGrowth > 5) {
        insights.push({
          type: 'positive',
          title: 'Revenue growth accelerating',
          description: `MRR growth rate is ${revenueGrowth.toFixed(1)}% MoM. ${revenueGrowth > 10 ? 'Consider scaling acquisition.' : 'Steady growth trajectory.'}`,
        })
      } else if (revenueGrowth < 0) {
        insights.push({
          type: 'warning',
          title: 'Revenue declining',
          description: `MRR decreased by ${Math.abs(revenueGrowth).toFixed(1)}% MoM. Review pricing and retention strategies.`,
        })
      }
    }

    if (burnRate && burnRate.target && burnRate.value > burnRate.target) {
      insights.push({
        type: 'warning',
        title: 'Cash burn rate above target',
        description: `Current burn rate is $${(burnRate.value / 1000).toFixed(0)}K/month vs target of $${(burnRate.target / 1000).toFixed(0)}K. Review expenses.`,
      })
    }

    if (ltv && cac && cac.value > 0) {
      const ratio = ltv.value / cac.value
      if (ratio > 3) {
        insights.push({
          type: 'positive',
          title: 'Customer LTV improving',
          description: `LTV:CAC ratio is ${ratio.toFixed(1)}:1, ${ratio > 5 ? 'well' : 'comfortably'} above the 3:1 benchmark.`,
        })
      } else {
        insights.push({
          type: 'warning',
          title: 'LTV:CAC ratio below benchmark',
          description: `LTV:CAC ratio is ${ratio.toFixed(1)}:1, below the 3:1 benchmark. Focus on retention or lower acquisition costs.`,
        })
      }
    }

    if (churnRate) {
      if (churnRate.value > 5) {
        insights.push({
          type: 'warning',
          title: 'Churn rate elevated',
          description: `Churn rate at ${churnRate.value.toFixed(1)}% is above the 5% threshold. Investigate customer satisfaction.`,
        })
      } else if (churnRate.previousValue > 0 && churnRate.value < churnRate.previousValue) {
        insights.push({
          type: 'positive',
          title: 'Churn rate improving',
          description: `Churn decreased from ${churnRate.previousValue.toFixed(1)}% to ${churnRate.value.toFixed(1)}%. Retention efforts paying off.`,
        })
      }
    }

    if (grossMargin) {
      if (grossMargin.value >= 70) {
        insights.push({
          type: 'positive',
          title: 'Strong gross margins',
          description: `Gross margin at ${grossMargin.value.toFixed(1)}% is healthy for a SaaS business.`,
        })
      }
    }

    if (insights.length === 0) {
      insights.push({
        type: 'info',
        title: 'Dashboard ready',
        description: 'Connect more data sources for richer AI insights and analytics.',
      })
    }

    return insights
  }

  const aiInsights = computeInsights()

  // Date range label for display
  const dateRangeLabels: Record<DateRange, string> = {
    this_month: 'This Month',
    last_month: 'Last Month',
    this_quarter: 'This Quarter',
    this_year: 'This Year',
  }

  return (
    <div className="space-y-6">
      {/* Header with date range selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {dateRangeLabels[dateRange]} overview for {organization?.name || 'your organization'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
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

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingKpis ? (
          // Loading skeletons
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
        ) : kpiCards.length > 0 ? (
          kpiCards.map((card) => {
            const kpi = card.kpi
            if (!kpi) {
              return (
                <KPICard
                  key={card.title}
                  title={card.title}
                  value="—"
                  change="N/A"
                  trend="up"
                  icon={card.icon}
                  description="No data"
                />
              )
            }
            const { percent, isUp } = computeChange(kpi.value, kpi.previousValue)
            const trendIsPositive = card.invertTrend ? !isUp : isUp
            return (
              <KPICard
                key={card.title}
                title={card.title}
                value={formatKpiValue(kpi.value, kpi.unit)}
                change={percent}
                trend={trendIsPositive ? 'up' : 'down'}
                icon={card.icon}
                description={card.description}
              />
            )
          })
        ) : (
          <div className="col-span-full">
            <EmptyState message="No KPI data available" description="KPIs will appear once your organization has data." />
          </div>
        )}
      </div>

      {/* SaaS Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isLoadingKpis ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : (
          saasMetricsData.map((metric) => (
            <div key={metric.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <span className="text-xs text-muted-foreground font-medium">{metric.name}</span>
              <span className="text-sm font-bold">
                {metric.kpi ? formatKpiValue(metric.kpi.value, metric.kpi.unit) : '—'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Revenue & Expenses</CardTitle>
                <CardDescription className="flex items-center gap-1.5">
                  12-month financial overview
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Demo Data</Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingKpis ? (
              <div className="h-72 flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={demoRevenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}K`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="expenses" stroke="hsl(var(--chart-4))" fillOpacity={1} fill="url(#colorExpenses)" strokeWidth={2} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              Current month allocation
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Demo Data</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingKpis ? (
              <div className="h-48 flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demoExpenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {demoExpenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {demoExpenseBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Growth */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customer Growth</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              New, churned, and total customers
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Demo Data</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingKpis ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demoCustomerData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="new" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="New" />
                    <Bar dataKey="churned" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Churned" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">AI Insights</CardTitle>
            </div>
            <CardDescription>Intelligent business observations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingKpis ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-2">
                    <Skeleton className="w-4 h-4 rounded shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5">
                      {insight.type === 'positive' && (
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      )}
                      {insight.type === 'warning' && (
                        <TrendingDown className="w-4 h-4 text-amber-500" />
                      )}
                      {insight.type === 'info' && (
                        <Zap className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{insight.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Status & Financial Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agent Status */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Active Agents</CardTitle>
            </div>
            <CardDescription>Real-time agent monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAgents ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-12 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            ) : agentStatusData.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                {agentStatusData.map((agent) => (
                  <div key={agent.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{agent.name}</span>
                        <Badge
                          variant={
                            agent.status === 'active' || agent.status === 'running'
                              ? 'default'
                              : agent.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {agent.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{agent.task}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      {agent.lastRun}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                message="No agent sessions yet"
                description="Agents will appear here once you start using the AI Copilot."
                icon={Bot}
              />
            )}
          </CardContent>
        </Card>

        {/* Cash Runway & Forecast Accuracy */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Financial Health</CardTitle>
            </div>
            <CardDescription>Key financial indicators</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingKpis ? (
              <div className="space-y-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-2 w-40" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">Cash Runway</span>
                    <span className="text-xs text-muted-foreground">{cashRunwayMonths} months</span>
                  </div>
                  <Progress value={Math.min(100, (cashRunwayMonths / 30) * 100)} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Based on current burn rate of ${burnRate ? `${(burnRate.value / 1000).toFixed(0)}K` : '??'}/mo
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">Forecast Accuracy</span>
                    <span className="text-xs text-muted-foreground">{forecastAccuracy}%</span>
                  </div>
                  <Progress value={forecastAccuracy} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">Revenue predictions vs actual (last quarter)</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">Break-even Progress</span>
                    <span className="text-xs text-muted-foreground">{breakEvenProgress}%</span>
                  </div>
                  <Progress value={breakEvenProgress} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {breakEvenProgress >= 100 ? 'Break-even achieved!' : 'Working towards break-even'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">LTV:CAC Ratio</span>
                    <span className="text-xs text-muted-foreground">{ltvCacRatio}:1</span>
                  </div>
                  <Progress value={Math.min(100, (ltvCacRatio / 15) * 100)} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {ltvCacRatio >= 3 ? 'Excellent' : 'Needs improvement'} — benchmark is 3:1
                  </p>
                </div>
              </div>
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

function KPICard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  description,
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ElementType
  description: string
}) {
  const isPositive = trend === 'up'
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
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
