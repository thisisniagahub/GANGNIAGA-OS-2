'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Upload,
  Link2,
  Unlink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Zap,
  Activity,
  Shield,
  Loader2,
  BarChart3,
  Target,
  Wallet,
  Flame,
  Bell,
  BellOff,
  ExternalLink,
  Clock,
  X,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type ActualsTab = 'dashboard' | 'variance' | 'integrations' | 'alerts'
type AlertSeverity = 'info' | 'warning' | 'critical'
type AlertLevel = 'on_track' | 'warning' | 'critical' | 'exceeded'
type HealthStatus = 'healthy' | 'attention' | 'critical'

interface ActualFinancial {
  id: string
  period: string
  source: string
  revenue: number
  cogs: number
  grossProfit: number
  operatingExpenses: number
  netIncome: number
  cashFlow: number
  cashBalance: number
  burnRate: number
  runway: number
  importedAt: string
}

interface VarianceResult {
  id: string
  organizationId: string
  forecastId: string | null
  period: string
  metric: string
  forecastValue: number
  actualValue: number
  variance: number
  variancePercent: number
  alertLevel: AlertLevel
  analysis: string | null
}

interface AlertResult {
  id: string
  organizationId: string
  type: string
  metric: string
  message: string
  severity: AlertSeverity
  period: string | null
  data: Record<string, unknown>
  dismissed: boolean
  createdAt: string
}

interface AccountingConnection {
  id: string
  provider: string
  status: string
  companyName: string | null
  lastSyncAt: string | null
  syncFrequency: string
}

interface DashboardData {
  actuals: ActualFinancial[]
  variances: VarianceResult[]
  alerts: AlertResult[]
  summary: {
    totalPeriods: number
    avgRevenueVariance: number
    avgExpenseVariance: number
    avgCashFlowVariance: number
    onTrackCount: number
    warningCount: number
    criticalCount: number
    exceededCount: number
    overallHealth: HealthStatus
  }
  connections: AccountingConnection[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHART_COLORS = {
  forecast: '#64748b',
  actual: '#10b981',
  revenue: '#10b981',
  expenses: '#f43f5e',
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#64748b',
}

const HEALTH_COLORS: Record<HealthStatus, string> = {
  healthy: '#10b981',
  attention: '#f59e0b',
  critical: '#ef4444',
}

const ALERT_LEVEL_COLORS: Record<AlertLevel, string> = {
  on_track: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  exceeded: '#7f1d1d',
}

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; text: string; icon: React.ElementType }> = {
  info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: Info },
  warning: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: AlertTriangle },
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: XCircle },
}

