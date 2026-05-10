import { db } from '@/lib/db'
import { storeMemory, retrieveMemories } from '@/lib/memory'

// ============================================
// Agent Type Definitions with Capabilities
// ============================================

export const AGENT_DEFINITIONS: Record<
  string,
  {
    name: string
    description: string
    systemPrompt: string
    capabilities: string[]
    allowedTools: string[]
    maxConcurrentTasks: number
  }
> = {
  cfo: {
    name: 'CFO Agent',
    description: 'Financial strategy, cash flow management, runway analysis',
    systemPrompt: `You are the CFO Agent of GangNiaga AI OS, an autonomous business operating system. You specialize in financial strategy, cash flow analysis, forecasting, budgeting, and financial risk assessment. Analyze financial data, provide actionable insights, and help optimize financial performance. Use markdown formatting for clarity. Be concise but thorough. Always consider ROI, cash flow impact, and financial sustainability in your recommendations. You have access to financial data, forecasts, KPIs, and can generate reports and exports.`,
    capabilities: [
      'financial_analysis',
      'forecasting',
      'budget_optimization',
      'funding_strategy',
      'cost_reduction',
    ],
    allowedTools: [
      'forecast_calculate',
      'kpi_update',
      'analytics_query',
      'export_generate',
    ],
    maxConcurrentTasks: 3,
  },
  ceo: {
    name: 'CEO Agent',
    description: 'Strategic vision, market positioning, growth strategy',
    systemPrompt: `You are the CEO Agent of GangNiaga AI OS. You specialize in executive summaries, strategic planning, business vision, market positioning, and organizational leadership. Provide high-level strategic insights that connect financial data to business outcomes. Help prioritize initiatives and make strategic trade-offs. Use markdown formatting. Focus on actionable strategic recommendations. You can search the web for market data and query analytics.`,
    capabilities: [
      'strategic_planning',
      'market_analysis',
      'competitive_positioning',
      'vision_setting',
      'decision_making',
    ],
    allowedTools: ['web_search', 'analytics_query', 'crm_lookup'],
    maxConcurrentTasks: 2,
  },
  research: {
    name: 'Research Agent',
    description:
      'Market intelligence, competitor analysis, industry trends',
    systemPrompt: `You are the Research Agent of GangNiaga AI OS. You specialize in market intelligence, competitor analysis, industry trends, and market research. Provide well-researched, factual insights with specific data points when possible. Identify market opportunities and threats. Use markdown formatting. Always back recommendations with market evidence and trends. You can search the web and navigate browsers for data.`,
    capabilities: [
      'market_research',
      'competitor_analysis',
      'trend_identification',
      'data_collection',
      'opportunity_discovery',
    ],
    allowedTools: ['web_search', 'browser_navigate', 'analytics_query'],
    maxConcurrentTasks: 5,
  },
  growth: {
    name: 'Growth Agent',
    description:
      'Customer acquisition, retention, and expansion strategies',
    systemPrompt: `You are the Growth Agent of GangNiaga AI OS. You specialize in growth strategies, customer acquisition, retention optimization, marketing channels, and scaling operations. Provide actionable growth recommendations with specific tactics, expected impact, and implementation timelines. Use markdown formatting. Focus on measurable growth metrics and scalable strategies. You can search the web, query analytics, and send notifications.`,
    capabilities: [
      'growth_strategy',
      'channel_optimization',
      'conversion_funnel',
      'retention_tactics',
      'experimentation',
    ],
    allowedTools: [
      'web_search',
      'analytics_query',
      'crm_lookup',
      'notification_send',
    ],
    maxConcurrentTasks: 3,
  },
  operations: {
    name: 'Operations Agent',
    description: 'Process optimization, resource allocation, efficiency',
    systemPrompt: `You are the Operations Agent of GangNiaga AI OS. You specialize in workflow execution, process optimization, operational efficiency, and automation. Help streamline business operations, reduce costs, and improve productivity. Use markdown formatting. Provide step-by-step operational recommendations with clear action items. You can query analytics, update KPIs, and send notifications.`,
    capabilities: [
      'process_optimization',
      'resource_management',
      'efficiency_analysis',
      'scaling_strategies',
      'automation_identification',
    ],
    allowedTools: [
      'analytics_query',
      'kpi_update',
      'notification_send',
    ],
    maxConcurrentTasks: 3,
  },
  fundraising: {
    name: 'Fundraising Agent',
    description:
      'Investment strategy, pitch preparation, investor relations',
    systemPrompt: `You are the Fundraising Agent of GangNiaga AI OS. You specialize in investor preparation, pitch deck creation, financial modeling for fundraising, valuation analysis, and investor communication. Help prepare compelling investment narratives and financial projections. Use markdown formatting. Focus on investor-ready deliverables and compelling data storytelling. You can search the web, query analytics, generate exports, and calculate forecasts.`,
    capabilities: [
      'pitch_preparation',
      'valuation_analysis',
      'investor_targeting',
      'term_sheet_review',
      'due_diligence_prep',
    ],
    allowedTools: [
      'web_search',
      'analytics_query',
      'export_generate',
      'forecast_calculate',
    ],
    maxConcurrentTasks: 2,
  },
  browser: {
    name: 'Browser Agent',
    description:
      'Web automation, data extraction, authenticated workflows',
    systemPrompt: `You are the Browser Agent of GangNiaga AI OS. You specialize in web automation, data extraction, online research, and digital workflow execution. Help automate web-based tasks, extract data from websites, and perform online research efficiently. Use markdown formatting. Provide clear instructions for web automation tasks. You can navigate the web and search for information.`,
    capabilities: [
      'web_automation',
      'data_extraction',
      'form_filling',
      'navigation',
      'screenshot_capture',
    ],
    allowedTools: ['browser_navigate', 'web_search'],
    maxConcurrentTasks: 2,
  },
  reporting: {
    name: 'Reporting Agent',
    description:
      'Report generation, data synthesis, stakeholder communication',
    systemPrompt: `You are the Reporting Agent of GangNiaga AI OS. You specialize in report generation, data visualization, KPI tracking, and business intelligence. Create clear, professional reports with actionable insights. Use markdown formatting with structured sections, tables, and key takeaways. Focus on clarity and decision-support. You can query analytics, generate exports, update KPIs, and calculate forecasts.`,
    capabilities: [
      'report_generation',
      'data_synthesis',
      'stakeholder_communication',
      'kpi_summarization',
      'trend_analysis',
    ],
    allowedTools: [
      'analytics_query',
      'export_generate',
      'kpi_update',
      'forecast_calculate',
    ],
    maxConcurrentTasks: 3,
  },
}

