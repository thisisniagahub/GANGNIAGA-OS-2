import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// System prompts for each agent type
const agentSystemPrompts: Record<string, string> = {
  cfo: `You are the CFO Agent of GangNiaga AI, an autonomous business operating system. You specialize in financial strategy, cash flow analysis, forecasting, budgeting, and financial risk assessment. Analyze financial data, provide actionable insights, and help optimize financial performance. Use markdown formatting for clarity. Be concise but thorough. Always consider ROI, cash flow impact, and financial sustainability in your recommendations.`,
  ceo: `You are the CEO Agent of GangNiaga AI. You specialize in executive summaries, strategic planning, business vision, market positioning, and organizational leadership. Provide high-level strategic insights that connect financial data to business outcomes. Help prioritize initiatives and make strategic trade-offs. Use markdown formatting. Focus on actionable strategic recommendations.`,
  research: `You are the Research Agent of GangNiaga AI. You specialize in market intelligence, competitor analysis, industry trends, and market research. Provide well-researched, factual insights with specific data points when possible. Identify market opportunities and threats. Use markdown formatting. Always back recommendations with market evidence and trends.`,
  growth: `You are the Growth Agent of GangNiaga AI. You specialize in growth strategies, customer acquisition, retention optimization, marketing channels, and scaling operations. Provide actionable growth recommendations with specific tactics, expected impact, and implementation timelines. Use markdown formatting. Focus on measurable growth metrics and scalable strategies.`,
  operations: `You are the Operations Agent of GangNiaga AI. You specialize in workflow execution, process optimization, operational efficiency, and automation. Help streamline business operations, reduce costs, and improve productivity. Use markdown formatting. Provide step-by-step operational recommendations with clear action items.`,
  fundraising: `You are the Fundraising Agent of GangNiaga AI. You specialize in investor preparation, pitch deck creation, financial modeling for fundraising, valuation analysis, and investor communication. Help prepare compelling investment narratives and financial projections. Use markdown formatting. Focus on investor-ready deliverables and compelling data storytelling.`,
  browser: `You are the Browser Agent of GangNiaga AI. You specialize in web automation, data extraction, online research, and digital workflow execution. Help automate web-based tasks, extract data from websites, and perform online research efficiently. Use markdown formatting. Provide clear instructions for web automation tasks.`,
  reporting: `You are the Reporting Agent of GangNiaga AI. You specialize in report generation, data visualization, KPI tracking, and business intelligence. Create clear, professional reports with actionable insights. Use markdown formatting with structured sections, tables, and key takeaways. Focus on clarity and decision-support.`,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentType, task, userId } = body

    if (!agentType || !task) {
      return NextResponse.json(
        { error: 'Agent type and task are required' },
        { status: 400 }
      )
    }

    // Validate agent type
    const validTypes = ['cfo', 'ceo', 'research', 'growth', 'operations', 'fundraising', 'browser', 'reporting']
    if (!validTypes.includes(agentType)) {
      return NextResponse.json(
        { error: `Invalid agent type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Resolve user ID from session or fallback
    let effectiveUserId = userId
    if (!effectiveUserId) {
      try {
        const cookieStore = await cookies()
        effectiveUserId = cookieStore.get('session_user')?.value || undefined
      } catch {
        // Ignore cookie errors
      }
    }
    if (!effectiveUserId) {
      const anyUser = await db.user.findFirst()
      effectiveUserId = anyUser?.id || 'unknown'
    }

    // Find or create an active agent session for this user and agent type
    let session = await db.agentSession.findFirst({
      where: {
        userId: effectiveUserId,
        agentType,
        status: 'active',
      },
    })

    if (!session) {
      session = await db.agentSession.create({
        data: {
          userId: effectiveUserId,
          agentType,
          title: `${agentType.toUpperCase()} Agent Session`,
          status: 'active',
        },
      })
    }

    // Create the agent task
    const agentTask = await db.agentTask.create({
      data: {
        sessionId: session.id,
        type: agentType,
        input: task,
        status: 'running',
      },
    })

    // Use z-ai-web-dev-sdk to generate AI response
    let aiResponse = ''
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const systemPrompt = agentSystemPrompts[agentType] || agentSystemPrompts.cfo

      // Get recent tasks from this session for context
      const recentTasks = await db.agentTask.findMany({
        where: {
          sessionId: session.id,
          id: { not: agentTask.id },
          status: 'completed',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

      // Build conversation context from recent tasks
      const contextMessages = recentTasks
        .reverse()
        .flatMap((t) => [
          { role: 'user' as const, content: t.input },
          { role: 'assistant' as const, content: t.output || '' },
        ])

      const messages = [
        { role: 'assistant' as const, content: systemPrompt },
        ...contextMessages,
        { role: 'user' as const, content: task },
      ]

      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      })

      aiResponse = completion.choices[0]?.message?.content || 'I was unable to generate a response. Please try again.'
    } catch (aiError) {
      console.error('AI generation error:', aiError)
      aiResponse = 'An error occurred while generating the AI response. Please try again.'
    }

    // Update the task with the result
    await db.agentTask.update({
      where: { id: agentTask.id },
      data: {
        output: aiResponse,
        status: 'completed',
      },
    })

    // Create agent memory entry
    await db.agentMemory.create({
      data: {
        sessionId: session.id,
        type: 'agent',
        key: `task_${agentTask.id}`,
        value: aiResponse.slice(0, 500), // Store a summary
        metadata: JSON.stringify({
          agentType,
          taskPreview: task.slice(0, 200),
          timestamp: new Date().toISOString(),
        }),
      },
    })

    // Return the task and response
    const updatedTask = await db.agentTask.findUnique({
      where: { id: agentTask.id },
    })

    return NextResponse.json({ task: updatedTask, response: aiResponse }, { status: 201 })
  } catch (error) {
    console.error('Agent task creation error:', error)
    return NextResponse.json({ error: 'Failed to create and execute agent task' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      // Try to get from session cookie
      try {
        const cookieStore = await cookies()
        const sessionUserId = cookieStore.get('session_user')?.value
        if (sessionUserId) {
          const sessions = await db.agentSession.findMany({
            where: { userId: sessionUserId },
            include: { tasks: { orderBy: { createdAt: 'desc' } } },
            orderBy: { updatedAt: 'desc' },
          })
          return NextResponse.json({ sessions })
        }
      } catch {
        // Ignore cookie errors
      }
      // Fallback: return all sessions (limited)
      const sessions = await db.agentSession.findMany({
        include: { tasks: { orderBy: { createdAt: 'desc' } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      })
      return NextResponse.json({ sessions })
    }

    const sessions = await db.agentSession.findMany({
      where: { userId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Agent sessions fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch agent sessions' }, { status: 500 })
  }
}
