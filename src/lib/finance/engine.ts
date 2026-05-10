import { db } from '@/lib/db'

// ==========================================
// SAAS METRICS
// ==========================================

export interface SaaSMetrics {
  mrr: number               // Monthly Recurring Revenue
  arr: number               // Annual Recurring Revenue
  cac: number               // Customer Acquisition Cost
  ltv: number               // Lifetime Value
  ltvCacRatio: number       // LTV:CAC ratio
  churnRate: number         // Monthly churn rate
  grossMargin: number       // Gross margin percentage
  netRevenueRetention: number // Net revenue retention rate
  paybackPeriod: number     // CAC payback period in months
  ruleOf40: number          // Growth rate + margin
}

export async function calculateSaaSMetrics(organizationId: string, period?: string): Promise<SaaSMetrics> {
  // Get the current period KPIs
  const currentPeriod = period || getCurrentMonthPeriod()

  const kpis = await db.kpi.findMany({
    where: {
      organizationId,
      period: currentPeriod,
    },
  })

  // MRR: Sum of KPIs where category='revenue' and unit='USD'
  const revenueKpis = kpis.filter(k => k.category === 'revenue' && k.unit === 'USD')
  const mrr = revenueKpis.reduce((sum, k) => sum + k.value, 0)

  // ARR: MRR × 12
  const arr = mrr * 12

  // CAC: marketing expenses / new customers
  const marketingSpend = kpis
    .filter(k => k.category === 'cash' && k.name.toLowerCase().includes('marketing'))
    .reduce((sum, k) => sum + k.value, 0)
  const newCustomers = kpis
    .filter(k => k.name.toLowerCase().includes('new customer') || k.name.toLowerCase().includes('new_customer'))
    .reduce((sum, k) => sum + k.value, 0)
  const cac = newCustomers > 0 ? marketingSpend / newCustomers : 0

  // Churn Rate: from KPI data
  const churnKpi = kpis.find(k =>
    k.name.toLowerCase().includes('churn') && k.unit === 'percent'
  )
  const churnRate = churnKpi ? churnKpi.value / 100 : 0.05 // default 5%

  // ARPU: Average Revenue Per User
  const totalCustomers = kpis
    .filter(k => k.name.toLowerCase().includes('total customer') || k.name.toLowerCase().includes('customer count'))
    .reduce((sum, k) => sum + k.value, 0)
  const arpu = totalCustomers > 0 ? mrr / totalCustomers : mrr > 0 ? mrr / 100 : 0

  // Gross Margin: (Revenue - COGS) / Revenue
  const cogs = kpis
    .filter(k => k.name.toLowerCase().includes('cogs') || k.name.toLowerCase().includes('cost of goods'))
    .reduce((sum, k) => sum + k.value, 0)
  const grossMargin = mrr > 0 ? ((mrr - cogs) / mrr) * 100 : 70 // default 70%

  // LTV: ARPU × (1/churn) × gross margin
  const ltv = churnRate > 0
    ? arpu * (1 / churnRate) * (grossMargin / 100)
    : arpu * 20 * (grossMargin / 100) // default 20 months if no churn

  // LTV:CAC Ratio
  const ltvCacRatio = cac > 0 ? ltv / cac : 0

  // CAC Payback Period: CAC / (ARPU × gross margin)
  const paybackPeriod = (arpu * (grossMargin / 100)) > 0
    ? cac / (arpu * (grossMargin / 100))
    : 0

  // Net Revenue Retention
  const nrrKpi = kpis.find(k =>
    k.name.toLowerCase().includes('net revenue retention') || k.name.toLowerCase().includes('nrr')
  )
  const netRevenueRetention = nrrKpi ? nrrKpi.value : 100 // default 100%

  // Rule of 40: Growth rate + Margin
  const growthKpi = kpis.find(k =>
    k.name.toLowerCase().includes('revenue growth') || k.name.toLowerCase().includes('mrr growth')
  )
  const growthRate = growthKpi ? growthKpi.value : 20 // default 20%
  const ruleOf40 = growthRate + grossMargin

  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    cac: Math.round(cac * 100) / 100,
    ltv: Math.round(ltv * 100) / 100,
    ltvCacRatio: Math.round(ltvCacRatio * 100) / 100,
    churnRate: Math.round(churnRate * 10000) / 100, // as percentage
    grossMargin: Math.round(grossMargin * 100) / 100,
    netRevenueRetention: Math.round(netRevenueRetention * 100) / 100,
    paybackPeriod: Math.round(paybackPeriod * 100) / 100,
    ruleOf40: Math.round(ruleOf40 * 100) / 100,
  }
}

// ==========================================
// BURN RATE & RUNWAY
// ==========================================

