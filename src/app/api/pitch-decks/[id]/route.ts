import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/middleware'
import { syncDynamicVariables, generateFunderQuestions, analyzeDeck, getDeckWithSlides } from '@/lib/pitch-deck'

// GET — Get a single deck with slides and questions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params

    const deck = await getDeckWithSlides(id)

    if (!deck) {
      return NextResponse.json({ error: 'Pitch deck not found' }, { status: 404 })
    }

    // Verify org membership
    if (user.organizationId !== deck.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse JSON fields for easier frontend consumption
    const parsedDeck = {
      ...deck,
      slides: JSON.parse(deck.slides || '[]'),
      dynamicVariables: JSON.parse(deck.dynamicVariables || '{}'),
      metadata: JSON.parse(deck.metadata || '{}'),
      useOfFunds: deck.useOfFunds ? JSON.parse(deck.useOfFunds) : null,
      slideData: deck.slideData.map((slide) => ({
        ...slide,
        content: JSON.parse(slide.content || '{}'),
        dynamicFields: JSON.parse(slide.dynamicFields || '[]'),
        metadata: JSON.parse(slide.metadata || '{}'),
      })),
      questions: deck.questions.map((q) => ({
        ...q,
        metadata: JSON.parse(q.metadata || '{}'),
      })),
    }

    return NextResponse.json({ deck: parsedDeck })
  } catch (error) {
    console.error('Pitch deck fetch error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch pitch deck' }, { status: 500 })
  }
}

// PATCH — Update deck, sync variables, generate questions, analyze, or update slide
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params
    const body = await req.json()
    const { action } = body

    // Check if deck exists and user has access
    const existingDeck = await db.pitchDeck.findUnique({
      where: { id },
    })

    if (!existingDeck) {
      return NextResponse.json({ error: 'Pitch deck not found' }, { status: 404 })
    }

    if (user.organizationId !== existingDeck.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Action: Sync dynamic variables from linked plan/forecast
    if (action === 'sync') {
      const result = await syncDynamicVariables(id)
      const deck = await getDeckWithSlides(id)
      return NextResponse.json({ deck, syncResult: result })
    }

    // Action: AI-generate funder questions
    if (action === 'generate_questions') {
      const questions = await generateFunderQuestions(id)
      const deck = await getDeckWithSlides(id)
      return NextResponse.json({ deck, questions })
    }

    // Action: AI-analyze the deck
    if (action === 'analyze') {
      const analysis = await analyzeDeck(id)
      const deck = await getDeckWithSlides(id)
      return NextResponse.json({ deck, analysis })
    }

    // Action: Update a specific slide
    if (action === 'update_slide') {
      const { slideId, data } = body
      if (!slideId) {
        return NextResponse.json({ error: 'Slide ID is required' }, { status: 400 })
      }

      // Verify slide belongs to this deck
      const existingSlide = await db.pitchDeckSlide.findUnique({
        where: { id: slideId },
      })

      if (!existingSlide || existingSlide.deckId !== id) {
        return NextResponse.json({ error: 'Slide not found in this deck' }, { status: 404 })
      }

      const updateData: Record<string, unknown> = {}
      if (data.title !== undefined) updateData.title = data.title
      if (data.type !== undefined) updateData.type = data.type
      if (data.content !== undefined) updateData.content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
      if (data.layout !== undefined) updateData.layout = data.layout
      if (data.dynamicFields !== undefined) updateData.dynamicFields = JSON.stringify(data.dynamicFields)
      if (data.speakerNotes !== undefined) updateData.speakerNotes = data.speakerNotes
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl
      if (data.order !== undefined) updateData.order = data.order

      if (Object.keys(updateData).length > 0) {
        await db.pitchDeckSlide.update({
          where: { id: slideId },
          data: updateData,
        })
      }

      const deck = await getDeckWithSlides(id)
      return NextResponse.json({ deck })
    }

    // Default: Update deck fields
    const deckUpdateData: Record<string, unknown> = {}
    if (body.title !== undefined) deckUpdateData.title = body.title
    if (body.status !== undefined) {
      const validStatuses = ['draft', 'generating', 'ready', 'presented', 'archived']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
      }
      deckUpdateData.status = body.status
    }
    if (body.fundingAsk !== undefined) deckUpdateData.fundingAsk = body.fundingAsk
    if (body.useOfFunds !== undefined) deckUpdateData.useOfFunds = typeof body.useOfFunds === 'string' ? body.useOfFunds : JSON.stringify(body.useOfFunds)
    if (body.targetAudience !== undefined) deckUpdateData.targetAudience = body.targetAudience
    if (body.planId !== undefined) deckUpdateData.planId = body.planId || null
    if (body.dynamicVariables !== undefined) deckUpdateData.dynamicVariables = typeof body.dynamicVariables === 'string' ? body.dynamicVariables : JSON.stringify(body.dynamicVariables)

    if (Object.keys(deckUpdateData).length > 0) {
      await db.pitchDeck.update({
        where: { id },
        data: deckUpdateData,
      })
    }

    const deck = await getDeckWithSlides(id)
    return NextResponse.json({ deck })
  } catch (error) {
    console.error('Pitch deck update error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : 'Failed to update pitch deck'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — Delete a pitch deck
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params

    const existingDeck = await db.pitchDeck.findUnique({
      where: { id },
    })

    if (!existingDeck) {
      return NextResponse.json({ error: 'Pitch deck not found' }, { status: 404 })
    }

    if (user.organizationId !== existingDeck.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the deck (cascading deletes handle slides and questions)
    await db.pitchDeck.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Pitch deck deleted successfully' })
  } catch (error) {
    console.error('Pitch deck deletion error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to delete pitch deck' }, { status: 500 })
  }
}
