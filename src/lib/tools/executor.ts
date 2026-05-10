// GangNiaga AI — Tool Execution Engine
// Handles tool execution with tracing, permissions, timeouts, approval flows, and token tracking

import { db } from '@/lib/db'
import {
  getTool,
  validateToolInput,
  type ToolDefinition,
} from './registry'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolExecutionRequest {
  toolName: string
  agentTaskId: string
  input: Record<string, any>
  userId: string
  organizationId?: string
  /** Override per-tool requiresApproval flag */
  requiresApproval?: boolean
}

export interface TokenUsage {
  prompt: number
  completion: number
  total: number
}

export interface ToolExecutionResult {
  success: boolean
  output?: any
  error?: string
  duration: number // ms
  tokenUsage?: TokenUsage
}

interface ApprovalRecord {
  id: string
  toolName: string
  input: Record<string, any>
  userId: string
  agentTaskId: string
  organizationId?: string
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  createdAt: Date
}

// ─── In-memory Stores ─────────────────────────────────────────────────────────

/** Pending approval requests — keyed by approval ID */
const approvalStore = new Map<string, ApprovalRecord>()

/** Simple rate-limit tracker — keyed by `${toolName}:${userId}` */
const rateLimitBuckets = new Map<
  string,
  { timestamps: number[] }
>()

// ─── Rate Limiting ────────────────────────────────────────────────────────────

function checkRateLimit(
  tool: ToolDefinition,
  userId: string,
): { allowed: boolean; retryAfterMs?: number } {
  if (!tool.rateLimited || !tool.maxExecutionsPerMinute) {
    return { allowed: true }
  }

  const key = `${tool.name}:${userId}`
  const now = Date.now()
  const windowMs = 60_000 // 1-minute sliding window

  let bucket = rateLimitBuckets.get(key)
  if (!bucket) {
    bucket = { timestamps: [] }
    rateLimitBuckets.set(key, bucket)
  }

  // Prune old timestamps
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)

  if (bucket.timestamps.length >= tool.maxExecutionsPerMinute) {
    const oldest = bucket.timestamps[0]
    const retryAfterMs = oldest + windowMs - now
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) }
  }

  // Record this execution attempt
  bucket.timestamps.push(now)
  return { allowed: true }
}

// ─── Permission Checking ──────────────────────────────────────────────────────

/**
 * Check whether a user's membership role grants the specified permissions.
 *
 * For simplicity this uses a static role→permissions map. In a production
 * system this would be backed by the AgentPermission table or a dedicated
 * RBAC service.
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'search.execute', 'forecast.execute', 'browser.execute',
    'email.execute', 'export.execute', 'crm.read',
    'analytics.read', 'kpi.write', 'notification.execute', 'code.execute',
  ],
  admin: [
    'search.execute', 'forecast.execute', 'browser.execute',
    'email.execute', 'export.execute', 'crm.read',
    'analytics.read', 'kpi.write', 'notification.execute', 'code.execute',
  ],
  manager: [
    'search.execute', 'forecast.execute', 'analytics.read',
    'kpi.write', 'notification.execute',
  ],
  accountant: [
    'forecast.execute', 'analytics.read', 'kpi.write',
  ],
  viewer: [
    'analytics.read',
  ],
}

async function checkPermissions(
  userId: string,
  requiredPermissions: string[],
  organizationId?: string,
): Promise<{ allowed: boolean; missing: string[] }> {
  if (requiredPermissions.length === 0) {
    return { allowed: true, missing: [] }
  }

  // Look up the user's role in the organization
  let userPermissions: string[] = []

  try {
    if (organizationId) {
      const membership = await db.membership.findFirst({
        where: { userId, organizationId, isActive: true },
      })
      if (membership) {
        userPermissions = ROLE_PERMISSIONS[membership.role] || []
      }
    }

    // Fallback: if no org-level permissions found, check user role
    if (userPermissions.length === 0) {
      const user = await db.user.findUnique({ where: { id: userId } })
      if (user) {
        userPermissions = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS['viewer']
      }
    }
  } catch {
    // If DB lookup fails, deny by default
    return { allowed: false, missing: requiredPermissions }
  }

  const missing = requiredPermissions.filter((p) => !userPermissions.includes(p))
  return { allowed: missing.length === 0, missing }
}

// ─── Execution Tracing ────────────────────────────────────────────────────────

/**
 * Create a ToolExecution record in the DB and return its ID.
 */
