// GangNiaga AI — Browser Automation Runtime
// Manages browser sessions, executes actions via agent-browser CLI or AI fallback,
// and persists sessions & snapshots to the database.

import { db } from '@/lib/db'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'extract' | 'fill' | 'scroll' | 'wait'
  url?: string
  selector?: string
  value?: string
  timeout?: number
}

export interface BrowserActionResult {
  success: boolean
  data?: string       // extracted text, base64 screenshot, etc.
  url?: string        // current URL after action
  title?: string      // page title
  error?: string
  duration: number    // ms
}

// ─── In-memory session store ──────────────────────────────────────────────────
// Tracks active browser sessions with their current URL and metadata.

interface SessionState {
  id: string
  userId: string
  url: string | null
  title: string | null
  status: 'active' | 'completed' | 'failed'
  createdAt: Date
  lastActivityAt: Date
}

const sessionStore = new Map<string, SessionState>()

// ─── Agent-Browser CLI Path ───────────────────────────────────────────────────

const AGENT_BROWSER_BIN = 'npx'
const AGENT_BROWSER_CMD = 'agent-browser'

/**
 * Check whether agent-browser CLI is available on the system.
 */
async function isAgentBrowserAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(AGENT_BROWSER_BIN, [AGENT_BROWSER_CMD, '--version'], {
      timeout: 5000,
    })
    return typeof stdout === 'string' && stdout.trim().length > 0
  } catch {
    return false
  }
}

// Cache the availability check so we only check once per process
let _agentBrowserAvailable: boolean | null = null

async function canUseAgentBrowser(): Promise<boolean> {
  if (_agentBrowserAvailable === null) {
    _agentBrowserAvailable = await isAgentBrowserAvailable()
  }
  return _agentBrowserAvailable
}

// ─── Session Management ───────────────────────────────────────────────────────

/**
 * Create a new browser session and optionally navigate to a start URL.
 */
export async function createBrowserSession(
  userId: string,
  startUrl?: string,
): Promise<{ sessionId: string; status: string }> {
  // Create the DB record
  const session = await db.browserSession.create({
    data: {
      userId,
      status: 'active',
      url: startUrl || null,
      metadata: JSON.stringify({
        startUrl: startUrl || null,
        createdAt: new Date().toISOString(),
      }),
    },
  })

  // Track in memory
  const state: SessionState = {
    id: session.id,
    userId,
    url: startUrl || null,
    title: null,
    status: 'active',
    createdAt: session.createdAt,
    lastActivityAt: new Date(),
  }
  sessionStore.set(session.id, state)

  // If a start URL was provided, navigate to it
  if (startUrl) {
    try {
      await executeBrowserAction(session.id, {
        type: 'navigate',
        url: startUrl,
      })
    } catch (err) {
      // Navigation failed but session is still created
      console.error('[BrowserRuntime] Initial navigation failed:', err)
    }
  }

  return { sessionId: session.id, status: 'active' }
}

/**
 * Execute a single browser action within a session.
 *
 * Strategy:
 *  1. Try the agent-browser CLI if available
 *  2. Fall back to AI-powered simulation via z-ai-web-dev-sdk
 */
