# GangNiaga AI OS — Product Requirements Document

**Version:** 4.0  
**Last Updated:** 2026-03-04  
**Author:** GangNiaga Engineering  
**Status:** Active Development  

---

## Table of Contents

1. [Product Overview & Vision](#1-product-overview--vision)
2. [Target Users](#2-target-users)
3. [Problem Statement](#3-problem-statement)
4. [Solution Overview](#4-solution-overview)
5. [Feature Requirements](#5-feature-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [User Stories](#7-user-stories)
8. [Success Metrics](#8-success-metrics)
9. [Constraints & Assumptions](#9-constraints--assumptions)
10. [Future Scope](#10-future-scope)

---

## 1. Product Overview & Vision

### 1.1 Product Name

**GangNiaga AI OS** — Autonomous AI Business Operating System

### 1.2 Vision Statement

To become the definitive AI-powered business operating system for startups and SMEs in ASEAN, enabling founders and business owners to plan, forecast, validate, and operate their businesses with the intelligence and rigor of a Fortune 500 executive team — at a fraction of the cost.

### 1.3 Mission

GangNiaga AI OS replaces fragmented business planning tools, expensive consultants, and static spreadsheets with an integrated, autonomous platform where AI agents act as your CEO, CFO, Research Analyst, Growth Lead, Operations Manager, Fundraising Advisor, Browser Operator, and Reporting Engine — all working collaboratively through orchestrated pipelines with persistent memory and bank-grade financial intelligence.

### 1.4 Product Tagline

*"Your AI Executive Team, Always On."*

### 1.5 Core Value Propositions

| Value Proposition | Description |
|---|---|
| **Autonomous Intelligence** | 8 specialized AI agents that execute tasks, not just chat |
| **Financial Rigor** | SaaS metrics, burn rate, scenario analysis, forecast validation, plan vs actuals |
| **Bank-Grade Research** | 50+ verified sources with citations, confidence scores, and industry benchmarks |
| **Pipeline Orchestration** | DAG-based multi-agent pipelines with dependency resolution |
| **Memory That Learns** | Persistent memory with relevance ranking, LLM compression, and time decay |
| **Investor-Ready Outputs** | Dynamic pitch decks, export to 6 formats, multi-agent plan review |
| **ASEAN-First** | Multi-currency, regional benchmarks, QuickBooks/Xero integration |

### 1.6 Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Database** | Prisma ORM (SQLite) |
| **State Management** | Zustand |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **AI SDK** | z-ai-web-dev-sdk |
| **Tables** | TanStack Table |
| **Forms** | React Hook Form + Zod |
| **Drag & Drop** | dnd-kit |

---

## 2. Target Users

### 2.1 Primary Personas

#### Persona 1: ASEAN Startup Founder

- **Role:** CEO/Founder of a pre-seed to Series A startup
- **Location:** Malaysia, Singapore, Indonesia, Thailand, Vietnam, Philippines
- **Needs:** Business plan creation, financial forecasting, investor pitch decks, idea validation
- **Pain Points:** Cannot afford CFO/consultants, uses spreadsheets for financials, lacks access to market research
- **Technical Level:** Moderate — comfortable with SaaS tools, not with financial modeling

#### Persona 2: SME Business Owner

- **Role:** Owner/operator of a small-to-medium enterprise
- **Location:** ASEAN region, 10-200 employees
- **Needs:** Cash flow tracking, plan vs actuals, operational efficiency, KPI monitoring
- **Pain Points:** No real-time financial visibility, manual bookkeeping reconciliation, no strategic planning tools
- **Technical Level:** Basic — needs intuitive, guided workflows

#### Persona 3: Entrepreneur / Solopreneur

- **Role:** Individual exploring or launching a new business idea
- **Location:** Global (ASEAN focus)
- **Needs:** Idea validation, market research, business model canvas, initial financial projections
- **Pain Points:** Unsure if idea is viable, no access to market data, overwhelmed by business planning complexity
- **Technical Level:** Varied — needs step-by-step AI guidance

#### Persona 4: Financial Advisor / Consultant

- **Role:** Freelance or agency-based business consultant
- **Location:** ASEAN
- **Needs:** Multi-client plan review, financial analysis, report generation, benchmarking
- **Pain Points:** Manual report creation, repetitive analysis, no scalable tooling
- **Technical Level:** Advanced — power user of financial tools

### 2.2 Organization Sizes

| Segment | Size | Plan Tier | Key Modules |
|---|---|---|---|
| **Startup** | 1-10 employees | Starter / Pro | Idea Canvas, Plans, Forecast, Pitch Decks |
| **SME** | 10-200 employees | Pro / Enterprise | Plan vs Actuals, KPIs, Integrations, Reports |
| **Enterprise** | 200+ employees | Enterprise | All modules, custom pipelines, RBAC, SSO |

### 2.3 Geographic Focus

Primary: Malaysia (MY), Singapore (SG), Indonesia (ID)  
Secondary: Thailand (TH), Vietnam (VN), Philippines (PH)  
Tertiary: Global

---

## 3. Problem Statement

### 3.1 The Core Problem

Startups and SMEs in ASEAN operate with **severe financial intelligence gaps**. They lack:

1. **Strategic Financial Planning** — Most founders build financial projections on static spreadsheets that never update, never compare against reality, and contain unvalidated assumptions.

2. **Affordable Expertise** — Hiring a CFO ($8K-25K/month in ASEAN), strategy consultants, or financial advisors is prohibitively expensive for early-stage companies.

3. **Integrated Tooling** — Business planning, forecasting, accounting, research, and reporting exist in disconnected tools (Google Sheets, PowerPoint, QuickBooks, research reports) with no data flow between them.

4. **Idea Validation** — Entrepreneurs invest months and capital into ideas without rigorous, data-backed validation, leading to high failure rates (90%+ startup failure rate in ASEAN).

5. **Investor Readiness** — Most founders cannot produce bankable business plans, defendable financials, or compelling pitch decks that survive investor scrutiny.

6. **Operational Visibility** — SMEs lack real-time KPI dashboards, variance tracking, and predictive alerts that enterprise companies take for granted.

### 3.2 Quantified Impact

| Metric | Current State | Target with GangNiaga |
|---|---|---|
| Time to create a business plan | 40-80 hours | 2-4 hours (AI-assisted) |
| Cost of financial planning | $5K-50K (consultants) | $29-99/month (SaaS) |
| Forecast accuracy | ±50% (guesswork) | ±15% (AI-validated) |
| Idea validation time | 2-6 months (manual) | 30 minutes (AI engine) |
| Pitch deck creation | 20-40 hours | 1-3 hours (AI-generated) |
| Plan vs actuals tracking | Monthly manual reconciliation | Real-time automated sync |

---

## 4. Solution Overview

### 4.1 Architecture Overview

GangNiaga AI OS is a **15-page single-page application** built on Next.js 16 with a modular architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     GangNiaga AI OS                             │
├─────────┬──────────┬──────────┬──────────┬─────────────────────┤
│ Dashboard│ Idea     │ Business │ Forecast │ Plan vs Actuals     │
│          │ Canvas   │ Plans    │ ing      │                     │
├──────────┼──────────┼──────────┼──────────┼─────────────────────┤
│ Plan     │ Pitch    │ AI       │ AI       │ Research            │
│ Review   │ Decks    │ Agents   │ Copilot  │                     │
├──────────┼──────────┼──────────┼──────────┼─────────────────────┤
│ Reports  │Workflow  │Observ-   │ Browser  │ Settings            │
│          │ s        │ ability  │          │                     │
└──────────┴──────────┴──────────┴──────────┴─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────┴──────┐ ┌─────┴──────┐ ┌──────┴──────┐
     │  8 AI Agents  │ │ 10 Tools   │ │ 6 Exports   │
     │  (DAG pipes)  │ │ (registry) │ │ (formats)   │
     └────────┬──────┘ └─────┬──────┘ └──────┬──────┘
              │               │               │
     ┌────────┴───────────────┴───────────────┴──────┐
     │          36+ Prisma Models (SQLite)            │
     │  Memory • RBAC • Audit • Observability • ...   │
     └────────────────────────────────────────────────┘
```

### 4.2 Core Systems

#### 4.2.1 AI Agent System

8 specialized agents, each with defined capabilities, allowed tools, and concurrent task limits:

| Agent | Role | Allowed Tools | Max Concurrent |
|---|---|---|---|
| **CFO** | Financial strategy, cash flow, runway analysis | `forecast_calculate`, `kpi_update`, `analytics_query`, `export_generate` | 3 |
| **CEO** | Strategic vision, market positioning, growth strategy | `web_search`, `analytics_query`, `crm_lookup` | 2 |
| **Research** | Market intelligence, competitor analysis, trends | `web_search`, `browser_navigate`, `analytics_query` | 5 |
| **Growth** | Customer acquisition, retention, expansion | `web_search`, `analytics_query`, `crm_lookup`, `notification_send` | 3 |
| **Operations** | Process optimization, resource allocation | `analytics_query`, `kpi_update`, `notification_send` | 3 |
| **Fundraising** | Investment strategy, pitch prep, investor relations | `web_search`, `analytics_query`, `export_generate`, `forecast_calculate` | 2 |
| **Browser** | Web automation, data extraction, navigation | `browser_navigate`, `web_search` | 2 |
| **Reporting** | Report generation, data synthesis, stakeholder comms | `analytics_query`, `export_generate`, `kpi_update`, `forecast_calculate` | 3 |

#### 4.2.2 Tool Registry

10 registered tools with input/output schemas, permissions, and rate limiting:

| Tool | Category | Rate Limit | Requires Approval | Sandboxed |
|---|---|---|---|---|
| `web_search` | Analytics | 10/min | No | No |
| `forecast_calculate` | Finance | — | No | No |
| `browser_navigate` | Browser | 5/min | No | Yes |
| `email_send` | Communication | 10/min | Yes | No |
| `export_generate` | Export | — | No | No |
| `crm_lookup` | CRM | — | No | No |
| `analytics_query` | Analytics | — | No | No |
| `kpi_update` | Data | — | No | No |
| `notification_send` | Communication | — | No | No |
| `code_execute` | Analytics | — | Yes | Yes |

#### 4.2.3 DAG-Based Agent Pipeline Orchestration

Multi-step pipelines where each step is an agent task with:
- **Dependency resolution** — Steps declare `dependsOn` step IDs forming a DAG
- **Input templating** — Step inputs can reference previous step outputs
- **Trigger types** — Manual, scheduled (cron), or event-driven
- **Execution tracking** — Pipeline runs and step runs with status, duration, and error tracking

#### 4.2.4 Memory Architecture

Global memory store with:
- **7 categories** — `user_preference`, `workspace_context`, `agent_knowledge`, `forecast_insight`, `workflow_pattern`, `market_intelligence`, `financial_summary`
- **Relevance ranking** — Score = `relevanceScore × accessBoost × recencyBoost`
- **LLM compression** — Old, low-access memories are summarized via LLM to reduce storage
- **Time decay** — Relevance scores decay over time for less-accessed memories
- **TTL support** — Optional expiration timestamps for ephemeral memories
- **Cross-session retrieval** — Memory is injected into agent system prompts for context-aware responses

#### 4.2.5 Observability System

- **Distributed tracing** — Trace IDs and span IDs propagated across agent pipelines
- **Token tracking** — Per-request token usage with cost estimation by agent and request type
- **Event logging** — All agent executions, workflow steps, pipeline steps, browser actions tracked
- **Dashboard** — Real-time event counts, status breakdowns, avg response time, error monitoring, slow operations

### 4.3 Data Model Summary

36+ Prisma models organized into 12 domains:

| Domain | Models |
|---|---|
| **Core** | User, Organization, Workspace, Membership |
| **Auth & Security** | ApiKey, AuditLog, RateLimitLog |
| **Business Planning** | BusinessPlan, PlanSection |
| **Financial Forecasting** | Forecast, ForecastRevenue, ForecastExpense, FinancialStatement |
| **KPI Intelligence** | Kpi |
| **AI Agents** | AgentSession, AgentTask, AgentMemory, ToolExecution |
| **Agent Orchestration** | AgentPipeline, AgentPipelineStep, AgentPipelineRun, PipelineStepRun |
| **Memory** | MemoryEntry |
| **Chat** | ChatSession, ChatMessage |
| **Workflow** | Workflow, WorkflowStep, WorkflowRun, WorkflowStepRun |
| **Reports & Exports** | Report, Export |
| **Browser** | BrowserSession, BrowserSnapshot |
| **Integrations** | Integration, IntegrationEvent, AccountingConnection |
| **Research** | ResearchSource, ResearchCitation, IndustryBenchmark |
| **Idea Validation** | IdeaCanvas, IdeaValidation, IdeaBenchmark |
| **Plan Review** | PlanReview, PlanReviewFinding |
| **Plan vs Actuals** | ActualFinancial, ForecastVariance, FinancialAlert |
| **Pitch Deck** | PitchDeck, PitchDeckSlide, PitchDeckQuestion |
| **Subscriptions** | Subscription |
| **Notifications** | Notification |
| **Scheduled Jobs** | ScheduledJob |
| **Automation Logs** | AutomationLog |
| **Skill Registry** | SkillRegistry |
| **Agent Permissions** | AgentPermission |
| **Observability** | TokenUsage, ObservabilityEvent |

---

## 5. Feature Requirements

### 5.1 Dashboard Page

**Priority:** P0 | **Status:** Implemented

The central command center providing an at-a-glance view of business health, recent activity, and AI agent status.

| Feature | Description | Priority |
|---|---|---|
| KPI Summary Cards | Display key metrics (Revenue, MRR, Burn Rate, Runway) with trend indicators | P0 |
| Financial Health Score | AI-computed overall business health score (0-100) | P1 |
| Recent Activity Feed | Chronological feed of agent tasks, workflow runs, and plan updates | P0 |
| Agent Status Panel | Live status of all 8 agent types with active task counts | P1 |
| Quick Actions | One-click access to common actions (New Plan, Run Forecast, Validate Idea) | P1 |
| Revenue vs Expenses Chart | Monthly comparison chart from forecast data | P0 |
| Cash Flow Projection | Visual projection of cash balance over 12 months | P1 |
| Variance Alerts | Summary of active financial alerts (on_track, warning, critical) | P0 |
| Active Workflows | Status of running workflows and pipelines | P2 |

### 5.2 Idea Canvas Page

**Priority:** P0 | **Status:** Implemented

Pre-workflow idea pressure-testing system. Users define business ideas using a structured canvas and receive AI-powered validation.

| Feature | Description | Priority |
|---|---|---|
| Canvas Builder | 10-field structured canvas (Problem, Solution, Target Market, etc.) | P0 |
| AI Validation Engine | 6-category validation: Market, Financial, Technical, Competitive, Team, Regulatory | P0 |
| Validation Scoring | 0-100 aggregate score with weighted category scores and letter grade (A-F) | P0 |
| Risk Assessment | 4-dimension risk scoring: market, tech, financial, team (with severity levels) | P0 |
| Industry Benchmarks | Compare idea metrics against industry-specific benchmarks by geography | P1 |
| AI Recommendations | Actionable suggestions for each weak category | P0 |
| Idea Benchmark Data | Market size, growth rate, CAC, churn rate, margin benchmarks from verified sources | P1 |
| Canvas Status Workflow | Draft → Validating → Validated / Needs Rework → Archived | P0 |
| Convert to Plan | One-click conversion of validated idea to a Business Plan | P1 |
| Multi-Geography Support | Benchmarks for MY, SG, ID, US, and global markets | P1 |

**Validation Category Weights:**

| Category | Weight | Questions per Category |
|---|---|---|
| Market | 25% | 5 |
| Financial | 20% | 5 |
| Technical | 18% | 5 |
| Competitive | 15% | 5 |
| Team | 12% | 5 |
| Regulatory | 10% | 5 |

### 5.3 Business Plans Page

**Priority:** P0 | **Status:** Implemented

AI-assisted business plan builder with structured sections and version control.

| Feature | Description | Priority |
|---|---|---|
| Plan Builder | Create plans with 8 section types: Executive Summary, Market Analysis, SWOT, Financial, Competitor, Team, Marketing, Operations | P0 |
| AI Section Generation | Generate section content from context, forecasts, and research | P0 |
| Plan Versioning | Version tracking with ability to compare versions | P1 |
| Plan Status Workflow | Draft → Review → Approved → Archived | P0 |
| Section Ordering | Drag-and-drop reordering of plan sections | P1 |
| Rich Text Editing | Markdown-based content editing with preview | P1 |
| Plan Templates | Pre-built templates for different business types (SaaS, E-commerce, Fintech) | P2 |
| Linked Forecasts | Associate forecasts with plans for financial sections | P0 |
| AI Content Improvement | Suggest improvements for existing plan sections | P2 |
| Export to 6 Formats | PDF, DOCX, PPTX, XLSX, CSV, Markdown | P0 |

### 5.4 Forecasting Page

**Priority:** P0 | **Status:** Implemented

Financial forecasting engine with scenario modeling and statement generation.

| Feature | Description | Priority |
|---|---|---|
| Forecast Builder | Define revenue items (5 categories) and expense items (7 categories) | P0 |
| Scenario Modeling | 4 scenario types: Best, Base, Worst, Custom with adjustable multipliers | P0 |
| Financial Statements | Auto-generate P&L, Balance Sheet, and Cash Flow statements per month | P0 |
| Revenue Modeling | Recurring/non-recurring revenue with monthly growth rates | P0 |
| Expense Modeling | Payroll, infrastructure, SaaS, tax, marketing, operational, other categories | P0 |
| Burn Rate & Runway | Automatic calculation with visual indicators | P0 |
| Chart Visualizations | Revenue, expense, and net income charts over time | P1 |
| Currency Support | Multi-currency forecasts (USD, MYR, SGD, IDR, etc.) | P1 |
| Forecast Validation | AI-powered validation of forecast assumptions | P2 |
| Investor Metrics | SaaS metrics: MRR, ARR, LTV, CAC, LTV:CAC ratio, payback period | P1 |

**Revenue Categories:** Subscription, Transaction, Service, Product, Other  
**Expense Categories:** Payroll, Infrastructure, SaaS, Tax, Marketing, Operational, Other

### 5.5 Plan vs Actuals Page

**Priority:** P0 | **Status:** Implemented

Real-time comparison of planned financials against actual performance with variance analysis.

| Feature | Description | Priority |
|---|---|---|
| Actual Financials Import | Import from QuickBooks, Xero, manual entry, or CSV | P0 |
| QuickBooks Integration | OAuth-connected sync with configurable frequency (hourly to monthly) | P0 |
| Xero Integration | OAuth-connected sync with tenant ID support | P0 |
| Variance Analysis | Auto-compute forecast vs actual variance per metric per period | P0 |
| Alert Levels | On Track, Warning, Critical, Exceeded thresholds | P0 |
| AI Variance Explanation | LLM-generated analysis of why variances occurred | P1 |
| Financial Alerts | Revenue tracking, expense drift, cash warning, hiring affordability, milestone, variance threshold | P0 |
| Alert Dismissal | Dismiss alerts with action tracking | P1 |
| Detailed Line Items | JSON-structured breakdown of actual financials | P1 |
| Actuals Dashboard | Visual comparison charts (planned vs actual bars/lines) | P0 |

**Variance Metrics Tracked:** Revenue, COGS, Gross Profit, Operating Expenses, Net Income, Cash Flow, Burn Rate

### 5.6 Plan Review Page

**Priority:** P0 | **Status:** Implemented

Multi-agent plan review system with narrative vs. financial cross-check, simulating lender/investor/auditor personas.

| Feature | Description | Priority |
|---|---|---|
| Multi-Persona Review | Lender, Investor, Auditor, Internal reviewer types | P0 |
| Narrative Agent | Evaluates quality of written narrative (0-100 score) | P0 |
| Financial Agent | Evaluates quality of financial projections (0-100 score) | P0 |
| Cross-Check Agent | Detects narrative vs. financial inconsistencies (0-100 score) | P0 |
| Overall Scoring | Overall, narrative, financial, consistency, risk, fundability scores | P0 |
| Discrepancy Detection | JSON-structured list of narrative-financial mismatches | P0 |
| Red Flag Identification | Critical issues that would block funding | P0 |
| Strengths Highlighting | Plan strengths to leverage in presentations | P1 |
| Recommendations | Specific improvement suggestions with evidence | P0 |
| Finding Resolution | Track which findings have been resolved | P1 |
| Review Status Workflow | Pending → Reviewing → Completed / Needs Revision | P0 |

### 5.7 Pitch Decks Page

**Priority:** P1 | **Status:** Implemented

Dynamic pitch deck orchestrator with template-based creation and AI generation.

| Feature | Description | Priority |
|---|---|---|
| 5 Built-In Templates | Seed Round (12 slides), Series A (14 slides), Debt Financing (10 slides), Partner Pitch (8 slides), Internal Review (6 slides) | P0 |
| AI Deck Generation | Auto-generate slide content from business plan + forecast data | P0 |
| Dynamic Variables | Auto-synced variables from plan/forecast/KPI data (e.g., `{{burn_rate}}`, `{{mrr}}`) | P0 |
| Slide Reordering | Drag-and-drop slide order management | P1 |
| Speaker Notes | AI-generated speaker notes per slide | P1 |
| Funder Questions | AI-generated 8-12 questions funders would ask, with suggested answers | P1 |
| Deck Analysis | AI scores: Overall, Clarity, Financial Rigor, Market Proof, Team Strength, Ask Clarity | P1 |
| Target Audience | Investor, Lender, Partner, Internal — affects template and question generation | P0 |
| Funding Ask & Use of Funds | Structured funding request with JSON breakdown | P1 |
| Export to PPTX | Generate downloadable PPTX from deck | P0 |
| Plan Linking | Link deck to a business plan for auto-synced data | P0 |

**Template → Audience Mapping:**

| Template | Target Audience | Slides | Focus |
|---|---|---|---|
| Seed Round | Investor | 12 | Vision, market, early traction |
| Series A | Investor | 14 | Metrics, unit economics, scale |
| Debt Financing | Lender | 10 | Cash flow, collateral, repayment |
| Partner Pitch | Partner | 8 | Mutual value, synergies |
| Internal Review | Internal | 6 | Data-focused, strategic updates |

### 5.8 AI Agents Page

**Priority:** P0 | **Status:** Implemented

Management interface for all 8 AI agent types with session tracking and task history.

| Feature | Description | Priority |
|---|---|---|
| Agent Type Overview | Visual cards for all 8 agent types with status and capabilities | P0 |
| Session Management | Create, view, and manage agent sessions | P0 |
| Task History | Full task history with input, output, status, and duration | P0 |
| Tool Execution Log | Detailed log of all tool calls per task with input/output/duration | P0 |
| Agent Memory View | Browse memories stored per session | P1 |
| Pipeline Builder | Visual DAG builder for multi-step agent pipelines | P1 |
| Pipeline Execution | Run pipelines manually, on schedule, or event-triggered | P0 |
| Step Dependencies | Define step dependencies (DAG edges) for ordered execution | P0 |
| Agent Permissions (RBAC) | Per-agent resource/action permission matrix | P1 |
| Concurrent Task Limits | Enforce per-agent max concurrent tasks | P1 |

### 5.9 AI Copilot Page

**Priority:** P0 | **Status:** Implemented

Conversational AI interface with agent-type selection, chat history, and tool execution.

| Feature | Description | Priority |
|---|---|---|
| Chat Interface | Multi-turn conversation with AI agents | P0 |
| Agent Type Selection | Choose which agent persona to chat with | P0 |
| Session Persistence | Chat sessions persisted with full message history | P0 |
| Context Injection | Inject business context (forecasts, KPIs, plan data) into conversations | P1 |
| Memory-Aware Responses | Agent responses enriched with relevant stored memories | P0 |
| Tool Call Parsing | Parse tool calls from AI responses (3 formats: code block, bracket, XML) | P0 |
| Tool Execution Display | Show tool execution results inline in chat | P1 |
| Conversation Export | Export chat history as Markdown | P2 |

### 5.10 Research Page

**Priority:** P1 | **Status:** Implemented

Bank-grade research system with verified sources, citations, and industry benchmarks.

| Feature | Description | Priority |
|---|---|---|
| Research Sources | 50+ verified sources: government, industry reports, academic, financial institutions, news, databases | P0 |
| Source Verification | Each source has verification status, reliability rating (0-5), and last-updated date | P0 |
| Citation System | Track claims, citations, data points, and confidence scores per source | P0 |
| Industry Benchmarks | Pre-loaded benchmarks with 25th/50th/75th percentiles, sample sizes, and confidence | P1 |
| Multi-Geography | Global, MY, SG, ID, US geography-specific data | P0 |
| Category Filtering | Economic, Industry, Demographic, Financial, Regulatory, Technology | P1 |
| AI-Powered Research | Agent-driven research with web search and browser automation | P1 |
| Citation Confidence | 0-1 confidence score on each citation | P0 |

### 5.11 Reports Page

**Priority:** P1 | **Status:** Implemented

AI-powered report generation for stakeholders.

| Feature | Description | Priority |
|---|---|---|
| Report Types | Investor, Board, KPI, Financial, Market | P0 |
| Multi-Format Export | PDF, DOCX, PPTX, CSV, XLSX | P0 |
| Report Status Workflow | Draft → Generated → Approved → Sent | P0 |
| AI Content Generation | Auto-generate report content from KPIs, forecasts, and actuals | P1 |
| Scheduled Reports | Cron-based automatic report generation | P2 |
| Report Templates | Pre-built templates for each report type | P1 |

### 5.12 Workflows Page

**Priority:** P1 | **Status:** Implemented

DAG-based workflow automation engine.

| Feature | Description | Priority |
|---|---|---|
| Workflow Builder | Define workflows with steps (agent, tool, condition, delay, notification, pipeline) | P0 |
| DAG Step Dependencies | Steps declare `dependsOn` arrays for ordered execution | P0 |
| Trigger Types | Manual, scheduled (cron), event-driven | P0 |
| Execution Tracking | Workflow runs with per-step status, duration, input/output | P0 |
| Step Types | Agent, Tool, Condition, Delay, Notification, Pipeline | P0 |
| Error Handling | Failed step tracking with error messages and skip support | P1 |
| Workflow Activation | Active/inactive toggle for workflows | P1 |

### 5.13 Observability Page

**Priority:** P1 | **Status:** Implemented

System monitoring, distributed tracing, and token usage tracking.

| Feature | Description | Priority |
|---|---|---|
| Event Dashboard | Total events, by type, by status, average response time | P0 |
| Token Usage Tracking | Total tokens, cost estimation, by agent, by request type | P0 |
| Distributed Traces | Trace ID → span ID propagation across pipeline steps | P1 |
| Error Monitoring | Recent errors with severity, source, and message | P0 |
| Slow Operations | Top 10 slowest operations with duration | P1 |
| Event Trend | Daily event count chart (1d, 7d, 30d, 90d, 1y ranges) | P1 |
| Data Retention | 90-day retention with automatic cleanup | P2 |
| Cost Estimation | Per-agent and per-request-type cost breakdown | P1 |

### 5.14 Browser Page

**Priority:** P2 | **Status:** Implemented

Web automation interface for data extraction and authenticated workflows.

| Feature | Description | Priority |
|---|---|---|
| Browser Sessions | Create and manage browser automation sessions | P1 |
| Navigation | Navigate to URLs with action types: screenshot, extract_text, extract_links, fill_form, click | P0 |
| Snapshot Capture | Screenshot, HTML, PDF, and data extraction snapshots | P1 |
| CSS Selector Targeting | Targeted actions using CSS selectors | P1 |
| Session History | Full history of browser actions and snapshots | P2 |
| Sandboxed Execution | Browser tools run in sandboxed environment | P0 |

### 5.15 Settings Page

**Priority:** P1 | **Status:** Implemented

Organization and user configuration.

| Feature | Description | Priority |
|---|---|---|
| Organization Settings | Name, logo, industry, size, country, currency | P0 |
| Membership Management | Invite/manage members with roles (Owner, Admin, Manager, Accountant, Viewer) | P0 |
| Integration Management | Connect/disconnect QuickBooks, Xero, Stripe, Google Analytics, Slack, Discord, GitHub, HubSpot, Salesforce | P0 |
| API Key Management | Create, revoke, and manage API keys with permissions and expiration | P0 |
| Subscription Management | Plan tier (Free, Starter, Pro, Enterprise) with Stripe billing | P1 |
| Notification Preferences | Configure alert thresholds and delivery preferences | P2 |
| Data Export | Bulk export of organization data | P2 |
| Audit Log Viewer | Search and filter audit logs by action, resource, user, status | P1 |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Requirement | Target | Measurement |
|---|---|---|
| Page Load Time (First Contentful Paint) | < 1.5 seconds | Lighthouse |
| API Response Time (95th percentile) | < 500ms (non-AI routes) | Observability dashboard |
| AI Agent Response Time | < 15 seconds (simple), < 60 seconds (complex) | Agent task duration tracking |
| Forecast Calculation | < 5 seconds for 24-month projection | Tool execution duration |
| Dashboard Render | < 2 seconds with full data | Performance monitoring |
| Database Query Time | < 100ms (indexed), < 500ms (aggregation) | Prisma query logging |
| Export Generation | < 30 seconds for PDF/DOCX/PPTX | Export job duration |
| Concurrent Users | 100 simultaneous per instance | Load testing |
| WebSocket Latency | < 100ms for real-time updates | Custom metrics |

### 6.2 Security

| Requirement | Implementation | Status |
|---|---|---|
| Authentication | 4-strategy auth: Cookie session, Server cookies, URL params, Bearer token | Implemented |
| Password Security | bcrypt hashing for password storage | Implemented |
| RBAC | 5 organization roles: Owner, Admin, Manager, Accountant, Viewer | Implemented |
| Agent RBAC | Per-agent resource/action permission matrix (AgentPermission model) | Implemented |
| API Key Security | SHA-256 hashed keys with prefix identification | Implemented |
| Rate Limiting | Per-endpoint rate limiting with configurable thresholds | Implemented |
| Audit Logging | All significant actions logged (create, execute, run, export) | Implemented |
| Input Validation | Zod schemas for API inputs, tool input validation | Implemented |
| Tool Approval | High-risk tools (`email_send`, `code_execute`) require approval | Implemented |
| Sandboxed Execution | `browser_navigate` and `code_execute` run sandboxed | Implemented |
| OAuth Token Encryption | Encrypted OAuth tokens for QuickBooks/Xero connections | Implemented |
| CSRF Protection | Next.js built-in CSRF protection | Implemented |
| XSS Prevention | React built-in escaping, CSP headers | Planned |
| Data Encryption at Rest | SQLite file encryption | Planned |

### 6.3 Scalability

| Requirement | Target | Strategy |
|---|---|---|
| Organizations | 10,000+ | Horizontal scaling, tenant isolation |
| Models per Organization | 100,000+ records | Indexed queries, pagination |
| Agent Concurrent Tasks | 50 per organization | Queue-based execution, task limits |
| Memory Entries | 1M+ per organization | Relevance ranking, compression, TTL |
| File Storage | 100GB+ | S3-compatible object storage |
| Database | SQLite (dev) → PostgreSQL (production) | Prisma migration path |
| API Throughput | 1,000 req/min | Rate limiting, caching |

### 6.4 Reliability

| Requirement | Target |
|---|---|
| Uptime SLA | 99.5% (Starter), 99.9% (Pro), 99.99% (Enterprise) |
| Data Backup | Daily automated backups |
| Disaster Recovery | RPO < 1 hour, RTO < 4 hours |
| Error Recovery | Agent task retry with exponential backoff |
| Graceful Degradation | AI failures return heuristic fallbacks |
| Data Retention | Observability: 90 days, Audit: 1 year, Business data: indefinite |

### 6.5 Accessibility

| Requirement | Target |
|---|---|
| WCAG Compliance | Level AA |
| Keyboard Navigation | Full keyboard accessibility |
| Screen Reader | Semantic HTML, ARIA labels |
| Color Contrast | 4.5:1 minimum ratio |
| Responsive Design | Mobile (375px), Tablet (768px), Desktop (1024px+) |

### 6.6 Internationalization

| Requirement | Target |
|---|---|
| Primary Language | English |
| Planned Languages | Malay, Bahasa Indonesia, Mandarin, Thai, Vietnamese |
| Currency Support | USD, MYR, SGD, IDR, THB, VND, PHP |
| Date/Number Formatting | Locale-aware formatting |
| RTL Support | Not in current scope |

---

## 7. User Stories

### 7.1 Idea Validation

| ID | Story | Priority |
|---|---|---|
| US-001 | As a startup founder, I want to fill out an Idea Canvas with my business concept so that the AI can validate its viability across 6 categories. | P0 |
| US-002 | As an entrepreneur, I want to see a validation score (0-100) with letter grade so that I can quickly assess whether my idea is worth pursuing. | P0 |
| US-003 | As a founder, I want to see risk assessments for market, technical, financial, and team risks so that I can address weaknesses before investing resources. | P0 |
| US-004 | As a startup founder, I want to compare my idea against industry benchmarks in my geography so that I can validate market assumptions with real data. | P1 |

### 7.2 Business Planning

| ID | Story | Priority |
|---|---|---|
| US-005 | As a startup founder, I want to create a business plan with 8 AI-generated section types so that I can produce a professional plan in hours, not weeks. | P0 |
| US-006 | As an SME owner, I want to link a financial forecast to my business plan so that the financial section stays synchronized with my projections. | P0 |
| US-007 | As a founder, I want to export my business plan to PDF or DOCX so that I can share it with investors and partners. | P0 |

### 7.3 Financial Intelligence

| ID | Story | Priority |
|---|---|---|
| US-008 | As a startup founder, I want to build a financial forecast with revenue and expense line items so that I can project cash flow and runway. | P0 |
| US-009 | As a CFO, I want to run scenario modeling (best/base/worst/custom) so that I can stress-test our financial assumptions. | P0 |
| US-010 | As an SME owner, I want to connect QuickBooks/Xero and see plan vs actuals with variance analysis so that I know whether we are on track. | P0 |
| US-011 | As a founder, I want to receive automated financial alerts when expenses drift or cash runs low so that I can take corrective action proactively. | P0 |

### 7.4 Plan Review

| ID | Story | Priority |
|---|---|---|
| US-012 | As a founder, I want to submit my business plan for AI-powered lender review so that I can identify and fix issues before approaching a bank. | P0 |
| US-013 | As a startup founder, I want to see narrative vs financial discrepancies detected by the cross-check agent so that I can align my story with my numbers. | P0 |
| US-014 | As a consultant, I want to switch between lender, investor, and auditor review personas so that I can get different perspectives on the same plan. | P1 |

### 7.5 Pitch Decks

| ID | Story | Priority |
|---|---|---|
| US-015 | As a startup founder, I want to create a pitch deck from a template with AI-generated content so that I can produce an investor-ready deck in under 3 hours. | P0 |
| US-016 | As a founder, I want dynamic variables (MRR, burn rate, runway) to auto-sync from my forecast so that my deck always shows current numbers. | P0 |
| US-017 | As a founder, I want AI to generate questions funders are likely to ask with suggested answers so that I can prepare for investor meetings. | P1 |

### 7.6 AI Agents

| ID | Story | Priority |
|---|---|---|
| US-018 | As a founder, I want to chat with the CFO Agent about cash flow optimization so that I can get expert financial advice without hiring a CFO. | P0 |
| US-019 | As an SME owner, I want to create a multi-step agent pipeline (Research → CEO → CFO → Reporting) so that complex business analyses run automatically. | P0 |
| US-020 | As a power user, I want agents to remember my preferences and past interactions so that responses improve over time without me repeating context. | P0 |

### 7.7 Research & Reports

| ID | Story | Priority |
|---|---|---|
| US-021 | As a startup founder, I want to search verified research sources with citations and confidence scores so that I can trust the data in my business plan. | P1 |
| US-022 | As a board member, I want to generate a monthly KPI report in PDF so that I can review business performance without manual data compilation. | P1 |

### 7.8 Workflow & Operations

| ID | Story | Priority |
|---|---|---|
| US-023 | As an operations manager, I want to create automated workflows with DAG-based dependencies so that multi-step processes execute reliably in order. | P1 |
| US-024 | As an admin, I want to monitor all AI agent executions, token usage, and errors in an observability dashboard so that I can ensure system health. | P1 |

### 7.9 Settings & Administration

| ID | Story | Priority |
|---|---|---|
| US-025 | As an organization admin, I want to manage team members with role-based access (Owner, Admin, Manager, Accountant, Viewer) so that sensitive data is protected. | P0 |
| US-026 | As a founder, I want to connect QuickBooks Online and configure sync frequency so that actual financial data flows into the platform automatically. | P0 |

---

## 8. Success Metrics

### 8.1 Product Metrics

| Metric | Target (6 months) | Target (12 months) | Measurement |
|---|---|---|---|
| Monthly Active Users (MAU) | 500 | 5,000 | Analytics |
| Organizations Created | 200 | 2,000 | Database |
| Business Plans Generated | 1,000 | 10,000 | Database |
| Idea Validations Run | 2,000 | 20,000 | Database |
| Pitch Decks Created | 500 | 5,000 | Database |
| Forecast Scenarios Run | 3,000 | 30,000 | Database |
| Agent Tasks Executed | 10,000 | 100,000 | Observability |
| Reports Generated | 1,000 | 15,000 | Database |
| QuickBooks/Xero Connections | 100 | 1,000 | Database |

### 8.2 Engagement Metrics

| Metric | Target | Measurement |
|---|---|---|
| Daily Active Users / MAU | > 30% | Analytics |
| Average Session Duration | > 15 minutes | Analytics |
| Feature Adoption Rate | > 40% of users use 3+ modules | Product analytics |
| Agent Chat Sessions per User | > 5 per week | Database |
| Plan Review Completion Rate | > 80% | Database |
| Export Rate | > 25% of plans exported | Database |
| Pitch Deck AI Generation Rate | > 60% of decks AI-generated | Database |

### 8.3 Quality Metrics

| Metric | Target | Measurement |
|---|---|---|
| AI Response Accuracy | > 85% user satisfaction | Feedback surveys |
| Forecast Accuracy (3-month) | ±15% variance | Plan vs actuals data |
| Validation Score Correlation | > 0.7 with survival rate | Longitudinal study |
| System Uptime | > 99.5% | Monitoring |
| API Error Rate | < 1% | Observability |
| Mean Time to Recovery (MTTR) | < 1 hour | Incident tracking |
| Agent Task Success Rate | > 95% | Database |
| Token Cost per User | < $2/day average | Observability |

### 8.4 Business Metrics

| Metric | Target (12 months) | Measurement |
|---|---|---|
| Monthly Recurring Revenue (MRR) | $50K | Stripe |
| Customer Acquisition Cost (CAC) | < $100 | Marketing analytics |
| Lifetime Value (LTV) | > $500 | Stripe |
| LTV:CAC Ratio | > 5:1 | Calculated |
| Churn Rate | < 5% monthly | Stripe |
| Net Promoter Score (NPS) | > 50 | Surveys |
| Free → Paid Conversion | > 10% | Stripe |
| Average Revenue Per User (ARPU) | > $50/month | Stripe |

---

## 9. Constraints & Assumptions

### 9.1 Technical Constraints

| Constraint | Impact | Mitigation |
|---|---|---|
| SQLite single-writer limitation | Limits concurrent write throughput | Migrate to PostgreSQL for production |
| z-ai-web-dev-sdk rate limits | Agent response delays during peak usage | Queue-based execution, caching |
| Browser automation is sandboxed | Cannot access authenticated user sessions | OAuth-based integrations instead |
| LLM context window limits | Memory injection limited to ~10 entries | Relevance ranking, compression |
| No native vector search in SQLite | Memory search is LIKE-based | Embedding-based search with pgvector (future) |
| File storage is local | Cannot scale horizontally for exports | S3-compatible object storage (future) |
| No real-time WebSocket in current deployment | Dashboard requires refresh | Server-sent events or WebSocket (future) |

### 9.2 Product Constraints

| Constraint | Impact | Mitigation |
|---|---|---|
| English-only UI in v1 | Limits ASEAN adoption | i18n planned for v2 |
| No mobile app | Mobile experience is responsive web only | PWA support in v2 |
| Single currency per organization | Cannot mix currencies in one forecast | Multi-currency planned for v3 |
| No multi-tenant isolation at DB level | Shared SQLite for all orgs | PostgreSQL schemas (production) |
| Manual accounting sync trigger | QuickBooks/Xero sync not truly real-time | Webhook-based sync (future) |

### 9.3 Assumptions

| Assumption | Risk if Wrong |
|---|---|
| ASEAN founders are comfortable with English UI | Lower adoption in non-English markets |
| z-ai-web-dev-sdk will remain available and stable | Core AI functionality disrupted |
| QuickBooks and Xero APIs remain accessible | Plan vs actuals feature compromised |
| Users will trust AI-generated financial advice | Low engagement, liability concerns |
| SQLite is sufficient for MVP scale (1K orgs) | Performance degradation requiring early migration |
| $0.01 per 1K tokens cost estimate is accurate | Token costs could exceed pricing |
| Users will understand the DAG pipeline concept | Feature underutilization |
| 50+ research sources will cover key ASEAN markets | Coverage gaps requiring additional sources |

### 9.4 Regulatory Compliance

| Regulation | Status | Notes |
|---|---|---|
| PDPA (Malaysia) | Planned | Personal data protection |
| PDPA (Singapore) | Planned | Personal data protection |
| UU PDP (Indonesia) | Planned | Personal data protection |
| GDPR (EU users) | Planned | Required for EU data subjects |
| PCI DSS | Not applicable | No direct payment processing |
| SOC 2 | Planned | Required for Enterprise tier |

---

## 10. Future Scope

### 10.1 Near-Term (v4.1 — Q2 2026)

| Feature | Description | Priority |
|---|---|---|
| PostgreSQL Migration | Move from SQLite to PostgreSQL with pgvector for vector search | P0 |
| Real-Time Updates | WebSocket/SSE for live dashboard and agent status | P0 |
| i18n Support | Malay, Bahasa Indonesia, Thai, Vietnamese UI | P1 |
| Mobile PWA | Progressive web app with offline support | P1 |
| Email Notifications | Send financial alerts and report summaries via email | P1 |
| Advanced Memory | Embedding-based vector search replacing LIKE queries | P1 |
| Collaborative Editing | Real-time multi-user plan editing (Google Docs-style) | P2 |

### 10.2 Mid-Term (v5.0 — Q4 2026)

| Feature | Description | Priority |
|---|---|---|
| Custom Agent Builder | Allow users to create custom agent personas with custom tools | P1 |
| Marketplace | Share and sell agent pipelines, templates, and workflows | P2 |
| Multi-Currency Forecasting | Mix currencies within a single forecast with exchange rates | P1 |
| Advanced Scenario Engine | Monte Carlo simulation for probabilistic forecasts | P1 |
| Competitor Tracking | Automated competitor monitoring with alerts on changes | P1 |
| CRM Integration | Bi-directional sync with HubSpot and Salesforce | P2 |
| Board Portal | Secure board meeting management with agenda, minutes, and resolutions | P2 |
| API Marketplace | Public API for third-party integrations | P2 |

### 10.3 Long-Term (v6.0 — 2027)

| Feature | Description | Priority |
|---|---|---|
| Autonomous Business Operations | AI agents that can execute business operations (hiring, procurement) | P2 |
| Predictive Analytics | ML models for churn prediction, revenue forecasting, cash flow optimization | P1 |
| Regulatory Compliance Engine | Automated compliance checking for ASEAN regulations | P2 |
| Financial Consolidation | Multi-entity financial consolidation for group companies | P2 |
| Audit Automation | Automated audit trail generation and compliance reporting | P2 |
| AI Negotiation Agent | Agent that negotiates with vendors, landlords, and service providers | P3 |
| Voice Interface | Voice-activated agent interaction via mobile | P3 |
| Blockchain Verification | Immutable audit trail and document verification | P3 |

### 10.4 Technical Debt & Infrastructure

| Item | Description | Priority |
|---|---|---|
| Migrate to PostgreSQL | Required for production scale and pgvector | P0 |
| Add Redis caching | For session management and frequently accessed data | P1 |
| Implement CI/CD pipeline | Automated testing, building, and deployment | P0 |
| Add E2E testing | Playwright-based end-to-end test suite | P1 |
| Implement log aggregation | Centralized logging with structured output | P1 |
| Add monitoring alerts | PagerDuty/Opsgenie integration for critical errors | P1 |
| Security audit | Third-party penetration testing | P1 |
| Load testing | k6 or Artillery-based performance testing | P2 |
| CDN setup | CloudFront or similar for static assets | P2 |
| Object storage migration | Move from local file storage to S3 | P1 |

---

## Appendix A: Subscription Tiers

| Feature | Free | Starter ($29/mo) | Pro ($79/mo) | Enterprise ($199/mo) |
|---|---|---|---|---|
| Organizations | 1 | 1 | 3 | Unlimited |
| Team Members | 1 | 3 | 10 | Unlimited |
| Business Plans | 1 | 5 | 25 | Unlimited |
| Idea Validations | 3/mo | 20/mo | 100/mo | Unlimited |
| Forecasts | 1 | 5 | 25 | Unlimited |
| Pitch Decks | 1 | 5 | 25 | Unlimited |
| Agent Tasks | 50/mo | 500/mo | 5,000/mo | Unlimited |
| Pipeline Runs | 10/mo | 100/mo | 1,000/mo | Unlimited |
| Plan Reviews | 1/mo | 10/mo | 50/mo | Unlimited |
| QuickBooks/Xero | — | 1 connection | 3 connections | Unlimited |
| Exports | 5/mo | 50/mo | 500/mo | Unlimited |
| Research Sources | 10 | 30 | 50+ | 50+ Custom |
| Token Allowance | 10K/mo | 100K/mo | 500K/mo | Custom |
| Support | Community | Email | Priority | Dedicated |
| SSO | — | — | — | SAML/OIDC |
| Audit Log Retention | 30 days | 90 days | 1 year | Unlimited |
| Custom Agent Builder | — | — | — | Included |

## Appendix B: API Route Map

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | User authentication |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/session` | Session validation |
| GET | `/api/plans` | List business plans |
| POST | `/api/plans` | Create business plan |
| GET | `/api/plans/[id]` | Get plan with sections |
| PATCH | `/api/plans/[id]` | Update plan |
| DELETE | `/api/plans/[id]` | Delete plan |
| GET | `/api/forecasts` | List forecasts |
| POST | `/api/forecasts` | Create forecast |
| GET | `/api/kpis` | List KPIs |
| POST | `/api/kpis` | Create/update KPI |
| GET | `/api/actuals` | List actual financials |
| POST | `/api/actuals` | Import actuals |
| GET | `/api/actuals/[id]` | Get actual financial |
| PATCH | `/api/actuals/[id]` | Update actual |
| GET | `/api/agents` | List agent sessions |
| POST | `/api/agents` | Execute agent task |
| GET | `/api/chat` | List chat sessions |
| POST | `/api/chat` | Send chat message |
| GET | `/api/chat/[id]` | Get chat session |
| POST | `/api/research` | Run research |
| GET | `/api/research/[id]` | Get research result |
| GET | `/api/reports` | List reports |
| POST | `/api/reports` | Generate report |
| GET | `/api/exports` | List exports |
| POST | `/api/exports` | Create export |
| GET | `/api/exports/[id]` | Get export status |
| GET | `/api/pipelines` | List agent pipelines |
| POST | `/api/pipelines` | Create pipeline |
| GET | `/api/pipelines/[id]` | Get pipeline |
| POST | `/api/pipelines/[id]` | Execute pipeline |
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/[id]` | Get workflow |
| POST | `/api/workflows/[id]` | Execute workflow |
| GET | `/api/plan-reviews` | List plan reviews |
| POST | `/api/plan-reviews` | Create plan review |
| GET | `/api/plan-reviews/[id]` | Get review with findings |
| GET | `/api/pitch-decks` | List pitch decks |
| POST | `/api/pitch-decks` | Create pitch deck |
| GET | `/api/pitch-decks/[id]` | Get deck with slides |
| POST | `/api/idea-canvases` | Create idea canvas |
| GET | `/api/idea-canvases` | List idea canvases |
| GET | `/api/idea-canvases/[id]` | Get canvas with validations |
| PATCH | `/api/idea-canvases/[id]` | Update canvas |
| GET | `/api/browser` | List browser sessions |
| POST | `/api/browser` | Create browser session |
| POST | `/api/tools/execute` | Execute a registered tool |
| GET | `/api/tools/approvals` | List pending tool approvals |
| GET | `/api/memories` | List/search memories |
| GET | `/api/observability` | Get observability dashboard |
| GET | `/api/notifications` | List notifications |
| POST | `/api/notifications` | Create notification |
| GET | `/api/settings` | Get organization settings |
| PATCH | `/api/settings` | Update settings |
| GET | `/api/finance` | Get financial summary |

## Appendix C: Agent Tool Permission Matrix

| Tool | CFO | CEO | Research | Growth | Operations | Fundraising | Browser | Reporting |
|---|---|---|---|---|---|---|---|---|
| `forecast_calculate` | ✅ | — | — | — | — | ✅ | — | ✅ |
| `kpi_update` | ✅ | — | — | — | ✅ | — | — | ✅ |
| `analytics_query` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| `export_generate` | ✅ | — | — | — | — | ✅ | — | ✅ |
| `web_search` | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | — |
| `crm_lookup` | — | ✅ | — | ✅ | — | — | — | — |
| `notification_send` | — | — | — | ✅ | ✅ | — | — | — |
| `browser_navigate` | — | — | ✅ | — | — | — | ✅ | — |
| `email_send` | — | — | — | — | — | — | — | — |
| `code_execute` | — | — | — | — | — | — | — | — |

> **Note:** `email_send` and `code_execute` require explicit approval and are not assigned to any agent by default.

## Appendix D: Memory Category → Agent Type Mapping

| Agent Type | Primary Memory Category | Secondary |
|---|---|---|
| CFO | `financial_summary` | `forecast_insight` |
| CEO | `agent_knowledge` | `workspace_context` |
| Research | `market_intelligence` | `agent_knowledge` |
| Growth | `workflow_pattern` | `market_intelligence` |
| Operations | `workflow_pattern` | `user_preference` |
| Fundraising | `financial_summary` | `agent_knowledge` |
| Browser | `agent_knowledge` | `workspace_context` |
| Reporting | `agent_knowledge` | `forecast_insight` |

## Appendix E: Export Format Capabilities

| Format | Plans | Reports | Forecasts | KPIs | Pitch Decks |
|---|---|---|---|---|---|
| **PDF** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DOCX** | ✅ | ✅ | ✅ | — | — |
| **PPTX** | — | — | — | — | ✅ |
| **XLSX** | — | ✅ | ✅ | ✅ | — |
| **CSV** | — | ✅ | ✅ | ✅ | — |
| **Markdown** | ✅ | ✅ | — | — | — |

---

*End of Document — GangNiaga AI OS PRD v4.0*
