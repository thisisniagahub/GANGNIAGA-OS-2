import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await db.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Chat session fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch chat session' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if session exists
    const existing = await db.chatSession.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    // Delete the session (cascading deletes will handle messages)
    await db.chatSession.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Chat session deleted successfully' })
  } catch (error) {
    console.error('Chat session deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 })
  }
}