// ============================================
// Tool Executor
// ============================================

const TOOL_EXECUTORS: Record<string, (params: Record<string, any>) => Promise<string>> = {
  forecast_calculate: async (params) => {
    // Query financial statements for calculations
    const forecastId = params.forecastId
    if (forecastId) {
      const statements = await db.financialStatement.findMany({
        where: { forecastId },
        take: 12,
        orderBy: { month: 'asc' },
      })
      return JSON.stringify({
        tool: 'forecast_calculate',
        result: statements.length > 0 ? 'Retrieved forecast data' : 'No forecast found',
        data: statements.map((s) => ({
          month: s.month,
          revenue: s.revenue,
          expenses: s.expenses,
          netIncome: s.netIncome,
          cashFlow: s.cashFlow,
        })),
      })
    }
    return JSON.stringify({ tool: 'forecast_calculate', result: 'No forecastId provided' })
  },

  kpi_update: async (params) => {
    const { organizationId, name, value } = params
    if (organizationId && name && value !== undefined) {
      const kpi = await db.kpi.findFirst({
        where: { organizationId, name },
      })
      if (kpi) {
        await db.kpi.update({
          where: { id: kpi.id },
          data: { previousValue: kpi.value, value: parseFloat(value) },
        })
        return JSON.stringify({ tool: 'kpi_update', result: 'KPI updated', name, value })
      }
      return JSON.stringify({ tool: 'kpi_update', result: 'KPI not found', name })
    }
    return JSON.stringify({ tool: 'kpi_update', result: 'Missing required params' })
  },

  analytics_query: async (params) => {
    const { organizationId, type } = params
    if (organizationId) {
      const kpis = await db.kpi.findMany({
        where: { organizationId },
        take: 20,
        orderBy: { updatedAt: 'desc' },
      })
      return JSON.stringify({
        tool: 'analytics_query',
        result: `Retrieved ${kpis.length} KPIs`,
        data: kpis.map((k) => ({
          name: k.name,
          value: k.value,
          category: k.category,
          period: k.period,
        })),
      })
    }
    return JSON.stringify({ tool: 'analytics_query', result: 'Missing organizationId' })
  },

  export_generate: async (params) => {
    const { organizationId, userId, title, type, format } = params
    if (organizationId && userId) {
      const exportRecord = await db.export.create({
        data: {
          organizationId,
          userId,
          type: type || 'report',
          format: format || 'pdf',
          title: title || 'Agent Export',
          status: 'pending',
          metadata: JSON.stringify({ source: 'agent_task', ...params }),
        },
      })
      return JSON.stringify({
        tool: 'export_generate',
        result: 'Export created',
        exportId: exportRecord.id,
      })
    }
    return JSON.stringify({ tool: 'export_generate', result: 'Missing required params' })
  },

  web_search: async (params) => {
    // Web search is handled at LLM level; we just log the request
    return JSON.stringify({
      tool: 'web_search',
      result: 'Web search tool invoked - results are handled by the LLM context',
      query: params.query,
    })
  },

  crm_lookup: async (params) => {
    // CRM lookup - return KPIs as customer-related data
    const { organizationId } = params
    if (organizationId) {
      const customerKpis = await db.kpi.findMany({
        where: { organizationId, category: 'customer' },
        take: 10,
      })
      return JSON.stringify({
        tool: 'crm_lookup',
        result: `Found ${customerKpis.length} customer metrics`,
        data: customerKpis,
      })
    }
    return JSON.stringify({ tool: 'crm_lookup', result: 'Missing organizationId' })
  },

  notification_send: async (params) => {
    const { userId, title, message } = params
    if (userId && title && message) {
      const notification = await db.notification.create({
        data: {
          userId,
          title,
          message,
          type: 'info',
        },
      })
      return JSON.stringify({
        tool: 'notification_send',
        result: 'Notification sent',
        notificationId: notification.id,
      })
    }
    return JSON.stringify({ tool: 'notification_send', result: 'Missing required params' })
  },

  browser_navigate: async (params) => {
    // Browser navigation is logged; actual browser ops handled separately
    return JSON.stringify({
      tool: 'browser_navigate',
      result: 'Browser navigation logged',
      url: params.url,
    })
  },
}

