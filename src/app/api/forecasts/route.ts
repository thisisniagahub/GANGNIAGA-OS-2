import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withApiHandler, getAuthUser, logAction } from '@/lib/middleware'
import { trackEvent } from '@/lib/observability'

// Helper to generate month strings between start and end (inclusive)
function generateMonths(startMonth: string, endMonth: string): string[] {
  const months: string[] = []
  const [startYear, startMon] = startMonth.split('-').map(Number)
  const [endYear, endMon] = endMonth.split('-').map(Number)

  let year = startYear
  let mon = startMon

  while (year < endYear || (year === endYear && mon <= endMon)) {
    months.push(`${year}-${String(mon).padStart(2, '0')}`)
    mon++
    if (mon > 12) {
      mon = 1
      year++
    }
  }

  return months
}

// Calculate revenue for a specific month given revenue items
function calculateMonthlyRevenue(
  revenues: { amount: number; growthRate: number; startMonth: string; endMonth: string | null; recurring: boolean }[],
  month: string,
  monthIndex: number
): number {
  let total = 0

  for (const rev of revenues) {
    // Check if this revenue item is active in this month
    if (month < rev.startMonth) continue
    if (rev.endMonth && month > rev.endMonth) continue

    // Apply growth rate compounding from the start month
    const baseAmount = rev.amount
    const compoundedAmount = baseAmount * Math.pow(1 + rev.growthRate / 100, monthIndex)
    total += compoundedAmount
  }

  return total
}

// Calculate expenses for a specific month given expense items
function calculateMonthlyExpenses(
  expenses: { amount: number; growthRate: number; startMonth: string; endMonth: string | null; recurring: boolean }[],
  month: string,
  monthIndex: number
): number {
  let total = 0

  for (const exp of expenses) {
    // Check if this expense item is active in this month
    if (month < exp.startMonth) continue
    if (exp.endMonth && month > exp.endMonth) continue

    // Apply growth rate compounding from the start month
    const baseAmount = exp.amount
    const compoundedAmount = baseAmount * Math.pow(1 + exp.growthRate / 100, monthIndex)
    total += compoundedAmount
  }

  return total
}

