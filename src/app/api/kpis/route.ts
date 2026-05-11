import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const kpis = await db.kpi.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ kpis })
  } catch (error) {
    console.error('KPIs fetch error:', error)
    return NextResponse.json({ kpis: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { organizationId, name, category, value, previousValue, target, unit, period } = body

    if (!organizationId || !name || !category || value === undefined || !period) {
      return NextResponse.json(
        { error: 'Organization ID, name, category, value, and period are required' },
        { status: 400 }
      )
    }

    const kpi = await db.kpi.create({
      data: {
        organizationId,
        name,
        category,
        value: Number(value),
        previousValue: previousValue !== undefined ? Number(previousValue) : 0,
        target: target !== undefined ? Number(target) : null,
        unit: unit || 'USD',
        period,
      },
    })

    return NextResponse.json({ kpi }, { status: 201 })
  } catch (error) {
    console.error('KPI create error:', error)
    return NextResponse.json({ error: 'Failed to create KPI' }, { status: 500 })
  }
}
