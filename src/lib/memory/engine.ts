import { db } from '@/lib/db'

// ============================================
// Memory Categories
// ============================================

export type MemoryCategory =
  | 'user_preference'
  | 'workspace_context'
  | 'agent_knowledge'
  | 'forecast_insight'
  | 'workflow_pattern'
  | 'market_intelligence'
  | 'financial_summary'

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  'user_preference',
  'workspace_context',
  'agent_knowledge',
  'forecast_insight',
  'workflow_pattern',
  'market_intelligence',
  'financial_summary',
]

// ============================================
// Store a Memory Entry
// ============================================

export async function storeMemory(params: {
  organizationId?: string
  userId?: string
  agentType?: string
  category: MemoryCategory
  key: string
  value: string
  summary?: string
  source?: string
  tags?: string[]
  relevanceScore?: number
  expiresAt?: Date
}): Promise<string> {
  const {
    organizationId,
    userId,
    agentType,
    category,
    key,
    value,
    summary,
    source = 'agent',
    tags = [],
    relevanceScore = 1.0,
    expiresAt,
  } = params

  // Check if a memory with the same key already exists (upsert by key + org + user + agent)
  const existing = await db.memoryEntry.findFirst({
    where: {
      key,
      ...(organizationId ? { organizationId } : { organizationId: null }),
      ...(userId ? { userId } : { userId: null }),
      ...(agentType ? { agentType } : { agentType: null }),
      category,
    },
  })

  if (existing) {
    // Update existing memory
    const updated = await db.memoryEntry.update({
      where: { id: existing.id },
      data: {
        value,
        summary: summary || existing.summary,
        source,
        tags: JSON.stringify(tags),
        relevanceScore: Math.max(relevanceScore, existing.relevanceScore),
        accessCount: existing.accessCount,
        expiresAt: expiresAt || existing.expiresAt,
        metadata: existing.metadata,
      },
    })
    return updated.id
  }

  // Create new memory
  const memory = await db.memoryEntry.create({
    data: {
      organizationId,
      userId,
      agentType,
      category,
      key,
      value,
      summary,
      relevanceScore,
      accessCount: 0,
      source,
      tags: JSON.stringify(tags),
      metadata: '{}',
      expiresAt,
    },
  })

  return memory.id
}

// ============================================
// Retrieve Memories with Relevance Ranking
// ============================================

