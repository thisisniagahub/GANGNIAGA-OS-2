// ============================================
// LIVE PLAN VS ACTUALS TRACKING ENGINE (v4.0)
// QuickBooks/Xero integration, real-time variance analysis
// ============================================

import { db } from '@/lib/db'

// ============================================
// TYPES
// ============================================

export interface ImportActualsData {
  period: string           // "2025-01", "Q1-2025"
  revenue?: number
  cogs?: number
  grossProfit?: number
  operatingExpenses?: number
  netIncome?: number
  cashFlow?: number
  cashBalance?: number
  accountsReceivable?: number
  accountsPayable?: number
  totalAssets?: number
  totalLiabilities?: number
  equity?: number
  burnRate?: number
  runway?: number
  lineItems?: Record<string, unknown>
  sourceSyncId?: string
}

export interface VarianceResult {
  id: string
  organizationId: string
  forecastId: string | null
  period: string
  metric: string
  forecastValue: number
  actualValue: number
  variance: number
  variancePercent: number
  alertLevel: 'on_track' | 'warning' | 'critical' | 'exceeded'
  analysis: string | null
}

export interface AlertResult {
  id: string
  organizationId: string
  type: string
  metric: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  period: string | null
  data: Record<string, unknown>
  dismissed: boolean
  createdAt: Date
}

export interface DashboardData {
  actuals: {
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
    importedAt: Date
  }[]
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
    overallHealth: 'healthy' | 'attention' | 'critical'
  }
  connections: {
    id: string
    provider: string
    status: string
    companyName: string | null
    lastSyncAt: Date | null
    syncFrequency: string
  }[]
}

// ============================================
// ALERT LEVEL THRESHOLDS
// ============================================

const ALERT_THRESHOLDS = {
  on_track: 5,     // < 5% variance
  warning: 15,     // 5-15% variance
  critical: 30,    // 15-30% variance
  exceeded: Infinity, // > 30% variance
} as const

function getAlertLevel(variancePercent: number): 'on_track' | 'warning' | 'critical' | 'exceeded' {
  const absVariance = Math.abs(variancePercent)
  if (absVariance < ALERT_THRESHOLDS.on_track) return 'on_track'
  if (absVariance < ALERT_THRESHOLDS.warning) return 'warning'
  if (absVariance < ALERT_THRESHOLDS.critical) return 'critical'
  return 'exceeded'
}

// ============================================
// IMPORT ACTUALS
// ============================================

export async function importActuals(
  organizationId: string,
  data: ImportActualsData,
  source: 'quickbooks' | 'xero' | 'manual' | 'csv_import' = 'manual',
): Promise<{
  actual: {
    id: string
    period: string
    source: string
    revenue: number
    netIncome: number
    cashFlow: number
    cashBalance: number
  }
  created: boolean
}> {
  // Check if actuals already exist for this period + source
  const existing = await db.actualFinancial.findUnique({
    where: {
      organizationId_period_source: {
        organizationId,
        period: data.period,
        source,
      },
    },
  })

  const actualData = {
    organizationId,
    period: data.period,
    source,
    sourceSyncId: data.sourceSyncId || null,
    revenue: data.revenue || 0,
    cogs: data.cogs || 0,
    grossProfit: data.grossProfit || (data.revenue || 0) - (data.cogs || 0),
    operatingExpenses: data.operatingExpenses || 0,
    netIncome: data.netIncome || 0,
    cashFlow: data.cashFlow || 0,
    cashBalance: data.cashBalance || 0,
    accountsReceivable: data.accountsReceivable || 0,
    accountsPayable: data.accountsPayable || 0,
    totalAssets: data.totalAssets || 0,
    totalLiabilities: data.totalLiabilities || 0,
    equity: data.equity || 0,
    burnRate: data.burnRate || 0,
    runway: data.runway || 0,
    lineItems: data.lineItems ? JSON.stringify(data.lineItems) : '{}',
    metadata: '{}',
    importedAt: new Date(),
  }

  let actual

  if (existing) {
    // Update existing record
    actual = await db.actualFinancial.update({
      where: { id: existing.id },
      data: actualData,
    })
  } else {
    // Create new record
    actual = await db.actualFinancial.create({
      data: actualData,
    })
  }

  // Update accounting connection lastSyncAt if applicable
  if (source === 'quickbooks' || source === 'xero') {
    await db.accountingConnection.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: source,
        },
      },
      create: {
        organizationId,
        provider: source,
        status: 'connected',
        lastSyncAt: new Date(),
        companyName: source === 'quickbooks' ? 'QuickBooks Company' : 'Xero Organisation',
      },
      update: {
        status: 'connected',
        lastSyncAt: new Date(),
      },
    })
  }

  return {
    actual: {
      id: actual.id,
      period: actual.period,
      source: actual.source,
      revenue: actual.revenue,
      netIncome: actual.netIncome,
      cashFlow: actual.cashFlow,
      cashBalance: actual.cashBalance,
    },
    created: !existing,
  }
}