const METRIC_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  cogs: 'COGS',
  gross_profit: 'Gross Profit',
  operating_expenses: 'Operating Expenses',
  net_income: 'Net Income',
  cash_flow: 'Cash Flow',
  burn_rate: 'Burn Rate',
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  revenue_tracking: 'Revenue Tracking',
  expense_drift: 'Expense Drift',
  cash_warning: 'Cash Warning',
  hiring_affordability: 'Hiring Affordability',
  milestone: 'Milestone',
  variance_threshold: 'Variance Threshold',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatVariance(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatCurrency(value)}`
}

function formatVariancePercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function formatPeriod(period: string): string {
  const parts = period.split('-')
  if (parts.length === 2) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthIdx = parseInt(parts[1]) - 1
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} ${parts[0]}`
    }
  }
  return period
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getAlertLevelBadge(level: AlertLevel) {
  const styles: Record<AlertLevel, { bg: string; text: string }> = {
    on_track: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
    warning: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    exceeded: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
  }
  const labels: Record<AlertLevel, string> = {
    on_track: 'On Track',
    warning: 'Warning',
    critical: 'Critical',
    exceeded: 'Exceeded',
  }
  return { ...styles[level], label: labels[level] }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActualsPage() {
  const { organization } = useAuthStore()

  // Data state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActualsTab>('dashboard')

  // Sync state
  const [syncingQB, setSyncingQB] = useState(false)
  const [syncingXero, setSyncingXero] = useState(false)

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importForm, setImportForm] = useState({
    period: '',
    revenue: '',
    operatingExpenses: '',
    netIncome: '',
    cashFlow: '',
    cashBalance: '',
  })

  // CSV import state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [isCsvImporting, setIsCsvImporting] = useState(false)
  const [csvData, setCsvData] = useState('')

  // Variance filters
  const [variancePeriodFilter, setVariancePeriodFilter] = useState<string>('all')
  const [varianceMetricFilter, setVarianceMetricFilter] = useState<string>('all')
  const [varianceAlertFilter, setVarianceAlertFilter] = useState<string>('all')
  const [expandedVariance, setExpandedVariance] = useState<string | null>(null)

  // Alert filters
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>('all')
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>('all')
  const [showDismissedAlerts, setShowDismissedAlerts] = useState(false)

  // ─── Fetch Dashboard Data ──────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    if (!organization?.id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/actuals?organizationId=${organization.id}`)
      if (res.ok) {
        const data = await res.json()
        setDashboardData(data)
      } else {
        toast.error('Failed to fetch actuals data')
      }
    } catch {
      toast.error('Failed to fetch actuals data')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ─── Sync Handlers ─────────────────────────────────────────────────────

  const handleSyncQuickBooks = useCallback(async () => {
    if (!organization?.id) return
    setSyncingQB(true)
    try {
      const res = await fetch('/api/actuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, action: 'sync_quickbooks' }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || 'QuickBooks sync complete')
        await fetchDashboard()
      } else {
        const data = await res.json()
        toast.error(data.error || 'QuickBooks sync failed')
      }
    } catch {
      toast.error('QuickBooks sync failed')
    } finally {
      setSyncingQB(false)
    }
  }, [organization?.id, fetchDashboard])

  const handleSyncXero = useCallback(async () => {
    if (!organization?.id) return
    setSyncingXero(true)
    try {
      const res = await fetch('/api/actuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, action: 'sync_xero' }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || 'Xero sync complete')
        await fetchDashboard()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Xero sync failed')
      }
    } catch {
      toast.error('Xero sync failed')
    } finally {
      setSyncingXero(false)
    }
  }, [organization?.id, fetchDashboard])

  // ─── Manual Import ─────────────────────────────────────────────────────

  const handleManualImport = useCallback(async () => {
    if (!organization?.id || !importForm.period) {
      toast.error('Period is required')
      return
    }
    setIsImporting(true)
    try {
      const res = await fetch('/api/actuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          action: 'import',
          data: {
            period: importForm.period,
            revenue: parseFloat(importForm.revenue) || 0,
            operatingExpenses: parseFloat(importForm.operatingExpenses) || 0,
            netIncome: parseFloat(importForm.netIncome) || 0,
            cashFlow: parseFloat(importForm.cashFlow) || 0,
            cashBalance: parseFloat(importForm.cashBalance) || 0,
          },
        }),
      })
      if (res.ok) {
        toast.success('Actuals imported successfully')
        setImportDialogOpen(false)
        setImportForm({ period: '', revenue: '', operatingExpenses: '', netIncome: '', cashFlow: '', cashBalance: '' })
        await fetchDashboard()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Import failed')
      }
    } catch {
      toast.error('Import failed')
    } finally {
      setIsImporting(false)
    }
  }, [organization?.id, importForm, fetchDashboard])

  // ─── CSV Import ────────────────────────────────────────────────────────

  const handleCsvImport = useCallback(async () => {
    if (!organization?.id || !csvData.trim()) {
      toast.error('CSV data is required')
      return
    }
    setIsCsvImporting(true)
    try {
      const lines = csvData.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      let imported = 0

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = values[idx] || '' })

        if (!row['period']) continue

        const res = await fetch('/api/actuals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: organization.id,
            action: 'import',
            data: {
              period: row['period'],
              revenue: parseFloat(row['revenue']) || 0,
              operatingExpenses: parseFloat(row['operating_expenses'] || row['expenses']) || 0,
              netIncome: parseFloat(row['net_income'] || row['netincome']) || 0,
              cashFlow: parseFloat(row['cash_flow'] || row['cashflow']) || 0,
              cashBalance: parseFloat(row['cash_balance'] || row['cashbalance']) || 0,
            },
          }),
        })
        if (res.ok) imported++
      }

      toast.success(`Imported ${imported} period(s) from CSV`)
      setCsvDialogOpen(false)
      setCsvData('')
      await fetchDashboard()
    } catch {
      toast.error('CSV import failed')
    } finally {
      setIsCsvImporting(false)
    }
  }, [organization?.id, csvData, fetchDashboard])

  // ─── Dismiss Alert ─────────────────────────────────────────────────────

  const handleDismissAlert = useCallback(async (alertId: string) => {
    try {
      const res = await fetch(`/api/actuals/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionTaken: 'Dismissed by user' }),
      })
      if (res.ok) {
        toast.success('Alert dismissed')
        await fetchDashboard()
      } else {
        toast.error('Failed to dismiss alert')
      }
    } catch {
      toast.error('Failed to dismiss alert')
    }
  }, [fetchDashboard])

  // ─── Compute Variance ──────────────────────────────────────────────────

  const handleComputeVariances = useCallback(async () => {
    if (!organization?.id) return
    try {
      const res = await fetch('/api/actuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, action: 'compute_variances' }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || 'Variances computed')
        await fetchDashboard()
      } else {
        toast.error('Failed to compute variances')
      }
    } catch {
      toast.error('Failed to compute variances')
    }
  }, [organization?.id, fetchDashboard])

  // ─── Export CSV ────────────────────────────────────────────────────────

  const handleExportCsv = useCallback(() => {
    if (!dashboardData?.variances) return
    const headers = ['Period', 'Metric', 'Forecast', 'Actual', 'Variance ($)', 'Variance (%)', 'Alert Level', 'Analysis']
    const rows = dashboardData.variances.map(v => [
      v.period,
      METRIC_LABELS[v.metric] || v.metric,
      v.forecastValue.toFixed(2),
      v.actualValue.toFixed(2),
      v.variance.toFixed(2),
      v.variancePercent.toFixed(2),
      v.alertLevel,
      (v.analysis || '').replace(/,/g, ';'),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `variances-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }, [dashboardData?.variances])

  // ─── Computed Data ─────────────────────────────────────────────────────

  const kpiCards = useMemo(() => {
    if (!dashboardData) return []
    const actuals = dashboardData.actuals
    const variances = dashboardData.variances

    const latestActual = actuals[0]
    const latestRevenueVariance = variances.find(v => v.metric === 'revenue')
    const latestExpenseVariance = variances.find(v => v.metric === 'operating_expenses')
    const latestCashFlowVariance = variances.find(v => v.metric === 'cash_flow')
    const latestBurnRateVariance = variances.find(v => v.metric === 'burn_rate')

    return [
      {
        title: 'Revenue Tracking',
        forecast: latestRevenueVariance?.forecastValue ?? 0,
        actual: latestRevenueVariance?.actualValue ?? latestActual?.revenue ?? 0,
        variance: latestRevenueVariance?.variance ?? 0,
        variancePercent: latestRevenueVariance?.variancePercent ?? 0,
        alertLevel: latestRevenueVariance?.alertLevel ?? 'on_track' as AlertLevel,
        icon: DollarSign,
      },
      {
        title: 'Expense Status',
        forecast: latestExpenseVariance?.forecastValue ?? 0,
        actual: latestExpenseVariance?.actualValue ?? latestActual?.operatingExpenses ?? 0,
        variance: latestExpenseVariance?.variance ?? 0,
        variancePercent: latestExpenseVariance?.variancePercent ?? 0,
        alertLevel: latestExpenseVariance?.alertLevel ?? 'on_track' as AlertLevel,
        icon: TrendingDown,
      },
      {
        title: 'Cash Position',
        forecast: latestCashFlowVariance?.forecastValue ?? 0,
        actual: latestCashFlowVariance?.actualValue ?? latestActual?.cashBalance ?? 0,
        variance: latestCashFlowVariance?.variance ?? 0,
        variancePercent: latestCashFlowVariance?.variancePercent ?? 0,
        alertLevel: latestCashFlowVariance?.alertLevel ?? 'on_track' as AlertLevel,
        icon: Wallet,
      },
      {
        title: 'Burn Rate',
        forecast: latestBurnRateVariance?.forecastValue ?? 0,
        actual: latestBurnRateVariance?.actualValue ?? latestActual?.burnRate ?? 0,
        variance: latestBurnRateVariance?.variance ?? 0,
        variancePercent: latestBurnRateVariance?.variancePercent ?? 0,
        alertLevel: latestBurnRateVariance?.alertLevel ?? 'on_track' as AlertLevel,
        icon: Flame,
      },
    ]
  }, [dashboardData])

  const planVsActualsChartData = useMemo(() => {
    if (!dashboardData?.actuals) return []
    const revenueVariances = dashboardData.variances.filter(v => v.metric === 'revenue')
    const expenseVariances = dashboardData.variances.filter(v => v.metric === 'operating_expenses')

    const periods = [...new Set([
      ...revenueVariances.map(v => v.period),
      ...expenseVariances.map(v => v.period),
    ])].sort()

    return periods.map(period => {
      const revVar = revenueVariances.find(v => v.period === period)
      const expVar = expenseVariances.find(v => v.period === period)
      return {
        period: formatPeriod(period),
        revenueForecast: revVar?.forecastValue ?? 0,
        revenueActual: revVar?.actualValue ?? 0,
        expenseForecast: expVar?.forecastValue ?? 0,
        expenseActual: expVar?.actualValue ?? 0,
      }
    })
  }, [dashboardData])

  const varianceTrendData = useMemo(() => {
    if (!dashboardData?.variances) return []
    const metrics = ['revenue', 'operating_expenses', 'net_income', 'cash_flow'] as const
    const periods = [...new Set(dashboardData.variances.map(v => v.period))].sort()

    return periods.map(period => {
      const entry: Record<string, string | number> = { period: formatPeriod(period) }
      metrics.forEach(metric => {
        const v = dashboardData.variances.find(v => v.period === period && v.metric === metric)
        entry[metric] = v ? Math.round(v.variancePercent * 10) / 10 : 0
      })
      return entry
    })
  }, [dashboardData])

  const healthScore = useMemo(() => {
    if (!dashboardData?.summary) return 0
    const { onTrackCount, warningCount, criticalCount, exceededCount, totalPeriods } = dashboardData.summary
    if (totalPeriods === 0) return 0
    const total = onTrackCount + warningCount + criticalCount + exceededCount
    if (total === 0) return 50
    const score = (onTrackCount * 100 + warningCount * 60 + criticalCount * 25 + exceededCount * 0) / total
    return Math.round(score)
  }, [dashboardData])

  const filteredVariances = useMemo(() => {
    if (!dashboardData?.variances) return []
    return dashboardData.variances.filter(v => {
      if (variancePeriodFilter !== 'all' && v.period !== variancePeriodFilter) return false
      if (varianceMetricFilter !== 'all' && v.metric !== varianceMetricFilter) return false
      if (varianceAlertFilter !== 'all' && v.alertLevel !== varianceAlertFilter) return false
      return true
    })
  }, [dashboardData?.variances, variancePeriodFilter, varianceMetricFilter, varianceAlertFilter])

  const filteredAlerts = useMemo(() => {
    if (!dashboardData?.alerts) return []
    return dashboardData.alerts.filter(a => {
      if (!showDismissedAlerts && a.dismissed) return false
      if (alertSeverityFilter !== 'all' && a.severity !== alertSeverityFilter) return false
      if (alertTypeFilter !== 'all' && a.type !== alertTypeFilter) return false
      return true
    })
  }, [dashboardData?.alerts, alertSeverityFilter, alertTypeFilter, showDismissedAlerts])

  const qbConnection = dashboardData?.connections?.find(c => c.provider === 'quickbooks')
  const xeroConnection = dashboardData?.connections?.find(c => c.provider === 'xero')

  const variancePeriods = useMemo(() => {
    if (!dashboardData?.variances) return []
    return [...new Set(dashboardData.variances.map(v => v.period))].sort()
  }, [dashboardData?.variances])

  const varianceMetrics = useMemo(() => {
    if (!dashboardData?.variances) return []
    return [...new Set(dashboardData.variances.map(v => v.metric))]
  }, [dashboardData?.variances])

  const chartTooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  }

  // ─── Loading State ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  // ─── Empty State ───────────────────────────────────────────────────────

  const hasData = dashboardData && (dashboardData.actuals.length > 0 || dashboardData.variances.length > 0)

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Plan vs Actuals Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {organization?.name ?? 'Your Organization'} · Live financial tracking
            {dashboardData?.summary?.overallHealth && (
              <Badge
                variant="outline"
                className="ml-2 text-[10px]"
                style={{
                  borderColor: HEALTH_COLORS[dashboardData.summary.overallHealth],
                  color: HEALTH_COLORS[dashboardData.summary.overallHealth],
                }}
              >
                {dashboardData.summary.overallHealth.toUpperCase()}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleComputeVariances} className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Compute Variances
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDashboard} className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActualsTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
            <Activity className="w-3 h-3 mr-1 hidden sm:inline" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="variance" className="text-xs sm:text-sm">
            <BarChart3 className="w-3 h-3 mr-1 hidden sm:inline" />
            Variance
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm">
            <Link2 className="w-3 h-3 mr-1 hidden sm:inline" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs sm:text-sm">
            <Bell className="w-3 h-3 mr-1 hidden sm:inline" />
            Alerts
            {dashboardData?.alerts?.filter(a => !a.dismissed).length ? (
              <Badge variant="destructive" className="ml-1 h-4 min-w-4 text-[10px] px-1">
                {dashboardData.alerts.filter(a => !a.dismissed).length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Dashboard ═══════════════════════════════════════════ */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {!hasData ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Target className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Actuals Data Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Import your financial actuals from QuickBooks, Xero, or manually to start tracking plan vs actuals performance.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleSyncQuickBooks} disabled={syncingQB}>
                    {syncingQB ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Sync QuickBooks
                  </Button>
                  <Button variant="outline" onClick={handleSyncXero} disabled={syncingXero}>
                    {syncingXero ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Sync Xero
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((kpi, idx) => {
                  const isPositive = kpi.variance >= 0
                  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight
                  const alertBadge = getAlertLevelBadge(kpi.alertLevel)

                  return (
                    <Card key={idx} className="relative overflow-hidden">
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: ALERT_LEVEL_COLORS[kpi.alertLevel] }}
                      />
                      <CardHeader className="pb-2 pt-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                          <div className={`p-1.5 rounded-lg ${alertBadge.bg}`}>
                            <kpi.icon className={`w-4 h-4 ${alertBadge.text}`} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{formatCurrency(kpi.actual)}</span>
                          <span className="text-xs text-muted-foreground">actual</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground">vs forecast:</span>
                          <span className={kpi.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {formatVariance(kpi.variance)}
                          </span>
                          <span className={`flex items-center gap-0.5 font-medium ${kpi.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            <TrendIcon className="w-3 h-3" />
                            {formatVariancePercent(kpi.variancePercent)}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${alertBadge.bg} ${alertBadge.text} border-0`}
                        >
                          {alertBadge.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Plan vs Actuals Grouped Bar Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Plan vs Actuals</CardTitle>
                    <CardDescription>Revenue and expenses: forecast vs actual by period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={planVsActualsChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                          <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [formatCurrencyFull(value), '']} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="revenueForecast" name="Revenue (Forecast)" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="revenueActual" name="Revenue (Actual)" fill={CHART_COLORS.revenue} radius={[2, 2, 0, 0]} />
                          <Bar dataKey="expenseForecast" name="Expenses (Forecast)" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="expenseActual" name="Expenses (Actual)" fill={CHART_COLORS.expenses} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Variance Trend Line Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Variance Trend</CardTitle>
                    <CardDescription>Variance % over time for key metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={varianceTrendData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                          <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <ReferenceLine y={0} stroke="#64748b" strokeDasharray="5 5" />
                          <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                          <ReferenceLine y={-5} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                          <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                          <ReferenceLine y={-15} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                          <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                          <Line type="monotone" dataKey="operating_expenses" stroke={CHART_COLORS.expenses} strokeWidth={2} dot={{ r: 3 }} name="Expenses" />
                          <Line type="monotone" dataKey="net_income" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Net Income" />
                          <Line type="monotone" dataKey="cash_flow" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Cash Flow" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Health Score + Summary Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Financial Health Score Gauge */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Financial Health Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center py-4">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        <circle
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke="hsl(var(--muted))"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke={healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="8"
                          strokeDasharray={`${(healthScore / 100) * 251.2} 251.2`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{healthScore}</span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444',
                          color: healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444',
                        }}
                      >
                        {healthScore >= 80 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 40 ? 'Needs Attention' : 'Critical'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Plan adherence based on variance analysis
                    </p>
                  </CardContent>
                </Card>

                {/* Variance Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Variance Summary</CardTitle>
                    <CardDescription>Current period breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {(['on_track', 'warning', 'critical', 'exceeded'] as AlertLevel[]).map(level => {
                        const count = dashboardData?.summary?.[`${level}Count` as keyof typeof dashboardData.summary] as number || 0
                        const total = dashboardData?.summary?.onTrackCount + dashboardData?.summary?.warningCount + dashboardData?.summary?.criticalCount + dashboardData?.summary?.exceededCount || 1
                        const pct = Math.round((count / total) * 100)
                        return (
                          <div key={level} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ALERT_LEVEL_COLORS[level] }} />
                                {getAlertLevelBadge(level).label}
                              </span>
                              <span className="font-medium">{count} ({pct}%)</span>
                            </div>
                            <Progress value={pct} className="h-1.5" style={{ '--progress-color': ALERT_LEVEL_COLORS[level] } as React.CSSProperties} />
                          </div>
                        )
                      })}
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Avg Rev Variance</span>
                        <p className="font-medium">{dashboardData?.summary?.avgRevenueVariance?.toFixed(1) ?? '0.0'}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Exp Variance</span>
                        <p className="font-medium">{dashboardData?.summary?.avgExpenseVariance?.toFixed(1) ?? '0.0'}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg CF Variance</span>
                        <p className="font-medium">{dashboardData?.summary?.avgCashFlowVariance?.toFixed(1) ?? '0.0'}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Periods</span>
                        <p className="font-medium">{dashboardData?.summary?.totalPeriods ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Actuals */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Recent Actuals</CardTitle>
                    <CardDescription>Latest imported periods</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {dashboardData?.actuals?.slice(0, 6).map(actual => (
                        <div key={actual.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{formatPeriod(actual.period)}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{actual.source}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(actual.revenue)}</p>
                            <p className="text-[10px] text-muted-foreground">NI: {formatCurrency(actual.netIncome)}</p>
                          </div>
                        </div>
                      ))}
                      {(!dashboardData?.actuals || dashboardData.actuals.length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-4">No actuals imported yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══ Tab 2: Variance Analysis ═══════════════════════════════════ */}
        <TabsContent value="variance" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Period:</Label>
                  <Select value={variancePeriodFilter} onValueChange={setVariancePeriodFilter}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="All Periods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      {variancePeriods.map(p => (
                        <SelectItem key={p} value={p}>{formatPeriod(p)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Metric:</Label>
                  <Select value={varianceMetricFilter} onValueChange={setVarianceMetricFilter}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue placeholder="All Metrics" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Metrics</SelectItem>
                      {varianceMetrics.map(m => (
                        <SelectItem key={m} value={m}>{METRIC_LABELS[m] || m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Alert:</Label>
                  <Select value={varianceAlertFilter} onValueChange={setVarianceAlertFilter}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="exceeded">Exceeded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!filteredVariances.length} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Variance Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Variance Details</CardTitle>
                  <CardDescription>{filteredVariances.length} variance records</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredVariances.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {dashboardData?.variances?.length ? 'No variances match your filters' : 'No variance data computed yet'}
                  </p>
                  {(!dashboardData?.variances || dashboardData.variances.length === 0) && (
                    <Button variant="outline" size="sm" onClick={handleComputeVariances} className="mt-3">
                      Compute Variances
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>Period</TableHead>
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Forecast</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Variance ($)</TableHead>
                        <TableHead className="text-right">Variance (%)</TableHead>
                        <TableHead>Alert Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVariances.map(v => {
                        const badge = getAlertLevelBadge(v.alertLevel)
                        const isExpanded = expandedVariance === v.id
                        return (
                          <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedVariance(isExpanded ? null : v.id)}>
                            <TableCell className="p-2">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{formatPeriod(v.period)}</TableCell>
                            <TableCell className="text-sm">{METRIC_LABELS[v.metric] || v.metric}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrencyFull(v.forecastValue)}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrencyFull(v.actualValue)}</TableCell>
                            <TableCell className={`text-right text-sm font-medium ${v.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatVariance(v.variance)}
                            </TableCell>
                            <TableCell className={`text-right text-sm font-medium ${v.variancePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatVariancePercent(v.variancePercent)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${badge.bg} ${badge.text} border-0`}>
                                {badge.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  {/* Expanded Analysis Panel */}
                  {expandedVariance && (() => {
                    const v = filteredVariances.find(v => v.id === expandedVariance)
                    if (!v) return null
                    return (
                      <div className="mt-3 p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-semibold">
                            AI Analysis: {formatPeriod(v.period)} · {METRIC_LABELS[v.metric] || v.metric}
                          </h4>
                        </div>
                        {v.analysis ? (
                          <p className="text-sm text-muted-foreground leading-relaxed">{v.analysis}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No AI analysis generated for this variance. Run &quot;Compute Variances&quot; to generate AI-powered insights for significant variances.</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Forecast</span>
                            <p className="font-medium">{formatCurrencyFull(v.forecastValue)}</p>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Actual</span>
                            <p className="font-medium">{formatCurrencyFull(v.actualValue)}</p>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Variance</span>
                            <p className={`font-medium ${v.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatVariance(v.variance)}</p>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Percentage</span>
                            <p className={`font-medium ${v.variancePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatVariancePercent(v.variancePercent)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab 3: Integrations ═════════════════════════════════════════ */}
        <TabsContent value="integrations" className="mt-4 space-y-4">
          {/* Connection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* QuickBooks Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">QB</span>
                    </div>
                    QuickBooks
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      qbConnection?.status === 'connected'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0'
                        : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-0'
                    }
                  >
                    {qbConnection?.status === 'connected' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</>
                    ) : (
                      <><Unlink className="w-3 h-3 mr-1" /> Disconnected</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {qbConnection?.companyName && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Company: </span>
                    <span className="font-medium">{qbConnection.companyName}</span>
                  </div>
                )}
                {qbConnection?.lastSyncAt && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Last Sync: </span>
                    <span className="font-medium">{getTimeAgo(qbConnection.lastSyncAt)}</span>
                  </div>
                )}
                {qbConnection?.syncFrequency && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Frequency: </span>
                    <span className="font-medium capitalize">{qbConnection.syncFrequency}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {qbConnection?.status === 'connected' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSyncQuickBooks}
                        disabled={syncingQB}
                        className="gap-1.5"
                      >
                        {syncingQB ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Sync Now
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info('Disconnect not implemented in demo mode')}>
                        <Unlink className="w-3.5 h-3.5" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={handleSyncQuickBooks} disabled={syncingQB} className="gap-1.5">
                      {syncingQB ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                      Connect QuickBooks
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Xero Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">Xe</span>
                    </div>
                    Xero
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      xeroConnection?.status === 'connected'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0'
                        : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-0'
                    }
                  >
                    {xeroConnection?.status === 'connected' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</>
                    ) : (
                      <><Unlink className="w-3 h-3 mr-1" /> Disconnected</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {xeroConnection?.companyName && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Organisation: </span>
                    <span className="font-medium">{xeroConnection.companyName}</span>
                  </div>
                )}
                {xeroConnection?.lastSyncAt && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Last Sync: </span>
                    <span className="font-medium">{getTimeAgo(xeroConnection.lastSyncAt)}</span>
                  </div>
                )}
                {xeroConnection?.syncFrequency && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Frequency: </span>
                    <span className="font-medium capitalize">{xeroConnection.syncFrequency}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {xeroConnection?.status === 'connected' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSyncXero}
                        disabled={syncingXero}
                        className="gap-1.5"
                      >
                        {syncingXero ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Sync Now
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info('Disconnect not implemented in demo mode')}>
                        <Unlink className="w-3.5 h-3.5" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={handleSyncXero} disabled={syncingXero} className="gap-1.5">
                      {syncingXero ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                      Connect Xero
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manual Import + CSV Import */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manual Import */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Manual Import
                </CardTitle>
                <CardDescription>Enter actuals for a specific period</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-1.5">
                      <Upload className="w-4 h-4" />
                      Enter Actuals Manually
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Import Actuals</DialogTitle>
                      <DialogDescription>Enter financial actuals for a specific period</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>Period</Label>
                        <Input
                          placeholder="e.g., 2025-01"
                          value={importForm.period}
                          onChange={(e) => setImportForm(f => ({ ...f, period: e.target.value }))}
                        />
                        <p className="text-[10px] text-muted-foreground">Format: YYYY-MM</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Revenue</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={importForm.revenue}
                            onChange={(e) => setImportForm(f => ({ ...f, revenue: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Operating Expenses</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={importForm.operatingExpenses}
                            onChange={(e) => setImportForm(f => ({ ...f, operatingExpenses: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Net Income</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={importForm.netIncome}
                            onChange={(e) => setImportForm(f => ({ ...f, netIncome: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cash Flow</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={importForm.cashFlow}
                            onChange={(e) => setImportForm(f => ({ ...f, cashFlow: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Cash Balance</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={importForm.cashBalance}
                            onChange={(e) => setImportForm(f => ({ ...f, cashBalance: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleManualImport} disabled={isImporting || !importForm.period}>
                        {isImporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                        Import
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* CSV Import */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  CSV Import
                </CardTitle>
                <CardDescription>Upload CSV with period data</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-1.5">
                      <FileSpreadsheet className="w-4 h-4" />
                      Import from CSV
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Import CSV</DialogTitle>
                      <DialogDescription>Paste your CSV data below</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>CSV Data</Label>
                        <Textarea
                          placeholder={`period,revenue,operating_expenses,net_income,cash_flow,cash_balance\n2025-01,50000,35000,15000,12000,150000\n2025-02,55000,36000,19000,15000,165000`}
                          value={csvData}
                          onChange={(e) => setCsvData(e.target.value)}
                          rows={8}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium">Required columns:</p>
                        <p>period (YYYY-MM), revenue, operating_expenses, net_income, cash_flow, cash_balance</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCsvDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCsvImport} disabled={isCsvImporting || !csvData.trim()}>
                        {isCsvImporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                        Import CSV
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Sync History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Sync History
              </CardTitle>
              <CardDescription>Recent data imports by source</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.actuals && dashboardData.actuals.length > 0 ? (
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net Income</TableHead>
                        <TableHead>Imported</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.actuals.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium text-sm">{formatPeriod(a.period)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{a.source}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(a.revenue)}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(a.operatingExpenses)}</TableCell>
                          <TableCell className={`text-right text-sm font-medium ${a.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(a.netIncome)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{getTimeAgo(a.importedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No sync history yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab 4: Alerts ═══════════════════════════════════════════════ */}
        <TabsContent value="alerts" className="mt-4 space-y-4">
          {/* Alert Filters */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Severity:</Label>
                  <Select value={alertSeverityFilter} onValueChange={setAlertSeverityFilter}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Type:</Label>
                  <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="revenue_tracking">Revenue Tracking</SelectItem>
                      <SelectItem value="expense_drift">Expense Drift</SelectItem>
                      <SelectItem value="cash_warning">Cash Warning</SelectItem>
                      <SelectItem value="hiring_affordability">Hiring Affordability</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="variance_threshold">Variance Threshold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Show Dismissed</Label>
                  <input
                    type="checkbox"
                    checked={showDismissedAlerts}
                    onChange={(e) => setShowDismissedAlerts(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert Types Legend */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-1 mb-2">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Alert Type Definitions</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { type: 'revenue_tracking', desc: 'Revenue deviating from forecast' },
                  { type: 'expense_drift', desc: 'Expenses exceeding planned budget' },
                  { type: 'cash_warning', desc: 'Low cash balance or runway' },
                  { type: 'hiring_affordability', desc: 'Burn rate affects hiring capacity' },
                  { type: 'milestone', desc: 'Positive achievement reached' },
                  { type: 'variance_threshold', desc: 'Net income severely off-track' },
                ].map(({ type, desc }) => (
                  <div key={type} className="flex items-start gap-1.5 text-xs">
                    <span className="font-medium min-w-fit">{ALERT_TYPE_LABELS[type]}:</span>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Financial Alerts
                <Badge variant="outline" className="text-xs font-normal">
                  {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <BellOff className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {dashboardData?.alerts?.length ? 'No alerts match your filters' : 'No financial alerts'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Alerts are generated automatically when actuals deviate from forecasts
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {filteredAlerts.map(alert => {
                    const style = SEVERITY_STYLES[alert.severity]
                    const SeverityIcon = style.icon
                    return (
                      <div
                        key={alert.id}
                        className={`rounded-lg border p-4 ${alert.dismissed ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${style.bg} shrink-0 mt-0.5`}>
                            <SeverityIcon className={`w-4 h-4 ${style.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className={`text-[10px] ${style.bg} ${style.text} border-0 capitalize`}>
                                {alert.severity}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {ALERT_TYPE_LABELS[alert.type] || alert.type}
                              </Badge>
                              {alert.period && (
                                <Badge variant="outline" className="text-[10px]">
                                  {formatPeriod(alert.period)}
                                </Badge>
                              )}
                              {alert.dismissed && (
                                <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-0">
                                  Dismissed
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed">{alert.message}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getTimeAgo(alert.createdAt)}
                              </span>
                              <span>Metric: {alert.metric}</span>
                            </div>
                          </div>
                          {!alert.dismissed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => handleDismissAlert(alert.id)}
                            >
                              <X className="w-3.5 h-3.5" />
                              Dismiss
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