async function startToolTrace(
  taskId: string,
  tool: string,
  input: string,
): Promise<string> {
  const execution = await db.toolExecution.create({
    data: {
      taskId,
      tool,
      input,
      status: 'running',
      metadata: '{}',
    },
  })
  return execution.id
}

/**
 * Update a ToolExecution record with the final result.
 */
async function endToolTrace(
  traceId: string,
  output: string,
  duration: number,
  status: string,
): Promise<void> {
  await db.toolExecution.update({
    where: { id: traceId },
    data: {
      output,
      duration,
      status,
    },
  })
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

async function createAuditLog(params: {
  userId: string
  organizationId?: string
  action: string
  resource: string
  resourceId?: string
  status: string
  details?: string
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        status: params.status,
        details: params.details,
        metadata: '{}',
      },
    })
  } catch (err) {
    // Audit logging should never block execution
    console.error('[ToolExecutor] Failed to write audit log:', err)
  }
}

// ─── Token Usage Tracking ─────────────────────────────────────────────────────

async function trackTokenUsage(params: {
  userId: string
  organizationId?: string
  agentType?: string
  requestType: string
  promptTokens: number
  completionTokens: number
}): Promise<void> {
  try {
    await db.tokenUsage.create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId,
        agentType: params.agentType,
        model: 'default',
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.promptTokens + params.completionTokens,
        requestType: params.requestType,
        metadata: '{}',
      },
    })
  } catch (err) {
    console.error('[ToolExecutor] Failed to track token usage:', err)
  }
}

// ─── Approval System ──────────────────────────────────────────────────────────

/**
 * Create a pending approval request for a tool that requires human approval.
 * Returns the approval ID.
 */
async function requestApproval(
  toolName: string,
  input: Record<string, any>,
  userId: string,
  agentTaskId: string,
  organizationId?: string,
): Promise<string> {
  const id = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const record: ApprovalRecord = {
    id,
    toolName,
    input,
    userId,
    agentTaskId,
    organizationId,
    status: 'pending',
    createdAt: new Date(),
  }
  approvalStore.set(id, record)
  return id
}

/**
 * Approve a pending tool execution.
 */
export async function approveExecution(approvalId: string): Promise<void> {
  const record = approvalStore.get(approvalId)
  if (!record) {
    throw new Error(`Approval ${approvalId} not found`)
  }
  if (record.status !== 'pending') {
    throw new Error(`Approval ${approvalId} is already ${record.status}`)
  }
  record.status = 'approved'
}

/**
 * Reject a pending tool execution.
 */
export async function rejectExecution(
  approvalId: string,
  reason: string,
): Promise<void> {
  const record = approvalStore.get(approvalId)
  if (!record) {
    throw new Error(`Approval ${approvalId} not found`)
  }
  if (record.status !== 'pending') {
    throw new Error(`Approval ${approvalId} is already ${record.status}`)
  }
  record.status = 'rejected'
  record.reason = reason
}

/**
 * Retrieve a pending approval by ID (useful for API routes that poll).
 */
export function getApproval(approvalId: string): ApprovalRecord | undefined {
  return approvalStore.get(approvalId)
}

/**
 * List all pending approvals, optionally filtered by userId.
 */
export function listPendingApprovals(userId?: string): ApprovalRecord[] {
  const all = Array.from(approvalStore.values()).filter(
    (r) => r.status === 'pending',
  )
  if (userId) {
    return all.filter((r) => r.userId === userId)
  }
  return all
}