export async function retrieveMemories(params: {
  organizationId?: string
  userId?: string
  agentType?: string
  category?: MemoryCategory
  query?: string
  tags?: string[]
  limit?: number
  minRelevance?: number
}): Promise<any[]> {
  const {
    organizationId,
    userId,
    agentType,
    category,
    query,
    tags = [],
    limit = 10,
    minRelevance = 0.5,
  } = params

  // Build where clause
  const where: any = {
    relevanceScore: { gte: minRelevance },
    ...(organizationId ? { organizationId } : {}),
    ...(userId ? { userId } : {}),
    ...(agentType ? { agentType } : {}),
    ...(category ? { category } : {}),
  }

  // If there's a text query, use SQL LIKE for searching
  let memories: any[]

  if (query && query.trim().length > 0) {
    memories = await searchByText(query, where, limit * 3) // Fetch more, then rank and trim
  } else {
    memories = await db.memoryEntry.findMany({
      where,
      orderBy: [
        { relevanceScore: 'desc' },
        { accessCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit * 3,
    })
  }

  // Filter by tags if specified
  let filtered = memories
  if (tags.length > 0) {
    filtered = filtered.filter((m) => {
      try {
        const memoryTags: string[] = JSON.parse(m.tags || '[]')
        return tags.some((tag) => memoryTags.includes(tag))
      } catch {
        return false
      }
    })
  }

  // Rank memories: relevance * (1 + accessCount * 0.1) * recencyBoost
  const now = Date.now()
  const ranked = filtered
    .map((m) => {
      const ageMs = now - new Date(m.createdAt).getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      const recencyBoost = Math.max(0.5, 1.0 - ageDays * 0.01) // Decays over 100 days
      const accessBoost = 1 + (m.accessCount || 0) * 0.1
      const rankedScore = (m.relevanceScore || 0) * accessBoost * recencyBoost

      return {
        ...m,
        rankedScore,
        tags: safeJsonParse(m.tags, []),
        metadata: safeJsonParse(m.metadata, {}),
      }
    })
    .sort((a, b) => b.rankedScore - a.rankedScore)
    .slice(0, limit)

  // Touch each retrieved memory (increment access count)
  await Promise.all(
    ranked.map((m) => touchMemory(m.id).catch(() => {}))
  )

  return ranked
}

// ============================================
// Update Memory Relevance (Touch / Access)
// ============================================

export async function touchMemory(memoryId: string): Promise<void> {
  const memory = await db.memoryEntry.findUnique({
    where: { id: memoryId },
  })

  if (!memory) return

  // Increment access count and slightly boost relevance
  const newAccessCount = (memory.accessCount || 0) + 1
  const boostedRelevance = Math.min(1.0, (memory.relevanceScore || 0.5) + 0.01)

  await db.memoryEntry.update({
    where: { id: memoryId },
    data: {
      accessCount: newAccessCount,
      relevanceScore: boostedRelevance,
    },
  })
}

// ============================================
// Compress Old Memories (Summarization Pipeline)
// ============================================

export async function compressMemories(
  organizationId: string,
  category?: MemoryCategory
): Promise<number> {
  // Find memories that are candidates for compression:
  // - Low access count
  // - Long value (worth summarizing)
  // - Not already summarized (no summary field)
  const candidates = await db.memoryEntry.findMany({
    where: {
      organizationId,
      ...(category ? { category } : {}),
      accessCount: { lte: 2 },
      summary: null,
    },
    take: 50,
  })

  // Filter to only long values (> 500 chars) that would benefit from compression
  const toCompress = candidates.filter((m) => (m.value?.length || 0) > 500)

  if (toCompress.length === 0) return 0

  let compressed = 0

  // Process in batches of 5
  for (let i = 0; i < toCompress.length; i += 5) {
    const batch = toCompress.slice(i, i + 5)

    await Promise.all(
      batch.map(async (memory) => {
        try {
          // Use LLM to generate a summary
          const summary = await generateMemorySummary(memory.value, memory.category)

          if (summary) {
            await db.memoryEntry.update({
              where: { id: memory.id },
              data: {
                summary,
                // Replace value with summary for storage efficiency
                value: summary,
                metadata: JSON.stringify({
                  ...safeJsonParse(memory.metadata, {}),
                  compressed: true,
                  originalLength: memory.value.length,
                  compressedAt: new Date().toISOString(),
                }),
              },
            })
            compressed++
          }
        } catch (err) {
          console.error(`Failed to compress memory ${memory.id}:`, err)
        }
      })
    )
  }

  return compressed
}

// ============================================
// Delete Expired Memories
// ============================================

export async function cleanupExpiredMemories(): Promise<number> {
  const now = new Date()

  const result = await db.memoryEntry.deleteMany({
    where: {
      expiresAt: {
        not: null,
        lt: now,
      },
    },
  })

  return result.count
}

// ============================================
// Get Memory Statistics
// ============================================

export async function getMemoryStats(organizationId: string): Promise<{
  totalMemories: number
  byCategory: Record<string, number>
  byAgent: Record<string, number>
  averageRelevance: number
  oldestMemory: Date | null
  newestMemory: Date | null
}> {
  const memories = await db.memoryEntry.findMany({
    where: { organizationId },
    select: {
      category: true,
      agentType: true,
      relevanceScore: true,
      createdAt: true,
    },
  })

  const totalMemories = memories.length

  // Count by category
  const byCategory: Record<string, number> = {}
  for (const m of memories) {
    byCategory[m.category] = (byCategory[m.category] || 0) + 1
  }

  // Count by agent
  const byAgent: Record<string, number> = {}
  for (const m of memories) {
    const agent = m.agentType || 'system'
    byAgent[agent] = (byAgent[agent] || 0) + 1
  }

  // Average relevance
  const averageRelevance =
    totalMemories > 0
      ? memories.reduce((sum, m) => sum + (m.relevanceScore || 0), 0) / totalMemories
      : 0

  // Oldest and newest
  const sorted = [...memories].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const oldestMemory = sorted.length > 0 ? new Date(sorted[0].createdAt) : null
  const newestMemory =
    sorted.length > 0 ? new Date(sorted[sorted.length - 1].createdAt) : null

  return {
    totalMemories,
    byCategory,
    byAgent,
    averageRelevance,
    oldestMemory,
    newestMemory,
  }
}

// ============================================
// Internal: Search Memories by Text (Simulates Vector Search)
// ============================================

async function searchByText(
  query: string,
  filters: any,
  limit: number
): Promise<any[]> {
  // For SQLite, we use LIKE for text matching
  // Split query into words and search for any match
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 5) // Limit to 5 search terms

  if (words.length === 0) {
    return db.memoryEntry.findMany({
      where: filters,
      orderBy: { relevanceScore: 'desc' },
      take: limit,
    })
  }

  // Build OR conditions for each word
  const orConditions = words.flatMap((word) => [
    { value: { contains: word } },
    { key: { contains: word } },
    { summary: { contains: word } },
    { tags: { contains: word } },
  ])

  const where = {
    ...filters,
    OR: orConditions,
  }

  return db.memoryEntry.findMany({
    where,
    orderBy: { relevanceScore: 'desc' },
    take: limit,
  })
}

// ============================================
// Internal: Age Memory Relevance (Time Decay)
// ============================================

export async function ageMemoryRelevance(
  organizationId: string,
  decayRate: number = 0.001
): Promise<number> {
  // Find memories that haven't been accessed recently
  const memories = await db.memoryEntry.findMany({
    where: {
      organizationId,
      relevanceScore: { gt: 0.1 }, // Don't age already low-relevance memories
    },
    select: {
      id: true,
      relevanceScore: true,
      accessCount: true,
      updatedAt: true,
    },
  })

  const now = Date.now()
  let aged = 0

  for (const memory of memories) {
    // Calculate time since last update in days
    const daysSinceUpdate =
      (now - new Date(memory.updatedAt).getTime()) / (1000 * 60 * 60 * 24)

    // Only age memories older than 7 days
    if (daysSinceUpdate < 7) continue

    // Decay: relevance decreases more for less-accessed memories
    const accessFactor = Math.max(0.5, 1 - (memory.accessCount || 0) * 0.05)
    const decay = decayRate * daysSinceUpdate * accessFactor
    const newRelevance = Math.max(0.1, (memory.relevanceScore || 0.5) - decay)

    // Only update if decay is significant
    if (Math.abs(newRelevance - memory.relevanceScore) > 0.001) {
      await db.memoryEntry.update({
        where: { id: memory.id },
        data: { relevanceScore: newRelevance },
      })
      aged++
    }
  }

  return aged
}

// ============================================
// Internal: Generate Memory Summary via LLM
// ============================================

async function generateMemorySummary(
  value: string,
  category: string
): Promise<string | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'You are a memory compression engine. Your job is to summarize long text into concise, information-dense summaries that preserve all key facts, numbers, and actionable insights. Output only the summary, no preamble.',
        },
        {
          role: 'user',
          content: `Summarize the following ${category} memory into a concise but complete summary (under 200 words). Preserve all key data points, numbers, and decisions:\n\n${value}`,
        },
      ],
      thinking: { type: 'disabled' },
    })

    return completion.choices[0]?.message?.content || null
  } catch (err) {
    console.error('Memory summarization failed:', err)
    return null
  }
}

// ============================================
// Utility: Safe JSON Parse
// ============================================

function safeJsonParse(str: string | null, fallback: any): any {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}
