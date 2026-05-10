'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
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
  BarChart3,
  Clock,
  RefreshCw,
  Bot,
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

const revenueData = [
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

const saasMetrics = [
  { name: 'MRR', value: '$102K' },
  { name: 'ARR', value: '$1.22M' },
  { name: 'LTV', value: '$4,200' },
  { name: 'CAC', value: '$380' },
]

const customerData = [
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

const expenseBreakdown = [
  { name: 'Payroll', value: 42, color: '#10b981' },
  { name: 'Infrastructure', value: 18, color: '#6366f1' },
  { name: 'SaaS Tools', value: 15, color: '#f59e0b' },
  { name: 'Marketing', value: 14, color: '#ef4444' },
  { name: 'Operations', value: 11, color: '#8b5cf6' },
]

const aiInsights = [
  { type: 'positive', title: 'Revenue growth accelerating', description: 'MRR growth rate increased from 8% to 12% MoM. Consider scaling acquisition.' },
  { type: 'warning', title: 'Cash burn rate above target', description: 'Current burn rate is $56K/month vs target of $45K. Review marketing spend.' },
  { type: 'positive', title: 'Customer LTV improving', description: 'LTV:CAC ratio improved to 11:1, well above the 3:1 benchmark.' },
  { type: 'info', title: 'Forecast updated', description: 'Q2 2026 projections suggest break-even by month 18.' },
]

const agentStatus = [
  { name: 'CFO Agent', status: 'active', task: 'Analyzing cash flow trends', lastRun: '2 min ago' },
  { name: 'Research Agent', status: 'active', task: 'Monitoring competitor pricing', lastRun: '15 min ago' },
  { name: 'Growth Agent', status: 'idle', task: 'Waiting for data refresh', lastRun: '1 hr ago' },
  { name: 'Reporting Agent', status: 'running', task: 'Generating weekly KPI report', lastRun: 'Now' },
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Monthly Revenue"
          value="$102,000"
          change="+12.3%"
          trend="up"
          icon={DollarSign}
          description="vs last month"
        />
        <KPICard
          title="Net Profit"
          value="$46,000"
          change="+18.2%"
          trend="up"
          icon={TrendingUp}
          description="vs last month"
        />
        <KPICard
          title="Active Customers"
          value="1,159"
          change="+8.7%"
          trend="up"
          icon={Users}
          description="vs last month"
        />
        <KPICard
          title="Burn Rate"
          value="$56,000"
          change="+3.1%"
          trend="down"
          icon={Activity}
          description="vs last month"
        />
      </div>

      {/* SaaS Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {saasMetrics.map((metric) => (
          <div key={metric.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <span className="text-xs text-muted-foreground font-medium">{metric.name}</span>
            <span className="text-sm font-bold">{metric.value}</span>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Revenue & Expenses</CardTitle>
                <CardDescription>12-month financial overview</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8">
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
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
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
            <CardDescription>Current month allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {expenseBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Growth */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customer Growth</CardTitle>
            <CardDescription>New, churned, and total customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerData}>
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
          </CardContent>
        </Card>
      </div>

      {/* Agent Status & Cash Runway */}
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
            <div className="space-y-3">
              {agentStatus.map((agent) => (
                <div key={agent.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{agent.name}</span>
                      <Badge
                        variant={agent.status === 'active' ? 'default' : agent.status === 'running' ? 'default' : 'secondary'}
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
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">Cash Runway</span>
                  <span className="text-xs text-muted-foreground">18 months</span>
                </div>
                <Progress value={60} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">Based on current burn rate of $56K/mo</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">Forecast Accuracy</span>
                  <span className="text-xs text-muted-foreground">87%</span>
                </div>
                <Progress value={87} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">Revenue predictions vs actual (last quarter)</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">Break-even Progress</span>
                  <span className="text-xs text-muted-foreground">72%</span>
                </div>
                <Progress value={72} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">Expected to reach break-even by month 18</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">LTV:CAC Ratio</span>
                  <span className="text-xs text-muted-foreground">11:1</span>
                </div>
                <Progress value={85} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">Excellent — benchmark is 3:1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

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