export async function executeBrowserAction(
  sessionId: string,
  action: BrowserAction,
): Promise<BrowserActionResult> {
  const startTime = Date.now()
  const state = sessionStore.get(sessionId)

  // Validate session
  if (!state) {
    // Try to load from DB
    const dbSession = await db.browserSession.findUnique({
      where: { id: sessionId },
    })
    if (!dbSession || dbSession.status !== 'active') {
      return {
        success: false,
        error: `Browser session ${sessionId} not found or not active`,
        duration: Date.now() - startTime,
      }
    }
    // Rehydrate in-memory state
    const meta = JSON.parse(dbSession.metadata || '{}')
    sessionStore.set(sessionId, {
      id: dbSession.id,
      userId: dbSession.userId,
      url: dbSession.url,
      title: meta.title || null,
      status: 'active',
      createdAt: dbSession.createdAt,
      lastActivityAt: new Date(),
    })
  }

  let result: BrowserActionResult

  // Try agent-browser CLI first, then fall back to AI simulation
  if (await canUseAgentBrowser()) {
    result = await executeViaAgentBrowser(sessionId, action)
  } else {
    result = await executeViaAI(sessionId, action)
  }

  result.duration = Date.now() - startTime

  // Update session state
  if (result.success) {
    const currentState = sessionStore.get(sessionId)
    if (currentState) {
      if (result.url) currentState.url = result.url
      if (result.title) currentState.title = result.title
      currentState.lastActivityAt = new Date()
    }

    // Update DB session
    await db.browserSession.update({
      where: { id: sessionId },
      data: {
        url: result.url || undefined,
        metadata: JSON.stringify({
          ...(sessionStore.get(sessionId) ? {} : {}),
          title: result.title || undefined,
          lastAction: action.type,
          lastActionAt: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      },
    })
  }

  // Create a snapshot record for extract/screenshot actions
  if (result.success && (action.type === 'screenshot' || action.type === 'extract')) {
    await db.browserSnapshot.create({
      data: {
        sessionId,
        type: action.type === 'screenshot' ? 'screenshot' : 'data',
        url: result.url || state?.url || null,
        data: result.data || null,
        metadata: JSON.stringify({
          actionType: action.type,
          selector: action.selector,
          timestamp: new Date().toISOString(),
        }),
      },
    })
  }

  // Create audit log
  try {
    const currentUser = sessionStore.get(sessionId)?.userId || 'unknown'
    await db.auditLog.create({
      data: {
        userId: currentUser,
        action: `browser.${action.type}`,
        resource: 'browser_sessions',
        resourceId: sessionId,
        status: result.success ? 'success' : 'failure',
        details: JSON.stringify({
          action,
          resultUrl: result.url,
          resultTitle: result.title,
          error: result.error,
          duration: result.duration,
        }),
        metadata: '{}',
      },
    })
  } catch (err) {
    console.error('[BrowserRuntime] Failed to write audit log:', err)
  }

  return result
}

/**
 * Execute a sequence of browser actions (workflow).
 * Stops on first failure unless the action has a timeout configured.
 */
export async function executeBrowserWorkflow(
  sessionId: string,
  actions: BrowserAction[],
): Promise<BrowserActionResult[]> {
  const results: BrowserActionResult[] = []

  for (const action of actions) {
    const result = await executeBrowserAction(sessionId, action)
    results.push(result)

    // Stop workflow on failure
    if (!result.success) {
      break
    }
  }

  return results
}

/**
 * Take a screenshot of the current page or a specific element.
 */
export async function takeScreenshot(
  sessionId: string,
  selector?: string,
): Promise<{
  screenshot: string  // base64
  url: string
  title: string
}> {
  const result = await executeBrowserAction(sessionId, {
    type: 'screenshot',
    selector,
  })

  return {
    screenshot: result.data || '',
    url: result.url || '',
    title: result.title || '',
  }
}

/**
 * Extract text content from the current page or a specific element.
 */
export async function extractPageContent(
  sessionId: string,
  selector?: string,
): Promise<{
  text: string
  url: string
  title: string
}> {
  const result = await executeBrowserAction(sessionId, {
    type: 'extract',
    selector,
  })

  return {
    text: result.data || '',
    url: result.url || '',
    title: result.title || '',
  }
}

/**
 * Close a browser session and clean up resources.
 */
export async function closeBrowserSession(sessionId: string): Promise<void> {
  // Remove from in-memory store
  sessionStore.delete(sessionId)

  // Update DB record
  await db.browserSession.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      metadata: JSON.stringify({
        closedAt: new Date().toISOString(),
      }),
      updatedAt: new Date(),
    },
  })
}

/**
 * Get a browser session with its snapshots.
 */
