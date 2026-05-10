# GangNiaga AI OS — Architecture Document

> **Version:** 4.0  
> **Last Updated:** 2025-03-04  
> **Status:** Production

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Architecture](#5-database-architecture)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [AI Agent System Architecture](#7-ai-agent-system-architecture)
8. [Pipeline Engine Architecture](#8-pipeline-engine-architecture)
9. [Memory Architecture](#9-memory-architecture)
10. [API Design Principles](#10-api-design-principles)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [Security Architecture](#12-security-architecture)
13. [Scalability Considerations](#13-scalability-considerations)
14. [Performance Optimizations](#14-performance-optimizations)

---

## 1. System Architecture Overview

GangNiaga AI OS is an **Autonomous Business Operating System** that combines AI agents, financial intelligence, and business planning into a unified platform. The system follows a monolithic Next.js architecture with modular engine layers, enabling rapid iteration while maintaining clean domain boundaries.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GangNiaga AI OS v4.0                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      PRESENTATION LAYER                          │  │
│  │  Next.js 16 App Router · React 19 · Tailwind CSS 4 · shadcn/ui │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │  │
│  │  │Dashboard│ │  Plans   │ │Forecast  │ │  15 Feature Pages  │  │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └────────────────────┘  │  │
│  │  Zustand (app-store, auth-store) · Recharts · Framer Motion    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        API LAYER                                 │  │
│  │  Next.js API Routes (35+ endpoints)                              │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  withApiHandler Wrapper                                     │ │  │
│  │  │  Rate Limit → Auth → RBAC → Handler → Audit → Response    │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      ENGINE LAYER                                │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │ Finance  │ │   Idea    │ │  Plan    │ │   Pitch Deck     │  │  │
│  │  │ Engine   │ │ Validation│ │  Review  │ │    Engine        │  │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘  │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │ Research │ │  Browser  │ │  Export  │ │  Observability   │  │  │
│  │  │ Engine   │ │  Runtime  │ │  Engine  │ │    Tracker       │  │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    AGENT & PIPELINE LAYER                        │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  8 Agent Types: CFO · CEO · Research · Growth · Ops ·    │  │  │
│  │  │  Fundraising · Browser · Reporting                        │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────┐  ┌────────────────────────────────┐  │  │
│  │  │  DAG Pipeline Engine │  │  Memory Architecture          │  │  │
│  │  │  (Kahn's Algorithm)  │  │  (7 categories, LLM compress) │  │  │
│  │  └──────────────────────┘  └────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     DATA & INFRASTRUCTURE                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │  │
│  │  │ Prisma ORM   │  │   SQLite     │  │  z-ai-web-dev-sdk   │  │  │
│  │  │ (36+ models) │  │  (embedded)  │  │  (LLM Integration)  │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Monolithic Next.js | Single deployable unit, shared types, fast iteration |
| SQLite via Prisma | Zero-ops database, embedded, ACID-compliant |
| Client-side routing (Zustand) | SPA-like navigation without full page reloads |
| Engine pattern | Each domain has a standalone engine with typed I/O |
| withApiHandler wrapper | Consistent auth, RBAC, rate limiting, audit across all endpoints |
| z-ai-web-dev-sdk | Unified LLM access layer for all AI operations |

---

## 2. Technology Stack

### Runtime & Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1+ | Full-stack React framework (App Router) |
| React | 19.0 | UI rendering with concurrent features |
| TypeScript | 5.x | Type safety across the entire codebase |
| Bun | Runtime | JavaScript runtime and package manager |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 4.x | Utility-first CSS with PostCSS |
| shadcn/ui | 50 components | Pre-built Radix UI primitives + Tailwind styling |
| Zustand | 5.0 | Lightweight state management |
| Recharts | 2.15 | Data visualization and charting |
| Framer Motion | 12.x | Animation and transition library |
| TanStack Query | 5.x | Server state management and caching |
| TanStack Table | 8.x | Headless table component |
| React Hook Form | 7.x | Form state management with Zod validation |
| cmdk | 1.1 | Command palette component |
| lucide-react | 0.525+ | Icon library |
| next-themes | 0.4 | Dark mode theme management |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Prisma | 6.11 | Type-safe ORM with migration support |
| SQLite | Embedded | Zero-configuration relational database |
| z-ai-web-dev-sdk | 0.0.17 | LLM chat completions and AI operations |
| Zod | 4.x | Runtime schema validation |

### UI Components Inventory (shadcn/ui)

```
src/components/ui/
├── accordion.tsx      ├── input.tsx          ├── select.tsx
├── alert.tsx          ├── input-otp.tsx      ├── separator.tsx
├── alert-dialog.tsx   ├── label.tsx          ├── sheet.tsx
├── aspect-ratio.tsx   ├── menubar.tsx        ├── sidebar.tsx
├── avatar.tsx         ├── navigation-menu.tsx ├── skeleton.tsx
├── badge.tsx          ├── pagination.tsx      ├── slider.tsx
├── breadcrumb.tsx     ├── popover.tsx         ├── sonner.tsx
├── button.tsx         ├── progress.tsx        ├── switch.tsx
├── calendar.tsx       ├── radio-group.tsx     ├── table.tsx
├── card.tsx           ├── resizable.tsx       ├── tabs.tsx
├── carousel.tsx       ├── scroll-area.tsx      ├── toast.tsx
├── chart.tsx          ├── context-menu.tsx     ├── toaster.tsx
├── checkbox.tsx       ├── dialog.tsx           ├── toggle.tsx
├── collapsible.tsx    ├── dropdown-menu.tsx    ├── toggle-group.tsx
├── command.tsx        ├── form.tsx             ├── tooltip.tsx
├── drawer.tsx         ├── hover-card.tsx
```

---

## 3. Frontend Architecture

### 3.1 Routing Strategy

GangNiaga uses **client-side routing via Zustand** instead of Next.js file-based routing. A single root page (`src/app/page.tsx`) renders all views based on the `currentPage` state from the app store.

```typescript
// src/lib/stores/app-store.ts
export type PageId = 
  | 'dashboard' 
  | 'idea-canvas'
  | 'plans' 
  | 'forecasting' 
  | 'actuals'
  | 'plan-review'
  | 'pitch-deck'
  | 'agents' 
  | 'copilot'
  | 'research'
  | 'reports' 
  | 'workflows'
  | 'observability'
  | 'browser'
  | 'settings'

interface AppState {
  currentPage: PageId
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setCurrentPage: (page: PageId) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
}
```

**Benefits:**
- Instant page transitions without network requests
- Shared layout state (sidebar, header) across all pages
- Simplified navigation for SPA-like experience
- No route-level data fetching complexity

### 3.2 State Management

Two Zustand stores manage global state:

| Store | Purpose | Key State |
|-------|---------|-----------|
| `app-store` | UI navigation & layout | `currentPage`, `sidebarOpen`, `sidebarCollapsed` |
| `auth-store` | User authentication | `user`, `organization`, `isAuthenticated`, `isLoading` |

```typescript
// Auth store — manages login/register/logout
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    const res = await fetch('/api/auth/login', { /* ... */ })
    set({ user: data.user, organization: data.organization, isAuthenticated: true })
  },

  logout: () => set({ user: null, organization: null, isAuthenticated: false }),
}))
```

### 3.3 Component Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Root SPA page
│   ├── layout.tsx                # Root layout with providers
│   ├── globals.css               # Tailwind base styles
│   └── api/                      # API route handlers
│       ├── auth/{login,register,session}/
│       ├── agents/
│       ├── plans/[id]/
│       ├── forecasts/
│       ├── kpis/
│       ├── chat/[id]/
│       ├── reports/
│       ├── workflows/[id]/
│       ├── pipelines/[id]/
│       ├── memories/
│       ├── tools/{execute,approvals}/
│       ├── browser/
│       ├── exports/[id]/
│       ├── observability/
│       ├── finance/
│       ├── idea-canvases/[id]/
│       ├── plan-reviews/[id]/
│       ├── pitch-decks/[id]/
│       ├── research/[id]/
│       ├── actuals/[id]/
│       ├── notifications/
│       └── settings/
├── components/
│   ├── ui/                       # 50 shadcn/ui primitives
│   ├── layout/                   # app-header, app-sidebar, command-palette
│   ├── providers/                 # theme-provider
│   └── {feature}/                # Feature page components (15 pages)
│       ├── dashboard/
│       ├── plans/
│       ├── forecasting/
│       ├── actuals/
│       ├── idea-canvas/
│       ├── plan-review/
│       ├── pitch-deck/
│       ├── agents/
│       ├── copilot/
│       ├── research/
│       ├── reports/
│       ├── workflows/
│       ├── observability/
│       ├── browser/
│       ├── settings/
│       └── auth/
└── hooks/
    ├── use-mobile.ts
    ├── use-api.ts
    └── use-toast.ts
```

### 3.4 Layout Components

- **AppSidebar**: Navigation with icons for all 15 pages, collapsible
- **AppHeader**: Breadcrumbs, search, user avatar, theme toggle
- **CommandPalette**: `cmdk`-based keyboard navigation (Cmd+K)

---

## 4. Backend Architecture

### 4.1 API Route Structure

All API routes follow a consistent pattern using the `withApiHandler` wrapper:

```typescript
// Example: src/app/api/plans/route.ts
export const POST = withApiHandler(
  { resource: 'plans', action: 'write' },
  async (req, user) => {
    const body = await req.json()
    // Business logic here
    return NextResponse.json({ success: true, data: result })
  }
)
```

### 4.2 Engine Pattern

Each domain feature is encapsulated in a standalone **engine** module under `src/lib/{domain}/engine.ts`. Engines are pure business logic with no HTTP concerns:

| Engine | Location | Key Functions |
|--------|----------|---------------|
| Finance | `src/lib/finance/engine.ts` | `calculateSaaSMetrics`, `analyzeBurnRate`, `runScenarioAnalysis`, `calculateKPIHealth`, `calculateInvestorMetrics`, `validateForecast` |
| Idea Validation | `src/lib/idea-validation/engine.ts` | `validateIdea`, `generateValidationQuestions`, `analyzeRisk`, `persistValidation` |
| Plan Review | `src/lib/plan-review/engine.ts` | `reviewPlan`, `generateLenderQuestions`, `crossCheckNarrativeVsFinancial` |
| Pitch Deck | `src/lib/pitch-deck/engine.ts` | `createDeck`, `generateSlidesFromPlan`, `syncDynamicVariables`, `generateFunderQuestions`, `analyzeDeck`, `generateDeckFromScratch` |
| Research | `src/lib/research/engine.ts` | `getVerifiedSources`, `searchBenchmarks`, `createCitation`, `validateCitation`, `generateResearchReport`, `seedDefaultSources` |
| Browser | `src/lib/browser/runtime.ts` | `createBrowserSession`, `executeBrowserAction`, `executeBrowserWorkflow`, `takeScreenshot`, `extractPageContent` |
| Export | `src/lib/exports/engine.ts` | `startExport`, `generateExport`, `getExportStatus`, `getExportFile` |
| Observability | `src/lib/observability/tracker.ts` | `trackEvent`, `startTrace`, `trackTokenUsage`, `getDashboardData`, `getTraces` |
| Memory | `src/lib/memory/engine.ts` | `storeMemory`, `retrieveMemories`, `compressMemories`, `cleanupExpiredMemories`, `ageMemoryRelevance` |
| Agent Orchestrator | `src/lib/agents/orchestrator.ts` | `executeAgentTask`, `getAgentSession`, `listAgentSessions` |
| Pipeline | `src/lib/agents/pipeline.ts` | `createPipeline`, `executePipeline`, `getPipelineStatus`, `updatePipeline`, `deletePipeline` |
| Workflows | `src/lib/workflows/engine.ts` | Workflow CRUD and execution |

### 4.3 withApiHandler Middleware Pipeline

Every API request passes through a 4-stage middleware pipeline:

```
Request → Rate Limit → Authentication → RBAC → Handler → Audit → Response
```

```typescript
// src/lib/middleware/with-api-handler.ts
export function withApiHandler(
  config: ApiHandlerConfig,
  handler: ApiHandler
): (req: NextRequest) => Promise<NextResponse> {
  return async (req) => {
    // STEP 1: Rate Limiting (IP-based pre-check)
    const preRateLimit = checkRateLimit(preIdentifier, endpoint)
    if (!preRateLimit.allowed) return errorResponse(429, 'RATE_LIMIT_EXCEEDED')

    // STEP 2: Authentication (4-strategy resolution)
    if (!config.skipAuth) {
      user = await requireAuth(req)  // throws AuthError if not authenticated
      // Re-check rate limit with user ID (more granular)
    }

    // STEP 3: RBAC Permission Check
    if (!config.skipRbac && config.resource && config.action) {
      await requirePermission(user, config.resource, config.action)
    }

    // STEP 4: Execute Handler
    const response = await handler(req, user)

    // Add rate limit headers, log audit entry
    return response
  }
}
```

### 4.4 Response Format Standards

All API responses follow a consistent shape:

```typescript
// Success response
{ success: true, data: T }

// Paginated response
{ success: true, data: T[], pagination: { page, pageSize, total, totalPages } }

// Error response
{ error: string, code: string, details?: string }
```

Standard error codes: `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMIT_EXCEEDED`, `INVALID_JSON`, `INTERNAL_ERROR`

---

## 5. Database Architecture

### 5.1 Technology

- **Database:** SQLite (embedded, zero-configuration)
- **ORM:** Prisma 6.11 with `prisma-client-js` generator
- **Connection:** Single file at `db/custom.db`, configured via `DATABASE_URL` env var

### 5.2 Domain Model Overview

The schema contains **36+ models** organized across **13 domains**:

```
┌──────────────────────────────────────────────────────────────────────┐
│                       GangNiaga Data Model                           │
├──────────────┬───────────────────────────────────────────────────────┤
│ Domain       │ Models                                               │
├──────────────┼───────────────────────────────────────────────────────┤
│ Core         │ User, Organization, Workspace, Membership            │
│ Auth         │ ApiKey, AuditLog, RateLimitLog                       │
│ Plans        │ BusinessPlan, PlanSection                            │
│ Forecasting  │ Forecast, ForecastRevenue, ForecastExpense,          │
│              │ FinancialStatement                                   │
│ KPI          │ Kpi                                                  │
│ Agents       │ AgentSession, AgentTask, ToolExecution, AgentMemory  │
│ Pipelines    │ AgentPipeline, AgentPipelineStep,                    │
│              │ AgentPipelineRun, PipelineStepRun                     │
│ Memory       │ MemoryEntry                                          │
│ Chat         │ ChatSession, ChatMessage                             │
│ Workflows    │ Workflow, WorkflowStep, WorkflowRun,                  │
│              │ WorkflowStepRun                                       │
│ Research     │ ResearchSource, ResearchCitation, IndustryBenchmark  │
│ Idea Canvas  │ IdeaCanvas, IdeaValidation, IdeaBenchmark            │
│ Plan Review  │ PlanReview, PlanReviewFinding                        │
│ Pitch Deck   │ PitchDeck, PitchDeckSlide, PitchDeckQuestion         │
│ Actuals      │ ActualFinancial, ForecastVariance, FinancialAlert,   │
│              │ AccountingConnection                                 │
│ Browser      │ BrowserSession, BrowserSnapshot                      │
│ Integrations │ Integration, IntegrationEvent                        │
│ Exports      │ Export                                               │
│ Notifications│ Notification                                         │
│ Reports      │ Report                                               │
│ Billing      │ Subscription                                         │
│ Scheduling   │ ScheduledJob                                         │
│ Automation   │ AutomationLog                                        │
│ Skills       │ SkillRegistry                                        │
│ Agent RBAC   │ AgentPermission                                      │
│ Observability│ TokenUsage, ObservabilityEvent                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

### 5.3 Key Relationships

```
User ─┬── Membership ──── Organization
      ├── ChatSession ──── ChatMessage
      ├── AgentSession ─┬── AgentTask ──── ToolExecution
      │                 └── AgentMemory
      ├── BrowserSession ──── BrowserSnapshot
      ├── Notification
      ├── Export
      └── AuditLog

Organization ─┬── BusinessPlan ──── PlanSection
              ├── Forecast ─┬── ForecastRevenue
              │             ├── ForecastExpense
              │             └── FinancialStatement
              ├── Kpi
              ├── AgentPipeline ─┬── AgentPipelineStep
              │                  └── AgentPipelineRun ──── PipelineStepRun
              ├── Workflow ─┬── WorkflowStep
              │             └── WorkflowRun ──── WorkflowStepRun
              ├── IdeaCanvas ─┬── IdeaValidation
              │               └── IdeaBenchmark
              ├── PlanReview ──── PlanReviewFinding
              ├── PitchDeck ─┬── PitchDeckSlide
              │              └── PitchDeckQuestion
              ├── ActualFinancial
              ├── ForecastVariance
              ├── FinancialAlert
              ├── AccountingConnection
              ├── ResearchSource ──── ResearchCitation
              ├── MemoryEntry
              ├── Report
              ├── Integration ──── IntegrationEvent
              ├── Subscription
              └── ScheduledJob
```

### 5.4 Design Patterns

- **CUID IDs:** All models use `@id @default(cuid())` for unique identifiers
- **JSON Metadata:** Complex/nested data stored as `String` with JSON serialization (e.g., `metadata`, `tags`, `config`)
- **Soft Status Fields:** State machines via `status` enums (e.g., `draft → active → completed → failed`)
- **Cascade Deletes:** Parent-child relationships use `onDelete: Cascade`
- **Composite Uniques:** `@@unique([userId, organizationId])` on Membership, `@@unique([agentType, resource, action])` on AgentPermission
- **Timestamps:** `createdAt @default(now())` and `updatedAt @updatedAt` on all mutable models

---

## 6. Authentication & Authorization

### 6.1 User Resolution (4-Strategy Chain)

The authentication system resolves the current user through a 4-strategy fallback chain:

```
┌─────────────────────────────────────────────────────┐
│              User Resolution Pipeline                │
│                                                      │
│  Strategy 1: Request Cookies (session_user)          │
│       ↓ not found                                    │
│  Strategy 2: Server cookies() Helper                 │
│       ↓ not found                                    │
│  Strategy 3: URL Search Params (?userId=...)         │
│       ↓ not found                                    │
│  Strategy 4: Authorization Header (Bearer token)     │
│       ↓ not found                                    │
│  Return: null (unauthenticated)                      │
└─────────────────────────────────────────────────────┘
```

```typescript
// src/lib/middleware/auth.ts
async function resolveUserId(req?: NextRequest): Promise<string | undefined> {
  // Strategy 1: Request cookies (for API routes)
  if (req) {
    const cookieValue = req.cookies.get('session_user')?.value
    if (cookieValue) return cookieValue
  }

  // Strategy 2: Server cookies() helper
  try {
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get('session_user')?.value
    if (cookieValue) return cookieValue
  } catch { /* cookies() not available */ }

  // Strategy 3: URL search params
  if (req) {
    const paramUserId = new URL(req.url).searchParams.get('userId')
    if (paramUserId) return paramUserId
  }

  // Strategy 4: Bearer token
  if (req) {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }
  }

  return undefined
}
```

### 6.2 RBAC Permission Matrix

The system implements **Role-Based Access Control** with 5 organization roles across 10 resources:

| Resource | Owner | Admin | Manager | Accountant | Viewer |
|----------|-------|-------|---------|------------|--------|
| plans | CRUD+X+A | CRUD+X | CRUD+X | R | R |
| forecasts | CRUD+X+A | CRUD+X | CRUD+X | CRUD+X | R |
| agents | CRUD+X+A | CRUD+X | CRUD+X | R+X | R |
| workflows | CRUD+X+A | CRUD+X | CRUD+X | R | R |
| reports | CRUD+X+A | CRUD+X+A | CRU | CRU | R |
| settings | CRUD+X+A | CRU | R | R | R |
| exports | CRUD+X+A | CRUD+X | CRU | CRU | R |
| integrations | CRUD+X+A | CRUD+X | R | R | R |
| browser | CRUD+X+A | CRUD+X | R+X | — | — |
| kpis | CRUD+X+A | CRUD+X | CRU | CRU | R |

**Legend:** C=Create, R=Read, U=Update, D=Delete, X=Execute, A=Admin

**Global Roles** (system-wide, independent of org):
- `super_admin` — wildcard access to everything
- `admin` — read, write, execute, admin
- `user` — read, write

### 6.3 Rate Limiting

In-memory rate limiter with 9 endpoint-specific configurations:

| Endpoint | Window | Max Requests |
|----------|--------|-------------|
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

Rate limit headers follow IETF draft standard:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1709554800
X-RateLimit-Window: 60s
```

### 6.4 Audit Logging

All API actions are logged to the `AuditLog` table with:

| Field | Purpose |
|-------|---------|
| `userId` | Who performed the action |
| `organizationId` | Which org context |
| `action` | Dot-notation action (e.g., `plan.create`, `agent.execute`) |
| `resource` | Resource type (e.g., `business_plans`, `agent_sessions`) |
| `resourceId` | Specific resource ID |
| `status` | `success`, `failure`, or `denied` |
| `ipAddress` | Client IP |
| `userAgent` | Client browser/client info |
| `details` | JSON context of the action |
| `metadata` | Additional structured data |

Audit logging is **non-blocking** (fire-and-forget) — it never blocks the main request flow.

---

## 7. AI Agent System Architecture

### 7.1 Agent Types

8 specialized agent types, each with unique system prompts, capabilities, and tool access:

| Agent | Capabilities | Allowed Tools | Max Concurrent |
|-------|-------------|---------------|---------------|
| **CFO** | Financial analysis, forecasting, budget optimization, funding strategy, cost reduction | `forecast_calculate`, `kpi_update`, `analytics_query`, `export_generate` | 3 |
| **CEO** | Strategic planning, market analysis, competitive positioning, decision making | `web_search`, `analytics_query`, `crm_lookup` | 2 |
| **Research** | Market research, competitor analysis, trend identification, opportunity discovery | `web_search`, `browser_navigate`, `analytics_query` | 5 |
| **Growth** | Growth strategy, channel optimization, conversion funnel, retention tactics | `web_search`, `analytics_query`, `crm_lookup`, `notification_send` | 3 |
| **Operations** | Process optimization, resource management, efficiency analysis, automation | `analytics_query`, `kpi_update`, `notification_send` | 3 |
| **Fundraising** | Pitch preparation, valuation analysis, investor targeting, due diligence prep | `web_search`, `analytics_query`, `export_generate`, `forecast_calculate` | 2 |
| **Browser** | Web automation, data extraction, form filling, screenshot capture | `browser_navigate`, `web_search` | 2 |
| **Reporting** | Report generation, data synthesis, stakeholder communication, trend analysis | `analytics_query`, `export_generate`, `kpi_update`, `forecast_calculate` | 3 |

### 7.2 Agent Task Execution Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   Agent Task Execution                        │
│                                                               │
│  1. Validate agent type against AGENT_DEFINITIONS             │
│  2. Get or create AgentSession (per user per agent type)      │
│  3. Build system prompt with injected memories                │
│  4. Create AgentTask record (status: running)                 │
│  5. Call z-ai-web-dev-sdk LLM with:                          │
│     - System prompt (agent definition + memory context)       │
│     - Recent task history (last 5 completed tasks)            │
│     - User message (task + additional context)                │
│  6. Parse AI response for tool calls (3 patterns)            │
│  7. Execute tools (with permission check)                     │
│  8. Update AgentTask (status: completed)                      │
│  9. Save to AgentMemory (session-local)                       │
│  10. Save to MemoryEntry (global, cross-session)              │
│  11. Create AuditLog entry                                    │
│  12. Return result, memories, toolExecutions                  │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 Tool Call Parsing

Agent responses are parsed for tool invocations using 3 patterns:

```typescript
// Pattern 1: Code block
```tool:tool_name
{"param": "value"}
```

// Pattern 2: Bracket notation
[TOOL_CALL: tool_name({"param": "value"})]

// Pattern 3: XML notation
<tool_call name="tool_name">{"param": "value"}</tool_call)>
```

### 7.4 Tool Execution with Approval Flow

Each tool execution is:
1. **Permission-checked** against the agent's `allowedTools` list
2. **Parameter-enriched** with `organizationId` and `userId`
3. **Recorded** in the `ToolExecution` table with input, output, status, duration
4. **Audited** as part of the parent `AgentTask`

Available tools:

| Tool | Purpose | DB Impact |
|------|---------|-----------|
| `forecast_calculate` | Retrieve and compute forecast data | Read: FinancialStatement |
| `kpi_update` | Update KPI values | Write: Kpi |
| `analytics_query` | Query KPI analytics | Read: Kpi |
| `export_generate` | Create export jobs | Write: Export |
| `web_search` | Web search (handled at LLM level) | Read-only |
| `crm_lookup` | Customer metrics lookup | Read: Kpi (customer category) |
| `notification_send` | Send user notifications | Write: Notification |
| `browser_navigate` | Browser navigation | Read/Write: BrowserSession |

### 7.5 Context-Aware System Prompt

The system prompt for each agent is dynamically built with injected memory context:

```
┌─────────────────────────────────────────────┐
│            System Prompt Construction        │
│                                              │
│  1. Base: Agent definition system prompt     │
│  2. + Memory: Top 10 relevant memories      │
│     (minRelevance: 0.3, ranked by score)     │
│  3. + Tools: Available tools and invocation  │
│     format documentation                     │
└─────────────────────────────────────────────┘
```

---

## 8. Pipeline Engine Architecture

### 8.1 DAG Pipeline Engine

The pipeline engine executes ordered sequences of agent tasks with **dependency resolution** using **Kahn's algorithm** for topological sorting.

```
┌──────────────────────────────────────────────────────────┐
│                    Pipeline Execution                      │
│                                                           │
│  Pipeline Definition                                      │
│  ┌───────┐     ┌───────┐     ┌───────┐                 │
│  │ Step 1│────▶│ Step 2│────▶│ Step 4│                 │
│  │ (CEO) │     │ (CFO) │     │(Rpt)  │                 │
│  └───────┘     └───────┘     └───────┘                 │
│       │              │                                    │
│       ▼              ▼                                    │
│  ┌───────┐     ┌───────┐                                │
│  │ Step 3│     │ Step 5│                                │
│  │(Rsch) │     │(Grow) │                                │
│  └───────┘     └───────┘                                │
│                                                           │
│  Execution Order (Kahn's):                                │
│  Level 0: [Step 1]           ← no dependencies            │
│  Level 1: [Step 2, Step 3]  ← depend on Step 1           │
│  Level 2: [Step 4, Step 5]  ← depend on Step 2           │
│                                                           │
│  Steps within a level execute in PARALLEL                 │
│  Levels execute SEQUENTIALLY                              │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Execution Flow

```
1. Create AgentPipelineRun (status: running)
2. Resolve execution order via Kahn's algorithm
3. For each level:
   a. Execute all steps in PARALLEL (Promise.allSettled)
   b. For each step:
      i.   Create PipelineStepRun (status: running)
      ii.  Resolve input template with previous step outputs
      iii. Execute agent task via orchestrator
      iv.  Record output for downstream steps
      v.   Update PipelineStepRun (status: completed/failed)
4. Update PipelineRun with final status
5. Create AuditLog entry
```

### 8.3 Input Template Resolution

Step input templates support variable interpolation from previous step outputs:

```typescript
// Template syntax: {{stepId.field}} or {{stepIndex.field}}
const template = {
  analysisScope: "{{0.output}}",           // Output of step 0
  financialContext: "{{step_abc.output}}",  // Output of specific step
}
```

The `resolveInputTemplate` function recursively resolves all `{{...}}` patterns against the accumulated `stepOutputs` map.

### 8.4 Database Model

```
AgentPipeline ──┬── AgentPipelineStep (definition)
                │     - agentType, name, inputTemplate, config
                │     - dependsOn (JSON array of step IDs)
                │     - order, isActive
                │
                └── AgentPipelineRun (execution)
                      ├── status, triggeredBy, result
                      └── PipelineStepRun[]
                            - agentType, input, output
                            - status, duration, error
```

---

## 9. Memory Architecture

### 9.1 Memory Categories

The memory system uses **7 categories** to organize stored knowledge:

| Category | Description | Example |
|----------|-------------|---------|
| `user_preference` | User-specific settings and preferences | "Prefers detailed financial analysis" |
| `workspace_context` | Organization-level context and norms | "Company uses USD currency, SaaS model" |
| `agent_knowledge` | Facts and patterns learned by agents | "Customer churn correlates with onboarding time" |
| `forecast_insight` | Financial forecast observations | "Revenue growth consistently exceeds projections by 15%" |
| `workflow_pattern` | Recurring workflow patterns | "Monthly report generation follows 3-step process" |
| `market_intelligence` | Market data and competitive insights | "Competitor X raised Series A at $20M valuation" |
| `financial_summary` | Compressed financial analysis | "MRR $50K, burn rate $30K, runway 18 months" |

### 9.2 Relevance Ranking

Memories are ranked using a composite score:

```
rankedScore = relevanceScore × accessBoost × recencyBoost

where:
  accessBoost = 1 + (accessCount × 0.1)
  recencyBoost = max(0.5, 1.0 - ageInDays × 0.01)  // decays over 100 days
```

### 9.3 Memory Lifecycle

```
┌────────────────────────────────────────────────────────────┐
│                    Memory Lifecycle                         │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │  Store    │───▶│ Retrieve │───▶│   Touch  │           │
│  │ (upsert) │    │ (rank)   │    │ (+count, │           │
│  └──────────┘    └──────────┘    │  +relev) │           │
│                                   └──────────┘           │
│       ▲                              │                    │
│       │                              ▼                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │ Compress │◀───│   Age    │◀───│  Decay   │           │
│  │ (LLM     │    │ (time    │    │ (0.001/  │           │
│  │ summary) │    │ decay)   │    │  day)    │           │
│  └──────────┘    └──────────┘    └──────────┘           │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────┐                                             │
│  │ Expire   │  (TTL-based cleanup)                        │
│  │ (delete) │                                              │
│  └──────────┘                                              │
└────────────────────────────────────────────────────────────┘
```

### 9.4 LLM Compression

When memories have low access counts and long values, they are candidates for **LLM-based compression**:

1. Find memories with `accessCount <= 2`, `summary = null`, `value.length > 500`
2. Batch process (5 at a time) through LLM with compression prompt
3. Replace `value` with compressed summary
4. Store original length in metadata for audit trail

### 9.5 Dual Storage

Agent memory is stored in two locations:

| Storage | Scope | Model | Purpose |
|---------|-------|-------|---------|
| AgentMemory | Session-local | `AgentMemory` | Conversation context within a session |
| MemoryEntry | Global | `MemoryEntry` | Cross-session, cross-agent knowledge retrieval |

---

## 10. API Design Principles

### 10.1 RESTful Conventions

| Method | Pattern | Purpose |
|--------|---------|---------|
| `GET` | `/api/{resource}` | List resources |
| `GET` | `/api/{resource}/{id}` | Get single resource |
| `POST` | `/api/{resource}` | Create resource |
| `PATCH` | `/api/{resource}/{id}` | Update resource |
| `DELETE` | `/api/{resource}/{id}` | Delete resource |

### 10.2 API Endpoint Map

```
/api/
├── auth/
│   ├── login          POST    User login
│   ├── register       POST    User registration
│   └── session        GET     Get current session
├── agents             GET/POST List/create agent sessions
├── plans/
│   ├──                GET/POST List/create plans
│   └── [id]           GET/PATCH/DELETE Plan CRUD
├── forecasts          GET/POST List/create forecasts
├── kpis               GET/POST List/create KPIs
├── chat/
│   ├──                GET/POST List/create chat sessions
│   └── [id]           GET     Get chat with messages
├── reports            GET/POST List/create reports
├── workflows/
│   ├──                GET/POST List/create workflows
│   └── [id]           GET/PATCH/DELETE Workflow CRUD
├── pipelines/
│   ├──                GET/POST List/create pipelines
│   └── [id]           GET/PATCH/DELETE Pipeline CRUD
├── memories           GET/POST Retrieve/store memories
├── tools/
│   ├── execute        POST    Execute a tool
│   └── approvals      GET/POST Tool approval management
├── browser            POST    Browser automation actions
├── exports/
│   ├──                GET/POST List/create exports
│   └── [id]           GET     Get export status/file
├── observability      GET     Observability dashboard data
├── finance            GET     Financial metrics & analysis
├── idea-canvases/
│   ├──                GET/POST List/create idea canvases
│   └── [id]           GET/PATCH/DELETE Canvas CRUD
├── plan-reviews/
│   ├──                GET/POST List/create reviews
│   └── [id]           GET     Get review details
├── pitch-decks/
│   ├──                GET/POST List/create decks
│   └── [id]           GET/PATCH/DELETE Deck CRUD
├── research/
│   ├──                GET     Search sources/benchmarks
│   └── [id]           GET     Get specific research data
├── actuals/
│   ├──                GET/POST List/create actual financials
│   └── [id]           GET/PATCH/DELETE Actual CRUD
├── notifications      GET     List user notifications
└── settings           GET/PATCH Get/update settings
```

### 10.3 withApiHandler Configuration Options

```typescript
interface ApiHandlerConfig {
  resource?: string        // RBAC resource name (e.g., 'plans')
  action?: string          // RBAC action (e.g., 'read', 'write')
  rateLimitEndpoint?: string  // Custom rate limit key
  auditAction?: string     // Custom audit action name
  skipAuth?: boolean       // Skip authentication (public endpoints)
  skipRbac?: boolean       // Skip RBAC check (auth still required)
}
```

---

## 11. Data Flow Diagrams

### 11.1 Agent Task Execution Flow

```
User Input
    │
    ▼
┌─────────┐    ┌──────────────┐    ┌───────────────┐
│  Client  │───▶│  API Route   │───▶│ withApiHandler │
│  (React) │    │  /api/agents │    │ (Auth+RBAC)   │
└─────────┘    └──────────────┘    └───────┬───────┘
                                           │
                                           ▼
                                   ┌───────────────┐
                                   │  Orchestrator  │
                                   │ executeAgentTask│
                                   └───────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────┐
                    ▼                      ▼                  ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │  Build Prompt │    │ Memory Store │    │  LLM Call    │
            │  (def+memory) │    │  Retrieve    │    │  (z-ai-sdk) │
            └──────┬───────┘    └──────────────┘    └──────┬──────┘
                   │                                       │
                   └───────────────┬───────────────────────┘
                                   ▼
                          ┌──────────────┐
                          │ Parse Tools  │
                          │ (3 patterns) │
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │ Execute  │ │ Execute  │ │ Execute  │
             │ Tool 1   │ │ Tool 2   │ │ Tool N   │
             └────┬─────┘ └────┬─────┘ └────┬─────┘
                  │            │            │
                  └────────────┼────────────┘
                               ▼
                    ┌──────────────────────┐
                    │  Save Results        │
                    │  - AgentTask (DB)    │
                    │  - ToolExecution (DB)│
                    │  - AgentMemory (DB)  │
                    │  - MemoryEntry (DB)  │
                    │  - AuditLog (DB)     │
                    └──────────────────────┘
                               │
                               ▼
                        Response to Client
```

### 11.2 Pipeline Execution Flow

```
Trigger (Manual / Scheduled / Event)
    │
    ▼
┌──────────────────┐
│ createPipelineRun │
│ (status: running) │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ resolveExecutionOrder │
│ (Kahn's Algorithm)    │
│                       │
│ Input: Steps + deps   │
│ Output: Level arrays  │
└────────┬─────────────┘
         │
         ▼
┌────────────────────────┐
│ For each level:        │
│                        │
│  Promise.allSettled(   │
│    steps.map(step => { │
│      1. Create StepRun │
│      2. Resolve input  │
│      3. executeAgentTask│
│      4. Record output  │
│      5. Update StepRun │
│    })                  │
│  )                     │
└────────┬───────────────┘
         │
         ▼
┌──────────────────────┐
│ Update PipelineRun   │
│ status: completed/   │
│         failed       │
│ + AuditLog entry     │
└──────────────────────┘
```

### 11.3 Plan Review Pipeline (3-Agent)

```
BusinessPlan + FinancialData
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│ Agent 1│ │  Agent 2 │
│Narrative│ │Financial │
│Analysis │ │ Analysis │
└────┬────┘ └─────┬────┘
     │              │
     └──────┬───────┘
            ▼
     ┌──────────────┐
     │   Agent 3     │
     │  Cross-Check  │
     │ (narrative vs │
     │  financials)  │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │ Heuristic     │
     │ Cross-Check   │
     │ (rule-based)  │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │ Aggregate &  │
     │ Deduplicate  │
     │ Findings     │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │ Calculate     │
     │ Scores        │
     │ - Narrative   │
     │ - Financial   │
     │ - Consistency │
     │ - Risk        │
     │ - Fundability │
     └──────┬───────┘
            │
            ▼
     ReviewReport
```

---

## 12. Security Architecture

### 12.1 Security Layers

```
┌─────────────────────────────────────────────────────┐
│                  Security Stack                      │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ Layer 1: Rate Limiting (IP + User)           │  │
│  │ - Pre-auth IP-based limiting                  │  │
│  │ - Post-auth user-based limiting               │  │
│  │ - Standard rate limit headers                 │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ Layer 2: Authentication (4 strategies)        │  │
│  │ - Cookie-based sessions                       │  │
│  │ - Bearer token API access                     │  │
│  │ - URL param fallback                         │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ Layer 3: Authorization (RBAC)                 │  │
│  │ - 5 org roles × 10 resources                  │  │
│  │ - Agent-specific permission table              │  │
│  │ - Tool-level access control                   │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ Layer 4: Audit Logging                        │  │
│  │ - All API actions recorded                    │  │
│  │ - Auth failures tracked                       │  │
│  │ - Rate limit violations logged                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 12.2 API Key Security

- API keys are stored as **SHA-256 hashes** (`keyHash` field)
- Only the **first 8 characters** are stored for identification (`keyPrefix`)
- Original key is never stored in the database
- Keys support expiration dates (`expiresAt`) and scoped permissions

### 12.3 Agent Permission Isolation

Agents have their own permission model independent of user RBAC:

```typescript
// AgentPermission table
@@unique([agentType, resource, action])

// Example: CFO agent can read and write forecasts
{ agentType: "cfo", resource: "forecasts", action: "write", isAllowed: true }
{ agentType: "cfo", resource: "browser", action: "execute", isAllowed: false }
```

### 12.4 Input Validation

- **Zod** for runtime schema validation on API inputs
- JSON parse errors return `400 INVALID_JSON` (never expose internals)
- Agent tool parameters are validated before execution
- LLM response parsing has graceful fallback (never crashes on bad AI output)

---

## 13. Scalability Considerations

### 13.1 Current Architecture Limits

| Component | Limit | Mitigation Path |
|-----------|-------|-----------------|
| SQLite | Single-writer, no horizontal scaling | Migrate to PostgreSQL via Prisma |
| In-memory rate limiting | Per-process only (not shared) | Migrate to Redis |
| In-memory browser sessions | Lost on process restart | Already persisted to DB with rehydration |
| File storage | Base64 in DB metadata | Migrate to S3/object storage |
| Single-process | No horizontal scaling | Containerize with external DB |

### 13.2 Scaling Path

```
Phase 1 (Current):     SQLite + In-Memory + Single Process
                          │
Phase 2 (Growth):      PostgreSQL + Redis + Multiple Containers
                          │
Phase 3 (Enterprise):  PostgreSQL + Redis Cluster + K8s + S3
```

### 13.3 Prisma Migration Path

The Prisma ORM abstracts the database layer, making migration straightforward:

```prisma
// Current
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Future: PostgreSQL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Schema changes needed for PostgreSQL:
- Replace `String` JSON fields with `Json` type
- Add database-level indexes for frequently queried fields
- Migrate `cuid()` to UUID for distributed ID generation

---

## 14. Performance Optimizations

### 14.1 Frontend Optimizations

| Technique | Implementation |
|-----------|---------------|
| Client-side routing | Zustand-based SPA navigation — no network requests for page transitions |
| Component lazy loading | Dynamic imports for heavy feature pages |
| Zustand selectors | Fine-grained subscriptions prevent unnecessary re-renders |
| TanStack Query caching | Server state caching with automatic background refetch |
| Tailwind CSS purging | Unused CSS removed in production builds |
| Next.js static generation | Static shell with client-side hydration |

### 14.2 Backend Optimizations

| Technique | Implementation |
|-----------|---------------|
| Non-blocking audit logging | `logAudit()` is fire-and-forget with `.catch(() => {})` |
| Rate limit cleanup | Lazy cleanup every 2 minutes, not on every request |
| Pipeline parallelism | Steps within a DAG level execute via `Promise.allSettled` |
| Background exports | Export generation runs in background, returns immediately with status |
| Batch memory compression | 5 memories compressed per batch, not one at a time |
| Agent session reuse | Active sessions are reused instead of creating new ones |

### 14.3 Database Optimizations

| Technique | Implementation |
|-----------|---------------|
| Composite unique constraints | `@@unique([userId, organizationId])`, `@@unique([agentType, resource, action])` |
| Cascade deletes | `onDelete: Cascade` prevents orphaned records |
| JSON metadata pattern | Flexible schema extension without migrations |
| Memory ranking | SQLite `LIKE` for text search + in-memory ranking |
| Query result limits | `take: N` on all list queries to prevent unbounded reads |

### 14.4 LLM Token Optimization

| Technique | Implementation |
|-----------|---------------|
| Memory injection limit | Top 10 memories only (with `minRelevance: 0.3` threshold) |
| Conversation context | Last 5 completed tasks only (not full history) |
| Content truncation | Task output stored as `slice(0, 5000)` in pipeline runs |
| Memory compression | LLM-based summarization for low-access, long-value memories |
| Token usage tracking | All LLM calls tracked in `TokenUsage` table for cost monitoring |

### 14.5 Caching Strategy

```
┌───────────────────────────────────────────────────┐
│               Cache Architecture                   │
│                                                    │
│  Browser (Client)                                  │
│  ├── TanStack Query cache (5 min staleTime)        │
│  └── Zustand store (session lifetime)              │
│                                                    │
│  Server (API)                                      │
│  ├── Rate limit store (in-memory Map)              │
│  ├── Browser session store (in-memory + DB)        │
│  └── Agent-browser availability (cached boolean)   │
│                                                    │
│  Database                                          │
│  ├── Prisma query result caching (future)          │
│  └── SQLite page cache (built-in)                  │
└───────────────────────────────────────────────────┘
```

---

## Appendix A: File Structure Reference

```
my-project/
├── prisma/
│   └── schema.prisma              # 36+ model database schema
├── src/
│   ├── app/
│   │   ├── page.tsx               # Root SPA page
│   │   ├── layout.tsx             # Root layout
│   │   ├── globals.css            # Global styles
│   │   └── api/                   # 35+ API route files
│   ├── components/
│   │   ├── ui/                    # 50 shadcn/ui components
│   │   ├── layout/                # Header, Sidebar, CommandPalette
│   │   ├── providers/             # ThemeProvider
│   │   └── {feature}/            # 15 feature page components
│   ├── hooks/                     # use-mobile, use-api, use-toast
│   └── lib/
│       ├── agents/
│       │   ├── orchestrator.ts    # Agent task execution engine
│       │   └── pipeline.ts        # DAG pipeline engine
│       ├── browser/
│       │   └── runtime.ts         # Dual-strategy browser automation
│       ├── exports/
│       │   └── engine.ts          # 6-format export engine
│       ├── finance/
│       │   └── engine.ts          # Financial intelligence engine
│       ├── idea-validation/
│       │   └── engine.ts          # 6-category idea validation
│       ├── memory/
│       │   └── engine.ts          # Memory store & retrieval engine
│       ├── middleware/
│       │   ├── auth.ts            # 4-strategy user resolution
│       │   ├── audit.ts           # Non-blocking audit logging
│       │   ├── rbac.ts            # 5-role × 10-resource RBAC
│       │   ├── rate-limit.ts      # 9-config in-memory rate limiter
│       │   └── with-api-handler.ts # Unified API middleware wrapper
│       ├── observability/
│       │   └── tracker.ts         # Distributed tracing & token tracking
│       ├── plan-review/
│       │   └── engine.ts          # 3-agent plan review pipeline
│       ├── pitch-deck/
│       │   └── engine.ts          # 5-template pitch deck engine
│       ├── research/
│       │   └── engine.ts          # 50+ source research engine
│       ├── stores/
│       │   ├── app-store.ts       # Navigation & layout state
│       │   └── auth-store.ts      # Authentication state
│       ├── tools/
│       │   ├── executor.ts        # Tool execution runtime
│       │   └── registry.ts        # Tool registry
│       ├── workflows/
│       │   └── engine.ts          # Workflow automation engine
│       ├── actuals/
│       │   └── engine.ts          # Plan vs actuals tracking
│       ├── db.ts                  # Prisma client singleton
│       └── utils.ts               # Shared utilities (cn, etc.)
├── public/
│   ├── logo.svg
│   └── robots.txt
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── components.json               # shadcn/ui configuration
```

---

*This document is maintained alongside the codebase. For implementation details, refer to the inline documentation in each engine module.*
