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

    const workflows = await db.workflow.findMany({
      where: { organizationId },
      include: {
        steps: true,
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error('Workflows fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { organizationId, name, description, trigger, schedule, steps } = body

    if (!organizationId || !name || !trigger) {
      return NextResponse.json(
        { error: 'Organization ID, name, and trigger are required' },
        { status: 400 }
      )
    }

    // Validate trigger type
    const validTriggers = ['manual', 'scheduled', 'event']
    if (!validTriggers.includes(trigger)) {
      return NextResponse.json(
        { error: `Invalid trigger. Must be one of: ${validTriggers.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate and build steps data
    const stepsData = Array.isArray(steps)
      ? steps.map((step: { type: string; name: string; config?: string; order?: number }) => ({
          type: step.type || 'agent',
          name: step.name || 'Untitled Step',
          config: step.config ? JSON.stringify(step.config) : '{}',
          order: step.order ?? 0,
        }))
      : []

    const workflow = await db.workflow.create({
      data: {
        organizationId,
        name,
        description: description || null,
        trigger,
        schedule: schedule || null,
        isActive: false,
        steps: {
          create: stepsData,
        },
      },
      include: {
        steps: true,
        runs: true,
      },
    })

    return NextResponse.json({ workflow }, { status: 201 })
  } catch (error) {
    console.error('Workflow create error:', error)
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }
}
