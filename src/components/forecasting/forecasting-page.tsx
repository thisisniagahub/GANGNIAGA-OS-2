'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  Calculator,
  BarChart3,
  PieChart as PieChartIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Save,
  FolderOpen,
  FilePlus,
  Loader2,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'

// ─── Types ───────────────────────────────────────────────────────────────────

type ScenarioType = 'best' | 'base' | 'worst' | 'custom'
type RevenueCategory = 'subscription' | 'transaction' | 'service' | 'product'
type ExpenseCategory = 'payroll' | 'infrastructure' | 'saas' | 'tax' | 'marketing' | 'operational'
type FinancialStatementTab = 'pl' | 'balance' | 'cashflow'

interface RevenueItem {
  id: string
  name: string
  category: RevenueCategory
  monthlyAmount: number
  growthRate: number
  startMonth: number
  endMonth: number
  isRecurring: boolean
}

interface ExpenseItem {
  id: string
  name: string
  category: ExpenseCategory
  monthlyAmount: number
  growthRate: number
}

interface SavedForecast {
  id: string
  name: string
  type: string
  organizationId: string
  startMonth: string
  endMonth: string
  currency: string
  createdAt: string
  updatedAt: string
  revenueItems: Array<{
    id: string
    name: string
    category: string
    amount: number
    growthRate: number
    startMonth: string
    endMonth: string | null
    recurring: boolean
    order: number
  }>
  expenseItems: Array<{
    id: string
    name: string
    category: string
    amount: number
    growthRate: number
    startMonth: string
    endMonth: string | null
    recurring: boolean
    order: number
  }>
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SCENARIO_MULTIPLIERS: Record<ScenarioType, { revenue: number; expense: number; growth: number }> = {
  best: { revenue: 1.2, expense: 0.9, growth: 1.3 },
  base: { revenue: 1.0, expense: 1.0, growth: 1.0 },
  worst: { revenue: 0.7, expense: 1.15, growth: 0.6 },
  custom: { revenue: 1.0, expense: 1.0, growth: 1.0 },
}

const REVENUE_CATEGORIES: { value: RevenueCategory; label: string }[] = [
  { value: 'subscription', label: 'Subscription' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'service', label: 'Service' },
  { value: 'product', label: 'Product' },
]

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'payroll', label: 'Payroll' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'saas', label: 'SaaS Tools' },
  { value: 'tax', label: 'Tax' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operational', label: 'Operational' },
]

