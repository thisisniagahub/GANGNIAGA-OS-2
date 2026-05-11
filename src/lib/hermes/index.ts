/**
 * Hermes Agent Integration - Main Export
 * @see https://hermes-agent.nousresearch.com/docs
 */

export * from "./types";
export { HermesClient, getHermesClient, resetHermesClient } from "./client";

/**
 * Hermes Agent Integration for GangNiaga AI OS
 *
 * INTEGRATION ARCHITECTURE:
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │                     GangNiaga AI OS (Next.js)                       │
 *  │                                                                     │
 *  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
 *  │  │ Hermes UI    │  │ GangNiaga    │  │ Hermes API Routes        │  │
 *  │  │ Components   │  │ Pages        │  │ /api/hermes/*            │  │
 *  │  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
 *  │         │                 │                        │                 │
 *  │         └─────────┬───────┘                        │                 │
 *  │                   │                                │                 │
 *  │         ┌─────────▼──────────┐                     │                 │
 *  │         │  Hermes Client     │                     │                 │
 *  │         │  (src/lib/hermes/) │                     │                 │
 *  │         └─────────┬──────────┘                     │                 │
 *  └───────────────────┼────────────────────────────────┼─────────────────┘
 *                      │                                │
 *                      │  OpenAI-Compatible API         │
 *                      │  (HTTP/SSE)                    │
 *                      │                                │
 *  ┌───────────────────▼────────────────────────────────▼─────────────────┐
 *  │                  Hermes Agent API Server                             │
 *  │                  (http://127.0.0.1:8642)                            │
 *  │                                                                     │
 *  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
 *  │  │ Chat API     │ │ Responses API│ │ Skills       │ │ Memory     │  │
 *  │  │ /v1/chat/... │ │ /v1/responses│ │ System       │ │ System     │  │
 *  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
 *  │                                                                     │
 *  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
 *  │  │ Cron Jobs    │ │ Delegation   │ │ Kanban Board │ │ Goals      │  │
 *  │  │ Scheduler    │ │ Subagents    │ │ Multi-Agent  │ │ Persistent │  │
 *  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
 *  │                                                                     │
 *  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
 *  │  │ 70+ Tools    │ │ MCP Servers  │ │ Browser      │ │ Voice Mode │  │
 *  │  │ & Toolsets   │ │ Integration  │ │ Automation   │ │ TTS/STT    │  │
 *  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
 *  │                                                                     │
 *  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
 *  │  │ Honcho       │ │ Provider     │ │ Credential   │ │ Messaging  │  │
 *  │  │ Memory       │ │ Routing      │ │ Pools        │ │ Gateway    │  │
 *  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 * FEATURES USED IN GANGNIAGA:
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. API Server (OpenAI-compatible) → Core LLM backend for all AI operations
 * 2. Skills System → GangNiaga-specific skills (financial, validation, review)
 * 3. Persistent Memory → Cross-session business context & user preferences
 * 4. Subagent Delegation → Parallel research, analysis, multi-file work
 * 5. Kanban Board → Multi-agent coordination for complex business workflows
 * 6. Cron Jobs → Scheduled reports, alerts, daily briefings
 * 7. Persistent Goals → Long-running autonomous business analysis tasks
 * 8. MCP Integration → Connect QuickBooks, Xero, banking APIs
 * 9. Browser Automation → Market research, competitor analysis
 * 10. Voice Mode → Voice-driven business queries
 * 11. Honcho Memory → Dialectic user modeling for personalization
 * 12. Provider Routing → Cost/speed/quality optimization
 * 13. Messaging Gateway → Business alerts via Telegram/Discord/Slack
 * 14. Tools & Toolsets → 70+ tools for comprehensive business operations
 * 15. Batch Processing → Scale research across many prompts
 */