// ============================================
// Parse Tool Calls from LLM Response
// ============================================

interface ParsedToolCall {
  tool: string
  params: Record<string, any>
}

function parseToolCalls(response: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = []

  // Pattern 1: ```tool:tool_name\n{json params}\n```
  const codeBlockPattern = /```tool:(\w+)\n([\s\S]*?)```/g
  let match: RegExpExecArray | null

  while ((match = codeBlockPattern.exec(response)) !== null) {
    try {
      const params = JSON.parse(match[2].trim())
      calls.push({ tool: match[1], params })
    } catch {
      // If JSON parse fails, skip
    }
  }

  // Pattern 2: [TOOL_CALL: tool_name(params_json)]
  const bracketPattern = /\[TOOL_CALL:\s*(\w+)\(([\s\S]*?)\)\]/g
  while ((match = bracketPattern.exec(response)) !== null) {
    try {
      const params = JSON.parse(match[2].trim())
      calls.push({ tool: match[1], params })
    } catch {
      // If JSON parse fails, skip
    }
  }

  // Pattern 3: <tool_call name="tool_name">{json}</tool_call)>
  const xmlPattern = /<tool_call\s+name="(\w+)">([\s\S]*?)<\/tool_call>/g
  while ((match = xmlPattern.exec(response)) !== null) {
    try {
      const params = JSON.parse(match[2].trim())
      calls.push({ tool: match[1], params })
    } catch {
      // If JSON parse fails, skip
    }
  }

  return calls
}

// ============================================
// Execute Agent Task
// ============================================