// ============================================
// COMPUTE VARIANCES
// ============================================

export async function computeVariances(
  organizationId: string,
  forecastId?: string,
): Promise<VarianceResult[]> {
  // Get the forecast to compare against
  let forecast
  if (forecastId) {
    forecast = await db.forecast.findUnique({
      where: { id: forecastId },
      include: {
        statements: {
          where: { type: 'pnl' },
          orderBy: { month: 'asc' },
        },
      },
    })
  } else {
    // Use the latest forecast for this org
    forecast = await db.forecast.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        statements: {
          where: { type: 'pnl' },
          orderBy: { month: 'asc' },
        },
      },
    })
  }

  if (!forecast) {
    return []
  }

  // Get actuals for the same periods
  const actuals = await db.actualFinancial.findMany({
    where: { organizationId },
    orderBy: { period: 'asc' },
  })

  // Build a map of period -> actual
  const actualsByPeriod = new Map<string, typeof actuals[0]>()
  for (const actual of actuals) {
    actualsByPeriod.set(actual.period, actual)
  }

  const variances: VarianceResult[] = []
  const metrics: { key: string; forecastField: keyof typeof forecast.statements[0]; actualField: keyof typeof actuals[0] }[] = [
    { key: 'revenue', forecastField: 'revenue', actualField: 'revenue' },
    { key: 'cogs', forecastField: 'expenses', actualField: 'cogs' },
    { key: 'gross_profit', forecastField: 'netIncome', actualField: 'grossProfit' },
    { key: 'operating_expenses', forecastField: 'expenses', actualField: 'operatingExpenses' },
    { key: 'net_income', forecastField: 'netIncome', actualField: 'netIncome' },
    { key: 'cash_flow', forecastField: 'cashFlow', actualField: 'cashFlow' },
    { key: 'burn_rate', forecastField: 'burnRate', actualField: 'burnRate' },
  ]

  // Try AI analysis for significant variances
  let aiAnalysisMap: Record<string, string> = {}
  const significantVariances: { period: string; metric: string; variancePercent: number }[] = []

  // First pass: compute raw variances to find significant ones
  for (const stmt of forecast.statements) {
    const actual = actualsByPeriod.get(stmt.month)
    if (!actual) continue

    for (const metric of metrics) {
      const forecastValue = Number(stmt[metric.forecastField]) || 0
      const actualValue = Number(actual[metric.actualField]) || 0
      const variance = actualValue - forecastValue
      const variancePercent = forecastValue !== 0 ? (variance / Math.abs(forecastValue)) * 100 : (actualValue !== 0 ? 999 : 0)

      if (Math.abs(variancePercent) >= 15) {
        significantVariances.push({
          period: stmt.month,
          metric: metric.key,
          variancePercent: Math.round(variancePercent * 100) / 100,
        })
      }
    }
  }

  // Generate AI analysis for significant variances
  if (significantVariances.length > 0) {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const analysisPrompt = `Analyze these financial forecast vs actual variances for a business. For each variance, provide a brief 1-2 sentence explanation of what might have caused it and what action the business should consider.

Variances:
${significantVariances.map(v => `- ${v.period} ${v.metric}: ${v.variancePercent > 0 ? '+' : ''}${v.variancePercent}% variance`).join('\n')}

Respond in JSON format as an object where keys are "period|metric" and values are the analysis strings. Example: {"2025-01|revenue": "Revenue exceeded forecast due to..."}`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'You are a CFO AI analyzing financial variances. Provide concise, actionable insights. Always respond with valid JSON.' },
          { role: 'user', content: analysisPrompt },
        ],
        thinking: { type: 'disabled' },
      })

      const responseText = completion.choices[0]?.message?.content || '{}'
      // Try to parse the AI response as JSON
      try {
        // Extract JSON from the response (might be wrapped in markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          aiAnalysisMap = JSON.parse(jsonMatch[0])
        }
      } catch {
        // If parsing fails, use empty analysis map
        aiAnalysisMap = {}
      }
    } catch (error) {
      console.error('AI variance analysis failed:', error)
      // Continue without AI analysis
    }
  }

  // Second pass: create variance records
  for (const stmt of forecast.statements) {
    const actual = actualsByPeriod.get(stmt.month)
    if (!actual) continue

    for (const metric of metrics) {
      const forecastValue = Number(stmt[metric.forecastField]) || 0
      const actualValue = Number(actual[metric.actualField]) || 0
      const variance = actualValue - forecastValue
      const variancePercent = forecastValue !== 0 ? (variance / Math.abs(forecastValue)) * 100 : (actualValue !== 0 ? 999 : 0)
      const alertLevel = getAlertLevel(variancePercent)
      const analysisKey = `${stmt.month}|${metric.key}`
      const analysis = aiAnalysisMap[analysisKey] || null

      // Upsert the variance record
      const existingVariance = await db.forecastVariance.findUnique({
        where: {
          organizationId_forecastId_period_metric: {
            organizationId,
            forecastId: forecast.id,
            period: stmt.month,
            metric: metric.key,
          },
        },
      })

      if (existingVariance) {
        await db.forecastVariance.update({
          where: { id: existingVariance.id },
          data: {
            forecastValue,
            actualValue,
            variance: Math.round(variance * 100) / 100,
            variancePercent: Math.round(variancePercent * 100) / 100,
            alertLevel,
            analysis,
          },
        })

        variances.push({
          id: existingVariance.id,
          organizationId,
          forecastId: forecast.id,
          period: stmt.month,
          metric: metric.key,
          forecastValue,
          actualValue,
          variance: Math.round(variance * 100) / 100,
          variancePercent: Math.round(variancePercent * 100) / 100,
          alertLevel,
          analysis,
        })
      } else {
        const newVariance = await db.forecastVariance.create({
          data: {
            organizationId,
            forecastId: forecast.id,
            period: stmt.month,
            metric: metric.key,
            forecastValue,
            actualValue,
            variance: Math.round(variance * 100) / 100,
            variancePercent: Math.round(variancePercent * 100) / 100,
            alertLevel,
            analysis,
            metadata: '{}',
          },
        })

        variances.push({
          id: newVariance.id,
          organizationId,
          forecastId: forecast.id,
          period: stmt.month,
          metric: metric.key,
          forecastValue,
          actualValue,
          variance: Math.round(variance * 100) / 100,
          variancePercent: Math.round(variancePercent * 100) / 100,
          alertLevel,
          analysis,
        })
      }
    }
  }

  return variances
}

