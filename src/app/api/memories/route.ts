import { NextRequest, NextResponse } from 'next/server'
import {
  storeMemory,
  retrieveMemories,
  getMemoryStats,
  compressMemories,
  cleanupExpiredMemories,
  ageMemoryRelevance,
} from '@/lib/memory'

// POST /api/memories - Store a new memory or perform actions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    // Action: store memory (default)
    if (!action || action === 'store') {
      const {
        organizationId,
        userId,
        agentType,
        category,
        key,
        value,
        summary,
        source,
        tags,
        relevanceScore,
        expiresAt,
      } = body

      if (!category || !key || !value) {
        return NextResponse.json(
          { error: 'category, key, and value are required' },
          { status: 400 }
        )
      }

      const memoryId = await storeMemory({
        organizationId,
        userId,
        agentType,
        category,
        key,
        value,
        summary,
        source,
        tags,
        relevanceScore,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })

      return NextResponse.json({ memoryId }, { status: 201 })
    }

    // Action: compress memories
    if (action === 'compress') {
      const { organizationId, category } = body
      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId is required for compression' },
          { status: 400 }
        )
      }

      const count = await compressMemories(organizationId, category)
      return NextResponse.json({ compressed: count })
    }

    // Action: cleanup expired memories
    if (action === 'cleanup') {
      const count = await cleanupExpiredMemories()
      return NextResponse.json({ deleted: count })
    }

    // Action: age memory relevance
    if (action === 'age') {
      const { organizationId, decayRate } = body
      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId is required for aging' },
          { status: 400 }
        )
      }

      const count = await ageMemoryRelevance(organizationId, decayRate)
      return NextResponse.json({ aged: count })
    }

    return NextResponse.json(
      { error: 'Unknown action. Valid actions: store, compress, cleanup, age' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Memory operation error:', error)
    return NextResponse.json(
      { error: 'Failed to perform memory operation' },
      { status: 500 }
    )
  }
}

// GET /api/memories - Retrieve memories or get stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    // Action: get memory stats
    if (action === 'stats') {
      const organizationId = searchParams.get('organizationId')
      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId is required for stats' },
          { status: 400 }
        )
      }

      const stats = await getMemoryStats(organizationId)
      return NextResponse.json({ stats })
    }

    // Default: retrieve memories
    const organizationId = searchParams.get('organizationId') || undefined
    const userId = searchParams.get('userId') || undefined
    const agentType = searchParams.get('agentType') || undefined
    const category = searchParams.get('category') || undefined
    const query = searchParams.get('query') || undefined
    const tagsStr = searchParams.get('tags')
    const tags = tagsStr ? tagsStr.split(',').filter(Boolean) : undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 10
    const minRelevance = searchParams.get('minRelevance')
      ? parseFloat(searchParams.get('minRelevance')!)
      : 0.5

    const memories = await retrieveMemories({
      organizationId,
      userId,
      agentType,
      category: category as any,
      query,
      tags,
      limit,
      minRelevance,
    })

    return NextResponse.json({ memories })
  } catch (error) {
    console.error('Memory retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve memories' },
      { status: 500 }
    )
  }
}