export async function executeAgentTask(params: {
  agentType: string
  task: string
  userId: string
  organizationId?: string
  sessionId?: string
  context?: Record<string, any>
}): Promise<{
  sessionId: string
  taskId: string
  result: string
  memories: any[]
  toolExecutions: any[]
}> {
  const { agentType, task, userId, organizationId, sessionId, context } = params

  // Validate agent type
  const definition = AGENT_DEFINITIONS[agentType]
  if (!definition) {
    throw new Error(
      `Invalid agent type: ${agentType}. Must be one of: ${Object.keys(AGENT_DEFINITIONS).join(', ')}`
    )
  }

  // 1. Get or create AgentSession
  let session
  if (sessionId) {
    session = await db.agentSession.findUnique({ where: { id: sessionId } })
  }

  if (!session) {
    session = await db.agentSession.findFirst({
      where: {
        userId,
        agentType,
        status: 'active',
      },
    })
  }

  if (!session) {
    session = await db.agentSession.create({
      data: {
        userId,
        agentType,
        title: `${definition.name} Session`,
        status: 'active',
        metadata: JSON.stringify({
          organizationId,
          createdAt: new Date().toISOString(),
        }),
      },
    })
  }

  // 2. Build system prompt with injected memories
  const systemPrompt = await buildSystemPromptWithMemory(
    agentType,
    userId,
    organizationId
  )

  // 3. Create AgentTask (status: running)
  const agentTask = await db.agentTask.create({
    data: {
      sessionId: session.id,
      type: agentType,
      input: task,
      status: 'running',
      metadata: JSON.stringify({
        organizationId,
        context: context || {},
        startedAt: new Date().toISOString(),
      }),
    },
  })

  // 4. Call z-ai-web-dev-sdk LLM with system prompt + task
  let aiResponse = ''
  const toolExecutions: any[] = []
  const startTime = Date.now()

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    // Get recent tasks for conversation context
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

    // Add context injection if provided
    let userMessage = task
    if (context && Object.keys(context).length > 0) {
      userMessage = `${task}\n\n[Additional Context]: ${JSON.stringify(context)}`
    }

    const messages = [
      { role: 'assistant' as const, content: systemPrompt },
      ...contextMessages,
      { role: 'user' as const, content: userMessage },
    ]

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    aiResponse =
      completion.choices[0]?.message?.content ||
      'I was unable to generate a response. Please try again.'
  } catch (aiError) {
    console.error('AI generation error:', aiError)
    aiResponse =
      'An error occurred while generating the AI response. Please try again.'
  }

  // 5. Parse the response for tool calls
  const parsedCalls = parseToolCalls(aiResponse)

  // 6. Execute any requested tools
  for (const call of parsedCalls) {
    const { tool, params: toolParams } = call

    // Check if tool is allowed for this agent
    if (!definition.allowedTools.includes(tool)) {
      const toolExec = await db.toolExecution.create({
        data: {
          taskId: agentTask.id,
          tool,
          input: JSON.stringify(toolParams),
          output: JSON.stringify({ error: 'Tool not allowed for this agent type' }),
          status: 'failed',
          metadata: JSON.stringify({ reason: 'permission_denied' }),
        },
      })
      toolExecutions.push(toolExec)
      continue
    }

    const toolStart = Date.now()
    try {
      const executor = TOOL_EXECUTORS[tool]
      if (executor) {
        // Inject organizationId and userId into tool params
        const enrichedParams = {
          ...toolParams,
          organizationId: toolParams.organizationId || organizationId,
          userId: toolParams.userId || userId,
        }

        const result = await executor(enrichedParams)
        const toolExec = await db.toolExecution.create({
          data: {
            taskId: agentTask.id,
            tool,
            input: JSON.stringify(toolParams),
            output: result,
            status: 'completed',
            duration: Date.now() - toolStart,
            metadata: JSON.stringify({ agentType }),
          },
        })
        toolExecutions.push(toolExec)
      } else {
        const toolExec = await db.toolExecution.create({
          data: {
            taskId: agentTask.id,
            tool,
            input: JSON.stringify(toolParams),
            output: JSON.stringify({ error: 'Unknown tool' }),
            status: 'failed',
            duration: Date.now() - toolStart,
          },
        })
        toolExecutions.push(toolExec)
      }
    } catch (toolError) {
      console.error(`Tool execution error (${tool}):`, toolError)
      const toolExec = await db.toolExecution.create({
        data: {
          taskId: agentTask.id,
          tool,
          input: JSON.stringify(toolParams),
          output: JSON.stringify({ error: String(toolError) }),
          status: 'failed',
          duration: Date.now() - toolStart,
        },
      })
      toolExecutions.push(toolExec)
    }
  }

  // 7. Update AgentTask with result (status: completed)
  await db.agentTask.update({
    where: { id: agentTask.id },
    data: {
      output: aiResponse,
      status: 'completed',
      metadata: JSON.stringify({
        organizationId,
        context: context || {},
        completedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        toolCallsCount: parsedCalls.length,
      }),
    },
  })

  // 8. Save relevant memories
  const memories: any[] = []

  // Save to AgentMemory table
  const agentMemory = await db.agentMemory.create({
    data: {
      sessionId: session.id,
      type: 'agent',
      key: `task_${agentTask.id}`,
      value: aiResponse.slice(0, 1000),
      metadata: JSON.stringify({
        agentType,
        taskPreview: task.slice(0, 300),
        toolCalls: parsedCalls.map((c) => c.tool),
        timestamp: new Date().toISOString(),
      }),
    },
  })
  memories.push(agentMemory)

  // Save to global MemoryEntry store (for cross-session retrieval)
  if (organizationId) {
    const memoryCategories: Record<string, string> = {
      cfo: 'financial_summary',
      research: 'market_intelligence',
      growth: 'workflow_pattern',
      operations: 'workflow_pattern',
      reporting: 'agent_knowledge',
      fundraising: 'financial_summary',
      ceo: 'agent_knowledge',
      browser: 'agent_knowledge',
    }

    const memoryId = await storeMemory({
      organizationId,
      userId,
      agentType,
      category: (memoryCategories[agentType] || 'agent_knowledge') as any,
      key: `${agentType}_task_${agentTask.id}`,
      value: aiResponse.slice(0, 2000),
      summary: aiResponse.slice(0, 200),
      source: 'agent',
      tags: [agentType, 'task_result', definition.capabilities[0]],
      relevanceScore: 0.8,
    })

    memories.push({ id: memoryId, type: 'memory_entry' })
  }

  // 9. Create AuditLog entry
  await db.auditLog.create({
    data: {
      userId,
      organizationId,
      action: 'agent.execute',
      resource: 'agent_tasks',
      resourceId: agentTask.id,
      status: 'success',
      details: JSON.stringify({
        agentType,
        taskPreview: task.slice(0, 200),
        toolCalls: parsedCalls.map((c) => c.tool),
        duration: Date.now() - startTime,
      }),
    },
  })

  // 10. Return result
  return {
    sessionId: session.id,
    taskId: agentTask.id,
    result: aiResponse,
    memories,
    toolExecutions,
  }
}