export interface BurnRateAnalysis {
  grossBurnRate: number      // Total monthly expenses
  netBurnRate: number        // Monthly expenses - monthly revenue
  cashBalance: number        // Current cash
  runwayMonths: number       // Months until cash runs out
  runwayDate: string         // Estimated date cash runs out
  burnTrend: 'increasing' | 'stable' | 'decreasing'
  monthlyBurnHistory: { month: string; grossBurn: number; netBurn: number; cashBalance: number }[]
}

export async function analyzeBurnRate(organizationId: string): Promise<BurnRateAnalysis> {
  // Get the latest forecast's financial statements
  const latestForecast = await db.forecast.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: {
      statements: {
        where: { type: 'pnl' },
        orderBy: { month: 'asc' },
      },
    },
  })

  // Also get KPI data for cash and expenses
  const kpis = await db.kpi.findMany({
    where: { organizationId },
    orderBy: { period: 'desc' },
  })

  // Build monthly burn history from financial statements
  const monthlyBurnHistory: { month: string; grossBurn: number; netBurn: number; cashBalance: number }[] = []

  if (latestForecast && latestForecast.statements.length > 0) {
    let cumulativeCash = 0

    for (const stmt of latestForecast.statements) {
      const grossBurn = stmt.expenses
      const netBurn = stmt.expenses - stmt.revenue
      cumulativeCash = stmt.cashBalance
      monthlyBurnHistory.push({
        month: stmt.month,
        grossBurn: Math.round(grossBurn * 100) / 100,
        netBurn: Math.round(netBurn * 100) / 100,
        cashBalance: Math.round(cumulativeCash * 100) / 100,
      })
    }
  } else {
    // Use KPI data to construct burn history
    const expenseKpis = kpis.filter(k => k.category === 'cash' || k.name.toLowerCase().includes('expense'))
    const revenueKpis = kpis.filter(k => k.category === 'revenue')

    // Group by period
    const periods = [...new Set(kpis.map(k => k.period))].sort().reverse().slice(0, 6)
    for (const period of periods.reverse()) {
      const periodExpenses = expenseKpis.filter(k => k.period === period).reduce((s, k) => s + k.value, 0)
      const periodRevenue = revenueKpis.filter(k => k.period === period).reduce((s, k) => s + k.value, 0)
      monthlyBurnHistory.push({
        month: period,
        grossBurn: Math.round(periodExpenses * 100) / 100,
        netBurn: Math.round((periodExpenses - periodRevenue) * 100) / 100,
        cashBalance: 0,
      })
    }
  }

  // Calculate current burn rate from the most recent month
  const latestMonth = monthlyBurnHistory.length > 0
    ? monthlyBurnHistory[monthlyBurnHistory.length - 1]
    : null

  // Get gross burn from KPI if no forecast
  const currentExpenseKpi = kpis.find(k =>
    k.name.toLowerCase().includes('total expense') || k.name.toLowerCase().includes('monthly expense')
  )
  const currentRevenueKpi = kpis.find(k =>
    k.name.toLowerCase().includes('total revenue') || k.name.toLowerCase().includes('mrr')
  )
  const currentCashKpi = kpis.find(k =>
    k.name.toLowerCase().includes('cash balance') || k.name.toLowerCase().includes('cash')
  )

  const grossBurnRate = latestMonth?.grossBurn || currentExpenseKpi?.value || 0
  const currentRevenue = latestMonth
    ? latestMonth.grossBurn - latestMonth.netBurn
    : currentRevenueKpi?.value || 0
  const netBurnRate = latestMonth?.netBurn || (grossBurnRate - currentRevenue) || 0
  const cashBalance = latestMonth?.cashBalance || currentCashKpi?.value || 0

  // Runway calculation
  let runwayMonths = 0
  if (netBurnRate > 0) {
    runwayMonths = cashBalance / netBurnRate
  } else if (netBurnRate <= 0) {
    // Not burning cash — infinite runway (represent as 999)
    runwayMonths = 999
  }

  // Estimated runway date
  const runwayDate = netBurnRate > 0
    ? new Date(Date.now() + runwayMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : 'N/A'

  // Determine burn trend from last 3 months
  const burnTrend = determineBurnTrend(monthlyBurnHistory)

  return {
    grossBurnRate: Math.round(grossBurnRate * 100) / 100,
    netBurnRate: Math.round(netBurnRate * 100) / 100,
    cashBalance: Math.round(cashBalance * 100) / 100,
    runwayMonths: Math.round(runwayMonths * 100) / 100,
    runwayDate,
    burnTrend,
    monthlyBurnHistory,
  }
}

// ==========================================
// SCENARIO ANALYSIS
// ==========================================

