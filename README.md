<p align="center">
  <img src="public/logo.svg" alt="GangNiaga AI Logo" width="80" height="80" />
  <h1 align="center">GangNiaga AI OS</h1>
  <p align="center">
    <strong>Autonomous AI Business Operating System</strong>
  </p>
  <p align="center">
    OpenClaw-inspired agentic runtime • AI-native business intelligence • Multi-agent orchestration<br/>
    Browser automation infrastructure • Financial forecasting engine • Workflow automation ecosystem
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma 6" />
  <img src="https://img.shields.io/badge/Bun-Runtime-000?logo=bun" alt="Bun" />
  <img src="https://img.shields.io/badge/Schema-38_Models-success" alt="38 DB Models" />
  <img src="https://img.shields.io/badge/API-20+_Endpoints-blue" alt="20+ API Endpoints" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Core Product Identity](#core-product-identity)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Core Modules](#core-modules)
- [AI Agent System](#ai-agent-system)
- [Agent Orchestration (DAG Pipelines)](#agent-orchestration-dag-pipelines)
- [Tool Execution Runtime](#tool-execution-runtime)
- [Memory Architecture](#memory-architecture)
- [Browser Automation](#browser-automation)
- [Financial Intelligence Engine](#financial-intelligence-engine)
- [Export System](#export-system)
- [Observability System](#observability-system)
- [Security Architecture](#security-architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [State Management](#state-management)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

**GangNiaga AI OS** is an enterprise-grade Autonomous Business Operating System that combines:

1. **LivePlan-style** business intelligence
2. **OpenClaw-style** autonomous agents
3. **Manus-style** workflow execution
4. **Devin-style** orchestration systems
5. **LangGraph-style** AI runtime coordination

This is NOT a simple AI chatbot, CRUD dashboard, template SaaS, or ChatGPT wrapper.

This IS:
- An enterprise AI operating system
- Autonomous workflow infrastructure
- Distributed agent runtime platform
- Browser automation ecosystem
- Business intelligence execution engine

---

## Core Product Identity

| Traditional Business Tools | GangNiaga AI OS |
|---|---|
| Manual data entry and analysis | AI auto-generates insights, forecasts, and actions |
| Static dashboards | Dynamic KPI intelligence with AI-driven recommendations |
| Siloed business functions | Unified OS with interconnected agents and pipelines |
| Reactive reporting | Proactive AI agents that monitor, alert, and act autonomously |
| One-size-fits-all templates | Context-aware, memory-injected, industry-specific AI generation |
| No tool access | 10 registered tools with permission-based execution |
| No memory | Persistent memory architecture with relevance ranking |
| Manual browser tasks | Autonomous browser automation with agent-browser |
| No observability | Full execution monitoring, distributed tracing, token tracking |

---

## Key Features

### Business Intelligence
- **AI Business Plan Builder** — 8-section plans with AI generation per section
- **Financial Forecasting Engine** — Multi-scenario modeling (Best/Base/Worst/Custom) with revenue/expense tracking, auto-generated P&L, Balance Sheet, Cash Flow
- **KPI Dashboard** — Real-time tracking with AI-computed insights and health indicators
- **AI Report Generator** — 5 report types (Investor, Board, KPI, Financial, Market) with AI
- **Financial Intelligence Engine** — SaaS metrics, burn rate analysis, scenario analysis, KPI health scoring, investor metrics, forecast validation

### AI Agent System
- **8 Specialized Agents** — CFO, CEO, Research, Growth, Operations, Fundraising, Browser, Reporting
- **Agent Orchestrator** — Memory-injected system prompts, tool call parsing, persistent sessions
- **DAG Pipeline Engine** — Multi-agent orchestration with topological sort, parallel execution, template resolution
- **Persistent Memory** — 7 memory categories with relevance ranking, access tracking, aging, compression
- **10 Registered Tools** — Web search, forecast calculate, browser navigate, email send, export generate, CRM lookup, analytics query, KPI update, notification send, code execute

### Automation & Integration
- **DAG Workflow Engine** — Step-level execution with topological sort, condition branching, template resolution
- **6 Step Types** — Agent, Tool, Condition, Delay, Notification, Pipeline
- **5 Pre-built Templates** — Weekly KPI Report, Competitor Monitor, Revenue Alert, Investor Update, Slack Summary
- **Browser Automation** — agent-browser integration with session management, screenshot capture, content extraction
- **Real Export System** — PDF, DOCX, PPTX, XLSX, CSV, Markdown generation with actual file download

### Enterprise Features
- **RBAC Permission System** — Role hierarchy (super_admin → viewer) with resource-action matrix
- **Agent Permission System** — Per-agent resource/action permissions with constraints
- **Rate Limiting** — Per-endpoint configurable rate limits with IETF standard headers
- **Audit Logging** — Complete audit trail for all API actions (success, failure, denied)
- **API Key Management** — SHA-256 hashed keys with permissions and expiration
- **Multi-tenant Architecture** — Organization-based data isolation
- **Observability** — Execution monitoring, distributed tracing, AI token tracking with cost estimation
- **Dark/Light Theme** — Full theme support with system preference detection
- **Responsive Design** — Mobile-first layout with collapsible sidebar

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16 | React framework with App Router |
| **React** | 19 | UI library |
| **TypeScript** | 5 | Type safety |
| **Tailwind CSS** | 4 | Utility-first CSS |
| **shadcn/ui** | New York style | Component library (46 components) |
| **Recharts** | 2 | Data visualization & charts |
| **Framer Motion** | 12 | Animations |
| **Zustand** | 5 | Client state management |
| **Lucide React** | — | Icon library |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js API Routes** | 16 | REST API endpoints |
| **Prisma** | 6 | ORM & database management |
| **SQLite** | — | Embedded database |
| **z-ai-web-dev-sdk** | 0.0.17 | AI/LLM integration |
| **Zod** | 4 | Schema validation |
| **agent-browser** | — | Browser automation runtime |

### Backend Libraries (Custom)
| Module | Purpose |
|---|---|
| `lib/middleware` | Auth, RBAC, rate limiting, audit logging, API handler wrapper |
| `lib/agents` | Agent orchestrator, DAG pipeline engine |
| `lib/tools` | Tool registry, executor, approval system |
| `lib/memory` | Memory engine with relevance ranking, compression, cleanup |
| `lib/browser` | Browser automation runtime, session management |
| `lib/finance` | SaaS metrics, burn rate, scenario analysis, KPI health, investor metrics |
| `lib/exports` | Export engine (PDF/DOCX/PPTX/XLSX/CSV/MD) |
| `lib/workflows` | DAG workflow engine with step-level execution |
| `lib/observability` | Execution tracking, distributed tracing, token usage |

### Development
| Technology | Purpose |
|---|---|
| **Bun** | JavaScript runtime & package manager |
| **ESLint** | Code linting |
| **PostCSS** | CSS processing |
| **Caddy** | Reverse proxy & gateway |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Caddy Gateway                                  │
│                        (Reverse Proxy :81)                                │
│                     XTransformPort routing                                │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       Next.js 16 Application                             │
│                           (Port 3000)                                    │
│                                                                          │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────────┐ │
│  │ React Client  │  │   API Routes     │  │    Backend Libraries      │ │
│  │ (App Shell)   │──│   (REST API)     │──│                           │ │
│  │               │  │                  │  │  ┌─────────────────────┐  │ │
│  │ • Zustand     │  │  /api/auth/*     │  │  │  Middleware Layer    │  │ │
│  │ • shadcn/ui   │  │  /api/chat/*     │  │  │  • Auth (RBAC)      │  │ │
│  │ • Recharts    │  │  /api/plans/*    │  │  │  • Rate Limiting    │  │ │
│  │ • Framer      │  │  /api/forecast   │  │  │  • Audit Logging    │  │ │
│  │   Motion      │  │  /api/agents/*   │  │  │  • API Handler      │  │ │
│  │               │  │  /api/reports/*  │  │  └─────────────────────┘  │ │
│  │ 11 Pages:     │  │  /api/workflow   │  │  ┌─────────────────────┐  │ │
│  │ Dashboard     │  │  /api/kpis/*     │  │  │  Agent Runtime      │  │ │
│  │ Plans         │  │  /api/settings   │  │  │  • Orchestrator     │  │ │
│  │ Forecasting   │  │  /api/exports/*  │  │  │  • Pipeline (DAG)   │  │ │
│  │ Agents        │  │  /api/browser    │  │  │  • Tool Executor    │  │ │
│  │ Copilot       │  │  /api/pipelines  │  │  └─────────────────────┘  │ │
│  │ Reports       │  │  /api/tools/*    │  │  ┌─────────────────────┐  │ │
│  │ Workflows     │  │  /api/memories   │  │  │  Memory Engine      │  │ │
│  │ Observability │  │  /api/finance    │  │  │  • Store/Retrieve   │  │ │
│  │ Browser       │  │  /api/observ.    │  │  │  • Ranking/Compress │  │ │
│  │ Settings      │  │  /api/notif.     │  │  └─────────────────────┘  │ │
│  └──────────────┘  └────────┬─────────┘  └────────────┬──────────────┘ │
│                             │                           │               │
│                             ▼                           ▼               │
│                     ┌──────────────┐           ┌──────────────┐         │
│                     │ Prisma ORM   │           │ z-ai-web-dev │         │
│                     │ (SQLite)     │           │    SDK       │         │
│                     │ 38 Models    │           │ (LLM/AI)     │         │
│                     └──────┬───────┘           └──────────────┘         │
│                            │                                            │
│                            ▼                                            │
│                     ┌──────────────┐                                    │
│                     │  custom.db   │                                    │
│                     │  (SQLite)    │                                    │
│                     └──────────────┘                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
User Action
    │
    ▼
Zustand Store (currentPage)
    │
    ▼
API Request
    │
    ├── Rate Limiting ──── X-RateLimit-* headers
    ├── Authentication ─── session_user cookie → AuthUser
    ├── RBAC Check ─────── role + resource + action → allow/deny
    ├── Audit Log ──────── record action attempt
    │
    ▼
Handler Execution
    │
    ├── Agent Orchestrator ── memory injection → LLM → tool parsing → execution
    ├── Pipeline Engine ───── DAG resolve → level-by-level → parallel execution
    ├── Tool Executor ─────── schema validation → permission check → execute → trace
    ├── Workflow Engine ───── DAG resolve → step execution → template resolution
    ├── Finance Engine ────── KPI queries → calculations → projections
    │
    ├── Observability ──── track event + token usage
    ├── Audit Log ──────── record outcome
    │
    ▼
JSON Response → UI Update
```

---

## Project Structure

```
gangniaga-ai/
├── prisma/
│   └── schema.prisma                    # Database schema (38 models)
├── db/
│   └── custom.db                        # SQLite database file
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout (ThemeProvider + Toaster)
│   │   ├── page.tsx                     # Main app shell + client-side routing (11 pages)
│   │   ├── globals.css                  # Tailwind + custom CSS variables
│   │   └── api/                         # REST API routes
│   │       ├── auth/
│   │       │   ├── login/route.ts       # POST - Login with rate limiting + audit
│   │       │   ├── register/route.ts    # POST - Register with rate limiting + audit
│   │       │   └── session/route.ts     # GET - Session check
│   │       ├── chat/
│   │       │   ├── route.ts             # POST - Chat with agent orchestrator + token tracking
│   │       │   └── [id]/route.ts        # GET/DELETE - Chat session
│   │       ├── plans/
│   │       │   ├── route.ts             # GET/POST - Plans with RBAC + audit
│   │       │   └── [id]/route.ts        # PATCH/DELETE - Plan update
│   │       ├── forecasts/route.ts       # GET/POST - Forecasts with RBAC + audit
│   │       ├── agents/route.ts          # GET/POST - Agent tasks via orchestrator
│   │       ├── reports/route.ts         # GET/POST - Reports with RBAC + audit
│   │       ├── workflows/
│   │       │   ├── route.ts             # GET/POST - Workflows
│   │       │   └── [id]/route.ts        # PATCH/DELETE - Workflow update
│   │       ├── pipelines/
│   │       │   ├── route.ts             # GET/POST - DAG pipelines
│   │       │   └── [id]/route.ts        # GET/POST/PATCH/DELETE - Pipeline CRUD + execute
│   │       ├── tools/
│   │       │   ├── execute/route.ts     # GET/POST - Tool registry + execution
│   │       │   └── approvals/route.ts   # GET/POST - Tool approval system
│   │       ├── memories/route.ts        # GET/POST - Memory store/retrieve/compress
│   │       ├── browser/route.ts         # GET/POST - Browser automation
│   │       ├── exports/
│   │       │   ├── route.ts             # GET/POST - Export jobs
│   │       │   └── [id]/route.ts        # GET - Export download
│   │       ├── finance/route.ts         # GET/POST - Financial intelligence
│   │       ├── observability/route.ts   # GET/POST - Observability dashboard
│   │       ├── kpis/route.ts            # GET/POST - KPI metrics
│   │       ├── notifications/route.ts   # GET/POST/PATCH - Notifications
│   │       └── settings/route.ts        # GET/PATCH - Organization settings
│   ├── components/
│   │   ├── auth/auth-page.tsx           # Login/Register tabs
│   │   ├── layout/
│   │   │   ├── app-header.tsx           # Top navigation bar
│   │   │   └── app-sidebar.tsx          # Collapsible sidebar (11 nav items + DevOps group)
│   │   ├── dashboard/dashboard-page.tsx # KPI cards, charts, AI insights
│   │   ├── plans/plans-page.tsx         # Business plan builder + editor
│   │   ├── forecasting/forecasting-page.tsx # Financial modeling + statements
│   │   ├── agents/agents-page.tsx       # 4 tabs: Agents, Pipelines, Tools, Memory
│   │   ├── copilot/copilot-page.tsx     # AI chat interface
│   │   ├── reports/reports-page.tsx     # Report generator + preview
│   │   ├── workflows/workflows-page.tsx # Workflow builder + templates
│   │   ├── observability/observability-page.tsx # Execution monitoring dashboard
│   │   ├── browser/browser-page.tsx     # Browser automation console
│   │   ├── settings/settings-page.tsx   # 8-tab settings panel
│   │   ├── providers/theme-provider.tsx # Dark/light theme
│   │   └── ui/                          # 46 shadcn/ui components
│   ├── lib/
│   │   ├── db.ts                        # Prisma client singleton
│   │   ├── utils.ts                     # cn() utility
│   │   ├── middleware/                  # Security & API infrastructure
│   │   │   ├── auth.ts                  # Auth middleware (getAuthUser, requireAuth)
│   │   │   ├── rbac.ts                  # RBAC (role hierarchy, resource-action matrix)
│   │   │   ├── rate-limit.ts            # Rate limiting (per-endpoint, IETF headers)
│   │   │   ├── audit.ts                 # Audit logging (logAudit, logAction, logDenied)
│   │   │   ├── with-api-handler.ts      # API route wrapper (auth+RBAC+rate+audit)
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── agents/                      # Agent runtime
│   │   │   ├── orchestrator.ts          # Agent definitions + executeAgentTask
│   │   │   ├── pipeline.ts              # DAG pipeline engine (create, execute, list)
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── tools/                       # Tool execution runtime
│   │   │   ├── registry.ts              # 10 tool definitions with schemas
│   │   │   ├── executor.ts              # Tool executor + tracing + approval
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── memory/                      # Memory architecture
│   │   │   ├── engine.ts                # Store, retrieve, rank, compress, cleanup
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── browser/                     # Browser automation
│   │   │   ├── runtime.ts               # Session mgmt, execute actions, screenshots
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── finance/                     # Financial intelligence engine
│   │   │   ├── engine.ts                # SaaS metrics, burn rate, scenarios, health, investor
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── exports/                     # Export system
│   │   │   ├── engine.ts                # PDF/DOCX/PPTX/XLSX/CSV/MD generation
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── workflows/                   # Workflow engine
│   │   │   ├── engine.ts                # DAG execution, step runners, template resolution
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── observability/               # Observability system
│   │   │   ├── tracker.ts               # Events, traces, token usage, dashboard data
│   │   │   └── index.ts                 # Barrel exports
│   │   └── stores/
│   │       ├── app-store.ts             # Navigation + UI state (11 pages)
│   │       └── auth-store.ts            # Authentication state
│   └── hooks/
│       ├── use-mobile.ts                # Mobile breakpoint hook
│       └── use-toast.ts                 # Toast notifications
├── Caddyfile                            # Reverse proxy configuration
├── package.json                         # Dependencies & scripts
└── worklog.md                           # Development worklog
```

---

## Getting Started

### Prerequisites

- **Bun** >= 1.0 (recommended runtime)
- **Node.js** >= 18 (alternative runtime)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd gangniaga-ai

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Initialize the database
bun run db:push

# Generate Prisma client
bun run db:generate

# Start the development server
bun run dev
```

The application will be available at `http://localhost:3000`.

### Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start development server on port 3000 |
| `bun run build` | Build for production (standalone output) |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint checks |
| `bun run db:push` | Push schema changes to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:reset` | Reset database |

---

## Core Modules

### 1. Dashboard
Central command center with real-time KPIs, AI insights, financial health indicators, and agent monitoring.

### 2. Business Plan Builder
AI-powered 8-section business plan creation with auto-generate, rewrite, status workflow (Draft → Review → Approved → Archived), and export.

### 3. Financial Forecasting Engine
Multi-scenario modeling with revenue/expense tracking, auto-generated P&L/Balance Sheet/Cash Flow, SaaS metrics, and AI CFO insights.

### 4. KPI Intelligence
Real-time monitoring across 5 categories (Revenue, Growth, SaaS, Cash, Customer) with target tracking and AI-computed insights.

### 5. AI Agent System (4 Tabs)
- **Agents Tab** — 8 agent cards with available tools, task assignment, agent chat, orchestration flow
- **Pipelines Tab** — DAG pipeline creation, execution, status monitoring, visual DAG diagram
- **Tools Tab** — 10 registered tools with schema-based execution, approval workflow, history
- **Memory Tab** — Memory entries with search, filtering, stats, compress/cleanup actions

### 6. AI Copilot
Chat interface with 5 agent types, history persistence, markdown rendering, suggestion cards.

### 7. Report Generator
5 report types with AI generation, quick templates, and real export (PDF/DOCX/PPTX/XLSX/CSV).

### 8. Workflow Automation
DAG workflow builder with 6 step types, condition branching, template resolution, execution history, and pre-built templates.

### 9. Observability Dashboard
Execution monitoring with event breakdown charts, token usage analytics, error tracking, slow operations, distributed tracing.

### 10. Browser Automation Console
Session management, action toolbar (navigate/click/type/screenshot/extract), snapshot gallery, quick workflows.

### 11. Settings
8-section settings panel: Profile, Organization, Team, Billing, Integrations, Notifications, Security, Appearance.

---

## AI Agent System

### Agent Types

| Agent | Role | Allowed Tools | Max Concurrent |
|---|---|---|---|
| **CFO Agent** | Financial strategy, cash flow, runway | forecast_calculate, kpi_update, analytics_query, export_generate | 3 |
| **CEO Agent** | Strategic vision, positioning | web_search, analytics_query, crm_lookup | 2 |
| **Research Agent** | Market intelligence, competitors | web_search, browser_navigate, analytics_query | 5 |
| **Growth Agent** | Customer acquisition, retention | web_search, analytics_query, crm_lookup, notification_send | 3 |
| **Operations Agent** | Process optimization, efficiency | analytics_query, kpi_update, notification_send | 3 |
| **Fundraising Agent** | Investment strategy, pitch prep | web_search, analytics_query, export_generate, forecast_calculate | 2 |
| **Browser Agent** | Web automation, data extraction | browser_navigate, web_search | 2 |
| **Reporting Agent** | Report generation, data synthesis | analytics_query, export_generate, kpi_update, forecast_calculate | 3 |

### Agent Execution Lifecycle

1. **Session Creation** — Get or create AgentSession
2. **Memory Injection** — Build system prompt with top-10 relevant memories from Memory Engine
3. **Task Creation** — Create AgentTask (status: running)
4. **LLM Call** — z-ai-web-dev-sdk with agent-specific system prompt
5. **Tool Call Parsing** — Detect tool requests in LLM output (3 pattern matchers)
6. **Tool Execution** — Execute requested tools via Tool Executor
7. **Result Update** — Update AgentTask with output (status: completed)
8. **Memory Save** — Store relevant insights in Memory Engine
9. **Audit Log** — Record execution in AuditLog
10. **Observability** — Track event and token usage

---

## Agent Orchestration (DAG Pipelines)

Multi-agent pipeline system with topological sort for DAG execution:

```
┌─────────────┐     ┌─────────────┐
│  CEO Agent  │────▶│Research Agent│
│  (Step 1)   │     │  (Step 2a)  │
└─────────────┘     └──────┬──────┘
                           │
                    ┌──────▼──────┐     ┌─────────────┐
                    │  CFO Agent  │────▶│Report Agent  │
                    │  (Step 2b)  │     │  (Step 3)   │
                    └─────────────┘     └─────────────┘
```

**Features:**
- **Kahn's Algorithm** — Topological sort for execution order
- **Parallel Execution** — Steps within a level run in parallel via `Promise.allSettled`
- **Template Resolution** — `{{stepId.field}}` and `{{stepIndex.output}}` patterns
- **Pipeline CRUD** — Create, read, update, delete, execute
- **Run Tracking** — AgentPipelineRun with PipelineStepRun per step
- **Error Handling** — Step-level failure tracking with early stop

**API:** `GET/POST /api/pipelines`, `GET/POST/PATCH/DELETE /api/pipelines/[id]`

---

## Tool Execution Runtime

### 10 Registered Tools

| Tool | Category | Requires Approval | Rate Limited | Sandboxed |
|---|---|---|---|---|
| `web_search` | Analytics | No | Yes (10/min) | No |
| `forecast_calculate` | Finance | No | No | No |
| `browser_navigate` | Browser | No | Yes (5/min) | Yes |
| `email_send` | Communication | **Yes** | Yes (10/min) | No |
| `export_generate` | Export | No | No | No |
| `crm_lookup` | CRM | No | No | No |
| `analytics_query` | Analytics | No | No | No |
| `kpi_update` | Data | No | No | No |
| `notification_send` | Communication | No | No | No |
| `code_execute` | Analytics | **Yes** | No | Yes |

### Execution Lifecycle

1. **Schema Validation** — Validate input against tool's JSON schema
2. **Permission Check** — Verify user role has access to tool's required permissions
3. **Rate Limiting** — Check per-tool per-user rate limits
4. **Approval Flow** — If `requiresApproval`, return 202 with approval ID
5. **DB Trace** — Create ToolExecution record (pending → running → completed/failed)
6. **Timeout Handling** — Enforce per-tool timeout (default 30s)
7. **Execution** — Run tool-specific implementation
8. **Token Tracking** — Record AI token usage for applicable tools
9. **Audit Log** — Record execution outcome

**API:** `GET/POST /api/tools/execute`, `GET/POST /api/tools/approvals`

---

## Memory Architecture

### Memory Categories

| Category | Purpose | Examples |
|---|---|---|
| `user_preference` | User-specific preferences | Communication style, preferred formats |
| `workspace_context` | Organization context | Industry, team size, business model |
| `agent_knowledge` | Agent-learned knowledge | Past analysis results, patterns |
| `forecast_insight` | Financial projections | Key metrics, trends, anomalies |
| `workflow_pattern` | Workflow knowledge | Common patterns, success rates |
| `market_intelligence` | Market data | Competitor info, market size, trends |
| `financial_summary` | Financial summaries | Revenue patterns, expense categories |

### Relevance Ranking Algorithm

```
rankedScore = relevanceScore × (1 + accessCount × 0.1) × recencyBoost
```

- **relevanceScore** — Initial score (0.0–1.0), decreases over time via `ageMemoryRelevance()`
- **accessCount** — Incremented on each retrieval, boosts relevance (+0.01 per touch)
- **recencyBoost** — Newer memories get a boost

### Lifecycle Management

- **Compression** — LLM-powered summarization of long, low-access memories
- **Aging** — Time-decay for stale memories (>7 days, mitigated by access count)
- **Cleanup** — TTL-based deletion via `expiresAt` field
- **Search** — SQLite LIKE-based text search (simulating vector search)

**API:** `GET/POST /api/memories`

---

## Browser Automation

### Supported Actions

| Action | Description | Parameters |
|---|---|---|
| `navigate` | Go to URL | url |
| `click` | Click element | selector |
| `type` | Type text | selector, value |
| `screenshot` | Capture screenshot | selector (optional) |
| `extract` | Extract page content | selector (optional) |
| `fill` | Fill form field | selector, value |
| `scroll` | Scroll page | — |
| `wait` | Wait for element | selector, timeout |

### Architecture

- **Dual Strategy** — Tries agent-browser CLI first, falls back to AI simulation via z-ai-web-dev-sdk
- **Session Management** — BrowserSession records with status tracking
- **Snapshot Storage** — BrowserSnapshot records for screenshots and extracted content
- **Audit Trail** — All browser actions logged

**API:** `GET/POST /api/browser`

---

## Financial Intelligence Engine

### SaaS Metrics Calculator

| Metric | Formula | Source |
|---|---|---|
| MRR | Sum of subscription revenue KPIs | KPI table |
| ARR | MRR × 12 | Calculated |
| CAC | Marketing spend / New customers | KPI table |
| LTV | ARPU × (1/churn) × gross margin | KPI table |
| LTV:CAC Ratio | LTV / CAC | Calculated |
| Churn Rate | From KPI data | KPI table |
| Gross Margin | (Revenue - COGS) / Revenue | KPI table |
| Payback Period | CAC / (MRR × Gross Margin) | Calculated |
| Rule of 40 | Growth rate + Margin | Calculated |

### Burn Rate Analysis
- Gross/Net burn rate from forecast financial statements
- Cash runway calculation (months until zero)
- Burn trend detection (increasing/stable/decreasing)
- Monthly burn history with cash balance

### KPI Health Scoring
- Weighted scoring: Revenue (30%), Cash (25%), Growth (20%), SaaS (15%), Efficiency (10%)
- A-F grading system with smart alerts
- Category-level health status (healthy/warning/critical)

### Investor Metrics
- Revenue multiple valuation
- Traction metrics (MRR growth, customer growth, NRR)
- Unit economics (LTV, CAC, LTV:CAC, payback, margin)
- Burn efficiency (net burn, ARR per employee, runway)

### Forecast Validation
- Error detection (negative runway, unrealistic growth, missing data)
- Assumption documentation
- Risk factor identification

**API:** `GET/POST /api/finance?type=saas|burn_rate|scenario|health|investor|validation`

---

## Export System

### Supported Formats

| Format | Implementation | Description |
|---|---|---|
| **PDF** | HTML with print-optimized CSS | Professional PDF output |
| **DOCX** | Word-compatible HTML with Office namespaces | Microsoft Word format |
| **PPTX** | Slide-based HTML from H2 sections | PowerPoint format |
| **XLSX** | SpreadsheetML XML | Excel native format |
| **CSV** | Standard CSV with escaping | Comma-separated values |
| **Markdown** | Direct content pass-through | Plain text format |

### Export Types

| Type | Data Source | Content |
|---|---|---|
| `plan` | BusinessPlan + PlanSections | Full plan with all sections |
| `report` | Report content | AI-generated report |
| `forecast` | Forecast + Revenue/Expenses + Statements | Financial projections with tables |
| `kpi` | KPI data grouped by category | KPI summary with change calculations |

**API:** `GET/POST /api/exports`, `GET /api/exports/[id]?download=true`

---

## Observability System

### Features

- **Event Tracking** — All executions (agent, workflow, pipeline, browser, tool, API) recorded
- **Distributed Tracing** — Trace ID + Span ID for request correlation
- **Token Usage** — AI token consumption by agent type, model, request type
- **Cost Estimation** — Automated cost calculation ($0.01/1K tokens)
- **Dashboard** — Event breakdown, token usage trends, error tracking, slow operations
- **Data Retention** — Configurable cleanup of old events

### Dashboard Metrics

| Metric | Description |
|---|---|
| Total Events | Count by time range |
| Average Response Time | Mean execution duration |
| Token Usage | Total tokens consumed |
| Error Rate | Percentage of error/critical events |
| Events by Type | Breakdown across 6 event types |
| Token by Agent | Usage per agent type |
| Daily Trend | Time series of events and tokens |

**API:** `GET/POST /api/observability`

---

## Security Architecture

### RBAC Role Hierarchy

| Role | Permissions |
|---|---|
| `super_admin` / `owner` | Wildcard access (`*`) |
| `admin` | read, write, execute, admin |
| `manager` | read, write, execute |
| `accountant` | read, write, execute:finance |
| `viewer` | read only |

### Resource-Action Matrix

10 resources (plans, forecasts, agents, workflows, reports, settings, exports, integrations, browser, kpis) × 4 actions (read, write, execute, admin).

### Rate Limiting

| Endpoint | Window | Max Requests |
|---|---|---|
| chat | 1 min | 20 |
| agents | 1 min | 10 |
| reports | 5 min | 5 |
| forecasts | 1 min | 10 |
| plans | 1 min | 15 |
| exports | 1 min | 10 |
| workflows | 1 min | 15 |
| settings | 1 min | 30 |
| auth | 1 min | 10 |
| default | 1 min | 60 |

IETF standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Window`

### Audit Logging

All API actions logged with: userId, organizationId, action, resource, resourceId, status, IP address, user agent, timestamp.

### Agent Permissions

Per-agent resource/action permissions with constraints (e.g., rate limits, allowed fields) stored in `AgentPermission` table.

### API Key Management

SHA-256 hashed keys with prefix identification, permission scoping, expiration, and usage tracking.

---

## Database Schema

38 interconnected models organized into 12 domain groups.

### Entity Relationship Overview

```
User ──┬── Membership ──── Organization ──┬── Workspace
       ├── ApiKey                            ├── BusinessPlan ──── PlanSection
       ├── AuditLog                          ├── Forecast ──┬── ForecastRevenue
       ├── ChatSession ── ChatMessage        │               ├── ForecastExpense
       ├── AgentSession ──┬── AgentTask      │               └── FinancialStatement
       │                  ├── AgentMemory    ├── Kpi
       │                  └── ToolExecution  ├── Report
       ├── BrowserSession ── BrowserSnapshot ├── Workflow ──┬── WorkflowStep
       ├── Export                              │              ├── WorkflowRun
       └── Notification                        │              └── WorkflowStepRun
                                                ├── AgentPipeline ──┬── AgentPipelineStep
                                                │                   └── AgentPipelineRun
                                                │                        └── PipelineStepRun
                                                ├── Subscription
                                                ├── Integration ── IntegrationEvent
                                                ├── AutomationLog
                                                ├── ScheduledJob
                                                └── RateLimitLog

MemoryEntry (standalone)
TokenUsage (standalone)
ObservabilityEvent (standalone)
SkillRegistry (standalone)
AgentPermission (standalone)
```

### Model Summary

| Domain | Models | Count |
|---|---|---|
| Core | User, Organization, Workspace, Membership | 4 |
| Auth & Security | ApiKey, AuditLog, RateLimitLog | 3 |
| Business Plans | BusinessPlan, PlanSection | 2 |
| Forecasting | Forecast, ForecastRevenue, ForecastExpense, FinancialStatement | 4 |
| KPI | Kpi | 1 |
| AI Agents | AgentSession, AgentTask, AgentMemory, ToolExecution | 4 |
| Agent Pipelines | AgentPipeline, AgentPipelineStep, AgentPipelineRun, PipelineStepRun | 4 |
| Memory | MemoryEntry | 1 |
| Chat | ChatSession, ChatMessage | 2 |
| Workflows | Workflow, WorkflowStep, WorkflowRun, WorkflowStepRun | 4 |
| Browser | BrowserSession, BrowserSnapshot | 2 |
| Reports | Report | 1 |
| Notifications | Notification | 1 |
| Billing | Subscription | 1 |
| Exports | Export | 1 |
| Integrations | Integration, IntegrationEvent | 2 |
| Scheduling | ScheduledJob | 1 |
| Observability | TokenUsage, ObservabilityEvent | 2 |
| Automation | AutomationLog, SkillRegistry, AgentPermission | 3 |
| **Total** | | **38** |

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user + org + KPIs (rate limited) |
| POST | `/api/auth/login` | Login with audit trail (rate limited) |
| GET | `/api/auth/session` | Check session status |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send message via agent orchestrator |
| GET | `/api/chat/[id]` | Get chat session + messages |
| DELETE | `/api/chat/[id]` | Delete chat session |

### Business Plans
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/plans` | Create plan with AI generation |
| GET | `/api/plans` | List plans |
| PATCH | `/api/plans/[id]` | Update plan/sections |
| DELETE | `/api/plans/[id]` | Delete plan |

### Forecasting
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/forecasts` | Create forecast + statements |
| GET | `/api/forecasts` | List forecasts with items |

### AI Agents
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/agents` | Execute agent task via orchestrator |
| GET | `/api/agents` | List agent sessions |

### Agent Pipelines
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/pipelines` | Create DAG pipeline |
| GET | `/api/pipelines` | List pipelines |
| GET | `/api/pipelines/[id]` | Get pipeline status |
| POST | `/api/pipelines/[id]` | Execute pipeline |
| PATCH | `/api/pipelines/[id]` | Update pipeline |
| DELETE | `/api/pipelines/[id]` | Delete pipeline |

### Tool Execution
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tools/execute` | List registered tools |
| POST | `/api/tools/execute` | Execute a tool |
| GET | `/api/tools/approvals` | List pending approvals |
| POST | `/api/tools/approvals` | Approve/reject execution |

### Memory
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/memories` | Retrieve/search memories |
| POST | `/api/memories` | Store/compress/cleanup memories |

### Browser Automation
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/browser` | List browser sessions |
| POST | `/api/browser` | Create session / execute action / screenshot / extract / close |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports` | Generate AI report |
| GET | `/api/reports` | List reports |

### Workflows
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows` | List workflows |
| PATCH | `/api/workflows/[id]` | Update workflow |
| DELETE | `/api/workflows/[id]` | Delete workflow |

### Financial Intelligence
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/finance` | Get SaaS/burn/scenario/health/investor metrics |
| POST | `/api/finance` | Validate forecast |

### Exports
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/exports` | Start export job |
| GET | `/api/exports` | List exports |
| GET | `/api/exports/[id]` | Get status / download file |

### Observability
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/observability` | Dashboard / token stats / traces |
| POST | `/api/observability` | Track event / token usage |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/kpis` | List/create KPIs |
| GET/POST/PATCH | `/api/notifications` | CRUD notifications |
| GET/PATCH | `/api/settings` | Organization settings |

---

## State Management

### Zustand Stores

```typescript
// app-store.ts — Navigation & UI
interface AppState {
  currentPage: 'dashboard' | 'plans' | 'forecasting' | 'agents' | 'copilot' | 
    'reports' | 'workflows' | 'observability' | 'browser' | 'settings'
  sidebarOpen: boolean
  sidebarCollapsed: boolean
}

// auth-store.ts — Authentication
interface AuthState {
  user: { id, email, name, avatar, role } | null
  organization: { id, name, slug, logo, industry, size, currency } | null
  isAuthenticated: boolean
  login / register / logout / setUser / setOrganization
}
```

---

## Environment Variables

```env
# Database
DATABASE_URL="file:./db/custom.db"

# AI SDK (z-ai-web-dev-sdk) — pre-configured, no API keys needed in sandbox
```

---

## Roadmap

### Phase 1 — Enterprise Foundation (Current) ✅

- [x] Authentication with rate limiting + audit logging
- [x] Dashboard with KPI cards, charts, AI insights
- [x] Business Plan Builder with AI generation
- [x] Financial Forecasting Engine with multi-scenario modeling
- [x] KPI Intelligence dashboard
- [x] AI Agent System (8 agents) with memory injection
- [x] Agent Orchestration (DAG pipelines with topological sort)
- [x] Tool Execution Runtime (10 tools, approval system, tracing)
- [x] Memory Architecture (7 categories, relevance ranking, compression)
- [x] Browser Automation Console (agent-browser integration)
- [x] Real Export System (PDF/DOCX/PPTX/XLSX/CSV/MD)
- [x] Financial Intelligence Engine (SaaS metrics, burn rate, scenarios, health, investor)
- [x] Observability System (execution tracking, distributed tracing, token usage)
- [x] DAG Workflow Engine (6 step types, condition branching, template resolution)
- [x] Security Architecture (RBAC, rate limiting, audit logging, agent permissions, API keys)
- [x] AI Copilot chat interface
- [x] Report Generator (5 types)
- [x] Settings panel

### Phase 2 — Realtime & Integration (Next)

- [ ] Real-time WebSocket notifications
- [ ] Stripe billing integration (real payments)
- [ ] Rich text editor (TipTap) for plan sections
- [ ] Real browser automation via Playwright pools
- [ ] Multi-language support (EN, MS, ZH)
- [ ] Email notification delivery (SendGrid/Resend)
- [ ] Advanced KPI alerting rules
- [ ] External integration connectors (QuickBooks, Xero, Stripe, HubSpot)
- [ ] Cron job scheduler service
- [ ] Advanced admin analytics

### Phase 3 — Scale (Future)

- [ ] PostgreSQL migration with pgvector for embeddings
- [ ] Redis caching layer
- [ ] LangGraph multi-agent orchestration framework
- [ ] Temporal workflow engine integration
- [ ] GraphQL API layer
- [ ] Meilisearch full-text search
- [ ] BullMQ job queue for background processing
- [ ] Docker/Kubernetes deployment
- [ ] Sandbox execution environment (Docker isolation)
- [ ] Horizontal scaling with load balancing

---

## License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ using Next.js 16, React 19, TypeScript, and AI.<br/>
  <strong>GangNiaga AI OS</strong> — Your Autonomous Business Operating System<br/>
  <em>OpenClaw-inspired • AI-native • Enterprise-grade</em>
</p>
