import { NextRequest, NextResponse } from 'next/server'
import {
  calculateSaaSMetrics,
  analyzeBurnRate,
  runScenarioAnalysis,
  calculateKPIHealth,
  calculateInvestorMetrics,
  validateForecast,
} from '@/lib/finance'

// GET /api/finance?organizationId=...&type=saas|burn_rate|scenario|health|investor|validation&forecastId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const type = searchParams.get('type') || 'saas'
    const forecastId = searchParams.get('forecastId')
    const period = searchParams.get('period') || undefined

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'saas': {
        const metrics = await calculateSaaSMetrics(organizationId, period)
        return NextResponse.json({ metrics })
      }

      case 'burn_rate': {
        const analysis = await analyzeBurnRate(organizationId)
        return NextResponse.json({ analysis })
      }

      case 'scenario': {
        // Parse custom adjustments from query params if provided
        const revenueMultiplier = searchParams.get('revenueMultiplier')
        const expenseMultiplier = searchParams.get('expenseMultiplier')
        const customAdjustments = revenueMultiplier || expenseMultiplier
          ? {
              revenueMultiplier: revenueMultiplier ? parseFloat(revenueMultiplier) : undefined,
              expenseMultiplier: expenseMultiplier ? parseFloat(expenseMultiplier) : undefined,
            }
          : undefined

        const scenario = await runScenarioAnalysis(organizationId, customAdjustments)
        return NextResponse.json({ scenario })
      }

      case 'health': {
        const health = await calculateKPIHealth(organizationId)
        return NextResponse.json({ health })
      }

      case 'investor': {
        const investorMetrics = await calculateInvestorMetrics(organizationId)
        return NextResponse.json({ investorMetrics })
      }

      case 'validation': {
        if (!forecastId) {
          return NextResponse.json(
            { error: 'forecastId is required for validation' },
            { status: 400 }
          )
        }
        const validation = await validateForecast(forecastId)
        return NextResponse.json({ validation })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: saas, burn_rate, scenario, health, investor, validation' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Finance GET error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate financial metrics' },
      { status: 500 }
    )
  }
}

// POST /api/finance — Run scenario analysis with custom adjustments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { organizationId, type, revenueMultiplier, expenseMultiplier, forecastId, period } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'scenario': {
        const customAdjustments = revenueMultiplier || expenseMultiplier
          ? {
              revenueMultiplier: revenueMultiplier ? Number(revenueMultiplier) : undefined,
              expenseMultiplier: expenseMultiplier ? Number(expenseMultiplier) : undefined,
            }
          : undefined
        const scenario = await runScenarioAnalysis(organizationId, customAdjustments)
        return NextResponse.json({ scenario })
      }

      case 'validation': {
        if (!forecastId) {
          return NextResponse.json(
            { error: 'forecastId is required for validation' },
            { status: 400 }
          )
        }
        const validation = await validateForecast(forecastId)
        return NextResponse.json({ validation })
      }

      case 'saas': {
        const metrics = await calculateSaaSMetrics(organizationId, period)
        return NextResponse.json({ metrics })
      }

      case 'burn_rate': {
        const analysis = await analyzeBurnRate(organizationId)
        return NextResponse.json({ analysis })
      }

      case 'health': {
        const health = await calculateKPIHealth(organizationId)
        return NextResponse.json({ health })
      }

      case 'investor': {
        const investorMetrics = await calculateInvestorMetrics(organizationId)
        return NextResponse.json({ investorMetrics })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: saas, burn_rate, scenario, health, investor, validation' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Finance POST error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate financial metrics' },
      { status: 500 }
    )
  }
}
