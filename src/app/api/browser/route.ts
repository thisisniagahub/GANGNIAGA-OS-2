// GangNiaga AI — Browser Automation API
// POST /api/browser — Create session or execute action
// GET  /api/browser — List browser sessions for a user

import { NextRequest, NextResponse } from 'next/server'
import {
  createBrowserSession,
  executeBrowserAction,
  executeBrowserWorkflow,
  takeScreenshot,
  extractPageContent,
  closeBrowserSession,
  listBrowserSessions,
  getBrowserSession,
  type BrowserAction,
} from '@/lib/browser'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, sessionId, browserAction, browserActions, startUrl, userId } = body

    switch (action) {
      // ── Create Session ──────────────────────────────────────────────
      case 'create_session': {
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 },
          )
        }

        const result = await createBrowserSession(userId, startUrl)
        return NextResponse.json({ session: result }, { status: 201 })
      }

      // ── Execute Single Action ───────────────────────────────────────
      case 'execute': {
        if (!sessionId || !browserAction) {
          return NextResponse.json(
            { error: 'sessionId and browserAction are required' },
            { status: 400 },
          )
        }

        // Validate browser action type
        const validTypes: BrowserAction['type'][] = [
          'navigate', 'click', 'type', 'screenshot', 'extract', 'fill', 'scroll', 'wait',
        ]
        if (!validTypes.includes(browserAction.type)) {
          return NextResponse.json(
            { error: `Invalid action type. Must be one of: ${validTypes.join(', ')}` },
            { status: 400 },
          )
        }

        const result = await executeBrowserAction(sessionId, browserAction as BrowserAction)
        return NextResponse.json({ result })
      }

      // ── Execute Workflow (Multiple Actions) ─────────────────────────
      case 'execute_workflow': {
        if (!sessionId || !browserActions || !Array.isArray(browserActions)) {
          return NextResponse.json(
            { error: 'sessionId and browserActions (array) are required' },
            { status: 400 },
          )
        }

        // Validate each action
        const validTypes: BrowserAction['type'][] = [
          'navigate', 'click', 'type', 'screenshot', 'extract', 'fill', 'scroll', 'wait',
        ]
        for (let i = 0; i < browserActions.length; i++) {
          if (!validTypes.includes(browserActions[i].type)) {
            return NextResponse.json(
              { error: `Invalid action type at index ${i}: ${browserActions[i].type}` },
              { status: 400 },
            )
          }
        }

        const results = await executeBrowserWorkflow(
          sessionId,
          browserActions as BrowserAction[],
        )
        return NextResponse.json({ results })
      }

      // ── Screenshot ──────────────────────────────────────────────────
      case 'screenshot': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required' },
            { status: 400 },
          )
        }

        const result = await takeScreenshot(sessionId, body.selector)
        return NextResponse.json({ result })
      }

      // ── Extract Content ─────────────────────────────────────────────
      case 'extract': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required' },
            { status: 400 },
          )
        }

        const result = await extractPageContent(sessionId, body.selector)
        return NextResponse.json({ result })
      }

      // ── Close Session ───────────────────────────────────────────────
      case 'close': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required' },
            { status: 400 },
          )
        }

        await closeBrowserSession(sessionId)
        return NextResponse.json({ success: true, message: 'Session closed' })
      }

      // ── Get Session Detail ──────────────────────────────────────────
      case 'get_session': {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required' },
            { status: 400 },
          )
        }

        const session = await getBrowserSession(sessionId)
        if (!session) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 },
          )
        }

        return NextResponse.json({ session })
      }

      default:
        return NextResponse.json(
          { error: `Invalid action. Must be one of: create_session, execute, execute_workflow, screenshot, extract, close, get_session` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('Browser API error:', error)
    return NextResponse.json(
      { error: 'Browser automation request failed' },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const sessionId = searchParams.get('sessionId')

    // If sessionId is provided, return session detail
    if (sessionId) {
      const session = await getBrowserSession(sessionId)
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 },
        )
      }
      return NextResponse.json({ session })
    }

    // Otherwise, list sessions for a user
    if (!userId) {
      return NextResponse.json(
        { error: 'userId or sessionId is required' },
        { status: 400 },
      )
    }

    const sessions = await listBrowserSessions(userId)
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Browser sessions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch browser sessions' },
      { status: 500 },
    )
  }
}
