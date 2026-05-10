import { NextRequest, NextResponse } from 'next/server'
import { createPipeline, listPipelines } from '@/lib/agents'

// POST /api/pipelines - Create a new pipeline
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, organizationId, steps, triggerType, schedule } = body

    if (!name || !organizationId || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'Name, organizationId, and at least one step are required' },
        { status: 400 }
      )
    }

    const result = await createPipeline({
      name,
      description,
      organizationId,
      steps,
      triggerType,
      schedule,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Pipeline creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create pipeline' },
      { status: 500 }
    )
  }
}

// GET /api/pipelines - List pipelines for an organization
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId query parameter is required' },
        { status: 400 }
      )
    }

    const pipelines = await listPipelines(organizationId)
    return NextResponse.json({ pipelines })
  } catch (error) {
    console.error('Pipeline list error:', error)
    return NextResponse.json(
      { error: 'Failed to list pipelines' },
      { status: 500 }
    )
  }
}