export interface ScenarioAnalysis {
  scenarios: {
    name: string
    type: 'best' | 'base' | 'worst' | 'custom'
    revenueMultiplier: number
    expenseMultiplier: number
    projected12MonthRevenue: number
    projected12MonthExpenses: number
    projected12MonthProfit: number
    breakEvenMonth: string | null
    endCashBalance: number
  }[]
  recommendation: string
}

export async function runScenarioAnalysis(
  organizationId: string,
  customAdjustments?: {
    revenueMultiplier?: number
    expenseMultiplier?: number
  }
): Promise<ScenarioAnalysis> {
  // Get the latest forecast for base data
  const latestForecast = await db.forecast.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: {
      revenueItems: true,
      expenseItems: true,
      statements: {
        where: { type: 'pnl' },
        orderBy: { month: 'asc' },
      },
    },
  })

  // Also use KPI data for baseline
  const kpis = await db.kpi.findMany({
    where: { organizationId },
  })

  const currentPeriod = getCurrentMonthPeriod()
  const currentKpis = kpis.filter(k => k.period === currentPeriod)

  // Get base monthly revenue and expenses
  let baseMonthlyRevenue = 0
  let baseMonthlyExpenses = 0
  let currentCash = 0

  if (latestForecast && latestForecast.statements.length > 0) {
    // Use the most recent statement as base
    const latestStmt = latestForecast.statements[latestForecast.statements.length - 1]
    baseMonthlyRevenue = latestStmt.revenue
    baseMonthlyExpenses = latestStmt.expenses
    currentCash = latestStmt.cashBalance
  } else {
    // Fall back to KPI data
    baseMonthlyRevenue = currentKpis
      .filter(k => k.category === 'revenue')
      .reduce((sum, k) => sum + k.value, 0)
    baseMonthlyExpenses = currentKpis
      .filter(k => k.name.toLowerCase().includes('expense') || k.category === 'cash')
      .reduce((sum, k) => sum + k.value, 0)
    currentCash = currentKpis
      .filter(k => k.name.toLowerCase().includes('cash'))
      .reduce((sum, k) => sum + k.value, 0)
  }

  // Apply growth rates from forecast if available
  const avgRevenueGrowth = latestForecast?.revenueItems.length
    ? latestForecast.revenueItems.reduce((sum, r) => sum + r.growthRate, 0) / latestForecast.revenueItems.length / 100
    : 0.02 // default 2% monthly growth

  const avgExpenseGrowth = latestForecast?.expenseItems.length
    ? latestForecast.expenseItems.reduce((sum, e) => sum + e.growthRate, 0) / latestForecast.expenseItems.length / 100
    : 0.01 // default 1% monthly growth

  // Define scenario multipliers
  const scenarioDefinitions = [
    { name: 'Best Case', type: 'best' as const, revenueMultiplier: 1.3, expenseMultiplier: 0.9 },
    { name: 'Base Case', type: 'base' as const, revenueMultiplier: 1.0, expenseMultiplier: 1.0 },
    { name: 'Worst Case', type: 'worst' as const, revenueMultiplier: 0.7, expenseMultiplier: 1.2 },
  ]

  // Add custom scenario if provided
  if (customAdjustments) {
    scenarioDefinitions.push({
      name: 'Custom Scenario',
      type: 'custom' as const,
      revenueMultiplier: customAdjustments.revenueMultiplier || 1.0,
      expenseMultiplier: customAdjustments.expenseMultiplier || 1.0,
    })
  }

  const scenarios = scenarioDefinitions.map(def => {
    // Project 12 months
    let totalRevenue = 0
    let totalExpenses = 0
    let cashBalance = currentCash
    let breakEvenMonth: string | null = null

    for (let month = 0; month < 12; month++) {
      const monthRevenue = baseMonthlyRevenue * def.revenueMultiplier * Math.pow(1 + avgRevenueGrowth, month)
      const monthExpenses = baseMonthlyExpenses * def.expenseMultiplier * Math.pow(1 + avgExpenseGrowth, month)

      totalRevenue += monthRevenue
      totalExpenses += monthExpenses
      cashBalance += monthRevenue - monthExpenses

      // Check for break-even (first month where monthly profit is positive)
      if (breakEvenMonth === null && monthRevenue > monthExpenses) {
        const breakDate = new Date()
        breakDate.setMonth(breakDate.getMonth() + month + 1)
        breakEvenMonth = breakDate.toISOString().split('T')[0]
      }
    }

    return {
      name: def.name,
      type: def.type,
      revenueMultiplier: def.revenueMultiplier,
      expenseMultiplier: def.expenseMultiplier,
      projected12MonthRevenue: Math.round(totalRevenue * 100) / 100,
      projected12MonthExpenses: Math.round(totalExpenses * 100) / 100,
      projected12MonthProfit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
      breakEvenMonth,
      endCashBalance: Math.round(cashBalance * 100) / 100,
    }
  })

  // Generate recommendation
  const baseCase = scenarios.find(s => s.type === 'base')!
  const worstCase = scenarios.find(s => s.type === 'worst')!
  let recommendation: string

  if (worstCase.endCashBalance < 0) {
    recommendation = 'WARNING: Under the worst-case scenario, your cash balance goes negative. Consider reducing expenses or securing additional funding to improve your runway.'
  } else if (baseCase.projected12MonthProfit > 0 && baseCase.ltvCacRatio > 3) {
    recommendation = 'Your financial outlook is positive. The base case shows profitability within 12 months. Consider reinvesting profits into growth to accelerate the best-case scenario.'
  } else if (baseCase.projected12MonthProfit > 0) {
    recommendation = 'The base case projects profitability within 12 months. Focus on maintaining revenue growth while controlling expenses to stay on track.'
  } else {
    recommendation = 'The base case does not project profitability within 12 months. Focus on increasing revenue or reducing expenses. The best-case scenario shows the potential upside if you can accelerate growth.'
  }

  return { scenarios, recommendation }
}