// ============================================
// GENERATE ALERTS
// ============================================

export async function generateAlerts(organizationId: string): Promise<AlertResult[]> {
  // Get all variances for this organization
  const variances = await db.forecastVariance.findMany({
    where: { organizationId },
    orderBy: { period: 'desc' },
  })

  // Get latest actuals
  const latestActuals = await db.actualFinancial.findMany({
    where: { organizationId },
    orderBy: { period: 'desc' },
    take: 3,
  })

  // Get previous actuals for comparison
  const previousActuals = await db.actualFinancial.findMany({
    where: { organizationId },
    orderBy: { period: 'asc' },
  })

  // Clear existing non-dismissed alerts before regenerating
  await db.financialAlert.deleteMany({
    where: {
      organizationId,
      dismissed: false,
    },
  })

  const alerts: AlertResult[] = []

  // 1. REVENUE TRACKING ALERTS
  const revenueVariances = variances.filter(v => v.metric === 'revenue')
  for (const rv of revenueVariances) {
    if (rv.alertLevel === 'critical' || rv.alertLevel === 'exceeded') {
      const isNegative = rv.variance < 0
      const alert = await db.financialAlert.create({
        data: {
          organizationId,
          type: 'revenue_tracking',
          metric: 'revenue',
          message: isNegative
            ? `Revenue is ${Math.abs(rv.variancePercent).toFixed(1)}% below forecast in ${rv.period}. Actual: $${rv.actualValue.toLocaleString()} vs Forecast: $${rv.forecastValue.toLocaleString()}.`
            : `Revenue exceeded forecast by ${rv.variancePercent.toFixed(1)}% in ${rv.period}. Actual: $${rv.actualValue.toLocaleString()} vs Forecast: $${rv.forecastValue.toLocaleString()}.`,
          severity: isNegative ? (rv.alertLevel === 'exceeded' ? 'critical' : 'warning') : 'info',
          period: rv.period,
          data: JSON.stringify({
            varianceId: rv.id,
            forecastValue: rv.forecastValue,
            actualValue: rv.actualValue,
            variance: rv.variance,
            variancePercent: rv.variancePercent,
          }),
          dismissed: false,
        },
      })

      alerts.push({
        id: alert.id,
        organizationId: alert.organizationId,
        type: alert.type,
        metric: alert.metric,
        message: alert.message,
        severity: alert.severity as 'info' | 'warning' | 'critical',
        period: alert.period,
        data: JSON.parse(alert.data),
        dismissed: alert.dismissed,
        createdAt: alert.createdAt,
      })
    }
  }

  // 2. EXPENSE DRIFT ALERTS
  const expenseVariances = variances.filter(v =>
    v.metric === 'operating_expenses' || v.metric === 'cogs'
  )
  for (const ev of expenseVariances) {
    if (ev.alertLevel === 'critical' || ev.alertLevel === 'exceeded') {
      const isOver = ev.variance > 0 // positive variance means actual > forecast for expenses
      if (isOver) {
        const alert = await db.financialAlert.create({
          data: {
            organizationId,
            type: 'expense_drift',
            metric: ev.metric,
            message: `${ev.metric === 'operating_expenses' ? 'Operating expenses' : 'COGS'} exceeded forecast by ${ev.variancePercent.toFixed(1)}% in ${ev.period}. Actual: $${ev.actualValue.toLocaleString()} vs Forecast: $${ev.forecastValue.toLocaleString()}.`,
            severity: ev.alertLevel === 'exceeded' ? 'critical' : 'warning',
            period: ev.period,
            data: JSON.stringify({
              varianceId: ev.id,
              forecastValue: ev.forecastValue,
              actualValue: ev.actualValue,
              variance: ev.variance,
              variancePercent: ev.variancePercent,
            }),
            dismissed: false,
          },
        })

        alerts.push({
          id: alert.id,
          organizationId: alert.organizationId,
          type: alert.type,
          metric: alert.metric,
          message: alert.message,
          severity: alert.severity as 'info' | 'warning' | 'critical',
          period: alert.period,
          data: JSON.parse(alert.data),
          dismissed: alert.dismissed,
          createdAt: alert.createdAt,
        })
      }
    }
  }

  // 3. CASH WARNING ALERTS
  if (latestActuals.length > 0) {
    const latest = latestActuals[0]

    // Low cash balance warning
    if (latest.cashBalance < 50000 && latest.cashBalance > 0) {
      const alert = await db.financialAlert.create({
        data: {
          organizationId,
          type: 'cash_warning',
          metric: 'cash_balance',
          message: `Cash balance is critically low at $${latest.cashBalance.toLocaleString()} as of ${latest.period}. Consider immediate action to improve cash position.`,
          severity: latest.cashBalance < 20000 ? 'critical' : 'warning',
          period: latest.period,
          data: JSON.stringify({
            cashBalance: latest.cashBalance,
            burnRate: latest.burnRate,
            runway: latest.runway,
          }),
          dismissed: false,
        },
      })

      alerts.push({
        id: alert.id,
        organizationId: alert.organizationId,
        type: alert.type,
        metric: alert.metric,
        message: alert.message,
        severity: alert.severity as 'info' | 'warning' | 'critical',
        period: alert.period,
        data: JSON.parse(alert.data),
        dismissed: alert.dismissed,
        createdAt: alert.createdAt,
      })
    }

    // Short runway warning
    if (latest.runway > 0 && latest.runway < 6) {
      const alert = await db.financialAlert.create({
        data: {
          organizationId,
          type: 'cash_warning',
          metric: 'runway',
          message: `Cash runway is only ${latest.runway.toFixed(1)} months as of ${latest.period}. At current burn rate of $${latest.burnRate.toLocaleString()}/month, funding is urgently needed.`,
          severity: latest.runway < 3 ? 'critical' : 'warning',
          period: latest.period,
          data: JSON.stringify({
            runway: latest.runway,
            burnRate: latest.burnRate,
            cashBalance: latest.cashBalance,
          }),
          dismissed: false,
        },
      })

      alerts.push({
        id: alert.id,
        organizationId: alert.organizationId,
        type: alert.type,
        metric: alert.metric,
        message: alert.message,
        severity: alert.severity as 'info' | 'warning' | 'critical',
        period: alert.period,
        data: JSON.parse(alert.data),
        dismissed: alert.dismissed,
        createdAt: alert.createdAt,
      })
    }

    // Negative cash flow trend
    if (latestActuals.length >= 2) {
      const prev = latestActuals[1]
      if (latest.cashFlow < 0 && prev.cashFlow < 0) {
        const alert = await db.financialAlert.create({
          data: {
            organizationId,
            type: 'cash_warning',
            metric: 'cash_flow',
            message: `Negative cash flow for consecutive months. ${prev.period}: $${prev.cashFlow.toLocaleString()}, ${latest.period}: $${latest.cashFlow.toLocaleString()}. Immediate action needed to reverse trend.`,
            severity: 'critical',
            period: latest.period,
            data: JSON.stringify({
              currentCashFlow: latest.cashFlow,
              previousCashFlow: prev.cashFlow,
              trend: 'declining',
            }),
            dismissed: false,
          },
        })

        alerts.push({
          id: alert.id,
          organizationId: alert.organizationId,
          type: alert.type,
          metric: alert.metric,
          message: alert.message,
          severity: alert.severity as 'info' | 'warning' | 'critical',
          period: alert.period,
          data: JSON.parse(alert.data),
          dismissed: alert.dismissed,
          createdAt: alert.createdAt,
        })
      }
    }
  }

  // 4. HIRING AFFORDABILITY ALERTS
  if (latestActuals.length > 0) {
    const latest = latestActuals[0]
    // If net burn rate is high and runway is short, flag hiring concerns
    const netBurnRate = latest.burnRate > 0 ? latest.burnRate : (latest.operatingExpenses - latest.revenue)
    const avgSalaryEstimate = 8000 // rough average salary estimate

    if (netBurnRate > 0 && latest.runway > 0 && latest.runway < 12) {
      const affordableHires = Math.floor((latest.cashBalance / latest.runway - latest.operatingExpenses) / avgSalaryEstimate)
      if (affordableHires < 1) {
        const alert = await db.financialAlert.create({
          data: {
            organizationId,
            type: 'hiring_affordability',
            metric: 'net_burn_rate',
            message: `Cannot afford new hires at current burn rate. With $${latest.cashBalance.toLocaleString()} cash and ${latest.runway.toFixed(1)} months runway, hiring would reduce runway below safe levels.`,
            severity: latest.runway < 6 ? 'critical' : 'warning',
            period: latest.period,
            data: JSON.stringify({
              netBurnRate,
              runway: latest.runway,
              cashBalance: latest.cashBalance,
              estimatedAffordableHires: affordableHires,
              avgSalaryEstimate,
            }),
            dismissed: false,
          },
        })

        alerts.push({
          id: alert.id,
          organizationId: alert.organizationId,
          type: alert.type,
          metric: alert.metric,
          message: alert.message,
          severity: alert.severity as 'info' | 'warning' | 'critical',
          period: alert.period,
          data: JSON.parse(alert.data),
          dismissed: alert.dismissed,
          createdAt: alert.createdAt,
        })
      }
    }
  }

  // 5. VARIANCE THRESHOLD ALERTS (net income)
  const netIncomeVariances = variances.filter(v => v.metric === 'net_income')
  for (const niv of netIncomeVariances) {
    if (niv.alertLevel === 'exceeded' && niv.variance < 0) {
      const alert = await db.financialAlert.create({
        data: {
          organizationId,
          type: 'variance_threshold',
          metric: 'net_income',
          message: `Net income severely below forecast in ${niv.period}. Variance: ${niv.variancePercent.toFixed(1)}%. Actual: $${niv.actualValue.toLocaleString()} vs Forecast: $${niv.forecastValue.toLocaleString()}.`,
          severity: 'critical',
          period: niv.period,
          data: JSON.stringify({
            varianceId: niv.id,
            forecastValue: niv.forecastValue,
            actualValue: niv.actualValue,
            variance: niv.variance,
            variancePercent: niv.variancePercent,
          }),
          dismissed: false,
        },
      })

      alerts.push({
        id: alert.id,
        organizationId: alert.organizationId,
        type: alert.type,
        metric: alert.metric,
        message: alert.message,
        severity: alert.severity as 'info' | 'warning' | 'critical',
        period: alert.period,
        data: JSON.parse(alert.data),
        dismissed: alert.dismissed,
        createdAt: alert.createdAt,
      })
    }
  }

  // 6. MILESTONE ALERTS (positive ones)
  for (const rv of revenueVariances) {
    if (rv.alertLevel === 'on_track' && rv.variance > 0 && rv.actualValue > 0) {
      // Check if this is a first-time profitability or revenue milestone
      const prevActual = previousActuals.find(a => a.period < rv.period)
      if (prevActual && prevActual.revenue > 0 && rv.actualValue > prevActual.revenue * 1.2) {
        const alert = await db.financialAlert.create({
          data: {
            organizationId,
            type: 'milestone',
            metric: 'revenue',
            message: `Revenue milestone: ${rv.period} revenue of $${rv.actualValue.toLocaleString()} exceeded previous period by ${(((rv.actualValue - prevActual.revenue) / prevActual.revenue) * 100).toFixed(1)}% and is on track with forecast.`,
            severity: 'info',
            period: rv.period,
            data: JSON.stringify({
              currentRevenue: rv.actualValue,
              previousRevenue: prevActual.revenue,
              forecastRevenue: rv.forecastValue,
              growthPercent: ((rv.actualValue - prevActual.revenue) / prevActual.revenue) * 100,
            }),
            dismissed: false,
          },
        })

        alerts.push({
          id: alert.id,
          organizationId: alert.organizationId,
          type: alert.type,
          metric: alert.metric,
          message: alert.message,
          severity: alert.severity as 'info' | 'warning' | 'critical',
          period: alert.period,
          data: JSON.parse(alert.data),
          dismissed: alert.dismissed,
          createdAt: alert.createdAt,
        })
      }
    }
  }

  return alerts
}