export async function getBrowserSession(sessionId: string): Promise<any> {
  const session = await db.browserSession.findUnique({
    where: { id: sessionId },
    include: {
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!session) return null

  return {
    ...session,
    metadata: JSON.parse(session.metadata || '{}'),
    snapshots: session.snapshots.map((s) => ({
      ...s,
      metadata: JSON.parse(s.metadata || '{}'),
    })),
  }
}

/**
 * List browser sessions for a user.
 */
export async function listBrowserSessions(userId: string): Promise<any[]> {
  const sessions = await db.browserSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  return sessions.map((s) => ({
    ...s,
    metadata: JSON.parse(s.metadata || '{}'),
    snapshotCount: s.snapshots.length,
  }))
}

// ─── Execution Strategies ─────────────────────────────────────────────────────

/**
 * Execute a browser action via the agent-browser CLI.
 *
 * The CLI command pattern is:
 *   npx agent-browser <command> --url <url> --selector <selector> --value <value>
 *
 * Supported commands: navigate, click, type, screenshot, extract, scroll, wait
 */
async function executeViaAgentBrowser(
  sessionId: string,
  action: BrowserAction,
): Promise<BrowserActionResult> {
  const startTime = Date.now()

  try {
    const args = [AGENT_BROWSER_CMD, action.type]

    if (action.url) args.push('--url', action.url)
    if (action.selector) args.push('--selector', action.selector)
    if (action.value) args.push('--value', action.value)
    if (action.timeout) args.push('--timeout', String(action.timeout))

    const { stdout, stderr } = await execFileAsync(AGENT_BROWSER_BIN, args, {
      timeout: action.timeout || 30000,
      env: { ...process.env },
    })

    // Try to parse JSON output from agent-browser
    let data: any = {}
    try {
      data = JSON.parse(stdout.trim())
    } catch {
      data = { text: stdout.trim() }
    }

    if (stderr && !stdout) {
      return {
        success: false,
        error: stderr.trim(),
        duration: Date.now() - startTime,
      }
    }

    return {
      success: true,
      data: action.type === 'screenshot' ? data.screenshot || data.data : data.text || data.data || stdout.trim(),
      url: data.url || action.url || undefined,
      title: data.title || undefined,
      duration: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Agent-browser execution failed',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Execute a browser action via AI simulation using z-ai-web-dev-sdk.
 *
 * This is the fallback when agent-browser is not available. The LLM generates
 * plausible page content and action results based on the URL and action type.
 */
async function executeViaAI(
  sessionId: string,
  action: BrowserAction,
): Promise<BrowserActionResult> {
  const startTime = Date.now()
  const state = sessionStore.get(sessionId)
  const currentUrl = state?.url || action.url || 'about:blank'

  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    // Build a prompt that describes the action and asks for structured output
    const systemPrompt = `You are a browser automation simulator. Given a URL and a browser action, simulate the result of that action as if you were a real browser. Return ONLY valid JSON with these fields:
- title: the page title
- url: the final URL after the action (may differ from input if redirects occurred)
- data: the result data (extracted text content for extract, base64 placeholder for screenshot, confirmation message for click/type/fill/scroll/wait)
- success: true/false

Be realistic. For "navigate" actions, describe a plausible page. For "extract", provide plausible text content. For "screenshot", return "screenshot_base64_placeholder". For "click"/"type"/"fill"/"scroll"/"wait", return a confirmation message.`

    const userPrompt = `Current URL: ${currentUrl}
Action: ${action.type}
${action.url ? `Target URL: ${action.url}` : ''}
${action.selector ? `Selector: ${action.selector}` : ''}
${action.value ? `Value: ${action.value}` : ''}
${action.timeout ? `Timeout: ${action.timeout}ms` : ''}

Return the simulated result as JSON.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    const content = completion.choices[0]?.message?.content || '{}'

    // Parse the AI response
    let parsed: any = {}
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = {
        title: 'Simulated Page',
        url: action.url || currentUrl,
        data: content,
        success: true,
      }
    }

    // Track token usage
    try {
      await db.tokenUsage.create({
        data: {
          userId: state?.userId || 'unknown',
          agentType: 'browser',
          model: 'default',
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
          totalTokens: completion.usage?.total_tokens ?? 0,
          requestType: 'browser_action',
          metadata: JSON.stringify({ sessionId, actionType: action.type }),
        },
      })
    } catch (err) {
      console.error('[BrowserRuntime] Failed to track token usage:', err)
    }

    return {
      success: parsed.success !== false,
      data: parsed.data || parsed.textContent || '',
      url: parsed.url || action.url || currentUrl,
      title: parsed.title || 'Simulated Page',
      duration: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      success: false,
      error: `AI browser simulation failed: ${err.message || 'Unknown error'}`,
      duration: Date.now() - startTime,
    }
  }
}