// ============================================
// Build Context-Aware System Prompt
// ============================================

async function buildSystemPromptWithMemory(
  agentType: string,
  userId: string,
  organizationId?: string
): Promise<string> {
  const definition = AGENT_DEFINITIONS[agentType]
  if (!definition) {
    return 'You are a helpful AI assistant.'
  }

  let prompt = definition.systemPrompt

  // Query MemoryEntry table for relevant memories
  if (organizationId) {
    try {
      const memories = await retrieveMemories({
        organizationId,
        userId,
        agentType,
        limit: 10,
        minRelevance: 0.3,
      })

      if (memories.length > 0) {
        const memoryContext = memories
          .map(
            (m: any, i: number) =>
              `${i + 1}. [${m.category}] ${m.summary || m.value?.slice(0, 200)}`
          )
          .join('\n')

        prompt += `\n\n## Relevant Context from Memory\n\nThe following are relevant memories from previous interactions that may help you provide better answers:\n\n${memoryContext}\n\nUse this context when relevant, but do not explicitly reference "memory" or "stored memories" — just use the information naturally.`
      }
    } catch (err) {
      console.error('Failed to retrieve memories for prompt:', err)
      // Continue without memory context
    }
  }

  // Add available tools info
  const toolDescriptions = definition.allowedTools
    .map((tool) => `- ${tool}`)
    .join('\n')

  prompt += `\n\n## Available Tools\n\nYou can invoke tools using this format in your response:\n\`\`\`tool:tool_name\n{"param": "value"}\n\`\`\`\n\nAvailable tools:\n${toolDescriptions}`

  return prompt
}

// ============================================
// Save Agent Memory (Convenience Function)
// ============================================

async function saveAgentMemory(
  sessionId: string,
  type: string,
  key: string,
  value: string
): Promise<void> {
  await db.agentMemory.create({
    data: {
      sessionId,
      type,
      key,
      value,
      metadata: JSON.stringify({
        savedAt: new Date().toISOString(),
      }),
    },
  })
}

// ============================================
// Get Agent Session with Tasks
// ============================================

export async function getAgentSession(sessionId: string) {
  return db.agentSession.findUnique({
    where: { id: sessionId },
    include: {
      tasks: {
        orderBy: { createdAt: 'desc' },
        include: {
          executions: true,
        },
      },
      memories: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })
}

// ============================================
// List Agent Sessions
// ============================================

export async function listAgentSessions(
  userId: string,
  agentType?: string
) {
  return db.agentSession.findMany({
    where: {
      userId,
      ...(agentType ? { agentType } : {}),
    },
    include: {
      tasks: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}