// ============================================
// GET DASHBOARD DATA
// ============================================

export async function getDashboardData(organizationId: string): Promise<DashboardData> {
  // Get actuals
  const actualsRaw = await db.actualFinancial.findMany({
    where: { organizationId },
    orderBy: { period: 'desc' },
    take: 12,
  })

  const actuals = actualsRaw.map(a => ({
    id: a.id,
    period: a.period,
    source: a.source,
    revenue: a.revenue,
    cogs: a.cogs,
    grossProfit: a.grossProfit,
    operatingExpenses: a.operatingExpenses,
    netIncome: a.netIncome,
    cashFlow: a.cashFlow,
    cashBalance: a.cashBalance,
    burnRate: a.burnRate,
    runway: a.runway,
    importedAt: a.importedAt,
  }))

  // Get variances
  const variancesRaw = await db.forecastVariance.findMany({
    where: { organizationId },
    orderBy: { period: 'desc' },
  })

  const variances: VarianceResult[] = variancesRaw.map(v => ({
    id: v.id,
    organizationId: v.organizationId,
    forecastId: v.forecastId,
    period: v.period,
    metric: v.metric,
    forecastValue: v.forecastValue,
    actualValue: v.actualValue,
    variance: v.variance,
    variancePercent: v.variancePercent,
    alertLevel: v.alertLevel as 'on_track' | 'warning' | 'critical' | 'exceeded',
    analysis: v.analysis,
  }))

  // Get alerts
  const alertsRaw = await db.financialAlert.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  })

  const alerts: AlertResult[] = alertsRaw.map(a => ({
    id: a.id,
    organizationId: a.organizationId,
    type: a.type,
    metric: a.metric,
    message: a.message,
    severity: a.severity as 'info' | 'warning' | 'critical',
    period: a.period,
    data: JSON.parse(a.data),
    dismissed: a.dismissed,
    createdAt: a.createdAt,
  }))

  // Get connections
  const connectionsRaw = await db.accountingConnection.findMany({
    where: { organizationId },
  })

  const connections = connectionsRaw.map(c => ({
    id: c.id,
    provider: c.provider,
    status: c.status,
    companyName: c.companyName,
    lastSyncAt: c.lastSyncAt,
    syncFrequency: c.syncFrequency,
  }))

  // Compute summary
  const revenueVariances = variances.filter(v => v.metric === 'revenue')
  const expenseVariances = variances.filter(v => v.metric === 'operating_expenses' || v.metric === 'cogs')
  const cashFlowVariances = variances.filter(v => v.metric === 'cash_flow')

  const avgRevenueVariance = revenueVariances.length > 0
    ? revenueVariances.reduce((sum, v) => sum + Math.abs(v.variancePercent), 0) / revenueVariances.length
    : 0

  const avgExpenseVariance = expenseVariances.length > 0
    ? expenseVariances.reduce((sum, v) => sum + Math.abs(v.variancePercent), 0) / expenseVariances.length
    : 0

  const avgCashFlowVariance = cashFlowVariances.length > 0
    ? cashFlowVariances.reduce((sum, v) => sum + Math.abs(v.variancePercent), 0) / cashFlowVariances.length
    : 0

  const onTrackCount = variances.filter(v => v.alertLevel === 'on_track').length
  const warningCount = variances.filter(v => v.alertLevel === 'warning').length
  const criticalCount = variances.filter(v => v.alertLevel === 'critical').length
  const exceededCount = variances.filter(v => v.alertLevel === 'exceeded').length

  const activeAlerts = alerts.filter(a => !a.dismissed)
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical')
  const overallHealth: 'healthy' | 'attention' | 'critical' =
    criticalAlerts.length > 0 || exceededCount > 0 ? 'critical'
    : warningCount > 0 || activeAlerts.length > 2 ? 'attention'
    : 'healthy'

  return {
    actuals,
    variances,
    alerts,
    summary: {
      totalPeriods: actuals.length,
      avgRevenueVariance: Math.round(avgRevenueVariance * 100) / 100,
      avgExpenseVariance: Math.round(avgExpenseVariance * 100) / 100,
      avgCashFlowVariance: Math.round(avgCashFlowVariance * 100) / 100,
      onTrackCount,
      warningCount,
      criticalCount,
      exceededCount,
      overallHealth,
    },
    connections,
  }
}

