import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, agentType } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Use the LLM SDK
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    // Build system prompt based on agent type
    const systemPrompts: Record<string, string> = {
      cfo: `You are the CFO Agent of GangNiaga AI, an autonomous business operating system. You specialize in financial strategy, cash flow analysis, forecasting, budgeting, and financial risk assessment. Provide detailed, data-driven financial insights. Use markdown formatting for clarity. Be concise but thorough.`,
      ceo: `You are the CEO Agent of GangNiaga AI. You specialize in executive summaries, strategic planning, business vision, market positioning, and organizational leadership. Provide high-level strategic insights. Use markdown formatting.`,
      research: `You are the Research Agent of GangNiaga AI. You specialize in market intelligence, competitor analysis, industry trends, and market research. Provide well-researched, factual insights with specific data points when possible. Use markdown formatting.`,
      growth: `You are the Growth Agent of GangNiaga AI. You specialize in growth strategies, customer acquisition, retention optimization, marketing channels, and scaling operations. Provide actionable growth recommendations with specific tactics. Use markdown formatting.`,
      general: `You are the GangNiaga AI Copilot, an intelligent business assistant powered by GangNiaga AI OS. You help with business planning, financial analysis, market research, and strategic decision-making. You have access to business data and can provide insights on demand. Be helpful, professional, and data-driven. Use markdown formatting for better readability.`,
    }

    const systemPrompt = systemPrompts[agentType || 'general']

    // Resolve user ID from session or fallback
    let userId: string
    try {
      const cookieStore = await cookies()
      const sessionUserId = cookieStore.get('session_user')?.value
      if (sessionUserId) {
        userId = sessionUserId
      } else {
        // Fallback: find any existing user
        const anyUser = await db.user.findFirst()
        userId = anyUser?.id || 'unknown'
      }
    } catch {
      const anyUser = await db.user.findFirst()
      userId = anyUser?.id || 'unknown'
    }

    // Get or create chat session
    let chatSession = sessionId
    if (!chatSession) {
      const session = await db.chatSession.create({
        data: {
          userId,
          title: message.slice(0, 50),
          agentType: agentType || 'general',
        },
      })
      chatSession = session.id
    }

    // Save user message
    await db.chatMessage.create({
      data: {
        sessionId: chatSession,
        role: 'user',
        content: message,
      },
    })

    // Get conversation history
    const messages = await db.chatMessage.findMany({
      where: { sessionId: chatSession },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    // Build messages array for LLM
    const llmMessages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // Call LLM
    const completion = await zai.chat.completions.create({
      messages: llmMessages,
      thinking: { type: 'disabled' },
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'

    // Save assistant message
    await db.chatMessage.create({
      data: {
        sessionId: chatSession,
        role: 'assistant',
        content: aiResponse,
      },
    })

    return NextResponse.json({
      response: aiResponse,
      sessionId: chatSession,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}
