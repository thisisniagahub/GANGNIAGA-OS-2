import { NextRequest, NextResponse } from 'next/server'
import { getPipelineStatus, executePipeline, updatePipeline, deletePipeline } from '@/lib/agents'

// GET /api/pipelines/[id] - Get pipeline status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pipeline = await getPipelineStatus(id)
    return NextResponse.json({ pipeline })
  } catch (error) {
    console.error('Pipeline status error:', error)
    const message = error instanceof Error ? error.message : 'Failed to get pipeline'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}

// POST /api/pipelines/[id] - Execute pipeline or update it
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, triggeredBy } = body

    if (action === 'execute') {
      const result = await executePipeline(id, triggeredBy)
      return NextResponse.json(result, { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action. Use action: "execute"' }, { status: 400 })
  } catch (error) {
    console.error('Pipeline execution error:', error)
    const message = error instanceof Error ? error.message : 'Failed to execute pipeline'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/pipelines/[id] - Update pipeline
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, description, status, triggerType, schedule, steps } = body

    const pipeline = await updatePipeline(id, {
      name,
      description,
      status,
      triggerType,
      schedule,
      steps,
    })

    return NextResponse.json({ pipeline })
  } catch (error) {
    console.error('Pipeline update error:', error)
    return NextResponse.json(
      { error: 'Failed to update pipeline' },
      { status: 500 }
    )
  }
}

// DELETE /api/pipelines/[id] - Delete pipeline
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deletePipeline(id)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Pipeline delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete pipeline' },
      { status: 500 }
    )
  }
}