// ─── Tool Execution Handlers ─────────────────────────────────────────────────

/**
 * web_search — uses z-ai-web-dev-sdk to perform an AI-powered web search.
 */
async function executeWebSearch(
  input: { query: string; maxResults?: number },
  userId: string,
  organizationId?: string,
): Promise<{ output: any; tokenUsage?: TokenUsage }> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  const maxResults = input.maxResults ?? 5

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'assistant',
        content:
          'You are a web search assistant. Given a search query, return a JSON array of search results. Each result should have: title, url, snippet. Return ONLY valid JSON, no markdown fences.',
      },
      {
        role: 'user',
        content: `Search query: "${input.query}". Return up to ${maxResults} results as a JSON array.`,
      },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content || '[]'

  // Parse the AI response as JSON
  let results: any[] = []
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    results = JSON.parse(cleaned)
    if (!Array.isArray(results)) results = [results]
  } catch {
    results = [{ title: 'Search Result', snippet: content, url: '' }]
  }

  const tokenUsage: TokenUsage = {
    prompt: completion.usage?.prompt_tokens ?? 0,
    completion: completion.usage?.completion_tokens ?? 0,
    total: completion.usage?.total_tokens ?? 0,
  }

  // Track token usage
  await trackTokenUsage({
    userId,
    organizationId,
    requestType: 'tool_web_search',
    promptTokens: tokenUsage.prompt,
    completionTokens: tokenUsage.completion,
  })

  return {
    output: { results, totalResults: results.length, query: input.query },
    tokenUsage,
  }
}

/**
 * forecast_calculate — queries forecast data from DB and runs scenario calculations.
 */
async function executeForecastCalculate(
  input: {
    forecastId: string
    scenario: string
    months?: number
    adjustments?: Record<string, any>
  },
  userId: string,
  organizationId?: string,
): Promise<{ output: any; tokenUsage?: TokenUsage }> {
  const months = input.months ?? 12

  // Fetch forecast with revenue and expense items
  const forecast = await db.forecast.findUnique({
    where: { id: input.forecastId },
    include: {
      revenueItems: true,
      expenseItems: true,
    },
  })

  if (!forecast) {
    return {
      output: {
        error: `Forecast ${input.forecastId} not found`,
        success: false,
      },
    }
  }

  // Scenario multipliers
  const multipliers: Record<string, { revenue: number; expense: number }> = {
    best: { revenue: 1.3, expense: 0.85 },
    base: { revenue: 1.0, expense: 1.0 },
    worst: { revenue: 0.7, expense: 1.2 },
    custom: { revenue: 1.0, expense: 1.0 },
  }

  const multiplier = multipliers[input.scenario] || multipliers.base

  // Apply custom adjustments if provided
  if (input.scenario === 'custom' && input.adjustments) {
    if (input.adjustments.revenueMultiplier)
      multiplier.revenue = input.adjustments.revenueMultiplier
    if (input.adjustments.expenseMultiplier)
      multiplier.expense = input.adjustments.expenseMultiplier
  }

  // Calculate monthly projections
  const projections = []
  const startDate = new Date(forecast.startMonth + '-01')

  let cumulativeRevenue = 0
  let cumulativeExpenses = 0
  let cashBalance = 0

  for (let i = 0; i < months; i++) {
    const date = new Date(startDate)
    date.setMonth(date.getMonth() + i)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    let monthRevenue = 0
    let monthExpenses = 0

    for (const rev of forecast.revenueItems) {
      const growthFactor = 1 + (rev.growthRate / 100) * i
      monthRevenue += rev.amount * multiplier.revenue * growthFactor
    }

    for (const exp of forecast.expenseItems) {
      const growthFactor = 1 + (exp.growthRate / 100) * i
      monthExpenses += exp.amount * multiplier.expense * growthFactor
    }

    cumulativeRevenue += monthRevenue
    cumulativeExpenses += monthExpenses
    cashBalance += monthRevenue - monthExpenses

    projections.push({
      month: monthKey,
      revenue: Math.round(monthRevenue * 100) / 100,
      expenses: Math.round(monthExpenses * 100) / 100,
      netIncome: Math.round((monthRevenue - monthExpenses) * 100) / 100,
      cumulativeRevenue: Math.round(cumulativeRevenue * 100) / 100,
      cumulativeExpenses: Math.round(cumulativeExpenses * 100) / 100,
      cashBalance: Math.round(cashBalance * 100) / 100,
    })
  }

  const totalRevenue = projections.reduce((s, p) => s + p.revenue, 0)
  const totalExpenses = projections.reduce((s, p) => s + p.expenses, 0)
  const avgBurnRate = totalExpenses / months
  const runway = avgBurnRate > 0 ? Math.round(cashBalance / avgBurnRate) : months

  return {
    output: {
      forecastId: forecast.id,
      forecastName: forecast.name,
      scenario: input.scenario,
      months,
      projections,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalNetIncome: Math.round((totalRevenue - totalExpenses) * 100) / 100,
        finalCashBalance: Math.round(cashBalance * 100) / 100,
        avgMonthlyBurnRate: Math.round(avgBurnRate * 100) / 100,
        runwayMonths: Math.max(runway, 0),
        revenueStreams: forecast.revenueItems.length,
        expenseItems: forecast.expenseItems.length,
      },
      multiplier,
      success: true,
    },
  }
}