// ============================================
// SIMULATE QUICKBOOKS SYNC
// ============================================

export async function simulateQuickBooksSync(organizationId: string): Promise<{
  imported: number
  periods: string[]
  source: string
}> {
  // Get the latest forecast to base realistic data on
  const forecast = await db.forecast.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: {
      statements: {
        where: { type: 'pnl' },
        orderBy: { month: 'asc' },
      },
    },
  })

  // Generate 6 months of realistic mock data
  const periods: string[] = []
  let imported = 0
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    periods.push(period)

    // Base values from forecast or defaults
    const matchingStatement = forecast?.statements.find(s => s.month === period)
    const baseRevenue = matchingStatement?.revenue || 50000 + Math.random() * 30000
    const baseCogs = baseRevenue * (0.25 + Math.random() * 0.1)
    const baseOpEx = baseRevenue * (0.4 + Math.random() * 0.15)

    // Add realistic variance (QuickBooks data tends to be close but not exact)
    const varianceFactor = 0.9 + Math.random() * 0.2 // 90-110% of forecast
    const revenue = Math.round(baseRevenue * varianceFactor)
    const cogs = Math.round(baseCogs * (0.95 + Math.random() * 0.15))
    const operatingExpenses = Math.round(baseOpEx * (1 + Math.random() * 0.1))
    const grossProfit = revenue - cogs
    const netIncome = grossProfit - operatingExpenses
    const cashFlow = netIncome + Math.round(Math.random() * 5000 - 2500)
    const cashBalance = Math.round(150000 + (i * 20000) + Math.random() * 30000)
    const burnRate = operatingExpenses - revenue > 0 ? Math.round(operatingExpenses - revenue) : 0
    const runway = burnRate > 0 ? Math.round((cashBalance / burnRate) * 10) / 10 : 24

    const lineItems = {
      sales: { amount: Math.round(revenue * 0.8), category: 'Revenue' },
      services: { amount: Math.round(revenue * 0.2), category: 'Revenue' },
      salaries: { amount: Math.round(operatingExpenses * 0.55), category: 'Expense' },
      rent: { amount: Math.round(operatingExpenses * 0.15), category: 'Expense' },
      software: { amount: Math.round(operatingExpenses * 0.12), category: 'Expense' },
      marketing: { amount: Math.round(operatingExpenses * 0.1), category: 'Expense' },
      utilities: { amount: Math.round(operatingExpenses * 0.08), category: 'Expense' },
    }

    await importActuals(organizationId, {
      period,
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      netIncome,
      cashFlow,
      cashBalance,
      accountsReceivable: Math.round(revenue * (0.1 + Math.random() * 0.15)),
      accountsPayable: Math.round(operatingExpenses * (0.08 + Math.random() * 0.12)),
      totalAssets: cashBalance + Math.round(Math.random() * 100000),
      totalLiabilities: Math.round(Math.random() * 50000),
      equity: Math.round(Math.random() * 150000),
      burnRate,
      runway,
      lineItems,
      sourceSyncId: `qb-${Date.now()}-${i}`,
    }, 'quickbooks')

    imported++
  }

  // Update the accounting connection
  await db.accountingConnection.upsert({
    where: {
      organizationId_provider: {
        organizationId,
        provider: 'quickbooks',
      },
    },
    create: {
      organizationId,
      provider: 'quickbooks',
      status: 'connected',
      companyName: 'QuickBooks Demo Company',
      lastSyncAt: new Date(),
      syncFrequency: 'daily',
      scopes: JSON.stringify(['com.intuit.quickbooks.accounting']),
    },
    update: {
      status: 'connected',
      lastSyncAt: new Date(),
    },
  })

  return { imported, periods, source: 'quickbooks' }
}