// ==========================================
// KPI HEALTH SCORING
// ==========================================

export interface KPIHealthScore {
  overallScore: number       // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  categories: {
    name: string
    score: number
    status: 'healthy' | 'warning' | 'critical'
    details: string
  }[]
  alerts: {
    severity: 'info' | 'warning' | 'critical'
    message: string
    kpi: string
  }[]
}

export async function calculateKPIHealth(organizationId: string): Promise<KPIHealthScore> {
  const kpis = await db.kpi.findMany({
    where: { organizationId },
    orderBy: { period: 'desc' },
  })

  const currentPeriod = getCurrentMonthPeriod()
  const currentKpis = kpis.filter(k => k.period === currentPeriod)
  const previousPeriod = getPreviousMonthPeriod()
  const previousKpis = kpis.filter(k => k.period === previousPeriod)

  // Define health categories with weighted scoring
  const categories: {
    name: string
    score: number
    status: 'healthy' | 'warning' | 'critical'
    details: string
  }[] = []

  const alerts: {
    severity: 'info' | 'warning' | 'critical'
    message: string
    kpi: string
  }[] = []

  // 1. Revenue Health (weight: 30%)
  const revenueKpis = currentKpis.filter(k => k.category === 'revenue')
  const prevRevenueKpis = previousKpis.filter(k => k.category === 'revenue')
  const currentRevenue = revenueKpis.filter(k => k.unit === 'USD').reduce((s, k) => s + k.value, 0)
  const prevRevenue = prevRevenueKpis.filter(k => k.unit === 'USD').reduce((s, k) => s + k.value, 0)
  const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0
  const revenueScore = calculateRevenueScore(currentRevenue, revenueGrowth)
  categories.push({
    name: 'Revenue',
    score: revenueScore,
    status: revenueScore >= 70 ? 'healthy' : revenueScore >= 40 ? 'warning' : 'critical',
    details: `Revenue: $${currentRevenue.toLocaleString()}. Growth: ${revenueGrowth.toFixed(1)}%.`,
  })
  if (revenueGrowth < -10) {
    alerts.push({ severity: 'critical', message: `Revenue declined ${Math.abs(revenueGrowth).toFixed(1)}% month-over-month`, kpi: 'revenue_growth' })
  } else if (revenueGrowth < 0) {
    alerts.push({ severity: 'warning', message: `Revenue declined ${Math.abs(revenueGrowth).toFixed(1)}% month-over-month`, kpi: 'revenue_growth' })
  }

  // 2. Cash Health (weight: 25%)
  const cashKpis = currentKpis.filter(k => k.category === 'cash' || k.name.toLowerCase().includes('cash'))
  const cashBalance = cashKpis.find(k => k.name.toLowerCase().includes('cash balance'))?.value || 0
  const burnRate = cashKpis.find(k => k.name.toLowerCase().includes('burn rate'))?.value || 0
  const runway = cashKpis.find(k => k.name.toLowerCase().includes('runway'))?.value || 0
  const cashScore = calculateCashScore(cashBalance, burnRate, runway)
  categories.push({
    name: 'Cash',
    score: cashScore,
    status: cashScore >= 70 ? 'healthy' : cashScore >= 40 ? 'warning' : 'critical',
    details: `Cash: $${cashBalance.toLocaleString()}. Runway: ${runway > 0 ? runway.toFixed(1) + ' months' : 'N/A'}.`,
  })
  if (runway > 0 && runway < 6) {
    alerts.push({ severity: 'critical', message: `Runway is only ${runway.toFixed(1)} months. Immediate action required.`, kpi: 'runway' })
  } else if (runway > 0 && runway < 12) {
    alerts.push({ severity: 'warning', message: `Runway is ${runway.toFixed(1)} months. Consider fundraising.`, kpi: 'runway' })
  }

  // 3. Growth Health (weight: 20%)
  const growthKpis = currentKpis.filter(k => k.category === 'growth')
  const customerCount = currentKpis.find(k => k.name.toLowerCase().includes('customer'))?.value || 0
  const prevCustomerCount = previousKpis.find(k => k.name.toLowerCase().includes('customer'))?.value || 0
  const customerGrowth = prevCustomerCount > 0 ? ((customerCount - prevCustomerCount) / prevCustomerCount) * 100 : 0
  const growthMetrics = growthKpis.length > 0
    ? growthKpis.reduce((sum, k) => {
        const targetMet = k.target ? k.value >= k.target : true
        return sum + (targetMet ? 20 : 10)
      }, 0) / growthKpis.length
    : 50
  const growthScore = Math.min(100, Math.max(0, customerGrowth > 10 ? growthMetrics + 20 : growthMetrics))
  categories.push({
    name: 'Growth',
    score: Math.round(growthScore),
    status: growthScore >= 70 ? 'healthy' : growthScore >= 40 ? 'warning' : 'critical',
    details: `Customers: ${customerCount}. Growth: ${customerGrowth.toFixed(1)}%.`,
  })
  if (customerGrowth < -5) {
    alerts.push({ severity: 'critical', message: `Customer count declining at ${Math.abs(customerGrowth).toFixed(1)}%`, kpi: 'customer_growth' })
  }

  // 4. SaaS Metrics Health (weight: 15%)
  const saasKpis = currentKpis.filter(k => k.category === 'saas')
  const churnRate = saasKpis.find(k => k.name.toLowerCase().includes('churn'))?.value || 5
  const ltvCacKpi = saasKpis.find(k => k.name.toLowerCase().includes('ltv') || k.name.toLowerCase().includes('cac'))
  const saasScore = calculateSaaSMetricScore(churnRate, ltvCacKpi?.value)
  categories.push({
    name: 'SaaS Metrics',
    score: saasScore,
    status: saasScore >= 70 ? 'healthy' : saasScore >= 40 ? 'warning' : 'critical',
    details: `Churn: ${churnRate.toFixed(1)}%. ${ltvCacKpi ? `LTV:CAC: ${ltvCacKpi.value.toFixed(1)}x.` : ''}`,
  })
  if (churnRate > 10) {
    alerts.push({ severity: 'critical', message: `Churn rate is very high at ${churnRate.toFixed(1)}%`, kpi: 'churn_rate' })
  } else if (churnRate > 5) {
    alerts.push({ severity: 'warning', message: `Churn rate is elevated at ${churnRate.toFixed(1)}%`, kpi: 'churn_rate' })
  }

  // 5. Efficiency Health (weight: 10%)
  const totalExpenses = currentKpis
    .filter(k => k.name.toLowerCase().includes('expense') && k.unit === 'USD')
    .reduce((s, k) => s + k.value, 0)
  const efficiency = currentRevenue > 0 ? (currentRevenue - totalExpenses) / currentRevenue : 0
  const efficiencyScore = Math.min(100, Math.max(0, efficiency * 100 + 50))
  categories.push({
    name: 'Efficiency',
    score: Math.round(efficiencyScore),
    status: efficiencyScore >= 70 ? 'healthy' : efficiencyScore >= 40 ? 'warning' : 'critical',
    details: `Profit margin: ${(efficiency * 100).toFixed(1)}%. Revenue/Expense ratio: ${totalExpenses > 0 ? (currentRevenue / totalExpenses).toFixed(2) : 'N/A'}.`,
  })
  if (efficiency < -0.5) {
    alerts.push({ severity: 'critical', message: 'Expenses significantly exceed revenue. Immediate cost reduction needed.', kpi: 'profit_margin' })
  }

  // Calculate weighted overall score
  const weights = [
    { category: 'Revenue', weight: 0.30 },
    { category: 'Cash', weight: 0.25 },
    { category: 'Growth', weight: 0.20 },
    { category: 'SaaS Metrics', weight: 0.15 },
    { category: 'Efficiency', weight: 0.10 },
  ]

  const overallScore = Math.round(
    weights.reduce((sum, w) => {
      const cat = categories.find(c => c.name === w.category)
      return sum + (cat?.score || 0) * w.weight
    }, 0)
  )

  // Determine grade
  const grade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F'

  return {
    overallScore,
    grade,
    categories,
    alerts,
  }
}

