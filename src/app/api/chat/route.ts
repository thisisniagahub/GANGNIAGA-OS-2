import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withApiHandler, logAction } from '@/lib/middleware'
import { trackEvent, trackTokenUsage } from '@/lib/observability'
import { executeAgentTask, AGENT_DEFINITIONS } from '@/lib/agents'

// POST handler wrapped with withApiHandler
export const POST = withApiHandler({
  resource: 'agents',
  action: 'execute',
  rateLimitEndpoint: 'chat',
  auditAction: 'chat.send',
}, async (req, user) => {
  const { message, sessionId, agentType } = await req.json()

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const userId = user.id
  const organizationId = user.organizationId

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

  // Use the agent orchestrator for agent-type-specific chats
  const effectiveAgentType = agentType || 'general'
  const agentDef = AGENT_DEFINITIONS[effectiveAgentType]

  let aiResponse: string

  if (agentDef) {
    // Use the agent orchestrator for defined agent types
    const result = await executeAgentTask({
      agentType: effectiveAgentType,
      task: message,
      userId,
      organizationId,
      context: {
        conversationHistory: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      },
    })
    aiResponse = result.result

    // Track token usage for the agent execution
    await trackTokenUsage({
      organizationId,
      userId,
      agentType: effectiveAgentType,
      promptTokens: 0, // Estimated from conversation length
      completionTokens: 0,
      totalTokens: Math.ceil((message.length + aiResponse.length) / 4),
      requestType: 'chat',
    }).catch(() => {})
  } else {
    // Fallback: Use inline system prompt for general/unrecognized types
    const systemPrompts: Record<string, string> = {
      general: `You are the GangNiaga AI Copilot, an intelligent business assistant powered by GangNiaga AI OS. You help with business planning, financial analysis, market research, and strategic decision-making. You have access to business data and can provide insights on demand. Be helpful, professional, and data-driven. Use markdown formatting for better readability.`,
    }

    const systemPrompt = systemPrompts[effectiveAgentType] || systemPrompts.general

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const llmMessages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const completion = await zai.chat.completions.create({
      messages: llmMessages,
      thinking: { type: 'disabled' },
    })

    aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'

    // Track token usage
    await trackTokenUsage({
      organizationId,
      userId,
      agentType: effectiveAgentType,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: Math.ceil((message.length + aiResponse.length) / 4),
      requestType: 'chat',
    }).catch(() => {})
  }

  // Save assistant message
  await db.chatMessage.create({
    data: {
      sessionId: chatSession,
      role: 'assistant',
      content: aiResponse,
    },
  })

  // Audit log for chat message
  await logAction(userId, 'chat.send', 'chat_messages', {
    sessionId: chatSession,
    agentType: effectiveAgentType,
    messageLength: message.length,
  })

  // Track observability event
  await trackEvent({
    organizationId,
    userId,
    eventType: 'api_request',
    source: 'api',
    status: 'info',
    message: `Chat message sent to ${effectiveAgentType} agent`,
    data: { sessionId: chatSession, agentType: effectiveAgentType },
  }).catch(() => {})

  return NextResponse.json({
    response: aiResponse,
    sessionId: chatSession,
  })
})