/**
 * browser_navigate — returns a structured response (real browser automation would
 * require the agent-browser skill / mini-service).
 */
async function executeBrowserNavigate(
  input: {
    url: string
    action?: string
    selector?: string
    value?: string
  },
  userId: string,
  organizationId?: string,
): Promise<{ output: any; tokenUsage?: TokenUsage }> {
  const action = input.action || 'extract_text'

  // Use AI to simulate browser extraction for text actions
  if (action === 'extract_text' || action === 'extract_links') {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'You are a browser automation assistant. Given a URL and action, provide a plausible structured response as if you visited the page. Return JSON with fields: title, description, links (if extract_links), textContent (if extract_text). Return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: `URL: ${input.url}, Action: ${action}`,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const content = completion.choices[0]?.message?.content || '{}'
    let data: any = {}
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      data = JSON.parse(cleaned)
    } catch {
      data = { textContent: content }
    }

    const tokenUsage: TokenUsage = {
      prompt: completion.usage?.prompt_tokens ?? 0,
      completion: completion.usage?.completion_tokens ?? 0,
      total: completion.usage?.total_tokens ?? 0,
    }

    await trackTokenUsage({
      userId,
      organizationId,
      requestType: 'tool_browser_navigate',
      promptTokens: tokenUsage.prompt,
      completionTokens: tokenUsage.completion,
    })

    return {
      output: {
        success: true,
        url: input.url,
        action,
        data,
      },
      tokenUsage,
    }
  }

  // For other actions, return a structured placeholder
  return {
    output: {
      success: true,
      url: input.url,
      action,
      selector: input.selector,
      message: `Browser action "${action}" queued. Real browser automation requires the agent-browser service.`,
    },
  }
}

/**
 * email_send — records the email in an audit log (real sending would require
 * an email service integration).
 */
async function executeEmailSend(
  input: { to: string; subject: string; body: string; cc?: string },
  userId: string,
  organizationId?: string,
): Promise<{ output: any }> {
  // In production this would call an email API (SendGrid, SES, etc.)
  const emailId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  await createAuditLog({
    userId,
    organizationId,
    action: 'email.send',
    resource: 'emails',
    resourceId: emailId,
    status: 'success',
    details: JSON.stringify({
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      bodyLength: input.body.length,
    }),
  })

  return {
    output: {
      sent: true,
      messageId: emailId,
      to: input.to,
      subject: input.subject,
      note: 'Email recorded. Real delivery requires email service integration.',
    },
  }
}

/**
 * export_generate — creates an Export record in the database.
 */