// ============================================
// SIMULATE XERO SYNC
// ============================================

export async function simulateXeroSync(organizationId: string): Promise<{
  imported: number
  periods: string[]
  source: string
}> {
  // Get the latest forecast to base realistic data on
  const forecast = await db.forecast.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: {
      statements: {
        where: { type: 'pnl' },
        orderBy: { month: 'asc' },
      },
    },
  })

  // Generate 6 months of realistic mock data
  const periods: string[] = []
  let imported = 0
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    periods.push(period)

    // Base values from forecast or defaults
    const matchingStatement = forecast?.statements.find(s => s.month === period)
    const baseRevenue = matchingStatement?.revenue || 45000 + Math.random() * 25000
    const baseCogs = baseRevenue * (0.2 + Math.random() * 0.12)
    const baseOpEx = baseRevenue * (0.35 + Math.random() * 0.18)

    // Xero data tends to be slightly different from QB
    const varianceFactor = 0.92 + Math.random() * 0.18
    const revenue = Math.round(baseRevenue * varianceFactor)
    const cogs = Math.round(baseCogs * (0.9 + Math.random() * 0.2))
    const operatingExpenses = Math.round(baseOpEx * (0.95 + Math.random() * 0.12))
    const grossProfit = revenue - cogs
    const netIncome = grossProfit - operatingExpenses
    const cashFlow = netIncome + Math.round(Math.random() * 4000 - 2000)
    const cashBalance = Math.round(120000 + (i * 18000) + Math.random() * 25000)
    const burnRate = operatingExpenses - revenue > 0 ? Math.round(operatingExpenses - revenue) : 0
    const runway = burnRate > 0 ? Math.round((cashBalance / burnRate) * 10) / 10 : 24

    const lineItems = {
      invoiceRevenue: { amount: Math.round(revenue * 0.75), category: 'Revenue' },
      otherRevenue: { amount: Math.round(revenue * 0.25), category: 'Revenue' },
      wages: { amount: Math.round(operatingExpenses * 0.5), category: 'Expense' },
      officeCosts: { amount: Math.round(operatingExpenses * 0.18), category: 'Expense' },
      subscriptions: { amount: Math.round(operatingExpenses * 0.14), category: 'Expense' },
      advertising: { amount: Math.round(operatingExpenses * 0.1), category: 'Expense' },
      bankFees: { amount: Math.round(operatingExpenses * 0.03), category: 'Expense' },
      insurance: { amount: Math.round(operatingExpenses * 0.05), category: 'Expense' },
    }

    await importActuals(organizationId, {
      period,
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      netIncome,
      cashFlow,
      cashBalance,
      accountsReceivable: Math.round(revenue * (0.12 + Math.random() * 0.1)),
      accountsPayable: Math.round(operatingExpenses * (0.06 + Math.random() * 0.14)),
      totalAssets: cashBalance + Math.round(Math.random() * 80000),
      totalLiabilities: Math.round(Math.random() * 40000),
      equity: Math.round(Math.random() * 130000),
      burnRate,
      runway,
      lineItems,
      sourceSyncId: `xero-${Date.now()}-${i}`,
    }, 'xero')

    imported++
  }

  // Update the accounting connection
  await db.accountingConnection.upsert({
    where: {
      organizationId_provider: {
        organizationId,
        provider: 'xero',
      },
    },
    create: {
      organizationId,
      provider: 'xero',
      status: 'connected',
      companyName: 'Xero Demo Organisation',
      lastSyncAt: new Date(),
      syncFrequency: 'daily',
      scopes: JSON.stringify(['accounting.transactions', 'accounting.reports']),
    },
    update: {
      status: 'connected',
      lastSyncAt: new Date(),
    },
  })

  return { imported, periods, source: 'xero' }
}

// ============================================
// DISMISS ALERT
// ============================================

export async function dismissAlert(
  alertId: string,
  actionTaken?: string,
): Promise<AlertResult | null> {
  const alert = await db.financialAlert.findUnique({
    where: { id: alertId },
  })

  if (!alert) return null

  const updated = await db.financialAlert.update({
    where: { id: alertId },
    data: {
      dismissed: true,
      dismissedAt: new Date(),
      actionTaken: actionTaken || null,
    },
  })

  return {
    id: updated.id,
    organizationId: updated.organizationId,
    type: updated.type,
    metric: updated.metric,
    message: updated.message,
    severity: updated.severity as 'info' | 'warning' | 'critical',
    period: updated.period,
    data: JSON.parse(updated.data),
    dismissed: updated.dismissed,
    createdAt: updated.createdAt,
  }
}
