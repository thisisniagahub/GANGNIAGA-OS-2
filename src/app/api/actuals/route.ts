// GangNiaga AI — Live Plan vs Actuals Tracking API
// GET  /api/actuals — Get actuals, variances, alerts, and dashboard data
// POST /api/actuals — Import actuals, trigger sync, compute variances, generate alerts

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth } from '@/lib/middleware'
import {
  importActuals,
  computeVariances,
  generateAlerts,
  getDashboardData,
  simulateQuickBooksSync,
  simulateXeroSync,
  type ImportActualsData,
} from '@/lib/actuals'

// GET — Retrieve actuals + variances + alerts for dashboard with graceful degradation for serverless
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ actuals: [], variances: [], alerts: [], dashboardData: null })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ actuals: [], variances: [], alerts: [], dashboardData: null })
    }

    // Verify org membership
    if (user.organizationId !== organizationId) {
      return NextResponse.json({ actuals: [], variances: [], alerts: [], dashboardData: null })
    }

    // Check for specific data type request
    const type = searchParams.get('type') // 'dashboard' | 'actuals' | 'variances' | 'alerts'

    if (type === 'actuals') {
      const { db } = await import('@/lib/db')
      const actuals = await db.actualFinancial.findMany({
        where: { organizationId },
        orderBy: { period: 'desc' },
        take: 24,
      })
      return NextResponse.json({ actuals })
    }

    if (type === 'variances') {
      const { db } = await import('@/lib/db')
      const forecastId = searchParams.get('forecastId') || undefined
      const variances = await db.forecastVariance.findMany({
        where: {
          organizationId,
          ...(forecastId ? { forecastId } : {}),
        },
        orderBy: { period: 'desc' },
      })
      return NextResponse.json({ variances })
    }

    if (type === 'alerts') {
      const { db } = await import('@/lib/db')
      const includeDismissed = searchParams.get('includeDismissed') === 'true'
      const alerts = await db.financialAlert.findMany({
        where: {
          organizationId,
          ...(includeDismissed ? {} : { dismissed: false }),
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ alerts })
    }

    // Default: return full dashboard data
    const dashboardData = await getDashboardData(organizationId)
    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Actuals GET error:', error)
    return NextResponse.json({ actuals: [], variances: [], alerts: [], dashboardData: null })
  }
}

// POST — Import actuals, trigger syncs, compute variances, generate alerts
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()
    const { organizationId, action } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 },
      )
    }

    // Verify org membership
    if (user.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Organization ID does not match your membership' },
        { status: 403 },
      )
    }

    switch (action) {
      // Import actual financial data manually
      case 'import': {
        const { data } = body as { data: ImportActualsData }
        if (!data?.period) {
          return NextResponse.json(
            { error: 'Period is required for import' },
            { status: 400 },
          )
        }

        const source = data.sourceSyncId
          ? 'csv_import' as const
          : 'manual' as const

        const result = await importActuals(organizationId, data, source)
        return NextResponse.json({
          message: result.created ? 'Actuals imported successfully' : 'Actuals updated successfully',
          ...result,
        })
      }

      // Simulate QuickBooks sync
      case 'sync_quickbooks': {
        const result = await simulateQuickBooksSync(organizationId)

        // Auto-compute variances after sync
        const variances = await computeVariances(organizationId)

        // Auto-generate alerts after sync
        const alerts = await generateAlerts(organizationId)

        return NextResponse.json({
          message: `QuickBooks sync complete. ${result.imported} periods imported.`,
          sync: result,
          variancesComputed: variances.length,
          alertsGenerated: alerts.length,
        })
      }

      // Simulate Xero sync
      case 'sync_xero': {
        const result = await simulateXeroSync(organizationId)

        // Auto-compute variances after sync
        const variances = await computeVariances(organizationId)

        // Auto-generate alerts after sync
        const alerts = await generateAlerts(organizationId)

        return NextResponse.json({
          message: `Xero sync complete. ${result.imported} periods imported.`,
          sync: result,
          variancesComputed: variances.length,
          alertsGenerated: alerts.length,
        })
      }

      // Compute variances
      case 'compute_variances': {
        const { forecastId } = body
        const variances = await computeVariances(organizationId, forecastId)
        return NextResponse.json({
          message: `Variances computed: ${variances.length} variance records`,
          variances,
        })
      }

      // Generate alerts
      case 'generate_alerts': {
        const alerts = await generateAlerts(organizationId)
        return NextResponse.json({
          message: `Alerts generated: ${alerts.length} alerts`,
          alerts,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: import, sync_quickbooks, sync_xero, compute_variances, generate_alerts` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('Actuals POST error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to process actuals request' },
      { status: 500 },
    )
  }
}