async function executeExportGenerate(
  input: {
    type: string
    format: string
    contentId: string
    title: string
  },
  userId: string,
  organizationId?: string,
): Promise<{ output: any }> {
  const exportRecord = await db.export.create({
    data: {
      organizationId: organizationId || 'unknown',
      userId,
      type: input.type,
      format: input.format,
      title: input.title,
      status: 'processing',
      metadata: JSON.stringify({ contentId: input.contentId }),
    },
  })

  // Simulate processing completion
  await db.export.update({
    where: { id: exportRecord.id },
    data: {
      status: 'completed',
      fileUrl: `/exports/${exportRecord.id}/${input.title}.${input.format}`,
      fileSize: 1024,
    },
  })

  await createAuditLog({
    userId,
    organizationId,
    action: 'export.generate',
    resource: 'exports',
    resourceId: exportRecord.id,
    status: 'success',
    details: JSON.stringify(input),
  })

  return {
    output: {
      exportId: exportRecord.id,
      status: 'completed',
      fileUrl: `/exports/${exportRecord.id}/${input.title}.${input.format}`,
      format: input.format,
      type: input.type,
    },
  }
}

/**
 * crm_lookup — queries the database for CRM-like data.
 * Since the schema doesn't have a dedicated CRM table, we simulate
 * by looking up KPI data or returning a placeholder response.
 */
async function executeCrmLookup(
  input: { query: string; entity?: string },
  userId: string,
  organizationId?: string,
): Promise<{ output: any }> {
  // Return structured placeholder data — real CRM would query HubSpot/Salesforce
  const results = [
    {
      id: 'crm_001',
      name: `Sample ${input.entity || 'customer'} matching "${input.query}"`,
      type: input.entity || 'customer',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ]

  return {
    output: {
      results,
      total: results.length,
      query: input.query,
      entity: input.entity || 'customer',
      note: 'CRM integration required for real data. Configure in Settings > Integrations.',
    },
  }
}

/**
 * analytics_query — queries KPI data from the database.
 */
async function executeAnalyticsQuery(
  input: { metric: string; period?: string; dimensions?: string[] },
  userId: string,
  organizationId?: string,
): Promise<{ output: any }> {
  let value = 0
  let breakdown: any[] = []

  try {
    if (organizationId) {
      const kpis = await db.kpi.findMany({
        where: {
          organizationId,
          category: input.metric,
          ...(input.period ? { period: input.period } : {}),
        },
      })

      if (kpis.length > 0) {
        value = kpis.reduce((sum, k) => sum + k.value, 0) / kpis.length
        breakdown = kpis.map((k) => ({
          name: k.name,
          value: k.value,
          unit: k.unit,
          period: k.period,
        }))
      }
    }
  } catch (err) {
    console.error('[ToolExecutor] Analytics query error:', err)
  }

  return {
    output: {
      metric: input.metric,
      value: Math.round(value * 100) / 100,
      period: input.period || 'all',
      dimensions: input.dimensions,
      breakdown,
    },
  }
}

/**
 * kpi_update — updates a KPI value in the database.
 */
async function executeKpiUpdate(
  input: { kpiId: string; value: number; period?: string },
  userId: string,
  organizationId?: string,
): Promise<{ output: any }> {
  const kpi = await db.kpi.findUnique({ where: { id: input.kpiId } })

  if (!kpi) {
    return {
      output: {
        kpiId: input.kpiId,
        updated: false,
        error: `KPI ${input.kpiId} not found`,
      },
    }
  }

  const previousValue = kpi.value

  await db.kpi.update({
    where: { id: input.kpiId },
    data: {
      previousValue,
      value: input.value,
      ...(input.period ? { period: input.period } : {}),
    },
  })

  await createAuditLog({
    userId,
    organizationId,
    action: 'kpi.update',
    resource: 'kpis',
    resourceId: input.kpiId,
    status: 'success',
    details: JSON.stringify({
      previousValue,
      newValue: input.value,
      period: input.period,
    }),
  })

  return {
    output: {
      kpiId: input.kpiId,
      previousValue,
      newValue: input.value,
      updated: true,
    },
  }
}

/**
 * notification_send — creates a notification in the database.
 */
async function executeNotificationSend(
  input: { userId: string; title: string; message: string; type?: string },
  executorUserId: string,
  organizationId?: string,
): Promise<{ output: any }> {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type || 'info',
    },
  })

  await createAuditLog({
    userId: executorUserId,
    organizationId,
    action: 'notification.send',
    resource: 'notifications',
    resourceId: notification.id,
    status: 'success',
    details: JSON.stringify({
      targetUserId: input.userId,
      title: input.title,
      type: input.type,
    }),
  })

  return {
    output: {
      notificationId: notification.id,
      sent: true,
      userId: input.userId,
      title: input.title,
    },
  }
}