// ==========================================
// INVESTOR METRICS
// ==========================================

export interface InvestorMetrics {
  valuation: {
    revenueMultiple: number
    estimatedValuation: number
    method: string
  }
  traction: {
    mrrGrowth: number        // MRR growth rate
    customerGrowth: number   // Customer growth rate
    netRevenueRetention: number
  }
  unitEconomics: {
    ltv: number
    cac: number
    ltvCacRatio: number
    paybackMonths: number
    grossMargin: number
  }
  burnEfficiency: {
    netBurn: number
    arrPerEmployee: number    // ARR / team size estimate
    monthsOfRunway: number
  }
}

export async function calculateInvestorMetrics(organizationId: string): Promise<InvestorMetrics> {
  // Get all relevant data
  const kpis = await db.kpi.findMany({
    where: { organizationId },
    orderBy: { period: 'desc' },
  })

  const currentPeriod = getCurrentMonthPeriod()
  const currentKpis = kpis.filter(k => k.period === currentPeriod)
  const previousPeriod = getPreviousMonthPeriod()
  const previousKpis = kpis.filter(k => k.period === previousPeriod)

  // Base metrics
  const mrr = currentKpis.filter(k => k.category === 'revenue' && k.unit === 'USD').reduce((s, k) => s + k.value, 0)
  const prevMrr = previousKpis.filter(k => k.category === 'revenue' && k.unit === 'USD').reduce((s, k) => s + k.value, 0)
  const arr = mrr * 12

  // Customer counts
  const totalCustomers = currentKpis.find(k => k.name.toLowerCase().includes('customer'))?.value || 0
  const prevCustomers = previousKpis.find(k => k.name.toLowerCase().includes('customer'))?.value || 0

  // SaaS metrics
  const churnRate = (currentKpis.find(k => k.name.toLowerCase().includes('churn') && k.unit === 'percent')?.value || 5) / 100
  const nrr = currentKpis.find(k => k.name.toLowerCase().includes('net revenue retention') || k.name.toLowerCase().includes('nrr'))?.value || 100
  const cogs = currentKpis.filter(k => k.name.toLowerCase().includes('cogs')).reduce((s, k) => s + k.value, 0)
  const grossMargin = mrr > 0 ? ((mrr - cogs) / mrr) * 100 : 70

  // CAC and LTV
  const marketingSpend = currentKpis.filter(k => k.name.toLowerCase().includes('marketing')).reduce((s, k) => s + k.value, 0)
  const newCustomers = currentKpis.find(k => k.name.toLowerCase().includes('new customer'))?.value || 0
  const cac = newCustomers > 0 ? marketingSpend / newCustomers : 0
  const arpu = totalCustomers > 0 ? mrr / totalCustomers : 0
  const ltv = churnRate > 0 ? arpu * (1 / churnRate) * (grossMargin / 100) : arpu * 20 * (grossMargin / 100)
  const ltvCacRatio = cac > 0 ? ltv / cac : 0
  const paybackMonths = (arpu * (grossMargin / 100)) > 0 ? cac / (arpu * (grossMargin / 100)) : 0

  // Burn rate
  const cashBalance = currentKpis.find(k => k.name.toLowerCase().includes('cash'))?.value || 0
  const netBurn = currentKpis.find(k => k.name.toLowerCase().includes('burn'))?.value || 0
  const monthsOfRunway = netBurn > 0 ? cashBalance / netBurn : 999

  // Organization info for team size estimate
  const membershipCount = await db.membership.count({
    where: { organizationId, isActive: true },
  })
  const teamSize = Math.max(membershipCount, 1)
  const arrPerEmployee = arr / teamSize

  // Valuation using revenue multiple method
  // Industry standard multiples: SaaS at growth stages
  const mrrGrowth = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0
  const customerGrowth = prevCustomers > 0 ? ((totalCustomers - prevCustomers) / prevCustomers) * 100 : 0

  // Revenue multiple based on growth rate
  let revenueMultiple: number
  if (mrrGrowth > 100) revenueMultiple = 20
  else if (mrrGrowth > 50) revenueMultiple = 15
  else if (mrrGrowth > 20) revenueMultiple = 10
  else if (mrrGrowth > 10) revenueMultiple = 7
  else if (mrrGrowth > 0) revenueMultiple = 5
  else revenueMultiple = 3

  const estimatedValuation = arr * revenueMultiple

  return {
    valuation: {
      revenueMultiple,
      estimatedValuation: Math.round(estimatedValuation * 100) / 100,
      method: 'Revenue Multiple (ARR-based)',
    },
    traction: {
      mrrGrowth: Math.round(mrrGrowth * 100) / 100,
      customerGrowth: Math.round(customerGrowth * 100) / 100,
      netRevenueRetention: Math.round(nrr * 100) / 100,
    },
    unitEconomics: {
      ltv: Math.round(ltv * 100) / 100,
      cac: Math.round(cac * 100) / 100,
      ltvCacRatio: Math.round(ltvCacRatio * 100) / 100,
      paybackMonths: Math.round(paybackMonths * 100) / 100,
      grossMargin: Math.round(grossMargin * 100) / 100,
    },
    burnEfficiency: {
      netBurn: Math.round(netBurn * 100) / 100,
      arrPerEmployee: Math.round(arrPerEmployee * 100) / 100,
      monthsOfRunway: Math.round(monthsOfRunway * 100) / 100,
    },
  }
}

