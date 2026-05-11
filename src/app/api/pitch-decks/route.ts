import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, requireAuth } from '@/lib/middleware'
import { createDeck, generateDeckFromScratch, getTemplates } from '@/lib/pitch-deck'

// GET — List pitch decks by organization, or list templates with graceful degradation for serverless
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ decks: [] })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const action = searchParams.get('action')

    // Return templates if requested
    if (action === 'templates') {
      const templates = getTemplates()
      return NextResponse.json({ templates })
    }

    if (!organizationId) {
      return NextResponse.json({ decks: [] })
    }

    // Verify org membership
    if (user.organizationId !== organizationId) {
      return NextResponse.json({ decks: [] })
    }

    const decks = await db.pitchDeck.findMany({
      where: { organizationId },
      include: {
        slideData: { orderBy: { order: 'asc' }, select: { id: true, type: true, title: true, order: true, layout: true } },
        questions: { select: { id: true, category: true, likelihood: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ decks })
  } catch (error) {
    console.error('Pitch decks fetch error:', error)
    return NextResponse.json({ decks: [] })
  }
}

// POST — Create a pitch deck
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()
    const { action, organizationId, planId, templateId, title, targetAudience } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Verify org membership
    if (user.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Organization ID does not match your membership' }, { status: 403 })
    }

    if (action === 'create') {
      // Create from template
      if (!templateId) {
        return NextResponse.json({ error: 'Template ID is required for create action' }, { status: 400 })
      }
      if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 })
      }

      const deck = await createDeck(organizationId, planId || null, templateId, title)
      return NextResponse.json({ deck })
    }

    if (action === 'generate') {
      // AI-generate full deck
      const audience = targetAudience || 'investor'
      const deck = await generateDeckFromScratch(organizationId, planId || null, audience)
      return NextResponse.json({ deck })
    }

    return NextResponse.json({ error: 'Invalid action. Use "create" or "generate".' }, { status: 400 })
  } catch (error) {
    console.error('Pitch deck creation error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : 'Failed to create pitch deck'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