/**
 * code_execute — returns a structured response for sandboxed code execution.
 * Real sandboxed execution would require an isolated runtime mini-service.
 */
async function executeCodeExecute(
  input: { language: string; code: string; timeout?: number },
  userId: string,
  organizationId?: string,
): Promise<{ output: any }> {
  // In production this would send code to a sandboxed runtime
  const executionId = `code_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  await createAuditLog({
    userId,
    organizationId,
    action: 'code.execute',
    resource: 'code_executions',
    resourceId: executionId,
    status: 'success',
    details: JSON.stringify({
      language: input.language,
      codeLength: input.code.length,
      timeout: input.timeout || 10000,
    }),
  })

  return {
    output: {
      stdout: `// ${input.language} execution simulated\n// Code: ${input.code.slice(0, 100)}${input.code.length > 100 ? '...' : ''}\n// Output: Execution completed successfully`,
      stderr: '',
      exitCode: 0,
      executionTime: 42,
      executionId,
      note: 'Sandboxed code execution requires a dedicated runtime service. Output is simulated.',
    },
  }
}

// ─── Tool Handler Dispatch ────────────────────────────────────────────────────

type ToolHandler = (
  input: any,
  userId: string,
  organizationId?: string,
) => Promise<{ output: any; tokenUsage?: TokenUsage }>

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  web_search: executeWebSearch,
  forecast_calculate: executeForecastCalculate,
  browser_navigate: executeBrowserNavigate,
  email_send: executeEmailSend,
  export_generate: executeExportGenerate,
  crm_lookup: executeCrmLookup,
  analytics_query: executeAnalyticsQuery,
  kpi_update: executeKpiUpdate,
  notification_send: executeNotificationSend,
  code_execute: executeCodeExecute,
}

// ─── Main Execution Function ──────────────────────────────────────────────────

/**
 * Execute a tool with full lifecycle management:
 *
 *  1. Validate tool name
 *  2. Validate input against tool schema
 *  3. Check permissions
 *  4. Check rate limits
 *  5. Handle approval flow (if required)
 *  6. Create ToolExecution trace (status: running)
 *  7. Execute with timeout handling
 *  8. Update ToolExecution trace with result
 *  9. Create AuditLog entry
 * 10. Return result
 */