const CHART_COLORS = {
  revenue: '#10b981',
  expenses: '#f43f5e',
  profit: '#3b82f6',
  cashFlow: '#8b5cf6',
  neutral: '#64748b',
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

// ─── Default Data ────────────────────────────────────────────────────────────

const DEFAULT_REVENUE_ITEMS: RevenueItem[] = [
  { id: 'r1', name: 'SaaS Pro Plan', category: 'subscription', monthlyAmount: 45000, growthRate: 5, startMonth: 1, endMonth: 12, isRecurring: true },
  { id: 'r2', name: 'SaaS Starter Plan', category: 'subscription', monthlyAmount: 18000, growthRate: 8, startMonth: 1, endMonth: 12, isRecurring: true },
  { id: 'r3', name: 'Payment Processing', category: 'transaction', monthlyAmount: 12000, growthRate: 6, startMonth: 1, endMonth: 12, isRecurring: true },
  { id: 'r4', name: 'Consulting Services', category: 'service', monthlyAmount: 8000, growthRate: 3, startMonth: 1, endMonth: 12, isRecurring: false },
  { id: 'r5', name: 'Enterprise Setup Fee', category: 'product', monthlyAmount: 15000, growthRate: 0, startMonth: 3, endMonth: 3, isRecurring: false },
  { id: 'r6', name: 'API Usage Fees', category: 'transaction', monthlyAmount: 5000, growthRate: 10, startMonth: 2, endMonth: 12, isRecurring: true },
]

const DEFAULT_EXPENSE_ITEMS: ExpenseItem[] = [
  { id: 'e1', name: 'Engineering Team', category: 'payroll', monthlyAmount: 28000, growthRate: 2 },
  { id: 'e2', name: 'Cloud Infrastructure', category: 'infrastructure', monthlyAmount: 8500, growthRate: 5 },
  { id: 'e3', name: 'SaaS Subscriptions', category: 'saas', monthlyAmount: 3200, growthRate: 3 },
  { id: 'e4', name: 'Digital Marketing', category: 'marketing', monthlyAmount: 6000, growthRate: 4 },
  { id: 'e5', name: 'Office & Operations', category: 'operational', monthlyAmount: 4500, growthRate: 2 },
  { id: 'e6', name: 'Sales Team', category: 'payroll', monthlyAmount: 15000, growthRate: 3 },
  { id: 'e7', name: 'Tax & Compliance', category: 'tax', monthlyAmount: 2800, growthRate: 1 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ForecastingPage() {
  const { organization } = useAuthStore()

  // State
  const [scenario, setScenario] = useState<ScenarioType>('base')
  const [revenueItems, setRevenueItems] = useState<RevenueItem[]>(DEFAULT_REVENUE_ITEMS)
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(DEFAULT_EXPENSE_ITEMS)
  const [statementTab, setStatementTab] = useState<FinancialStatementTab>('pl')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [customGrowthMultiplier, setCustomGrowthMultiplier] = useState(1.0)
  const [customRevenueMultiplier, setCustomRevenueMultiplier] = useState(1.0)
  const [customExpenseMultiplier, setCustomExpenseMultiplier] = useState(1.0)

  // API integration state
  const [savedForecasts, setSavedForecasts] = useState<SavedForecast[]>([])
  const [isLoadingForecasts, setIsLoadingForecasts] = useState(false)
  const [isSavingForecast, setIsSavingForecast] = useState(false)
  const [currentForecastId, setCurrentForecastId] = useState<string | null>(null)
  const [forecastName, setForecastName] = useState('')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)

  // Fetch saved forecasts on mount
  useEffect(() => {
    const fetchForecasts = async () => {
      if (!organization?.id) return
      setIsLoadingForecasts(true)
      try {
        const res = await fetch(`/api/forecasts?organizationId=${organization.id}`)
        if (res.ok) {
          const data = await res.json()
          setSavedForecasts(data.forecasts || [])
        }
      } catch {
        // Silently fail - forecasts will just be empty
      } finally {
        setIsLoadingForecasts(false)
      }
    }
    fetchForecasts()
  }, [organization?.id])

  // Save forecast to backend
  const handleSaveForecast = useCallback(async () => {
    if (!organization?.id) return
    if (!forecastName.trim()) {
      toast.error('Please enter a forecast name')
      return
    }

    setIsSavingForecast(true)
    try {
      const now = new Date()
      const startMonth = `${now.getFullYear()}-01`
      const endMonth = `${now.getFullYear()}-12`

      // Map frontend revenue items to API format
      const revenues = revenueItems.map((item) => ({
        name: item.name,
        category: item.category,
        amount: item.monthlyAmount,
        growthRate: item.growthRate,
        startMonth: `${now.getFullYear()}-${String(item.startMonth).padStart(2, '0')}`,
        endMonth: item.isRecurring ? `${now.getFullYear()}-12` : `${now.getFullYear()}-${String(item.endMonth).padStart(2, '0')}`,
        recurring: item.isRecurring,
      }))

      // Map frontend expense items to API format
      const expenses = expenseItems.map((item) => ({
        name: item.name,
        category: item.category,
        amount: item.monthlyAmount,
        growthRate: item.growthRate,
        startMonth: startMonth,
        endMonth: endMonth,
        recurring: true,
      }))

      const res = await fetch('/api/forecasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          name: forecastName,
          type: scenario,
          startMonth,
          endMonth,
          currency: organization.currency || 'USD',
          revenues,
          expenses,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Forecast saved successfully!')
        setCurrentForecastId(data.forecast?.id || null)
        setSaveDialogOpen(false)
        setForecastName('')
        // Refresh the list
        const listRes = await fetch(`/api/forecasts?organizationId=${organization.id}`)
        if (listRes.ok) {
          const listData = await listRes.json()
          setSavedForecasts(listData.forecasts || [])
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save forecast')
      }
    } catch {
      toast.error('Failed to save forecast')
    } finally {
      setIsSavingForecast(false)
    }
  }, [organization?.id, organization?.currency, revenueItems, expenseItems, scenario, forecastName])

  // Load a saved forecast
  const handleLoadForecast = useCallback((forecast: SavedForecast) => {
    // Map API revenue items to frontend format
    const loadedRevenue: RevenueItem[] = forecast.revenueItems.map((item, idx) => {
      const startParts = item.startMonth.split('-')
      const startMo = parseInt(startParts[1]) || 1
      const endMo = item.endMonth ? parseInt(item.endMonth.split('-')[1]) || 12 : 12
      return {
        id: `lr${idx}`,
        name: item.name,
        category: item.category as RevenueCategory,
        monthlyAmount: item.amount,
        growthRate: item.growthRate,
        startMonth: startMo,
        endMonth: endMo,
        isRecurring: item.recurring,
      }
    })

    // Map API expense items to frontend format
    const loadedExpense: ExpenseItem[] = forecast.expenseItems.map((item, idx) => ({
      id: `le${idx}`,
      name: item.name,
      category: item.category as ExpenseCategory,
      monthlyAmount: item.amount,
      growthRate: item.growthRate,
    }))

    setRevenueItems(loadedRevenue.length > 0 ? loadedRevenue : DEFAULT_REVENUE_ITEMS)
    setExpenseItems(loadedExpense.length > 0 ? loadedExpense : DEFAULT_EXPENSE_ITEMS)
    setScenario((forecast.type || 'base') as ScenarioType)
    setCurrentForecastId(forecast.id)
    setLoadDialogOpen(false)
    toast.success(`Loaded forecast: ${forecast.name}`)
  }, [])

  // New forecast - reset form
  const handleNewForecast = useCallback(() => {
    setRevenueItems(DEFAULT_REVENUE_ITEMS)
    setExpenseItems(DEFAULT_EXPENSE_ITEMS)
    setScenario('base')
    setCurrentForecastId(null)
    setAiInsight(null)
    setCustomGrowthMultiplier(1.0)
    setCustomRevenueMultiplier(1.0)
    setCustomExpenseMultiplier(1.0)
    toast.success('New forecast created')
  }, [])

  const multipliers = useMemo(() => {
    if (scenario === 'custom') {
      return { revenue: customRevenueMultiplier, expense: customExpenseMultiplier, growth: customGrowthMultiplier }
    }
    return SCENARIO_MULTIPLIERS[scenario]
  }, [scenario, customRevenueMultiplier, customExpenseMultiplier, customGrowthMultiplier])

  // ─── Computed Forecast Data ─────────────────────────────────────────────

  const monthlyData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const monthNum = idx + 1
      let totalRevenue = 0

      revenueItems.forEach((item) => {
        if (monthNum >= item.startMonth && monthNum <= item.endMonth) {
          const monthsActive = monthNum - item.startMonth
          const growthFactor = 1 + (item.growthRate / 100) * monthsActive * multipliers.growth
          totalRevenue += item.monthlyAmount * multipliers.revenue * growthFactor
        }
      })

      let totalExpenses = 0
      expenseItems.forEach((item) => {
        const monthsActive = monthNum - 1
        const growthFactor = 1 + (item.growthRate / 100) * monthsActive * multipliers.growth
        totalExpenses += item.monthlyAmount * multipliers.expense * growthFactor
      })

      const netIncome = totalRevenue - totalExpenses

      return {
        month,
        monthNum,
        revenue: Math.round(totalRevenue),
        expenses: Math.round(totalExpenses),
        netIncome: Math.round(netIncome),
      }
    })
  }, [revenueItems, expenseItems, multipliers])

  const cashFlowData = useMemo(() => {
    let cashBalance = 250000 // Starting cash
    return monthlyData.map((d) => {
      cashBalance += d.netIncome
      return {
        ...d,
        cashBalance: Math.round(cashBalance),
        cashFlow: d.netIncome,
      }
    })
  }, [monthlyData])

  const profitMarginData = useMemo(() => {
    return monthlyData.map((d) => ({
      month: d.month,
      profitMargin: d.revenue > 0 ? Math.round((d.netIncome / d.revenue) * 100) : 0,
      revenue: d.revenue,
      netIncome: d.netIncome,
    }))
  }, [monthlyData])

  const breakEvenData = useMemo(() => {
    let cumProfit = 0
    return monthlyData.map((d) => {
      cumProfit += d.netIncome
      return {
        month: d.month,
        cumulativeProfit: Math.round(cumProfit),
        monthlyProfit: d.netIncome,
      }
    })
  }, [monthlyData])

  // ─── SaaS Metrics ──────────────────────────────────────────────────────

  const saasMetrics = useMemo(() => {
    const currentMonth = monthlyData[monthlyData.length - 1]
    const mrr = currentMonth?.revenue ?? 0
    const arr = mrr * 12
    const totalCustomers = 1159
    const cac = 380
    const ltv = 4200
    const churnRate = 3.2
    const grossMargin = currentMonth ? ((currentMonth.revenue - currentMonth.expenses * 0.4) / currentMonth.revenue) * 100 : 0

    return { mrr, arr, cac, ltv, churnRate, grossMargin, totalCustomers }
  }, [monthlyData])

  // ─── Financial Statement Data ──────────────────────────────────────────

  const plData = useMemo(() => {
    return monthlyData.map((d) => {
      const cogs = Math.round(d.expenses * 0.4)
      const grossProfit = d.revenue - cogs
      const opExpenses = d.expenses - cogs
      const ebitda = grossProfit - opExpenses
      const taxRate = 0.21
      const netIncome = ebitda > 0 ? Math.round(ebitda * (1 - taxRate)) : ebitda
      return { ...d, cogs, grossProfit, opExpenses, ebitda, tax: ebitda > 0 ? Math.round(ebitda * taxRate) : 0, netIncomeAfterTax: netIncome }
    })
  }, [monthlyData])

  const balanceSheetData = useMemo(() => {
    let retainedEarnings = 0
    return monthlyData.map((d) => {
      retainedEarnings += d.netIncome
      const assets = Math.round(250000 * 0.3 + d.revenue * 1.5 + retainedEarnings)
      const currentAssets = Math.round(d.revenue * 0.8 + 50000)
      const fixedAssets = assets - currentAssets
      const liabilities = Math.round(d.expenses * 2)
      const currentLiabilities = Math.round(d.expenses * 0.6)
      const longTermLiabilities = liabilities - currentLiabilities
      const equity = assets - liabilities
      retainedEarnings += d.netIncome // already added above, so we subtract the double count
      return {
        month: d.month,
        totalAssets: assets,
        currentAssets,
        fixedAssets,
        totalLiabilities: liabilities,
        currentLiabilities,
        longTermLiabilities,
        equity,
        retainedEarnings: Math.round(retainedEarnings - d.netIncome), // use the value before this month's addition
      }
    })
  }, [monthlyData])

  const cashFlowStatementData = useMemo(() => {
    return cashFlowData.map((d) => {
      const operatingCF = d.netIncome + Math.round(d.expenses * 0.1)
      const investingCF = -Math.round(d.revenue * 0.08)
      const financingCF = d.monthNum <= 3 ? 20000 : 0
      return {
        month: d.month,
        operatingCF: Math.round(operatingCF),
        investingCF: Math.round(investingCF),
        financingCF: Math.round(financingCF),
        netCF: Math.round(operatingCF + investingCF + financingCF),
        cashBalance: d.cashBalance,
      }
    })
  }, [cashFlowData])

  // ─── Key Metrics ───────────────────────────────────────────────────────

  const keyMetrics = useMemo(() => {
    const currentMonth = monthlyData[monthlyData.length - 1]
    const prevMonth = monthlyData[monthlyData.length - 2]
    const burnRate = currentMonth && currentMonth.netIncome < 0 ? Math.abs(currentMonth.netIncome) : 0
    const lastCash = cashFlowData[cashFlowData.length - 1]?.cashBalance ?? 250000
    const runway = burnRate > 0 ? Math.round(lastCash / burnRate) : 999

    return {
      revenue: currentMonth?.revenue ?? 0,
      expenses: currentMonth?.expenses ?? 0,
      netIncome: currentMonth?.netIncome ?? 0,
      cashBalance: lastCash,
      burnRate,
      runway,
      revenueChange: prevMonth ? ((currentMonth!.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0,
    }
  }, [monthlyData, cashFlowData])

  // ─── Revenue Category Breakdown for Pie Chart ──────────────────────────

  const revenueByCategory = useMemo(() => {
    const catMap: Record<string, number> = {}
    revenueItems.forEach((item) => {
      const cat = item.category
      catMap[cat] = (catMap[cat] || 0) + item.monthlyAmount * multipliers.revenue
    })
    return Object.entries(catMap).map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [revenueItems, multipliers])

  const expenseByCategory = useMemo(() => {
    const catMap: Record<string, number> = {}
    expenseItems.forEach((item) => {
      const cat = item.category
      catMap[cat] = (catMap[cat] || 0) + item.monthlyAmount * multipliers.expense
    })
    return Object.entries(catMap).map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [expenseItems, multipliers])

  // ─── Handlers ──────────────────────────────────────────────────────────

  const addRevenueItem = useCallback(() => {
    setRevenueItems((prev) => [
      ...prev,
      {
        id: generateId(),
        name: 'New Revenue Stream',
        category: 'subscription',
        monthlyAmount: 5000,
        growthRate: 5,
        startMonth: 1,
        endMonth: 12,
        isRecurring: true,
      },
    ])
    toast.success('Revenue stream added')
  }, [])

  const removeRevenueItem = useCallback((id: string) => {
    setRevenueItems((prev) => prev.filter((item) => item.id !== id))
    toast.success('Revenue stream removed')
  }, [])

  const updateRevenueItem = useCallback((id: string, field: keyof RevenueItem, value: string | number | boolean) => {
    setRevenueItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }, [])

  const addExpenseItem = useCallback(() => {
    setExpenseItems((prev) => [
      ...prev,
      {
        id: generateId(),
        name: 'New Expense Item',
        category: 'operational',
        monthlyAmount: 2000,
        growthRate: 2,
      },
    ])
    toast.success('Expense item added')
  }, [])

  const removeExpenseItem = useCallback((id: string) => {
    setExpenseItems((prev) => prev.filter((item) => item.id !== id))
    toast.success('Expense item removed')
  }, [])

  const updateExpenseItem = useCallback((id: string, field: keyof ExpenseItem, value: string | number) => {
    setExpenseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }, [])

  const handleAiInsight = useCallback(async () => {
    setAiLoading(true)
    setAiInsight(null)
    try {
      const summary = monthlyData
        .slice(-3)
        .map((d) => `${d.month}: Rev $${formatCurrency(d.revenue)}, Exp $${formatCurrency(d.expenses)}, Net $${formatCurrency(d.netIncome)}`)
        .join('; ')

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on our current financial forecast (scenario: ${scenario}):\nRecent 3 months: ${summary}\nKey metrics: MRR ${formatCurrency(saasMetrics.mrr)}, ARR ${formatCurrency(saasMetrics.arr)}, Burn Rate ${formatCurrency(keyMetrics.burnRate)}/mo, Runway ${keyMetrics.runway} months, Cash Balance ${formatCurrency(keyMetrics.cashBalance)}.\n\nProvide 3-5 specific, actionable financial recommendations for this business. Focus on cash flow optimization, revenue growth strategies, and expense management. Be concise and specific.`,
          agentType: 'cfo',
        }),
      })

      if (!res.ok) throw new Error('Failed to get AI insights')

      const data = await res.json()
      setAiInsight(data.response)
      toast.success('AI insights generated')
    } catch {
      toast.error('Failed to generate AI insights. Please try again.')
      setAiInsight('Unable to generate AI insights at this time. Please try again later.')
    } finally {
      setAiLoading(false)
    }
  }, [monthlyData, scenario, saasMetrics, keyMetrics])

  // ─── Chart Tooltip Style ───────────────────────────────────────────────

  const chartTooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  }

  const currencyFormatter = (value: number) => [`$${value.toLocaleString()}`, '']
  const pctFormatter = (value: number) => [`${value}%`, '']

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="w-6 h-6 text-primary" />
              Financial Forecasting Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {organization?.name ?? 'Your Organization'} · 12-month financial projections
              {currentForecastId && <span className="ml-2 text-primary">• Editing saved forecast</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleNewForecast} className="gap-1.5">
              <FilePlus className="w-4 h-4" />
              New
            </Button>
            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FolderOpen className="w-4 h-4" />
                  Load
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Load Saved Forecast</DialogTitle>
                  <DialogDescription>Select a previously saved forecast to load</DialogDescription>
                </DialogHeader>
                {isLoadingForecasts ? (
                  <div className="space-y-3 py-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : savedForecasts.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <FolderOpen className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No saved forecasts yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Save your current forecast to load it later</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {savedForecasts.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleLoadForecast(f)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{f.name}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {f.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{f.startMonth} → {f.endMonth}</span>
                          <span>{f.revenueItems.length} revenue · {f.expenseItems.length} expenses</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Save className="w-4 h-4" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Save Forecast</DialogTitle>
                  <DialogDescription>Save your current forecast configuration for later</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Forecast Name</Label>
                    <Input
                      placeholder="e.g., Q1 2025 Base Case"
                      value={forecastName}
                      onChange={(e) => setForecastName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>Scenario: <span className="font-medium text-foreground capitalize">{scenario}</span></div>
                    <div>Revenue Streams: <span className="font-medium text-foreground">{revenueItems.length}</span></div>
                    <div>Expense Items: <span className="font-medium text-foreground">{expenseItems.length}</span></div>
                    <div>Period: <span className="font-medium text-foreground">12 months</span></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={isSavingForecast}>Cancel</Button>
                  <Button onClick={handleSaveForecast} disabled={isSavingForecast || !forecastName.trim()}>
                    {isSavingForecast ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-1" />Save Forecast</>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Separator orientation="vertical" className="h-6" />
            <Button onClick={handleAiInsight} disabled={aiLoading} className="shrink-0">
              <Sparkles className="w-4 h-4 mr-2" />
              {aiLoading ? 'Generating Insights...' : 'AI CFO Insights'}
            </Button>
          </div>
        </div>

        {/* Scenario Tabs + Key Metrics */}
        <Tabs value={scenario} onValueChange={(v) => setScenario(v as ScenarioType)}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-4">
              <TabsTrigger value="best" className="text-xs sm:text-sm">
                <TrendingUp className="w-3 h-3 mr-1 hidden sm:inline" />
                Best Case
              </TabsTrigger>
              <TabsTrigger value="base" className="text-xs sm:text-sm">
                <Target className="w-3 h-3 mr-1 hidden sm:inline" />
                Base Case
              </TabsTrigger>
              <TabsTrigger value="worst" className="text-xs sm:text-sm">
                <TrendingDown className="w-3 h-3 mr-1 hidden sm:inline" />
                Worst Case
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs sm:text-sm">
                <BarChart3 className="w-3 h-3 mr-1 hidden sm:inline" />
                Custom
              </TabsTrigger>
            </TabsList>
            {scenario === 'custom' && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs whitespace-nowrap">Rev ×</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="3"
                    value={customRevenueMultiplier}
                    onChange={(e) => setCustomRevenueMultiplier(parseFloat(e.target.value) || 1)}
                    className="w-16 h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs whitespace-nowrap">Exp ×</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="3"
                    value={customExpenseMultiplier}
                    onChange={(e) => setCustomExpenseMultiplier(parseFloat(e.target.value) || 1)}
                    className="w-16 h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs whitespace-nowrap">Growth ×</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="3"
                    value={customGrowthMultiplier}
                    onChange={(e) => setCustomGrowthMultiplier(parseFloat(e.target.value) || 1)}
                    className="w-16 h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <TabsContent value={scenario} className="mt-4 space-y-4">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard
                title="Revenue"
                value={formatCurrency(keyMetrics.revenue)}
                change={keyMetrics.revenueChange}
                icon={DollarSign}
              />
              <MetricCard
                title="Expenses"
                value={formatCurrency(keyMetrics.expenses)}
                change={-((keyMetrics.expenses / (keyMetrics.revenue || 1)) * 100)}
                icon={TrendingDown}
                invertTrend
              />
              <MetricCard
                title="Net Income"
                value={formatCurrency(keyMetrics.netIncome)}
                change={keyMetrics.netIncome > 0 ? 12.5 : -8.3}
                icon={keyMetrics.netIncome >= 0 ? TrendingUp : TrendingDown}
              />
              <MetricCard
                title="Cash Balance"
                value={formatCurrency(keyMetrics.cashBalance)}
                change={5.2}
                icon={DollarSign}
              />
              <MetricCard
                title="Burn Rate"
                value={keyMetrics.burnRate > 0 ? `${formatCurrency(keyMetrics.burnRate)}/mo` : 'None'}
                change={-2.1}
                icon={ArrowDownRight}
                invertTrend
              />
              <MetricCard
                title="Runway"
                value={keyMetrics.runway >= 999 ? '∞' : `${keyMetrics.runway} mo`}
                change={keyMetrics.runway > 12 ? 8 : -5}
                icon={Target}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue vs Expenses Line Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
              <CardDescription>12-month projection trend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                    <RechartsTooltip contentStyle={chartTooltipStyle} formatter={currencyFormatter} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_COLORS.revenue}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      name="Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke={CHART_COLORS.expenses}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      name="Expenses"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Projection Area Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cash Flow Projection</CardTitle>
              <CardDescription>Cash balance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.cashFlow} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.cashFlow} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                    <RechartsTooltip contentStyle={chartTooltipStyle} formatter={currencyFormatter} />
                    <Area
                      type="monotone"
                      dataKey="cashBalance"
                      stroke={CHART_COLORS.cashFlow}
                      fill="url(#cashGradient)"
                      strokeWidth={2}
                      name="Cash Balance"
                    />
                    <ReferenceLine y={0} stroke={CHART_COLORS.expenses} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Profit Margin Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Profit Margin Trend</CardTitle>
              <CardDescription>Monthly net profit margin percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitMarginData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <RechartsTooltip contentStyle={chartTooltipStyle} formatter={pctFormatter} />
                    <ReferenceLine y={0} stroke={CHART_COLORS.expenses} strokeDasharray="5 5" />
                    <Line
                      type="monotone"
                      dataKey="profitMargin"
                      stroke={CHART_COLORS.profit}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      name="Profit Margin"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Break-even Analysis */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Break-Even Analysis</CardTitle>
              <CardDescription>Cumulative profit trajectory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakEvenData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                    <RechartsTooltip contentStyle={chartTooltipStyle} formatter={currencyFormatter} />
                    <ReferenceLine y={0} stroke={CHART_COLORS.expenses} strokeWidth={2} />
                    <Bar
                      dataKey="cumulativeProfit"
                      name="Cumulative Profit"
                      radius={[4, 4, 0, 0]}
                    >
                      {breakEvenData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.cumulativeProfit >= 0 ? CHART_COLORS.revenue : CHART_COLORS.expenses}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue & Expense Modeling + Pie Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Revenue Modeling */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Revenue Streams</CardTitle>
                  <CardDescription>Configure your revenue projections</CardDescription>
                </div>
                <Button size="sm" onClick={addRevenueItem}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Stream
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                {revenueItems.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Name</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateRevenueItem(item.id, 'name', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Category</Label>
                        <Select
                          value={item.category}
                          onValueChange={(v) => updateRevenueItem(item.id, 'category', v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REVENUE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value} className="text-xs">
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Monthly Amount</Label>
                        <Input
                          type="number"
                          value={item.monthlyAmount}
                          onChange={(e) => updateRevenueItem(item.id, 'monthlyAmount', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Growth %/mo</Label>
                        <Input
                          type="number"
                          value={item.growthRate}
                          onChange={(e) => updateRevenueItem(item.id, 'growthRate', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] text-muted-foreground">Start Mo</Label>
                          <Input
                            type="number"
                            min={1}
                            max={12}
                            value={item.startMonth}
                            onChange={(e) => updateRevenueItem(item.id, 'startMonth', parseInt(e.target.value) || 1)}
                            className="w-14 h-7 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] text-muted-foreground">End Mo</Label>
                          <Input
                            type="number"
                            min={1}
                            max={12}
                            value={item.endMonth}
                            onChange={(e) => updateRevenueItem(item.id, 'endMonth', parseInt(e.target.value) || 12)}
                            className="w-14 h-7 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.isRecurring}
                            onCheckedChange={(v) => updateRevenueItem(item.id, 'isRecurring', v)}
                          />
                          <Label className="text-[10px] text-muted-foreground">
                            {item.isRecurring ? 'Recurring' : 'One-time'}
                          </Label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {formatCurrency(item.monthlyAmount * multipliers.revenue)}/mo
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeRevenueItem(item.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Revenue Mix</CardTitle>
              </div>
              <CardDescription>By category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {revenueByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => [formatCurrencyFull(value), '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {revenueByCategory.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground capitalize">{item.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expense Modeling + Pie Chart */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Expense Items</CardTitle>
                  <CardDescription>Configure your expense projections</CardDescription>
                </div>
                <Button size="sm" onClick={addExpenseItem}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                {expenseItems.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Name</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateExpenseItem(item.id, 'name', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Category</Label>
                        <Select
                          value={item.category}
                          onValueChange={(v) => updateExpenseItem(item.id, 'category', v as ExpenseCategory)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value} className="text-xs">
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Monthly Amount</Label>
                        <Input
                          type="number"
                          value={item.monthlyAmount}
                          onChange={(e) => updateExpenseItem(item.id, 'monthlyAmount', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Growth %/mo</Label>
                        <Input
                          type="number"
                          value={item.growthRate}
                          onChange={(e) => updateExpenseItem(item.id, 'growthRate', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-2 gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {formatCurrency(item.monthlyAmount * multipliers.expense)}/mo
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeExpenseItem(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expense Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Expense Breakdown</CardTitle>
              </div>
              <CardDescription>By category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => [formatCurrencyFull(value), '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {expenseByCategory.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground capitalize">{item.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SaaS Metrics Panel */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">SaaS Metrics</CardTitle>
            </div>
            <CardDescription>Key performance indicators for subscription businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <SaaSMetricCard
                label="MRR"
                value={formatCurrency(saasMetrics.mrr)}
                description="Monthly Recurring Revenue"
                trend="up"
              />
              <SaaSMetricCard
                label="ARR"
                value={formatCurrency(saasMetrics.arr)}
                description="Annual Recurring Revenue"
                trend="up"
              />
              <SaaSMetricCard
                label="CAC"
                value={formatCurrency(saasMetrics.cac)}
                description="Customer Acquisition Cost"
                trend="down"
              />
              <SaaSMetricCard
                label="LTV"
                value={formatCurrency(saasMetrics.ltv)}
                description="Customer Lifetime Value"
                trend="up"
              />
              <SaaSMetricCard
                label="Churn"
                value={`${saasMetrics.churnRate}%`}
                description="Monthly churn rate"
                trend="neutral"
              />
              <SaaSMetricCard
                label="Gross Margin"
                value={`${saasMetrics.grossMargin.toFixed(1)}%`}
                description="Revenue minus COGS"
                trend={saasMetrics.grossMargin > 70 ? 'up' : 'neutral'}
              />
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">LTV : CAC Ratio</span>
                <span className="font-bold text-sm">
                  {(saasMetrics.ltv / saasMetrics.cac).toFixed(1)}:1
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">CAC Payback</span>
                <span className="font-bold text-sm">
                  {Math.round(saasMetrics.cac / ((saasMetrics.mrr * saasMetrics.grossMargin / 100) / saasMetrics.totalCustomers))} mo
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">Customers</span>
                <span className="font-bold text-sm">{saasMetrics.totalCustomers.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Statements Preview */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Financial Statements</CardTitle>
            </div>
            <CardDescription>Projected monthly financial data</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={statementTab} onValueChange={(v) => setStatementTab(v as FinancialStatementTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
                <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
                <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
              </TabsList>

              <TabsContent value="pl" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10 min-w-[100px]">Metric</TableHead>
                        {MONTHS.map((m) => (
                          <TableHead key={m} className="text-right min-w-[80px]">{m}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="font-medium">
                        <TableCell className="sticky left-0 bg-card z-10">Revenue</TableCell>
                        {plData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(d.revenue)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">COGS</TableCell>
                        {plData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs text-muted-foreground">
                            ({formatCurrency(d.cogs)})
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="font-medium">
                        <TableCell className="sticky left-0 bg-card z-10">Gross Profit</TableCell>
                        {plData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs">
                            {formatCurrency(d.grossProfit)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">OpEx</TableCell>
                        {plData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs text-muted-foreground">
                            ({formatCurrency(d.opExpenses)})
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="font-medium">
                        <TableCell className="sticky left-0 bg-card z-10">EBITDA</TableCell>
                        {plData.map((d) => (
                          <TableCell key={d.month} className={`text-right text-xs ${d.ebitda >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(d.ebitda)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">Tax (21%)</TableCell>
                        {plData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs text-muted-foreground">
                            ({formatCurrency(d.tax)})
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="font-bold">
                        <TableCell className="sticky left-0 bg-card z-10">Net Income</TableCell>
                        {plData.map((d) => (
                          <TableCell key={d.month} className={`text-right text-xs ${d.netIncomeAfterTax >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(d.netIncomeAfterTax)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="balance" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Metric</TableHead>
                        {MONTHS.map((m) => (
                          <TableHead key={m} className="text-right min-w-[80px]">{m}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">Current Assets</TableCell>
                        {balanceSheetData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs">{formatCurrency(d.currentAssets)}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">Fixed Assets</TableCell>
                        {balanceSheetData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs">{formatCurrency(d.fixedAssets)}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="font-medium">
                        <TableCell className="sticky left-0 bg-card z-10">Total Assets</TableCell>
                        {balanceSheetData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs">{formatCurrency(d.totalAssets)}</TableCell>
                        ))}
                      </TableRow>
                      <Separator />
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">Current Liabilities</TableCell>
                        {balanceSheetData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs text-red-500">{formatCurrency(d.currentLiabilities)}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">LT Liabilities</TableCell>
                        {balanceSheetData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs text-red-500">{formatCurrency(d.longTermLiabilities)}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="font-medium">
                        <TableCell className="sticky left-0 bg-card z-10">Total Liabilities</TableCell>
                        {balanceSheetData.map((d) => (
                          <TableCell key={d.month} className="text-right text-xs text-red-500">{formatCurrency(d.totalLiabilities)}</TableCell>
                        ))}
                      </TableRow>
                      <Separator />
                      <TableRow className="font-bold">
                        <TableCell className="sticky left-0 bg-card z-10">Equity</TableCell>
                        {balanceSheetData.map((d) => (
                          <TableCell key={d.month} className={`text-right text-xs ${d.equity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(d.equity)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="cashflow" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10 min-w-[120px]">Metric</TableHead>
                        {MONTHS.map((m) => (
                          <TableHead key={m} className="text-right min-w-[80px]">{m}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">Operating CF</TableCell>
                        {cashFlowStatementData.map((d) => (
                          <TableCell key={d.month} className={`text-right text-xs ${d.operatingCF >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(d.operatingCF)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">Investing CF</TableCell>
                        {cashFlowStatementData.map((d) => (
                          <TableCell key={d.month} className={`text-right text-xs ${d.investingCF >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(d.investingCF)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground">Financing CF</TableCell>
                        {cashFlowStatementData.map((d) => (
                          <TableCell key={d.month} className={`text-right text-xs ${d.financingCF >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(d.financingCF)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="font-medium">
                        <TableCell className="sticky left-0 bg-card z-10">Net Cash Flow</TableCell>
                        {cashFlowStatementData.map((d) => (
                          <TableCell key={d.month} className={`text-right text-xs ${d.netCF >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(d.netCF)}
                          </TableCell>
                        ))}
                      </TableRow>
                      <Separator />
                      <TableRow className="font-bold">
                        <TableCell className="sticky left-0 bg-card z-10">Cash Balance</TableCell>
                        {cashFlowStatementData.map((d) => (
                          <TableCell key={d.month} className={`text-right text-xs ${d.cashBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(d.cashBalance)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* AI Insights Panel */}
        {aiInsight && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">CFO Agent Insights</CardTitle>
              </div>
              <CardDescription>AI-generated financial recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{aiInsight}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  invertTrend = false,
}: {
  title: string
  value: string
  change: number
  icon: React.ElementType
  invertTrend?: boolean
}) {
  const isPositive = invertTrend ? change < 0 : change > 0
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
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
            {Math.abs(change).toFixed(1)}%
          </Badge>
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{title}</p>
      </CardContent>
    </Card>
  )
}

function SaaSMetricCard({
  label,
  value,
  description,
  trend,
}: {
  label: string
  value: string
  description: string
  trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          {trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
          {trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-amber-500" />}
          {trend === 'neutral' && <div className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20" />}
        </div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </CardContent>
    </Card>
  )
}