// ==========================================
// FORECAST VALIDATION
// ==========================================

export interface ForecastValidation {
  forecastId: string
  isValid: boolean
  warnings: string[]
  errors: string[]
  assumptions: string[]
  riskFactors: string[]
}

export async function validateForecast(forecastId: string): Promise<ForecastValidation> {
  const warnings: string[] = []
  const errors: string[] = []
  const assumptions: string[] = []
  const riskFactors: string[] = []

  // Fetch the forecast with all related data
  const forecast = await db.forecast.findUnique({
    where: { id: forecastId },
    include: {
      revenueItems: true,
      expenseItems: true,
      statements: {
        where: { type: 'pnl' },
        orderBy: { month: 'asc' },
      },
    },
  })

  if (!forecast) {
    return {
      forecastId,
      isValid: false,
      warnings: [],
      errors: ['Forecast not found'],
      assumptions: [],
      riskFactors: [],
    }
  }

  // Check for critical errors
  if (forecast.revenueItems.length === 0) {
    errors.push('Forecast has no revenue items. Add at least one revenue stream.')
  }

  if (forecast.expenseItems.length === 0) {
    warnings.push('Forecast has no expense items. Consider adding expense projections for a complete picture.')
  }

  // Check financial statements
  const pnlStatements = forecast.statements.filter(s => s.type === 'pnl')

  if (pnlStatements.length === 0) {
    errors.push('No financial statements generated for this forecast.')
  } else {
    // Check for negative runway
    const negativeRunway = pnlStatements.find(s => s.runway < 0)
    if (negativeRunway) {
      errors.push(`Negative runway detected in ${negativeRunway.month}. Cash balance is insufficient to cover expenses.`)
    }

    // Check for consistent cash decline
    let decliningMonths = 0
    for (let i = 1; i < pnlStatements.length; i++) {
      if (pnlStatements[i].cashBalance < pnlStatements[i - 1].cashBalance) {
        decliningMonths++
      }
    }
    if (decliningMonths > pnlStatements.length * 0.8 && pnlStatements.length > 3) {
      errors.push(`Cash balance declining in ${decliningMonths} of ${pnlStatements.length} months. The business is not sustainable at this rate.`)
    }

    // Check for zero revenue throughout
    const totalRevenue = pnlStatements.reduce((sum, s) => sum + s.revenue, 0)
    if (totalRevenue === 0) {
      errors.push('Total projected revenue is zero across all months.')
    }

    // Check for unrealistic growth rates in revenue items
    for (const rev of forecast.revenueItems) {
      if (rev.growthRate > 50) {
        warnings.push(`Revenue item "${rev.name}" has a very high growth rate of ${rev.growthRate}%/month. This may be unrealistic.`)
        riskFactors.push(`High growth assumption for "${rev.name}" (${rev.growthRate}%/month)`)
      }
      if (rev.growthRate < -20) {
        warnings.push(`Revenue item "${rev.name}" has a steep decline rate of ${rev.growthRate}%/month.`)
      }
    }

    // Check for unrealistic expense growth
    for (const exp of forecast.expenseItems) {
      if (exp.growthRate > 30) {
        warnings.push(`Expense item "${exp.name}" has a high growth rate of ${exp.growthRate}%/month. This could erode margins quickly.`)
        riskFactors.push(`Escalating expenses for "${exp.name}" (${exp.growthRate}%/month)`)
      }
    }

    // Check break-even analysis
    const profitableMonths = pnlStatements.filter(s => s.netIncome > 0)
    if (profitableMonths.length === 0 && pnlStatements.length >= 6) {
      warnings.push('No profitable months in the forecast period. Break-even is not achieved within the projection.')
      riskFactors.push('No break-even achieved within forecast period')
    }

    // Check for very short runway
    const latestStatement = pnlStatements[pnlStatements.length - 1]
    if (latestStatement && latestStatement.runway > 0 && latestStatement.runway < 6) {
      errors.push(`Runway is only ${latestStatement.runway.toFixed(1)} months at the end of the forecast. Funding is urgently needed.`)
      riskFactors.push('Less than 6 months of runway')
    } else if (latestStatement && latestStatement.runway > 0 && latestStatement.runway < 12) {
      warnings.push(`Runway is ${latestStatement.runway.toFixed(1)} months at end of forecast. Consider fundraising.`)
    }

    // Check expense/revenue ratio
    const totalExpenses = pnlStatements.reduce((sum, s) => sum + s.expenses, 0)
    if (totalRevenue > 0 && totalExpenses / totalRevenue > 3) {
      warnings.push(`Expenses are ${((totalExpenses / totalRevenue) * 100).toFixed(0)}% of revenue. The expense-to-revenue ratio is very high.`)
    }

    // Identify assumptions
    assumptions.push(`Forecast type: ${forecast.type} case`)
    assumptions.push(`Projection period: ${forecast.startMonth} to ${forecast.endMonth}`)
    assumptions.push(`Revenue streams: ${forecast.revenueItems.length}`)
    assumptions.push(`Expense categories: ${forecast.expenseItems.length}`)
    assumptions.push(`Average revenue growth rate: ${forecast.revenueItems.length > 0 ? (forecast.revenueItems.reduce((s, r) => s + r.growthRate, 0) / forecast.revenueItems.length).toFixed(1) : 0}%/month`)
    assumptions.push(`Average expense growth rate: ${forecast.expenseItems.length > 0 ? (forecast.expenseItems.reduce((s, e) => s + e.growthRate, 0) / forecast.expenseItems.length).toFixed(1) : 0}%/month`)

    // Add risk factors for market conditions
    if (forecast.revenueItems.filter(r => r.recurring).length === 0 && forecast.revenueItems.length > 0) {
      riskFactors.push('No recurring revenue streams — revenue may be inconsistent')
    }

    if (forecast.expenseItems.filter(e => e.category === 'payroll').reduce((s, e) => s + e.amount, 0) >
        forecast.expenseItems.reduce((s, e) => s + e.amount, 0) * 0.7) {
      riskFactors.push('High payroll concentration (>70% of expenses) — difficult to cut costs quickly')
    }
  }

  return {
    forecastId,
    isValid: errors.length === 0,
    warnings,
    errors,
    assumptions,
    riskFactors,
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getCurrentMonthPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getPreviousMonthPeriod(): string {
  const now = new Date()
  now.setMonth(now.getMonth() - 1)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function determineBurnTrend(
  history: { month: string; grossBurn: number; netBurn: number; cashBalance: number }[]
): 'increasing' | 'stable' | 'decreasing' {
  if (history.length < 2) return 'stable'

  const recent = history.slice(-3)
  if (recent.length < 2) return 'stable'

  // Compare first and last net burn in the recent period
  const firstNetBurn = recent[0].netBurn
  const lastNetBurn = recent[recent.length - 1].netBurn

  const changeRate = firstNetBurn !== 0 ? (lastNetBurn - firstNetBurn) / Math.abs(firstNetBurn) : 0

  if (changeRate > 0.1) return 'increasing'
  if (changeRate < -0.1) return 'decreasing'
  return 'stable'
}

function calculateRevenueScore(revenue: number, growthRate: number): number {
  let score = 50 // base score

  // Revenue magnitude bonus
  if (revenue > 100000) score += 20
  else if (revenue > 50000) score += 15
  else if (revenue > 10000) score += 10
  else if (revenue > 0) score += 5

  // Growth rate bonus
  if (growthRate > 20) score += 30
  else if (growthRate > 10) score += 20
  else if (growthRate > 0) score += 10
  else if (growthRate > -5) score += 0
  else if (growthRate > -10) score -= 15
  else score -= 30

  return Math.min(100, Math.max(0, score))
}

function calculateCashScore(cashBalance: number, burnRate: number, runway: number): number {
  let score = 50

  if (runway >= 18) score += 40
  else if (runway >= 12) score += 30
  else if (runway >= 6) score += 15
  else if (runway >= 3) score -= 10
  else if (runway > 0) score -= 30
  else if (burnRate > 0) score -= 50 // no runway and burning cash

  if (cashBalance > 500000) score += 10
  else if (cashBalance > 100000) score += 5

  return Math.min(100, Math.max(0, score))
}

function calculateSaaSMetricScore(churnRate: number, ltvCacRatio?: number): number {
  let score = 50

  // Churn rate scoring (lower is better)
  if (churnRate <= 2) score += 30
  else if (churnRate <= 5) score += 20
  else if (churnRate <= 10) score += 5
  else if (churnRate <= 15) score -= 10
  else score -= 25

  // LTV:CAC ratio scoring (higher is better)
  if (ltvCacRatio !== undefined) {
    if (ltvCacRatio >= 5) score += 20
    else if (ltvCacRatio >= 3) score += 15
    else if (ltvCacRatio >= 1) score += 5
    else score -= 10
  }

  return Math.min(100, Math.max(0, score))
}