export async function executeTool(
  request: ToolExecutionRequest,
): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  // 1. Validate tool name
  const toolDef = getTool(request.toolName)
  if (!toolDef) {
    return {
      success: false,
      error: `Unknown tool: ${request.toolName}`,
      duration: Date.now() - startTime,
    }
  }

  // 2. Validate input
  const validation = validateToolInput(request.toolName, request.input)
  if (!validation.valid) {
    return {
      success: false,
      error: `Input validation failed: ${validation.errors?.join('; ')}`,
      duration: Date.now() - startTime,
    }
  }

  // 3. Check permissions
  const permCheck = await checkPermissions(
    request.userId,
    toolDef.requiredPermissions,
    request.organizationId,
  )
  if (!permCheck.allowed) {
    await createAuditLog({
      userId: request.userId,
      organizationId: request.organizationId,
      action: `tool.${request.toolName}.denied`,
      resource: 'tool_executions',
      status: 'denied',
      details: JSON.stringify({ missingPermissions: permCheck.missing }),
    })
    return {
      success: false,
      error: `Permission denied. Missing: ${permCheck.missing.join(', ')}`,
      duration: Date.now() - startTime,
    }
  }

  // 4. Check rate limits
  const rateCheck = checkRateLimit(toolDef, request.userId)
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded for ${request.toolName}. Retry after ${rateCheck.retryAfterMs}ms.`,
      duration: Date.now() - startTime,
    }
  }

  // 5. Handle approval flow
  const needsApproval =
    request.requiresApproval ?? toolDef.requiresApproval ?? false

  if (needsApproval) {
    const approvalId = await requestApproval(
      request.toolName,
      request.input,
      request.userId,
      request.agentTaskId,
      request.organizationId,
    )

    await createAuditLog({
      userId: request.userId,
      organizationId: request.organizationId,
      action: `tool.${request.toolName}.approval_requested`,
      resource: 'tool_approvals',
      resourceId: approvalId,
      status: 'success',
      details: JSON.stringify({ toolName: request.toolName, input: request.input }),
    })

    return {
      success: false,
      error: `Tool execution requires approval. Approval ID: ${approvalId}`,
      duration: Date.now() - startTime,
      output: {
        approvalId,
        status: 'pending_approval',
        toolName: request.toolName,
      },
    }
  }

  // 6. Create ToolExecution trace
  let traceId: string
  try {
    traceId = await startToolTrace(
      request.agentTaskId,
      request.toolName,
      JSON.stringify(request.input),
    )
  } catch (err) {
    console.error('[ToolExecutor] Failed to create trace:', err)
    traceId = 'trace_error'
  }

  // 7. Execute with timeout
  const timeout = toolDef.timeout ?? 30000
  const handler = TOOL_HANDLERS[request.toolName]

  if (!handler) {
    await endToolTrace(traceId, JSON.stringify({ error: 'No handler' }), Date.now() - startTime, 'failed')
    return {
      success: false,
      error: `No execution handler for tool: ${request.toolName}`,
      duration: Date.now() - startTime,
    }
  }

  try {
    const result = await executeWithTimeout(
      handler(request.input, request.userId, request.organizationId),
      timeout,
      request.toolName,
    )

    const duration = Date.now() - startTime

    // 8. Update trace
    await endToolTrace(
      traceId,
      JSON.stringify(result.output),
      duration,
      'completed',
    )

    // 9. Create audit log
    await createAuditLog({
      userId: request.userId,
      organizationId: request.organizationId,
      action: `tool.${request.toolName}.execute`,
      resource: 'tool_executions',
      resourceId: traceId,
      status: 'success',
      details: JSON.stringify({
        toolName: request.toolName,
        duration,
        success: true,
        tokenUsage: result.tokenUsage,
      }),
    })

    // 10. Return result
    return {
      success: true,
      output: result.output,
      duration,
      tokenUsage: result.tokenUsage,
    }
  } catch (err: any) {
    const duration = Date.now() - startTime
    const errorMessage =
      err instanceof Error ? err.message : String(err)

    // Update trace with error
    await endToolTrace(
      traceId,
      JSON.stringify({ error: errorMessage }),
      duration,
      'failed',
    )

    // Create audit log for failure
    await createAuditLog({
      userId: request.userId,
      organizationId: request.organizationId,
      action: `tool.${request.toolName}.execute`,
      resource: 'tool_executions',
      resourceId: traceId,
      status: 'failure',
      details: JSON.stringify({
        toolName: request.toolName,
        duration,
        error: errorMessage,
      }),
    })

    return {
      success: false,
      error: errorMessage,
      duration,
    }
  }
}

// ─── Timeout Wrapper ──────────────────────────────────────────────────────────

function executeWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  toolName: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Tool "${toolName}" timed out after ${ms}ms`))
    }, ms)

    promise
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}