// POST — Create forecast with middleware
export const POST = withApiHandler({
  resource: 'forecasts',
  action: 'write',
  rateLimitEndpoint: 'forecasts',
  auditAction: 'forecast.create',
}, async (req, user) => {
  const body = await req.json()
  const { organizationId, name, type, startMonth, endMonth, currency, revenues, expenses } = body

  if (!organizationId || !name || !startMonth || !endMonth) {
    return NextResponse.json(
      { error: 'Organization ID, name, start month, and end month are required' },
      { status: 400 }
    )
  }

  // Verify the user belongs to the specified organization
  if (user.organizationId !== organizationId) {
    return NextResponse.json({ error: 'Organization ID does not match your membership' }, { status: 403 })
  }

  // Validate type
  const validTypes = ['best', 'base', 'worst', 'custom']
  if (type && !validTypes.includes(type)) {
    return NextResponse.json(
      { error: 'Type must be one of: best, base, worst, custom' },
      { status: 400 }
    )
  }

  // Create the forecast
  const forecast = await db.forecast.create({
    data: {
      name,
      type: type || 'base',
      organizationId,
      startMonth,
      endMonth,
      currency: currency || 'USD',
    },
  })

  // Create revenue items
  const revenueItems = revenues || []
  if (revenueItems.length > 0) {
    await db.forecastRevenue.createMany({
      data: revenueItems.map((rev: Record<string, unknown>, index: number) => ({
        forecastId: forecast.id,
        name: (rev.name as string) || 'Revenue Item',
        category: (rev.category as string) || 'subscription',
        amount: (rev.amount as number) || 0,
        growthRate: (rev.growthRate as number) || 0,
        startMonth: (rev.startMonth as string) || startMonth,
        endMonth: (rev.endMonth as string) || null,
        recurring: (rev.recurring as boolean) !== undefined ? (rev.recurring as boolean) : true,
        order: index,
      })),
    })
  }

  // Create expense items
  const expenseItems = expenses || []
  if (expenseItems.length > 0) {
    await db.forecastExpense.createMany({
      data: expenseItems.map((exp: Record<string, unknown>, index: number) => ({
        forecastId: forecast.id,
        name: (exp.name as string) || 'Expense Item',
        category: (exp.category as string) || 'operational',
        amount: (exp.amount as number) || 0,
        growthRate: (exp.growthRate as number) || 0,
        startMonth: (exp.startMonth as string) || startMonth,
        endMonth: (exp.endMonth as string) || null,
        recurring: (exp.recurring as boolean) !== undefined ? (exp.recurring as boolean) : true,
        order: index,
      })),
    })
  }

  // Generate financial statements for each month
  const months = generateMonths(startMonth, endMonth)
  let cumulativeCashBalance = 0

  // Re-fetch the created items to use in calculations
  const createdRevenues = await db.forecastRevenue.findMany({
    where: { forecastId: forecast.id },
  })
  const createdExpenses = await db.forecastExpense.findMany({
    where: { forecastId: forecast.id },
  })

  const statements = []

  for (let i = 0; i < months.length; i++) {
    const month = months[i]
    const monthIndex = i

    const revenueSum = calculateMonthlyRevenue(createdRevenues, month, monthIndex)
    const expenseSum = calculateMonthlyExpenses(createdExpenses, month, monthIndex)
    const netIncome = revenueSum - expenseSum
    const cashFlow = netIncome // Simplified: cash flow = net income
    cumulativeCashBalance += cashFlow

    const burnRate = expenseSum > revenueSum ? expenseSum - revenueSum : 0
    const runway = burnRate > 0 ? cumulativeCashBalance / burnRate : 0

    // P&L statement
    statements.push({
      forecastId: forecast.id,
      month,
      type: 'pnl',
      revenue: revenueSum,
      expenses: expenseSum,
      netIncome,
      assets: 0,
      liabilities: 0,
      equity: netIncome,
      cashFlow,
      cashBalance: cumulativeCashBalance,
      burnRate,
      runway: Math.max(0, runway),
    })

    // Cash flow statement
    statements.push({
      forecastId: forecast.id,
      month,
      type: 'cash_flow',
      revenue: revenueSum,
      expenses: expenseSum,
      netIncome,
      assets: 0,
      liabilities: 0,
      equity: 0,
      cashFlow,
      cashBalance: cumulativeCashBalance,
      burnRate,
      runway: Math.max(0, runway),
    })

    // Balance sheet statement (simplified)
    statements.push({
      forecastId: forecast.id,
      month,
      type: 'balance_sheet',
      revenue: revenueSum,
      expenses: expenseSum,
      netIncome,
      assets: cumulativeCashBalance > 0 ? cumulativeCashBalance : 0,
      liabilities: cumulativeCashBalance < 0 ? Math.abs(cumulativeCashBalance) : 0,
      equity: cumulativeCashBalance,
      cashFlow,
      cashBalance: cumulativeCashBalance,
      burnRate,
      runway: Math.max(0, runway),
    })
  }

  if (statements.length > 0) {
    await db.financialStatement.createMany({
      data: statements,
    })
  }

  // Return the created forecast with all items and statements
  const fullForecast = await db.forecast.findUnique({
    where: { id: forecast.id },
    include: {
      revenueItems: true,
      expenseItems: true,
      statements: {
        orderBy: [{ month: 'asc' }, { type: 'asc' }],
      },
    },
  })

  // Audit log
  await logAction(user.id, 'forecast.create', 'forecasts', {
    forecastId: forecast.id,
    name,
    type: type || 'base',
    revenueCount: revenueItems.length,
    expenseCount: expenseItems.length,
  })

  // Track event
  await trackEvent({
    organizationId,
    userId: user.id,
    eventType: 'api_request',
    source: 'api',
    status: 'info',
    message: `Forecast created: ${name}`,
    data: { forecastId: forecast.id, type, monthCount: months.length },
  }).catch(() => {})

  return NextResponse.json({ forecast: fullForecast }, { status: 201 })
})

// GET — List forecasts with graceful degradation for serverless
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ forecasts: [] })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ forecasts: [] })
    }

    // Verify org membership
    if (user.organizationId !== organizationId) {
      return NextResponse.json({ forecasts: [] })
    }

    const forecasts = await db.forecast.findMany({
      where: { organizationId },
      include: {
        revenueItems: true,
        expenseItems: true,
        statements: {
          orderBy: [{ month: 'asc' }, { type: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ forecasts })
  } catch (error) {
    console.error('Forecasts fetch error:', error)
    return NextResponse.json({ forecasts: [] })
  }
}
