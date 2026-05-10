<p align="center">
  <img src="public/logo.svg" alt="GangNiaga AI Logo" width="80" height="80" />
  <h1 align="center">GangNiaga AI</h1>
  <p align="center">
    <strong>Autonomous AI Business Operating System</strong>
  </p>
  <p align="center">
    AI-powered platform that autonomously plans, forecasts, monitors, and operates your business — so you can focus on what matters most.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma 6" />
  <img src="https://img.shields.io/badge/Bun-Runtime-000?logo=bun" alt="Bun" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Core Modules](#core-modules)
- [AI Agent System](#ai-agent-system)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [State Management](#state-management)
- [UI Components](#ui-components)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

**GangNiaga AI** is an Autonomous Business Operating System that leverages artificial intelligence to automate and optimize every aspect of business management. From generating comprehensive business plans to financial forecasting, KPI monitoring, and AI agent orchestration — GangNiaga AI acts as your virtual C-suite, operating your business autonomously.

### What Makes GangNiaga AI Different?

| Traditional Business Tools | GangNiaga AI |
|---|---|
| Manual data entry and analysis | AI auto-generates insights and forecasts |
| Static dashboards | Dynamic KPI intelligence with AI-driven recommendations |
| Siloed business functions | Unified OS with interconnected agents |
| Reactive reporting | Proactive AI agents that monitor, alert, and act |
| One-size-fits-all templates | Context-aware, industry-specific AI generation |

---

## Key Features

### Business Intelligence
- **AI Business Plan Builder** — Generate 8-section business plans with AI, including Executive Summary, Market Analysis, SWOT, Financial Plan, Competitor Analysis, Marketing Strategy, Operations Plan, and Team
- **Financial Forecasting Engine** — Multi-scenario modeling (Best/Base/Worst/Custom) with revenue streams, expense tracking, and auto-generated P&L, Balance Sheet, and Cash Flow statements
- **KPI Dashboard** — Real-time tracking of 10+ business metrics with AI-computed insights and health indicators
- **AI Report Generator** — Create investor, board, KPI, financial, and market reports with AI

### AI Agent System
- **8 Specialized Agents** — CFO, CEO, Research, Growth, Operations, Fundraising, Browser, and Reporting agents
- **Agent Orchestrator** — Coordinate multiple agents to work together on complex tasks
- **Persistent Memory** — Agents maintain context and learn from interactions
- **Tool Execution** — Agents can invoke tools (browser, email, forecast, PDF, CRM, spreadsheet, analytics)

### Automation & Integration
- **Workflow Builder** — Visual step-by-step workflow creation with triggers (manual, scheduled, event-based)
- **Pre-built Templates** — Weekly KPI Report, Competitor Monitor, Revenue Alert, Investor Update, Slack Summary
- **AI Copilot** — Chat-based interface with agent-specific routing and markdown-rendered responses

### Enterprise Features
- **Multi-tenant Architecture** — Organization-based data isolation with role-based access control
- **Session-based Authentication** — Secure httpOnly cookie-based auth with registration, login, and session management
- **Dark/Light Theme** — Full theme support with system preference detection
- **Responsive Design** — Mobile-first layout with collapsible sidebar and adaptive components

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
┌─────────────────────────────────────────────────────────────┐
│                        Caddy Gateway                         │
│                     (Reverse Proxy :81)                      │
│                  XTransformPort routing                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 Application                    │
│                      (Port 3000)                             │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  React Client   │  │  API Routes    │  │  Prisma ORM  │  │
│  │  (App Shell)    │──│  (REST API)    │──│  (SQLite)    │  │
│  │                 │  │                │  │              │  │
│  │  • Zustand      │  │  /api/auth/*   │  │  20+ Models  │  │
│  │  • shadcn/ui    │  │  /api/chat/*   │  │              │  │
│  │  • Recharts     │  │  /api/plans/*  │  └──────┬───────┘  │
│  │  • Framer       │  │  /api/forecast │         │          │
│  │    Motion       │  │  /api/agents/* │         ▼          │
│  │                 │  │  /api/reports/*│  ┌──────────────┐  │
│  └────────────────┘  │  /api/workflow │  │  custom.db   │  │
│                      │  /api/kpis/*   │  │  (SQLite)    │  │
│                      │  /api/settings │  └──────────────┘  │
│                      └───────┬────────┘                     │
│                              │                              │
│                              ▼                              │
│                      ┌──────────────┐                       │
│                      │ z-ai-web-dev  │                       │
│                      │    SDK        │                       │
│                      │ (LLM/AI)     │                       │
│                      └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Zustand Store → API Route → Prisma Query → SQLite
                                                    ↓
                                              z-ai-web-dev-sdk
                                              (AI Generation)
                                                    ↓
                                            Prisma Create/Update
                                                    ↓
                                            JSON Response → UI Update
```

---

## Project Structure

```
gangniaga-ai/
├── prisma/
│   └── schema.prisma              # Database schema (20+ models)
├── db/
│   └── custom.db                  # SQLite database file
├── public/
│   ├── logo.svg                   # App logo
│   └── robots.txt                 # SEO
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (ThemeProvider + Toaster)
│   │   ├── page.tsx               # Main app shell + client-side routing
│   │   ├── globals.css            # Tailwind + custom CSS variables
│   │   └── api/                   # REST API routes
│   │       ├── route.ts           # Health check
│   │       ├── auth/
│   │       │   ├── login/         # POST - User login
│   │       │   ├── register/      # POST - User registration
│   │       │   └── session/       # GET - Session check
│   │       ├── chat/
│   │       │   ├── route.ts       # POST - Send chat message
│   │       │   └── [id]/          # GET/DELETE - Chat session
│   │       ├── plans/
│   │       │   ├── route.ts       # GET/POST - Business plans
│   │       │   └── [id]/          # PATCH/DELETE - Plan update
│   │       ├── forecasts/         # GET/POST - Financial forecasts
│   │       ├── agents/            # GET/POST - AI agent tasks
│   │       ├── reports/           # GET/POST - AI reports
│   │       ├── workflows/
│   │       │   ├── route.ts       # GET/POST - Workflows
│   │       │   └── [id]/          # PATCH/DELETE - Workflow update
│   │       ├── kpis/              # GET/POST - KPI metrics
│   │       ├── notifications/     # GET/POST/PATCH - Notifications
│   │       ├── settings/          # GET/PATCH - Organization settings
│   │       └── exports/           # GET/POST - Export jobs
│   ├── components/
│   │   ├── auth/
│   │   │   └── auth-page.tsx      # Login/Register tabs
│   │   ├── layout/
│   │   │   ├── app-header.tsx     # Top navigation bar
│   │   │   └── app-sidebar.tsx    # Collapsible sidebar navigation
│   │   ├── dashboard/
│   │   │   └── dashboard-page.tsx # KPI cards, charts, AI insights
│   │   ├── plans/
│   │   │   └── plans-page.tsx     # Business plan builder + editor
│   │   ├── forecasting/
│   │   │   └── forecasting-page.tsx # Financial modeling engine
│   │   ├── agents/
│   │   │   └── agents-page.tsx    # Agent cards + orchestration
│   │   ├── copilot/
│   │   │   └── copilot-page.tsx   # AI chat interface
│   │   ├── reports/
│   │   │   └── reports-page.tsx   # Report generator + preview
│   │   ├── workflows/
│   │   │   └── workflows-page.tsx # Workflow builder + templates
│   │   ├── settings/
│   │   │   └── settings-page.tsx  # 8-tab settings panel
│   │   ├── providers/
│   │   │   └── theme-provider.tsx # Dark/light theme provider
│   │   └── ui/                    # 46 shadcn/ui components
│   ├── lib/
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── utils.ts               # cn() utility
│   │   └── stores/
│   │       ├── app-store.ts       # Navigation + UI state
│   │       └── auth-store.ts      # Authentication state
│   └── hooks/
│       ├── use-mobile.ts          # Mobile breakpoint hook
│       └── use-toast.ts           # Toast notifications
├── examples/
│   └── websocket/                 # Socket.IO demo (port 3003)
├── Caddyfile                      # Reverse proxy configuration
├── package.json                   # Dependencies & scripts
├── tailwind.config.ts             # Tailwind + shadcn/ui theme
├── tsconfig.json                  # TypeScript configuration
├── next.config.ts                 # Next.js configuration
└── worklog.md                     # Development worklog
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

The central command center displaying real-time business metrics and AI-generated insights.

- **KPI Cards** — Monthly Revenue, Net Profit, Active Customers, Burn Rate
- **SaaS Metrics Strip** — MRR, ARR, LTV, CAC
- **Charts** — Revenue & Expenses (Area), Expense Breakdown (Pie), Customer Growth (Bar)
- **AI Insights** — Dynamically computed from real KPI data (revenue growth, burn rate warnings, LTV:CAC analysis, churn detection)
- **Agent Status** — Active agent sessions with task monitoring
- **Financial Health** — Cash runway, forecast accuracy, break-even progress, LTV:CAC ratio

### 2. Business Plan Builder

AI-powered business plan creation with 8 comprehensive sections.

| Section | Description |
|---|---|
| Executive Summary | Company overview, mission, and vision |
| Market Analysis | TAM/SAM/SOM, trends, and opportunities |
| SWOT Analysis | Strengths, Weaknesses, Opportunities, Threats |
| Financial Plan | Revenue model, cost structure, projections |
| Competitor Analysis | Direct/indirect competitors, positioning |
| Marketing Strategy | Channels, tactics, customer acquisition |
| Operations Plan | Team, processes, technology stack |
| Team | Founders, advisors, hiring roadmap |

Features:
- AI auto-generate all sections or individual sections
- AI rewrite per section with one click
- Status workflow: Draft → Review → Approved → Archived
- Grid/List view with search and filtering
- Export to PDF/DOCX (placeholder)

### 3. Financial Forecasting Engine

Multi-scenario financial modeling with comprehensive statement generation.

**Scenario Types:**
- **Best Case** — Optimistic multipliers applied
- **Base Case** — Realistic projections
- **Worst Case** — Conservative/pessimistic outlook
- **Custom** — User-defined adjustment multipliers

**Revenue Modeling:**
- 6 default revenue streams (Subscriptions, Transaction Fees, Professional Services, Product Sales, Licensing, Advertising)
- Category classification (subscription, transaction, service, product, other)
- Monthly growth rate per stream
- Start/end month configuration
- Recurring vs one-time flag

**Expense Modeling:**
- 7 default expense items (Team Payroll, Cloud Infrastructure, SaaS Tools, Tax & Compliance, Marketing, Operational, R&D)
- Category classification (payroll, infrastructure, saas, tax, marketing, operational, other)
- Growth rate tracking per item

**Financial Statements:**
- Profit & Loss (monthly)
- Balance Sheet (monthly)
- Cash Flow Statement (monthly)

**Charts:**
- Revenue vs Expenses (Line)
- Cash Flow Projection (Area)
- Profit Margin Trend
- Break-Even Analysis
- Revenue/Expense Breakdown (Pie)

**SaaS Metrics:**
- MRR, ARR, CAC, LTV, Churn Rate, Gross Margin

**AI CFO Insights:** Sends forecast context to the CFO agent for strategic analysis.

### 4. KPI Intelligence

Real-time monitoring of key performance indicators across 5 categories.

| Category | Example KPIs |
|---|---|
| Revenue | Monthly Revenue, MRR, ARR |
| Growth | Revenue Growth Rate, Customer Growth |
| SaaS | LTV, CAC, Churn Rate, Gross Margin |
| Cash | Burn Rate, Runway, Cash Balance |
| Customer | Active Customers, NPS, Retention Rate |

Features:
- Auto-populated on registration (10 sample KPIs)
- AI-computed insights (growth trends, anomaly detection, health scoring)
- Target tracking with progress indicators
- Period-based filtering (monthly, quarterly, annual)

### 5. AI Agent System

8 specialized AI agents that act as your virtual C-suite.

See [AI Agent System](#ai-agent-system) for detailed documentation.

### 6. AI Copilot

Chat-based interface with multi-agent routing and intelligent response generation.

- **5 Agent Types**: General, CFO, CEO, Research, Growth
- **Chat History** — Persisted to localStorage (up to 50 sessions)
- **Markdown Rendering** — Rich AI responses with syntax highlighting
- **Suggestion Cards** — Agent-specific conversation starters
- **Typing Animation** — Real-time response streaming indicator

### 7. Report Generator

AI-powered report generation for stakeholders.

**Report Types:**
| Type | Audience | Content Focus |
|---|---|---|
| Investor | VCs, Angels | Traction, metrics, financials, projections |
| Board | Board Members | Strategic overview, KPIs, risk assessment |
| KPI | Management | Detailed metric analysis, trends, targets |
| Financial | CFO/Finance | P&L, cash flow, runway, budget vs actual |
| Market | Strategy Team | Market size, trends, competitive landscape |

**Quick Templates:**
- Weekly KPI Summary
- Monthly Financial Report
- Quarterly Investor Update
- Annual Board Report

### 8. Workflow Automation

Visual workflow builder with triggers, steps, and execution history.

**Trigger Types:**
- Manual — User-initiated
- Scheduled — Cron-based scheduling
- Event — System event triggered

**Step Types:**
- Agent — Invoke an AI agent
- Tool — Execute a tool (browser, email, PDF, etc.)
- Condition — Branching logic
- Delay — Wait/pause step
- Notification — Send alert

**Pre-built Templates:**
- Weekly KPI Report
- Competitor Monitor
- Revenue Alert
- Investor Update
- Slack Summary

### 9. Settings

8-section settings panel for complete account and organization management.

| Section | Features |
|---|---|
| Profile | Name, email, avatar, password |
| Organization | Name, industry, size, country, currency |
| Team | Members, invite, role management |
| Billing | Plan info, usage stats |
| Integrations | QuickBooks, Xero, Stripe, Google Analytics, Slack, Discord |
| Notifications | Email, in-app, push preferences |
| Security | MFA, session management |
| Appearance | Light/Dark/System theme |

---

## AI Agent System

GangNiaga AI features 8 specialized agents, each designed to handle specific business domains. Agents communicate through a shared orchestration layer and maintain persistent memory across sessions.

### Agent Types

| Agent | Role | System Prompt Focus | Key Capabilities |
|---|---|---|---|
| **CFO Agent** | Chief Financial Officer | Financial strategy, cash flow management, runway analysis | Financial planning, expense optimization, funding strategy, P&L analysis |
| **CEO Agent** | Chief Executive Officer | Strategic vision, market positioning, growth strategy | Business strategy, market analysis, competitive positioning, vision planning |
| **Research Agent** | Market Researcher | Market research, competitor analysis, trend identification | Market sizing, competitive analysis, industry trends, opportunity identification |
| **Growth Agent** | Growth Marketer | Customer acquisition, retention, and expansion | Marketing strategy, channel optimization, conversion funnels, growth experiments |
| **Operations Agent** | Operations Manager | Process optimization, team management, efficiency | Process improvement, resource allocation, operational efficiency, scaling strategies |
| **Fundraising Agent** | Fundraising Advisor | Investment strategy, pitch preparation, investor relations | Pitch deck guidance, valuation analysis, investor targeting, term sheet review |
| **Browser Agent** | Web Automation | Web research, data extraction, automated browsing | Competitor monitoring, market data collection, web scraping, form filling |
| **Reporting Agent** | Report Generator | Report creation, data synthesis, stakeholder communication | Investor reports, board decks, KPI summaries, financial statements |

### Agent Architecture

```
┌───────────────────────────────────────────────┐
│                User Request                    │
└──────────────────┬────────────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────────────┐
│           Agent Orchestrator                   │
│   (Routes request to appropriate agent)        │
└────┬──────┬──────┬──────┬──────┬──────┬──────┘
     │      │      │      │      │      │
     ▼      ▼      ▼      ▼      ▼      ▼
  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐
  │ CFO ││ CEO ││Research││Growth││ Ops ││ ... │
  └──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘
     │      │      │      │      │      │
     ▼      ▼      ▼      ▼      ▼      ▼
┌───────────────────────────────────────────────┐
│            z-ai-web-dev-sdk                    │
│         (LLM with agent-specific prompts)      │
└──────────────────┬────────────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────────────┐
│            Tool Execution Layer                │
│  browser | email | forecast | pdf | crm | ... │
└──────────────────┬────────────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────────────┐
│          Agent Memory (Persistent)             │
│  user | workspace | agent | forecast | workflow│
└───────────────────────────────────────────────┘
```

### Agent Memory Types

| Memory Type | Description |
|---|---|
| `user` | User preferences, past interactions, communication style |
| `workspace` | Organization context, industry, team structure |
| `agent` | Agent-specific knowledge, past task results |
| `forecast` | Financial projections, model parameters |
| `workflow` | Workflow definitions, execution history |

---

## Database Schema

GangNiaga AI uses Prisma ORM with SQLite, featuring 20+ interconnected models organized into 8 domain groups.

### Entity Relationship Overview

```
User ──┬── Membership ──── Organization ──┬── Workspace
       │                                  ├── BusinessPlan ──── PlanSection
       │                                  ├── Forecast ──┬── ForecastRevenue
       ├── ChatSession ── ChatMessage     │               ├── ForecastExpense
       ├── AgentSession ──┬── AgentTask   │               └── FinancialStatement
       │                  └── AgentMemory │
       │            ToolExecution         ├── Kpi
       └── Notification                  ├── Report
                                          ├── Workflow ──┬── WorkflowStep
                                          │              └── WorkflowRun
                                          └── Subscription

BrowserSession ── BrowserSnapshot
Export
AutomationLog
SkillRegistry
AgentPermission
```

### Model Summary

| Domain | Models | Count |
|---|---|---|
| Core | User, Organization, Workspace, Membership | 4 |
| Business Plans | BusinessPlan, PlanSection | 2 |
| Forecasting | Forecast, ForecastRevenue, ForecastExpense, FinancialStatement | 4 |
| KPI | Kpi | 1 |
| AI Agents | AgentSession, AgentTask, AgentMemory, ToolExecution | 4 |
| Chat | ChatSession, ChatMessage | 2 |
| Workflows | Workflow, WorkflowStep, WorkflowRun | 3 |
| Other | Report, Notification, Subscription, Export, BrowserSession, BrowserSnapshot, AutomationLog, SkillRegistry, AgentPermission | 9 |
| **Total** | | **29** |

---

## API Reference

### Authentication

#### `POST /api/auth/register`
Register a new user with organization.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "organizationName": "My Startup"
}
```

**Response:** Sets `session_user` httpOnly cookie. Creates user + default organization + membership + 10 sample KPIs.

---

#### `POST /api/auth/login`
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:** Sets `session_user` httpOnly cookie.

---

#### `GET /api/auth/session`
Check current session status.

**Response:**
```json
{
  "user": { "id": "...", "email": "...", "name": "...", "role": "..." },
  "organization": { "id": "...", "name": "...", "slug": "...", "industry": "..." }
}
```

---

### Chat

#### `POST /api/chat`
Send a message to an AI agent.

**Request Body:**
```json
{
  "message": "What's my burn rate?",
  "agentType": "cfo",
  "sessionId": "optional-existing-session-id"
}
```

**Agent Types:** `general`, `cfo`, `ceo`, `research`, `growth`

**Response:**
```json
{
  "sessionId": "...",
  "message": {
    "id": "...",
    "role": "assistant",
    "content": "Based on your current financial data..."
  }
}
```

---

#### `GET /api/chat/[id]`
Retrieve a chat session with all messages.

#### `DELETE /api/chat/[id]`
Delete a chat session and all its messages.

---

### Business Plans

#### `POST /api/plans`
Create a new business plan.

**Request Body:**
```json
{
  "title": "My Startup Plan",
  "description": "A comprehensive business plan",
  "organizationId": "...",
  "aiGenerate": true,
  "businessType": "saas",
  "industry": "fintech",
  "targetMarket": "Southeast Asia"
}
```

When `aiGenerate: true`, all 8 sections are auto-generated by AI.

#### `GET /api/plans?organizationId=...`
List all plans for an organization.

#### `PATCH /api/plans/[id]`
Update a plan (title, description, status, section content).

**Request Body:**
```json
{
  "title": "Updated Plan Title",
  "status": "review",
  "sections": [
    { "type": "executive_summary", "content": "Updated content..." }
  ]
}
```

#### `DELETE /api/plans/[id]`
Delete a plan and all its sections.

---

### Financial Forecasting

#### `POST /api/forecasts`
Create a forecast with revenue/expense items. Auto-generates monthly financial statements.

**Request Body:**
```json
{
  "name": "2025 Base Forecast",
  "type": "base",
  "organizationId": "...",
  "startMonth": "2025-01",
  "endMonth": "2025-12",
  "revenueItems": [
    { "name": "Subscriptions", "category": "subscription", "amount": 50000, "growthRate": 5, "startMonth": "2025-01" }
  ],
  "expenseItems": [
    { "name": "Team Payroll", "category": "payroll", "amount": 30000, "growthRate": 2, "startMonth": "2025-01" }
  ]
}
```

#### `GET /api/forecasts?organizationId=...`
List forecasts with items and statements.

---

### AI Agents

#### `POST /api/agents`
Assign a task to an AI agent.

**Request Body:**
```json
{
  "agentType": "cfo",
  "task": "Analyze our current burn rate and suggest cost optimization strategies"
}
```

**Agent Types:** `cfo`, `ceo`, `research`, `growth`, `operations`, `fundraising`, `browser`, `reporting`

**Response:**
```json
{
  "sessionId": "...",
  "taskId": "...",
  "result": "Based on your financial data...",
  "memories": [...]
}
```

#### `GET /api/agents?userId=...`
List agent sessions with tasks.

---

### Reports

#### `POST /api/reports`
Generate an AI report.

**Request Body:**
```json
{
  "title": "Q1 Investor Report",
  "type": "investor",
  "format": "pdf",
  "organizationId": "...",
  "aiGenerate": true
}
```

**Report Types:** `investor`, `board`, `kpi`, `financial`, `market`
**Formats:** `pdf`, `docx`, `pptx`, `csv`, `xlsx`

#### `GET /api/reports?organizationId=...`
List reports for an organization.

---

### Workflows

#### `POST /api/workflows`
Create a new workflow.

**Request Body:**
```json
{
  "name": "Weekly KPI Report",
  "description": "Auto-generate weekly KPI summary",
  "trigger": "scheduled",
  "schedule": "0 9 * * 1",
  "organizationId": "...",
  "steps": [
    { "type": "agent", "name": "Collect KPIs", "config": "{\"agentType\": \"reporting\"}" },
    { "type": "notification", "name": "Send Report", "config": "{\"channel\": \"email\"}" }
  ]
}
```

#### `GET /api/workflows?organizationId=...`
List workflows with steps and recent runs.

#### `PATCH /api/workflows/[id]`
Update workflow (name, trigger, steps, isActive).

#### `DELETE /api/workflows/[id]`
Delete a workflow.

---

### KPIs

#### `GET /api/kpis?organizationId=...`
List KPIs for an organization.

#### `POST /api/kpis`
Create a new KPI.

---

### Settings

#### `GET /api/settings?organizationId=...`
Get organization settings.

#### `PATCH /api/settings`
Update organization settings.

---

### Notifications

#### `GET /api/notifications?userId=...`
List notifications for a user.

#### `POST /api/notifications`
Create a notification.

#### `PATCH /api/notifications`
Mark notifications as read.

---

### Exports

#### `GET /api/exports?organizationId=...`
List export jobs.

#### `POST /api/exports`
Create an export job.

---

## State Management

### Zustand Stores

#### `app-store.ts` — Navigation & UI

```typescript
interface AppState {
  currentPage: 'dashboard' | 'plans' | 'forecasting' | 'agents' | 'copilot' | 'reports' | 'workflows' | 'settings'
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setCurrentPage: (page: PageId) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
}
```

#### `auth-store.ts` — Authentication

```typescript
interface AuthState {
  user: { id: string; email: string; name: string; avatar: string; role: string } | null
  organization: { id: string; name: string; slug: string; logo: string; industry: string; size: string; currency: string } | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, organizationName: string) => Promise<void>
  logout: () => void
  setUser: (user: any) => void
  setOrganization: (org: any) => void
}
```

---

## UI Components

### shadcn/ui Component Library (46 Components)

| Category | Components |
|---|---|
| **Layout** | Card, Separator, AspectRatio, ResizablePanels, ScrollArea |
| **Navigation** | Sidebar, Breadcrumb, NavigationMenu, Pagination, Tabs, Menubar |
| **Data Display** | Table, Badge, Avatar, Tooltip, HoverCard, Progress, Chart |
| **Forms** | Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, InputOTP, Form, Label |
| **Feedback** | Dialog, AlertDialog, Sheet, Drawer, Toast, Sonner, Skeleton, Alert, Progress |
| **Actions** | Button, Toggle, ToggleGroup, DropdownMenu, ContextMenu, Command, Popover, Calendar |
| **Containers** | Accordion, Collapsible, Carousel, Tabs |

### Custom Components

| Component | Location | Description |
|---|---|---|
| AuthPage | `components/auth/` | Login/Register with tabs, OAuth buttons |
| AppSidebar | `components/layout/` | Collapsible navigation with page links |
| AppHeader | `components/layout/` | Top bar with search, notifications, user menu |
| DashboardPage | `components/dashboard/` | KPI cards, charts, AI insights |
| PlansPage | `components/plans/` | Business plan builder + editor |
| ForecastingPage | `components/forecasting/` | Financial modeling + statements |
| AgentsPage | `components/agents/` | Agent cards + orchestration |
| CopilotPage | `components/copilot/` | AI chat interface |
| ReportsPage | `components/reports/` | Report generator + preview |
| WorkflowsPage | `components/workflows/` | Workflow builder + templates |
| SettingsPage | `components/settings/` | 8-tab settings panel |
| ThemeProvider | `components/providers/` | Dark/light/system theme |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="file:./db/custom.db"

# AI SDK (z-ai-web-dev-sdk)
# The SDK is pre-configured and does not require additional API keys
# in the sandbox environment.

# NextAuth (if using NextAuth.js)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Roadmap

### Phase 1 — MVP (Current) ✅

- [x] Authentication (Register, Login, Session)
- [x] Dashboard with KPI cards and AI insights
- [x] Business Plan Builder with AI generation
- [x] Financial Forecasting Engine with multi-scenario modeling
- [x] KPI Intelligence dashboard
- [x] AI Agent System (8 agent types)
- [x] AI Copilot chat interface
- [x] Report Generator (5 report types)
- [x] Workflow Automation builder
- [x] Settings panel

### Phase 2 — Enhancement (Next)

- [ ] Real-time WebSocket notifications
- [ ] PDF/DOCX/PPTX export with actual file generation
- [ ] Stripe billing integration
- [ ] Rich text editor (TipTap) for plan sections
- [ ] Advanced agent orchestration (multi-agent pipelines)
- [ ] Browser automation via Playwright
- [ ] Multi-language support (EN, MS, ZH)
- [ ] Email notification delivery
- [ ] Advanced KPI alerting rules

### Phase 3 — Scale (Future)

- [ ] PostgreSQL migration with pgvector for embeddings
- [ ] Redis caching layer
- [ ] LangGraph multi-agent orchestration framework
- [ ] Temporal workflow engine integration
- [ ] GraphQL API layer
- [ ] Meilisearch full-text search
- [ ] BullMQ job queue for background processing
- [ ] Docker/Kubernetes deployment
- [ ] External integration connectors (QuickBooks, Xero, Stripe)
- [ ] Admin analytics dashboard

---

## License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with ❤️ using Next.js 16, React 19, TypeScript, and AI.<br/>
  <strong>GangNiaga AI</strong> — Your Autonomous Business Operating System
</p>
