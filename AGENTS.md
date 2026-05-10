# GangNiaga AI OS — Agent System Documentation

> **Version:** 4.0  
> **Last Updated:** 2025-03-04  
> **Status:** Production  
> **Source:** `src/lib/agents/`, `src/lib/tools/`, `src/lib/memory/`

---

## Table of Contents

1. [Agent System Overview](#1-agent-system-overview)
2. [Agent Types](#2-agent-types)
3. [Tool Registry](#3-tool-registry)
4. [Tool Execution Flow](#4-tool-execution-flow)
5. [Approval System](#5-approval-system)
6. [Pipeline Engine](#6-pipeline-engine)
7. [Memory Architecture](#7-memory-architecture)
8. [Agent RBAC](#8-agent-rbac)
9. [Observability Integration](#9-observability-integration)
10. [Best Practices](#10-best-practices)
11. [Adding New Agents](#11-adding-new-agents)
12. [Adding New Tools](#12-adding-new-tools)

---

## 1. Agent System Overview

The GangNiaga AI OS Agent System is a **multi-agent orchestration framework** that powers the autonomous business operating system. It comprises 8 specialized agent types, 10 registered tools, a DAG-based pipeline engine, and a 7-category memory architecture — all coordinated through a central orchestrator.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     GangNiaga Agent System v4.0                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     USER / API LAYER                             │  │
│  │  POST /api/agents  ·  POST /api/chat  ·  POST /api/pipelines    │  │
│  └───────────────────────────┬───────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   AGENT ORCHESTRATOR                              │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  executeAgentTask()                                        │ │  │
│  │  │  1. Validate agent type                                    │ │  │
│  │  │  2. Get/create session                                     │ │  │
│  │  │  3. Inject memories into system prompt                     │ │  │
│  │  │  4. Call LLM (z-ai-web-dev-sdk)                           │ │  │
│  │  │  5. Parse tool calls from response                         │ │  │
│  │  │  6. Execute tools (permission-checked)                     │ │  │
│  │  │  7. Persist results + memories                             │ │  │
│  │  │  8. Audit log                                              │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────┬───────────────────────────────────────┘  │
│                              │                                          │
│              ┌───────────────┼───────────────┐                          │
│              ▼               ▼               ▼                          │
│  ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐            │
│  │  8 Agent Types  │ │ 10 Tools     │ │ Pipeline Engine  │            │
│  │  CFO · CEO      │ │ Registry     │ │ (DAG + Kahn's)   │            │
│  │  Research       │ │              │ │                  │            │
│  │  Growth · Ops   │ │ executeTool()│ │ createPipeline() │            │
│  │  Fundraising    │ │ validate()   │ │ executePipeline()│            │
│  │  Browser        │ │ rateLimit()  │ │ resolveDAG()     │            │
│  │  Reporting      │ │ approve()    │ │ resolveTemplate()│            │
│  └────────┬────────┘ └──────┬───────┘ └────────┬─────────┘            │
│           │                 │                   │                       │
│           └────────────┬────┘───────────────────┘                       │
│                        ▼                                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    SUPPORTING SYSTEMS                             │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │  │
│  │  │   Memory     │ │  Observability│ │  RBAC / AgentPermission │ │  │
│  │  │  (7 categories│ │  (traces,    │ │  (role-based + resource │ │  │
│  │  │   LLM compress│ │   tokens,    │ │   matrix + per-agent)   │ │  │
│  │  │   relevance)  │ │   events)    │ │                         │ │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    DATABASE LAYER (Prisma + SQLite)               │  │
│  │  AgentSession · AgentTask · ToolExecution · AgentMemory          │  │
│  │  AgentPipeline · AgentPipelineStep · AgentPipelineRun            │  │
│  │  PipelineStepRun · MemoryEntry · AgentPermission                 │  │
│  │  AuditLog · TokenUsage · ObservabilityEvent                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Agent Specialization** | Each agent has a narrow domain with tailored system prompts and restricted tool access |
| **Tool Isolation** | Agents can only invoke tools from their `allowedTools` list; unauthorized calls are rejected |
| **Memory-Driven Context** | Agents receive relevant memories injected into their system prompts for continuity |
| **Pipeline Orchestration** | Multi-step workflows are modeled as DAGs with parallel level execution |
| **Full Audit Trail** | Every agent task, tool execution, and pipeline run creates audit log entries |
| **Human-in-the-Loop** | Sensitive tools require approval before execution |

### Data Flow Summary

```
User Request
    │
    ▼
┌──────────────────────────────────────┐
│  Orchestrator: executeAgentTask()    │
│                                      │
│  Create/find session                 │
│  Inject memories ────── MemoryEngine │
│  Call LLM ────────── z-ai-web-dev-sdk│
│  Parse tool calls                    │
│  Execute tools ─────── ToolExecutor  │
│  Persist results ───── Prisma DB     │
│  Store memories ────── MemoryEngine  │
│  Audit log ─────────── AuditLog      │
└──────────────────────────────────────┘
    │
    ▼
Response: { sessionId, taskId, result, memories, toolExecutions }
```

---

## 2. Agent Types

The system defines 8 specialized agent types, each with unique capabilities, tool access, and concurrency limits. All definitions live in `src/lib/agents/orchestrator.ts` within the `AGENT_DEFINITIONS` constant.

### 2.1 Agent Type Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        8 Agent Types                                    │
├──────────────┬──────────────────────────────┬───────────────┬───────────┤
│ Agent        │ Domain                       │ Tools         │ Max Conc. │
├──────────────┼──────────────────────────────┼───────────────┼───────────┤
│ CFO          │ Financial strategy           │ 4 tools       │ 3         │
│ CEO          │ Executive vision             │ 3 tools       │ 2         │
│ Research     │ Market intelligence          │ 3 tools       │ 5         │
│ Growth       │ Customer acquisition         │ 4 tools       │ 3         │
│ Operations   │ Process optimization         │ 3 tools       │ 3         │
│ Fundraising  │ Investor preparation         │ 4 tools       │ 2         │
│ Browser      │ Web automation               │ 2 tools       │ 2         │
│ Reporting    │ Report generation            │ 4 tools       │ 3         │
└──────────────┴──────────────────────────────┴───────────────┴───────────┘
```

### 2.2 CFO Agent

| Property | Value |
|----------|-------|
| **Key** | `cfo` |
| **Name** | CFO Agent |
| **Description** | Financial strategy, cash flow management, runway analysis |
| **Max Concurrent Tasks** | 3 |

**Capabilities:**
- `financial_analysis` — Analyze financial statements, P&L, balance sheet, cash flow
- `forecasting` — Generate and evaluate financial projections across scenarios
- `budget_optimization` — Identify cost savings and budget reallocation opportunities
- `funding_strategy` — Evaluate funding options, dilution impacts, and capital structure
- `cost_reduction` — Find operational inefficiencies and cost reduction levers

**Allowed Tools:**

| Tool | Usage in CFO Context |
|------|---------------------|
| `forecast_calculate` | Run scenario models (best/base/worst) with custom adjustments |
| `kpi_update` | Update financial KPIs after analysis (e.g., MRR, burn rate) |
| `analytics_query` | Retrieve current financial metrics for analysis |
| `export_generate` | Generate financial reports and export documents |

**System Prompt Focus:**
- ROI and cash flow impact analysis
- Financial sustainability assessment
- Concise but thorough markdown formatting
- Actionable recommendations with quantified outcomes

**Example Task:**
```typescript
const result = await executeAgentTask({
  agentType: 'cfo',
  task: 'Analyze our current burn rate and project runway under base and worst-case scenarios for the next 12 months',
  userId: 'user_123',
  organizationId: 'org_456',
})
```

### 2.3 CEO Agent

| Property | Value |
|----------|-------|
| **Key** | `ceo` |
| **Name** | CEO Agent |
| **Description** | Strategic vision, market positioning, growth strategy |
| **Max Concurrent Tasks** | 2 |

**Capabilities:**
- `strategic_planning` — Develop and refine strategic initiatives
- `market_analysis` — Assess market size, trends, and positioning
- `competitive_positioning` — Evaluate competitive landscape and differentiation
- `vision_setting` — Define long-term company vision and mission
- `decision_making` — Provide decision frameworks and trade-off analysis

**Allowed Tools:**

| Tool | Usage in CEO Context |
|------|---------------------|
| `web_search` | Research market trends, competitor moves, industry news |
| `analytics_query` | Pull business metrics for strategic assessment |
| `crm_lookup` | Access customer relationship data for strategic decisions |

**System Prompt Focus:**
- High-level strategic insights connecting financial data to business outcomes
- Prioritization frameworks and strategic trade-offs
- Actionable strategic recommendations

**Example Task:**
```typescript
const result = await executeAgentTask({
  agentType: 'ceo',
  task: 'Given our current growth metrics, should we prioritize geographic expansion or product diversification for the next 18 months?',
  userId: 'user_123',
  organizationId: 'org_456',
})
```

### 2.4 Research Agent

| Property | Value |
|----------|-------|
| **Key** | `research` |
| **Name** | Research Agent |
| **Description** | Market intelligence, competitor analysis, industry trends |
| **Max Concurrent Tasks** | 5 |

**Capabilities:**
- `market_research` — Conduct primary and secondary market research
- `competitor_analysis` — Profile competitors, pricing, market share
- `trend_identification` — Identify emerging trends and shifts
- `data_collection` — Gather and organize data from web sources
- `opportunity_discovery` — Surface market gaps and opportunities

**Allowed Tools:**

| Tool | Usage in Research Context |
|------|--------------------------|
| `web_search` | Search the web for market data, news, and reports |
| `browser_navigate` | Navigate specific URLs for data extraction |
| `analytics_query` | Cross-reference external data with internal metrics |

**System Prompt Focus:**
- Well-researched, factual insights with specific data points
- Market evidence and trend backing for all recommendations
- Identifies both opportunities and threats

**Example Task:**
```typescript
const result = await executeAgentTask({
  agentType: 'research',
  task: 'Research the competitive landscape for B2B SaaS companies in Southeast Asia focusing on HR tech',
  userId: 'user_123',
  organizationId: 'org_456',
})
```

### 2.5 Growth Agent

| Property | Value |
|----------|-------|
| **Key** | `growth` |
| **Name** | Growth Agent |
| **Description** | Customer acquisition, retention, and expansion strategies |
| **Max Concurrent Tasks** | 3 |

**Capabilities:**
- `growth_strategy` — Develop and refine growth strategies
- `channel_optimization` — Optimize acquisition channels and marketing spend
- `conversion_funnel` — Analyze and improve conversion at each funnel stage
- `retention_tactics` — Design retention programs and churn reduction
- `experimentation` — Plan and evaluate A/B tests and growth experiments

**Allowed Tools:**

| Tool | Usage in Growth Context |
|------|------------------------|
| `web_search` | Research growth tactics and industry benchmarks |
| `analytics_query` | Pull funnel metrics, conversion rates, retention data |
| `crm_lookup` | Access customer data for segmentation analysis |
| `notification_send` | Alert team about significant metric changes |

**System Prompt Focus:**
- Measurable growth metrics and scalable strategies
- Specific tactics with expected impact and implementation timelines
- Data-driven recommendations

### 2.6 Operations Agent

| Property | Value |
|----------|-------|
| **Key** | `operations` |
| **Name** | Operations Agent |
| **Description** | Process optimization, resource allocation, efficiency |
| **Max Concurrent Tasks** | 3 |

**Capabilities:**
- `process_optimization` — Streamline workflows and eliminate bottlenecks
- `resource_management` — Optimize resource allocation and utilization
- `efficiency_analysis` — Identify operational inefficiencies and waste
- `scaling_strategies` — Plan scaling strategies for growth
- `automation_identification` — Find automation opportunities

**Allowed Tools:**

| Tool | Usage in Operations Context |
|------|-----------------------------|
| `analytics_query` | Pull operational metrics and KPIs |
| `kpi_update` | Update operational metrics after changes |
| `notification_send` | Notify team about process changes or alerts |

**System Prompt Focus:**
- Step-by-step operational recommendations with clear action items
- Practical, implementable suggestions
- Focus on cost reduction and productivity improvement

### 2.7 Fundraising Agent

| Property | Value |
|----------|-------|
| **Key** | `fundraising` |
| **Name** | Fundraising Agent |
| **Description** | Investment strategy, pitch preparation, investor relations |
| **Max Concurrent Tasks** | 2 |

**Capabilities:**
- `pitch_preparation` — Create and refine investor pitch materials
- `valuation_analysis` — Calculate and justify company valuation
- `investor_targeting` — Identify and profile potential investors
- `term_sheet_review` — Analyze term sheets and cap table implications
- `due_diligence_prep` — Prepare due diligence documentation

**Allowed Tools:**

| Tool | Usage in Fundraising Context |
|------|------------------------------|
| `web_search` | Research comparable transactions and market valuations |
| `analytics_query` | Pull financial metrics for investor presentations |
| `export_generate` | Generate investor-ready documents and pitch decks |
| `forecast_calculate` | Project financial scenarios for investor discussions |

**System Prompt Focus:**
- Investor-ready deliverables and compelling data storytelling
- Dilution impact analysis and cap table considerations
- Professional formatting suitable for external stakeholders

### 2.8 Browser Agent

| Property | Value |
|----------|-------|
| **Key** | `browser` |
| **Name** | Browser Agent |
| **Description** | Web automation, data extraction, authenticated workflows |
| **Max Concurrent Tasks** | 2 |

**Capabilities:**
- `web_automation` — Automate web-based tasks and workflows
- `data_extraction` — Extract structured data from web pages
- `form_filling` — Fill out and submit web forms
- `navigation` — Navigate complex multi-page web workflows
- `screenshot_capture` — Capture and analyze page screenshots

**Allowed Tools:**

| Tool | Usage in Browser Context |
|------|--------------------------|
| `browser_navigate` | Navigate to URLs and perform page actions |
| `web_search` | Find URLs and resources before navigation |

**System Prompt Focus:**
- Clear instructions for web automation tasks
- Structured data extraction with CSS selectors
- Error handling for page load failures and dynamic content

### 2.9 Reporting Agent

| Property | Value |
|----------|-------|
| **Key** | `reporting` |
| **Name** | Reporting Agent |
| **Description** | Report generation, data synthesis, stakeholder communication |
| **Max Concurrent Tasks** | 3 |

**Capabilities:**
- `report_generation` — Create formatted business reports
- `data_synthesis` — Combine data from multiple sources into coherent narratives
- `stakeholder_communication` — Tailor content for different audiences
- `kpi_summarization` — Summarize KPI performance and trends
- `trend_analysis` — Identify and explain trends in business data

**Allowed Tools:**

| Tool | Usage in Reporting Context |
|------|----------------------------|
| `analytics_query` | Pull data for report content |
| `export_generate` | Generate export files (PDF, DOCX, PPTX, XLSX) |
| `kpi_update` | Update KPI values based on analysis |
| `forecast_calculate` | Include projections in reports |

**System Prompt Focus:**
- Professional, structured markdown with clear sections and tables
- Key takeaways and action items
- Decision-support focus with clarity over complexity

---

## 3. Tool Registry

The Tool Registry (`src/lib/tools/registry.ts`) defines all available tools with their schemas, permissions, rate limits, and configuration. It serves as the single source of truth for tool metadata.

### 3.1 Tool Definitions

10 tools are registered in the system:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Tool Registry (10 Tools)                            │
├────────────────────┬────────────┬─────────────────┬─────────────────────┤
│ Tool               │ Category   │ Approval Needed │ Rate Limit (/min)   │
├────────────────────┼────────────┼─────────────────┼─────────────────────┤
│ web_search         │ analytics  │ No              │ 10                  │
│ forecast_calculate │ finance    │ No              │ —                   │
│ browser_navigate   │ browser    │ No              │ 5                   │
│ email_send         │ comm.      │ YES             │ 10                  │
│ export_generate    │ export     │ No              │ —                   │
│ crm_lookup         │ crm        │ No              │ —                   │
│ analytics_query    │ analytics  │ No              │ —                   │
│ kpi_update         │ data       │ No              │ —                   │
│ notification_send  │ comm.      │ No              │ —                   │
│ code_execute       │ analytics  │ YES             │ —                   │
└────────────────────┴────────────┴─────────────────┴─────────────────────┘
```

### 3.2 Detailed Tool Schemas

#### `web_search`

```typescript
{
  name: 'web_search',
  description: 'Search the web for information using AI-powered search',
  category: 'analytics',
  requiredPermissions: ['search.execute'],
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      maxResults: { type: 'number', default: 5, description: 'Max results' },
    },
    required: ['query'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      results: { type: 'array', items: { title, url, snippet } },
      totalResults: { type: 'number' },
    },
  },
  rateLimited: true,
  maxExecutionsPerMinute: 10,
  timeout: 15000,
}
```

#### `forecast_calculate`

```typescript
{
  name: 'forecast_calculate',
  description: 'Calculate financial forecasts with scenario modeling',
  category: 'finance',
  requiredPermissions: ['forecast.execute'],
  inputSchema: {
    type: 'object',
    properties: {
      forecastId: { type: 'string', description: 'ID of the forecast' },
      scenario: { type: 'string', enum: ['best', 'base', 'worst', 'custom'] },
      months: { type: 'number', default: 12 },
      adjustments: { type: 'object', description: 'Custom scenario multipliers' },
    },
    required: ['forecastId', 'scenario'],
  },
  timeout: 60000, // Long-running financial calculations
}
```

#### `browser_navigate`

```typescript
{
  name: 'browser_navigate',
  description: 'Navigate to a URL and extract content using browser automation',
  category: 'browser',
  requiredPermissions: ['browser.execute'],
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL to navigate to' },
      action: { type: 'string', enum: ['screenshot', 'extract_text', 'extract_links', 'fill_form', 'click'] },
      selector: { type: 'string', description: 'CSS selector for targeted actions' },
      value: { type: 'string', description: 'Value for form filling' },
    },
    required: ['url'],
  },
  rateLimited: true,
  maxExecutionsPerMinute: 5,
  timeout: 30000,
  sandboxed: true,
}
```

#### `email_send`

```typescript
{
  name: 'email_send',
  description: 'Send an email notification',
  category: 'communication',
  requiredPermissions: ['email.execute'],
  inputSchema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient email' },
      subject: { type: 'string', description: 'Email subject' },
      body: { type: 'string', description: 'Email body' },
      cc: { type: 'string', description: 'CC recipient' },
    },
    required: ['to', 'subject', 'body'],
  },
  rateLimited: true,
  maxExecutionsPerMinute: 10,
  requiresApproval: true,  // ⚠️ Human approval required
}
```

#### `export_generate`

```typescript
{
  name: 'export_generate',
  description: 'Generate a document export (PDF, DOCX, PPTX, XLSX)',
  category: 'export',
  requiredPermissions: ['export.execute'],
  inputSchema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['plan', 'report', 'forecast', 'kpi'] },
      format: { type: 'string', enum: ['pdf', 'docx', 'pptx', 'xlsx', 'csv'] },
      contentId: { type: 'string', description: 'ID of content to export' },
      title: { type: 'string', description: 'Export title' },
    },
    required: ['type', 'format', 'contentId', 'title'],
  },
  timeout: 60000,
}
```

#### `crm_lookup`

```typescript
{
  name: 'crm_lookup',
  description: 'Look up customer data from CRM',
  category: 'crm',
  requiredPermissions: ['crm.read'],
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      entity: { type: 'string', enum: ['customer', 'deal', 'contact'] },
    },
    required: ['query'],
  },
}
```

#### `analytics_query`

```typescript
{
  name: 'analytics_query',
  description: 'Query analytics data for business metrics',
  category: 'analytics',
  requiredPermissions: ['analytics.read'],
  inputSchema: {
    type: 'object',
    properties: {
      metric: { type: 'string', description: 'Metric name (revenue, churn, mrr)' },
      period: { type: 'string', description: 'Time period' },
      dimensions: { type: 'array', items: { type: 'string' } },
    },
    required: ['metric'],
  },
}
```

#### `kpi_update`

```typescript
{
  name: 'kpi_update',
  description: 'Update a KPI value',
  category: 'data',
  requiredPermissions: ['kpi.write'],
  inputSchema: {
    type: 'object',
    properties: {
      kpiId: { type: 'string', description: 'KPI ID' },
      value: { type: 'number', description: 'New value' },
      period: { type: 'string', description: 'Period (2025-01, Q1-2025)' },
    },
    required: ['kpiId', 'value'],
  },
}
```

#### `notification_send`

```typescript
{
  name: 'notification_send',
  description: 'Send an in-app notification to users',
  category: 'communication',
  requiredPermissions: ['notification.execute'],
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'Target user ID' },
      title: { type: 'string', description: 'Notification title' },
      message: { type: 'string', description: 'Notification body' },
      type: { type: 'string', enum: ['info', 'warning', 'error', 'success'] },
    },
    required: ['userId', 'title', 'message'],
  },
}
```

#### `code_execute`

```typescript
{
  name: 'code_execute',
  description: 'Execute code in a sandboxed environment',
  category: 'analytics',
  requiredPermissions: ['code.execute'],
  inputSchema: {
    type: 'object',
    properties: {
      language: { type: 'string', enum: ['javascript', 'python', 'sql'] },
      code: { type: 'string', description: 'Source code to execute' },
      timeout: { type: 'number', default: 10000 },
    },
    required: ['language', 'code'],
  },
  sandboxed: true,
  requiresApproval: true,  // ⚠️ Human approval required
  timeout: 15000,
}
```

### 3.3 Agent-to-Tool Access Matrix

```
                    web   forecast  browser  email  export  crm   analytics  kpi   notif   code
                    srch  calc      nav      send   gen     look  query      upd   send    exec
                ─────────────────────────────────────────────────────────────────────────────
CFO             │  —      ✓        —        —      ✓       —      ✓         ✓     —       —
CEO             │  ✓      —        —        —      —       ✓      ✓         —     —       —
Research        │  ✓      —        ✓        —      —       —      ✓         —     —       —
Growth          │  ✓      —        —        —      —       ✓      ✓         —     ✓       —
Operations      │  —      —        —        —      —       —      ✓         ✓     ✓       —
Fundraising     │  ✓      ✓        —        —      ✓       —      ✓         —     —       —
Browser         │  ✓      —        ✓        —      —       —      —         —     —       —
Reporting       │  —      ✓        —        —      ✓       —      ✓         ✓     —       —
```

### 3.4 Input Validation

The `validateToolInput()` function enforces schema compliance for every tool invocation:

```typescript
// Validation checks:
// 1. All required fields are present
// 2. Field types match declared types
// 3. Enum values are valid (when applicable)

const result = validateToolInput('web_search', { query: 'SaaS metrics' })
// => { valid: true }

const result = validateToolInput('web_search', {})
// => { valid: false, errors: ['Missing required field: query'] }

const result = validateToolInput('forecast_calculate', {
  forecastId: 'fc_123',
  scenario: 'invalid'
})
// => { valid: false, errors: ['Field "scenario" must be one of: best, base, worst, custom'] }
```

---

## 4. Tool Execution Flow

The Tool Execution Engine (`src/lib/tools/executor.ts`) handles the complete lifecycle of tool invocations with 10 distinct steps.

### 4.1 Execution Lifecycle

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Tool Execution Lifecycle                         │
│                                                                      │
│  1. Validate tool name ──── getTool(name)                           │
│         │                                                            │
│         ▼                                                            │
│  2. Validate input ──────── validateToolInput(name, input)          │
│         │                                                            │
│         ▼                                                            │
│  3. Check permissions ───── checkPermissions(userId, required)      │
│         │                                                            │
│         ▼                                                            │
│  4. Check rate limits ───── checkRateLimit(tool, userId)            │
│         │                                                            │
│         ▼                                                            │
│  5. Handle approval flow ── requestApproval() if requiresApproval   │
│         │  (returns pending_approval if needed)                      │
│         ▼                                                            │
│  6. Create trace ──────────── startToolTrace(taskId, tool, input)   │
│         │                                                            │
│         ▼                                                            │
│  7. Execute with timeout ─ executeWithTimeout(handler, timeout)     │
│         │                                                            │
│         ▼                                                            │
│  8. Update trace ──────────── endToolTrace(traceId, output)         │
│         │                                                            │
│         ▼                                                            │
│  9. Create audit log ─────── createAuditLog(...)                     │
│         │                                                            │
│         ▼                                                            │
│  10. Return result ────────── { success, output, duration, tokens } │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Execution Code Example

```typescript
import { executeTool } from '@/lib/tools/executor'

const result = await executeTool({
  toolName: 'forecast_calculate',
  agentTaskId: 'task_abc123',
  input: {
    forecastId: 'fc_456',
    scenario: 'worst',
    months: 12,
  },
  userId: 'user_789',
  organizationId: 'org_012',
})

// Success case
if (result.success) {
  console.log(result.output)
  // {
  //   forecastId: 'fc_456',
  //   scenario: 'worst',
  //   projections: [...12 monthly projections],
  //   summary: {
  //     totalRevenue: 450000,
  //     totalExpenses: 540000,
  //     totalNetIncome: -90000,
  //     finalCashBalance: 210000,
  //     avgMonthlyBurnRate: 45000,
  //     runwayMonths: 4,
  //     revenueStreams: 3,
  //     expenseItems: 8,
  //   },
  //   multiplier: { revenue: 0.7, expense: 1.2 },
  //   success: true,
  // }
  console.log(`Duration: ${result.duration}ms`)
}

// Failure case
if (!result.success) {
  console.error(result.error) // "Permission denied. Missing: forecast.execute"
}
```

### 4.3 Tool Call Parsing

When the LLM generates a response, the orchestrator parses it for tool calls using 3 supported patterns:

```typescript
// Pattern 1: Fenced code block
```tool:forecast_calculate
{"forecastId": "fc_123", "scenario": "base"}
```

// Pattern 2: Bracket notation
[TOOL_CALL: analytics_query({"metric": "revenue", "period": "this_month"})]

// Pattern 3: XML tag
<tool_call name="kpi_update">{"kpiId": "kpi_abc", "value": 125000}</tool_call)>
```

The `parseToolCalls()` function applies all three regex patterns and returns an array of `ParsedToolCall` objects:

```typescript
interface ParsedToolCall {
  tool: string
  params: Record<string, any>
}

// Example output:
[
  { tool: 'forecast_calculate', params: { forecastId: 'fc_123', scenario: 'base' } },
  { tool: 'analytics_query', params: { metric: 'revenue', period: 'this_month' } },
  { tool: 'kpi_update', params: { kpiId: 'kpi_abc', value: 125000 } },
]
```

### 4.4 Parameter Enrichment

Before execution, tool parameters are automatically enriched with contextual identifiers:

```typescript
const enrichedParams = {
  ...toolParams,
  organizationId: toolParams.organizationId || organizationId,
  userId: toolParams.userId || userId,
}
```

This ensures every tool execution has the correct organizational and user context, even if the LLM omits these from its tool call.

### 4.5 Timeout Handling

Each tool has a configurable timeout (default: 30 seconds). The `executeWithTimeout` wrapper enforces this:

```typescript
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
      .then((result) => { clearTimeout(timer); resolve(result) })
      .catch((err) => { clearTimeout(timer); reject(err) })
  })
}
```

| Tool | Timeout |
|------|---------|
| `web_search` | 15s |
| `forecast_calculate` | 60s |
| `browser_navigate` | 30s |
| `email_send` | 30s (default) |
| `export_generate` | 60s |
| `code_execute` | 15s |
| Others | 30s (default) |

---

## 5. Approval System

Certain tools require **explicit human approval** before execution. This provides a safety net for operations that have external side effects.

### 5.1 Approval Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Approval Flow                             │
│                                                              │
│  Tool Call (requiresApproval: true)                          │
│       │                                                      │
│       ▼                                                      │
│  requestApproval(toolName, input, userId, taskId)            │
│       │                                                      │
│       ▼                                                      │
│  Create ApprovalRecord (status: pending)                     │
│  Return: { approvalId, status: 'pending_approval' }         │
│       │                                                      │
│       │  ◄──── Human reviews via /api/tools/approvals        │
│       ▼                                                      │
│  ┌──────────────────┐                                        │
│  │  approveExecution │──► status: 'approved' ──► re-execute │
│  └──────────────────┘                                        │
│  ┌──────────────────┐                                        │
│  │  rejectExecution  │──► status: 'rejected' ──► abort      │
│  └──────────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Tools Requiring Approval

| Tool | Why Approval Is Required |
|------|--------------------------|
| `email_send` | Sends external communications that cannot be recalled |
| `code_execute` | Executes arbitrary code in a runtime environment |

### 5.3 Approval API

```typescript
// List pending approvals
GET /api/tools/approvals

// Approve an execution
POST /api/tools/approvals
{ approvalId: 'approval_123', action: 'approve' }

// Reject an execution
POST /api/tools/approvals
{ approvalId: 'approval_123', action: 'reject', reason: 'Not authorized for this recipient' }
```

### 5.4 Approval Data Model

```typescript
interface ApprovalRecord {
  id: string                    // Unique approval ID
  toolName: string              // Which tool requested approval
  input: Record<string, any>    // The proposed tool input
  userId: string                // User who initiated the agent task
  agentTaskId: string           // Parent agent task
  organizationId?: string       // Organization context
  status: 'pending' | 'approved' | 'rejected'
  reason?: string               // Rejection reason
  createdAt: Date               // When approval was requested
}
```

---

## 6. Pipeline Engine

The Pipeline Engine (`src/lib/agents/pipeline.ts`) enables multi-step agent workflows with dependency resolution, parallel execution, and input template resolution.

### 6.1 DAG-Based Execution Model

```
┌──────────────────────────────────────────────────────────────┐
│                  Pipeline DAG Example                         │
│                                                               │
│  Pipeline: "Quarterly Business Review"                        │
│                                                               │
│  ┌───────────┐                                               │
│  │ Step 1    │  Level 0 (no dependencies)                     │
│  │ CEO       │  Strategic assessment                          │
│  └─────┬─────┘                                               │
│        │                                                     │
│   ┌────┴────┐                                                │
│   ▼         ▼                                                │
│  ┌──────────┐ ┌──────────┐  Level 1 (depends on Step 1)      │
│  │ Step 2   │ │ Step 3   │                                   │
│  │ CFO      │ │ Research │  Financial + Market analysis       │
│  └────┬─────┘ └────┬─────┘  (executed in PARALLEL)           │
│       │            │                                         │
│       ▼            ▼                                         │
│  ┌──────────┐ ┌──────────┐  Level 2 (depends on Steps 2,3)   │
│  │ Step 4   │ │ Step 5   │                                   │
│  │ Reporting│ │ Growth   │  Synthesis + Growth plan           │
│  └────┬─────┘ └────┬─────┘  (executed in PARALLEL)           │
│       │            │                                         │
│       ▼            ▼                                         │
│  ┌──────────┐                                               │
│  │ Step 6   │  Level 3 (depends on Steps 4,5)                │
│  │ Fundraise│  Final investor prep                           │
│  └──────────┘                                               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Kahn's Algorithm Implementation

The DAG execution order is resolved using **Kahn's algorithm** for topological sorting:

```
1. Build adjacency list and in-degree map from step dependencies
2. Initialize queue with all nodes having in-degree = 0
3. While queue is not empty:
   a. Current level = all nodes in queue (can run in parallel)
   b. Add level to execution plan
   c. For each node in level, decrease in-degree of dependents
   d. Add newly 0-degree nodes to next queue
4. Handle any remaining nodes (cycles or disconnected)
```

```typescript
// Simplified Kahn's algorithm
function resolveExecutionOrder(steps): Step[][] {
  const activeSteps = steps.filter(s => s.isActive)
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  // Initialize
  for (const step of activeSteps) {
    inDegree.set(step.id, 0)
    adjacency.set(step.id, [])
  }

  // Build graph from dependsOn
  for (const step of activeSteps) {
    const deps = JSON.parse(step.dependsOn)
    for (const dep of deps) {
      adjacency.get(dep)?.push(step.id)
      inDegree.set(step.id, (inDegree.get(step.id) || 0) + 1)
    }
  }

  // Kahn's algorithm - level by level
  const levels = []
  let queue = [...inDegree.entries()]
    .filter(([_, degree]) => degree === 0)
    .map(([id]) => id)

  while (queue.length > 0) {
    const level = queue.map(id => stepMap.get(id))
    levels.push(level)
    
    const nextQueue = []
    for (const step of level) {
      for (const depId of adjacency.get(step.id)) {
        inDegree.set(depId, inDegree.get(depId) - 1)
        if (inDegree.get(depId) === 0) nextQueue.push(depId)
      }
    }
    queue = nextQueue
  }

  return levels
}
```

### 6.3 Parallel Level Execution

Steps within the same DAG level execute in parallel using `Promise.allSettled`:

```typescript
for (let levelIndex = 0; levelIndex < executionLevels.length; levelIndex++) {
  const level = executionLevels[levelIndex]

  // All steps in this level run concurrently
  const levelResults = await Promise.allSettled(
    level.map(async (step) => {
      const stepRun = await createStepRun(pipelineRun.id, step)

      try {
        const resolvedInput = resolveInputTemplate(step.inputTemplate, stepOutputs)
        const taskString = buildTaskString(step.name, step.description, resolvedInput)

        const agentResult = await executeAgentTask({
          agentType: step.agentType,
          task: taskString,
          userId,
          organizationId: pipeline.organizationId,
          context: resolvedInput,
        })

        // Store output for downstream steps
        stepOutputs[step.id] = {
          agentType: step.agentType,
          output: agentResult.result,
          taskId: agentResult.taskId,
        }

        return { stepId: step.id, status: 'completed', output: agentResult.result }
      } catch (error) {
        return { stepId: step.id, status: 'failed', error: String(error) }
      }
    })
  )
}
```

### 6.4 Input Template Resolution

Pipeline steps can reference outputs from previous steps using the `{{stepId.field}}` or `{{stepIndex.field}}` syntax:

```typescript
// Step input template
const inputTemplate = {
  analysisScope: "{{0.output}}",              // Output of step at index 0
  financialContext: "{{step_abc123.output}}",   // Output of specific step by ID
  metadata: "{{1.agentType}}",                  // Agent type of step at index 1
}

// resolveInputTemplate recursively replaces all {{...}} patterns
function resolveInputTemplate(template, previousOutputs) {
  const resolved = {}
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      resolved[key] = value.replace(/\{\{([^}]+)\}\}/g, (match, ref) => {
        const [stepRef, ...fieldParts] = ref.trim().split('.')
        const field = fieldParts.join('.')
        const stepOutput = previousOutputs[stepRef]
        
        if (field === 'output') return stepOutput?.output || ''
        if (field === 'agentType') return stepOutput?.agentType || ''
        return stepOutput?.[field] || match  // Leave unreplaced if not found
      })
    } else if (typeof value === 'object') {
      resolved[key] = resolveInputTemplate(value, previousOutputs) // Recursive
    } else {
      resolved[key] = value
    }
  }
  return resolved
}
```

### 6.5 Pipeline CRUD

```typescript
// Create a pipeline
const { pipelineId } = await createPipeline({
  name: 'Quarterly Business Review',
  description: 'Multi-agent quarterly analysis pipeline',
  organizationId: 'org_123',
  steps: [
    {
      agentType: 'ceo',
      name: 'Strategic Assessment',
      inputTemplate: { quarter: 'Q1-2025' },
      dependsOn: [],
    },
    {
      agentType: 'cfo',
      name: 'Financial Analysis',
      inputTemplate: {
        scope: '{{0.output}}',   // References CEO's output
        quarter: 'Q1-2025',
      },
      dependsOn: ['0'],          // Depends on step index 0
    },
    {
      agentType: 'research',
      name: 'Market Intelligence',
      inputTemplate: { scope: '{{0.output}}' },
      dependsOn: ['0'],
    },
    {
      agentType: 'reporting',
      name: 'Generate Report',
      inputTemplate: {
        financials: '{{1.output}}',
        market: '{{2.output}}',
      },
      dependsOn: ['1', '2'],     // Depends on CFO + Research
    },
  ],
  triggerType: 'manual',
})

// Execute the pipeline
const result = await executePipeline(pipelineId, 'user_456')
// => { runId, status: 'completed', results: [...] }

// Get pipeline status
const status = await getPipelineStatus(pipelineId)

// Update pipeline
await updatePipeline(pipelineId, { status: 'active' })

// Delete pipeline
await deletePipeline(pipelineId)
```

### 6.6 Pipeline Database Model

```
AgentPipeline (definition)
  ├── name, description, organizationId
  ├── status: draft → active → paused → archived
  ├── triggerType: manual | scheduled | event
  ├── schedule: cron expression
  │
  ├── AgentPipelineStep[] (step definitions)
  │     ├── agentType, name, description
  │     ├── inputTemplate (JSON with {{ref}} placeholders)
  │     ├── config (agent-specific config)
  │     ├── dependsOn (JSON array of step IDs/indices)
  │     ├── order, isActive
  │     └── pipelineId → AgentPipeline
  │
  └── AgentPipelineRun[] (execution instances)
        ├── status: pending → running → completed → failed → cancelled
        ├── triggeredBy, result (JSON summary)
        ├── startedAt, completedAt
        │
        └── PipelineStepRun[]
              ├── stepId, agentType
              ├── input (resolved), output (agent result)
              ├── status: pending → running → completed → failed → skipped
              ├── error, duration
              └── startedAt, completedAt
```

---

## 7. Memory Architecture

The Memory Architecture (`src/lib/memory/engine.ts`) provides persistent, context-aware memory for agents across sessions. It implements a 7-category classification system with relevance ranking, LLM-powered compression, and time-based decay.

### 7.1 Memory Categories

```
┌──────────────────────────────────────────────────────────────────────┐
│                     7 Memory Categories                               │
├────────────────────┬─────────────────────────────────────────────────┤
│ Category           │ Description                                     │
├────────────────────┼─────────────────────────────────────────────────┤
│ user_preference    │ User-specific settings and interaction patterns │
│ workspace_context  │ Organization-level norms, currency, industry    │
│ agent_knowledge    │ Facts and patterns learned by agents            │
│ forecast_insight   │ Financial forecast observations and analysis    │
│ workflow_pattern   │ Recurring workflow patterns and sequences       │
│ market_intelligence│ Market data, competitor info, industry trends   │
│ financial_summary  │ Compressed financial analysis and key metrics   │
└────────────────────┴─────────────────────────────────────────────────┘
```

### 7.2 Agent-to-Category Mapping

When agents store memories, they are automatically categorized:

| Agent Type | Memory Category |
|------------|----------------|
| `cfo` | `financial_summary` |
| `ceo` | `agent_knowledge` |
| `research` | `market_intelligence` |
| `growth` | `workflow_pattern` |
| `operations` | `workflow_pattern` |
| `fundraising` | `financial_summary` |
| `browser` | `agent_knowledge` |
| `reporting` | `agent_knowledge` |

### 7.3 Relevance Ranking Algorithm

Memories are ranked using a composite score that balances base relevance, access frequency, and recency:

```
rankedScore = relevanceScore × accessBoost × recencyBoost

where:
  accessBoost  = 1 + (accessCount × 0.1)
  recencyBoost = max(0.5, 1.0 - ageInDays × 0.01)   // decays over ~100 days

Example:
  A memory with:
    relevanceScore = 0.8
    accessCount    = 5
    ageInDays      = 30
  
  rankedScore = 0.8 × (1 + 5 × 0.1) × max(0.5, 1.0 - 30 × 0.01)
             = 0.8 × 1.5 × 0.7
             = 0.84
```

### 7.4 Memory Lifecycle

```
┌────────────────────────────────────────────────────────────────────┐
│                     Memory Lifecycle                                │
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │  Store    │───▶│ Retrieve │───▶│   Touch  │───▶│   Age    │   │
│  │ (upsert) │    │ (rank &  │    │ (+count, │    │ (decay   │   │
│  │          │    │  filter) │    │ +relev.) │    │  over    │   │
│  └──────────┘    └──────────┘    └──────────┘    │  time)   │   │
│       │                                           └──────────┘   │
│       │                                                │          │
│       │          ┌──────────┐    ┌──────────┐           │          │
│       │          │ Compress │    │  Cleanup │           │          │
│       │          │ (LLM     │    │ (expire  │◀──────────┘          │
│       │          │  summary)│    │  old)    │  low access           │
│       │          └──────────┘    └──────────┘  → compress           │
│       │                                              → delete      │
│       ▼                                                           │
│  MemoryEntry (DB)                                                 │
│  - organizationId, userId, agentType                              │
│  - category, key, value, summary                                  │
│  - relevanceScore, accessCount, source, tags                      │
│  - expiresAt, createdAt, updatedAt                                │
└────────────────────────────────────────────────────────────────────┘
```

### 7.5 Memory Operations

#### Store Memory (Upsert)

```typescript
const memoryId = await storeMemory({
  organizationId: 'org_123',
  userId: 'user_456',
  agentType: 'cfo',
  category: 'financial_summary',
  key: 'cfo_task_task_abc123',
  value: 'MRR $50K, burn rate $30K, runway 18 months...',
  summary: 'MRR $50K, burn $30K, 18mo runway',
  source: 'agent',
  tags: ['cfo', 'task_result', 'financial_analysis'],
  relevanceScore: 0.8,
})
```

If a memory with the same `key + organizationId + userId + agentType + category` already exists, it is updated (upsert behavior). The `relevanceScore` is set to `max(new, existing)`.

#### Retrieve Memories

```typescript
const memories = await retrieveMemories({
  organizationId: 'org_123',
  userId: 'user_456',
  agentType: 'cfo',
  category: 'financial_summary',    // optional filter
  query: 'burn rate runway',         // text search
  tags: ['financial_analysis'],      // tag filter
  limit: 10,
  minRelevance: 0.3,
})
```

Retrieved memories are automatically "touched" — their `accessCount` is incremented and `relevanceScore` is slightly boosted (+0.01, capped at 1.0).

#### Compress Memories

```typescript
const compressedCount = await compressMemories('org_123')
// Compresses memories with accessCount ≤ 2 and value length > 500 chars
// Uses LLM to generate summaries, then replaces value with summary
```

#### Age Memory Relevance

```typescript
const agedCount = await ageMemoryRelevance('org_123', 0.001)
// Decays relevance of memories not updated in 7+ days
// Less-accessed memories decay faster
```

#### Cleanup Expired Memories

```typescript
const deletedCount = await cleanupExpiredMemories()
// Deletes all memories where expiresAt < now
```

### 7.6 Memory Injection into System Prompt

When an agent task is executed, relevant memories are injected into the system prompt:

```typescript
async function buildSystemPromptWithMemory(agentType, userId, organizationId) {
  let prompt = AGENT_DEFINITIONS[agentType].systemPrompt

  // Retrieve top 10 relevant memories (minRelevance: 0.3)
  const memories = await retrieveMemories({
    organizationId, userId, agentType,
    limit: 10, minRelevance: 0.3,
  })

  if (memories.length > 0) {
    const memoryContext = memories
      .map((m, i) => `${i + 1}. [${m.category}] ${m.summary || m.value?.slice(0, 200)}`)
      .join('\n')

    prompt += `\n\n## Relevant Context from Memory\n\n${memoryContext}\n\n`
    prompt += 'Use this context when relevant, but do not explicitly reference "memory" — use the information naturally.'
  }

  // Append available tools documentation
  prompt += `\n\n## Available Tools\n\n\`\`\`tool:tool_name\n{"param": "value"}\n\`\`\`\n\n`
  prompt += `Available tools:\n${definition.allowedTools.map(t => `- ${t}`).join('\n')}`

  return prompt
}
```

---

## 8. Agent RBAC

The Agent RBAC system implements **dual-layer access control**: agent-level tool restrictions and organization-level resource permissions.

### 8.1 Two-Layer Permission Model

```
┌──────────────────────────────────────────────────────────────────┐
│                  Agent Permission Model                           │
│                                                                   │
│  Layer 1: Agent Tool Restrictions                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  AGENT_DEFINITIONS[agentType].allowedTools                  │ │
│  │  Controls which tools an agent CAN request                  │ │
│  │  Enforced in orchestrator before tool execution             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              +                                    │
│  Layer 2: User Permission Check                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ToolDefinition.requiredPermissions + User's org role       │ │
│  │  Controls which tools the USER is authorized to run         │ │
│  │  Enforced in executor via checkPermissions()                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              =                                    │
│  Effective Permission: agentAllowedTools ∩ userPermissions       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Agent Permission Table

Fine-grained agent permissions are stored in the `AgentPermission` database model:

```typescript
model AgentPermission {
  id          String   @id @default(cuid())
  agentType   String   // cfo, ceo, research, etc.
  resource    String   // kpis, forecasts, plans, reports, workflows, etc.
  action      String   // read, write, execute, admin
  isAllowed   Boolean  @default(false)
  constraints String   @default("{}")  // JSON constraints
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([agentType, resource, action])
}
```

```typescript
// Check agent permission
const allowed = await checkAgentPermission('cfo', 'forecasts', 'execute')
// => true (if AgentPermission record exists with isAllowed: true)
```

### 8.3 Tool Permission Mapping

Each tool requires specific permission strings:

| Tool | Required Permission |
|------|-------------------|
| `web_search` | `search.execute` |
| `forecast_calculate` | `forecast.execute` |
| `browser_navigate` | `browser.execute` |
| `email_send` | `email.execute` |
| `export_generate` | `export.execute` |
| `crm_lookup` | `crm.read` |
| `analytics_query` | `analytics.read` |
| `kpi_update` | `kpi.write` |
| `notification_send` | `notification.execute` |
| `code_execute` | `code.execute` |

### 8.4 Role-to-Permission Mapping

Organization roles map to tool permissions:

| Role | Granted Permissions |
|------|-------------------|
| **owner** | All 10 permissions (wildcard) |
| **admin** | All 10 permissions |
| **manager** | `search.execute`, `forecast.execute`, `analytics.read`, `kpi.write`, `notification.execute` |
| **accountant** | `forecast.execute`, `analytics.read`, `kpi.write` |
| **viewer** | `analytics.read` only |

### 8.5 Permission Check Flow

```typescript
// In ToolExecutor — combined check
async function executeTool(request: ToolExecutionRequest) {
  const toolDef = getTool(request.toolName)

  // Check 1: Does the user's role grant the required permissions?
  const permCheck = await checkPermissions(
    request.userId,
    toolDef.requiredPermissions,
    request.organizationId,
  )
  if (!permCheck.allowed) {
    return { success: false, error: `Permission denied. Missing: ${permCheck.missing.join(', ')}` }
  }

  // ... proceed with execution
}

// In Orchestrator — agent-level check
for (const call of parsedCalls) {
  if (!definition.allowedTools.includes(call.tool)) {
    // Log as failed: "Tool not allowed for this agent type"
    continue
  }
  // ... proceed with execution
}
```

---

## 9. Observability Integration

The Observability system (`src/lib/observability/tracker.ts`) provides execution monitoring, distributed tracing, and token usage tracking for the agent system.

### 9.1 Event Types

| Event Type | Source | Description |
|------------|--------|-------------|
| `agent_execution` | `agent` | Agent task started/completed/failed |
| `workflow_step` | `workflow` | Workflow step execution |
| `pipeline_step` | `pipeline` | Pipeline step execution |
| `browser_action` | `browser` | Browser automation action |
| `tool_execution` | `tool` | Tool execution event |
| `api_request` | `api` | API endpoint request |
| `export_job` | `export` | Export generation job |

### 9.2 Distributed Tracing

The `startTrace()` function creates distributed traces with nested spans:

```typescript
const trace = startTrace('quarterly-review-pipeline')

const researchSpan = trace.startSpan('research-market-data')
// ... execute research ...
await researchSpan.end({ result: 'success', dataPoints: 42 })

const cfoSpan = trace.startSpan('cfo-financial-analysis')
// ... execute CFO task ...
await cfoSpan.end({ result: 'success', scenarios: 3 })

await trace.end({ totalSteps: 2, pipelineStatus: 'completed' })
```

```
Trace: quarterly-review-pipeline
├── Span: research-market-data (duration: 4500ms, result: success)
└── Span: cfo-financial-analysis (duration: 8200ms, result: success)
Total duration: 12700ms
```

### 9.3 Token Usage Tracking

Every LLM call and tool execution that consumes tokens is tracked:

```typescript
await trackTokenUsage({
  organizationId: 'org_123',
  userId: 'user_456',
  agentType: 'cfo',
  model: 'default',
  promptTokens: 1250,
  completionTokens: 850,
  totalTokens: 2100,
  requestType: 'agent_task',  // chat | plan_generate | forecast_analyze | report_generate | agent_task | pipeline_step
})
```

### 9.4 Dashboard Data

```typescript
const dashboardData = await getDashboardData('org_123', '30d')
// => {
//   totalEvents: 1547,
//   eventsByType: { agent_execution: 450, tool_execution: 890, ... },
//   eventsByStatus: { info: 1400, warning: 95, error: 42, critical: 10 },
//   avgResponseTime: 2300,     // ms
//   totalTokenUsage: 1250000,
//   tokenUsageByAgent: { cfo: 420000, ceo: 280000, ... },
//   recentErrors: [...],       // last 20 errors
//   topSlowOperations: [...],  // top 10 slowest
//   eventTrend: [...],         // daily event counts
// }
```

### 9.5 Agent Task Observability

Every `executeAgentTask()` call generates these observability signals:

1. **AgentTask record** — `status: pending → running → completed/failed`
2. **ToolExecution records** — One per tool call, with `input`, `output`, `duration`, `status`
3. **AuditLog entry** — `action: 'agent.execute'`, includes `agentType`, `taskPreview`, `toolCalls`, `duration`
4. **TokenUsage record** — If the tool consumes LLM tokens (e.g., `web_search`, `browser_navigate`)
5. **MemoryEntry records** — Two writes: session-local `AgentMemory` and global `MemoryEntry`

---

## 10. Best Practices

### 10.1 Agent Task Design

**DO:**
- ✅ Provide specific, well-scoped tasks to agents
- ✅ Include relevant context in the task description
- ✅ Use the appropriate agent type for the task domain
- ✅ Let the agent decide which tools to invoke — don't prescribe tool calls
- ✅ Check the agent's `allowedTools` to ensure it can accomplish the task

**DON'T:**
- ❌ Send vague or overly broad tasks (e.g., "Analyze everything")
- ❌ Request a CFO agent to do market research (use Research agent instead)
- ❌ Assume tools are available — always check the access matrix
- ❌ Chain multiple unrelated tasks in a single request (use pipelines instead)

### 10.2 Pipeline Design

**DO:**
- ✅ Model dependencies explicitly with `dependsOn`
- ✅ Keep pipeline steps focused — one agent, one responsibility
- ✅ Use `{{stepId.output}}` to pass context between steps
- ✅ Design for parallelism — independent steps should run concurrently
- ✅ Set appropriate `maxConcurrentTasks` for each agent type

**DON'T:**
- ❌ Create circular dependencies (Kahn's algorithm handles this gracefully but execution is undefined)
- ❌ Pass entire outputs between steps — use summaries or key data points
- ❌ Make every step depend on the previous one if not required (kills parallelism)
- ❌ Forget to handle partial pipeline failures (use `Promise.allSettled` results)

### 10.3 Memory Management

**DO:**
- ✅ Let the system manage memory relevance automatically
- ✅ Run `compressMemories()` periodically for storage efficiency
- ✅ Run `cleanupExpiredMemories()` to remove stale data
- ✅ Run `ageMemoryRelevance()` to ensure recent data surfaces first
- ✅ Set `expiresAt` on temporary or time-sensitive memories

**DON'T:**
- ❌ Store raw LLM outputs — summarize key insights first
- ❌ Overwrite important memories without preserving the original
- ❌ Rely on memory for real-time data (always query fresh via tools)
- ❌ Set artificially high `relevanceScore` values (interferes with ranking)

### 10.4 Tool Usage

**DO:**
- ✅ Validate tool inputs against schemas before calling
- ✅ Handle `requiresApproval` flows in the UI (show pending approvals)
- ✅ Respect rate limits and implement backoff on `429` responses
- ✅ Log tool execution failures for debugging
- ✅ Use `organizationId` and `userId` enrichment for audit trails

**DON'T:**
- ❌ Call tools directly — always go through `executeTool()` for full lifecycle
- ❌ Bypass the approval system for `email_send` or `code_execute`
- ❌ Store sensitive data (passwords, API keys) in tool input/output records
- ❌ Assume tool execution is idempotent — some tools have side effects

### 10.5 Security

**DO:**
- ✅ Enforce both agent-level and user-level permission checks
- ✅ Audit log all agent actions and tool executions
- ✅ Use the `withApiHandler` wrapper for all agent-related API endpoints
- ✅ Set appropriate `maxConcurrentTasks` to prevent resource exhaustion
- ✅ Sanitize LLM outputs before displaying to users

**DON'T:**
- ❌ Trust LLM-generated tool calls without validation
- ❌ Allow agents to access tools outside their `allowedTools` list
- ❌ Skip RBAC checks for "internal" agent operations
- ❌ Log sensitive user data in audit trails

---

## 11. Adding New Agents

To add a new agent type to the system, follow these steps:

### Step 1: Define the Agent

Add the agent definition to `AGENT_DEFINITIONS` in `src/lib/agents/orchestrator.ts`:

```typescript
// In src/lib/agents/orchestrator.ts
export const AGENT_DEFINITIONS: Record<string, {...}> = {
  // ... existing agents ...

  compliance: {
    name: 'Compliance Agent',
    description: 'Regulatory compliance, audit trails, risk assessment',
    systemPrompt: `You are the Compliance Agent of GangNiaga AI OS. You specialize in regulatory compliance, audit preparation, risk assessment, and policy adherence. Help ensure the organization meets its regulatory obligations and follows best practices. Use markdown formatting. Focus on specific regulatory requirements and actionable compliance steps.`,
    capabilities: [
      'regulatory_analysis',
      'audit_preparation',
      'risk_assessment',
      'policy_review',
      'compliance_monitoring',
    ],
    allowedTools: [
      'web_search',
      'analytics_query',
      'export_generate',
    ],
    maxConcurrentTasks: 2,
  },
}
```

### Step 2: Add Memory Category Mapping

Update the `memoryCategories` map in `executeAgentTask()`:

```typescript
const memoryCategories: Record<string, string> = {
  // ... existing mappings ...
  compliance: 'agent_knowledge',  // or create a new category
}
```

### Step 3: Add Agent Permissions

Insert records into the `AgentPermission` table:

```sql
INSERT INTO agent_permissions (id, agentType, resource, action, isAllowed, constraints)
VALUES
  (cuid(), 'compliance', 'kpis', 'read', 1, '{}'),
  (cuid(), 'compliance', 'forecasts', 'read', 1, '{}'),
  (cuid(), 'compliance', 'reports', 'write', 1, '{}'),
  (cuid(), 'compliance', 'exports', 'execute', 1, '{}');
```

### Step 4: Update Valid Agent Types List

Add the new agent type to the validation list in `createPipeline()`:

```typescript
const validAgentTypes = [
  'cfo', 'ceo', 'research', 'growth', 'operations',
  'fundraising', 'browser', 'reporting',
  'compliance',  // Add new type
]
```

### Step 5: Update the Database Schema

Ensure the `AgentSession.agentType` field can accept the new value (it's a `String` type, so no migration needed for SQLite). If you need a new memory category, add it to the `MemoryCategory` type:

```typescript
export type MemoryCategory =
  | 'user_preference'
  | 'workspace_context'
  | 'agent_knowledge'
  | 'forecast_insight'
  | 'workflow_pattern'
  | 'market_intelligence'
  | 'financial_summary'
  | 'compliance_record'  // New category
```

### Step 6: Add Tool Handlers (if needed)

If the new agent needs a tool that doesn't exist yet, add it to both the registry and executor (see [Section 12](#12-adding-new-tools)).

### Step 7: Test

```typescript
// Test the new agent
const result = await executeAgentTask({
  agentType: 'compliance',
  task: 'Review our current financial reporting against SOX requirements',
  userId: 'user_123',
  organizationId: 'org_456',
})

console.log(result.result)       // Agent's analysis
console.log(result.toolExecutions) // Tool calls made
console.log(result.memories)      // Stored memories
```

---

## 12. Adding New Tools

To add a new tool to the system, follow these steps:

### Step 1: Define the Tool in the Registry

Add the tool definition to `TOOL_DEFINITIONS` in `src/lib/tools/registry.ts`:

```typescript
// In src/lib/tools/registry.ts
export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  // ... existing tools ...

  document_sign: {
    name: 'document_sign',
    description: 'Send a document for electronic signature',
    category: 'communication',
    requiredPermissions: ['document.execute'],
    inputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'ID of the document to sign' },
        signers: {
          type: 'array',
          items: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' } } },
          description: 'List of signers with name and email',
        },
        message: { type: 'string', description: 'Message to include with signing request' },
      },
      required: ['documentId', 'signers'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        signingRequestId: { type: 'string' },
        status: { type: 'string' },
        signerCount: { type: 'number' },
      },
    },
    rateLimited: true,
    maxExecutionsPerMinute: 5,
    timeout: 30000,
    requiresApproval: true,  // External side effects
  },
}
```

### Step 2: Implement the Tool Handler

Add the execution handler in `src/lib/tools/executor.ts`:

```typescript
// In src/lib/tools/executor.ts

async function executeDocumentSign(
  input: { documentId: string; signers: Array<{ name: string; email: string }>; message?: string },
  userId: string,
  organizationId?: string,
): Promise<{ output: any; tokenUsage?: TokenUsage }> {
  // Create signing request via external API (DocuSign, HelloSign, etc.)
  const signingId = `sign_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  await createAuditLog({
    userId,
    organizationId,
    action: 'document.sign',
    resource: 'documents',
    resourceId: input.documentId,
    status: 'success',
    details: JSON.stringify({
      signingId,
      signerCount: input.signers.length,
      signers: input.signers.map(s => s.email),
    }),
  })

  return {
    output: {
      signingRequestId: signingId,
      status: 'sent',
      signerCount: input.signers.length,
      documentId: input.documentId,
      note: 'Document signing request created. Configure signing provider in Settings > Integrations.',
    },
  }
}
```

### Step 3: Register the Handler

Add the handler to the `TOOL_HANDLERS` dispatch map:

```typescript
const TOOL_HANDLERS: Record<string, ToolHandler> = {
  // ... existing handlers ...
  document_sign: executeDocumentSign,
}
```

### Step 4: Add Orchestrator-Level Handler (for Agent Tasks)

Add a simplified handler to `TOOL_EXECUTORS` in `src/lib/agents/orchestrator.ts`:

```typescript
const TOOL_EXECUTORS: Record<string, (params: Record<string, any>) => Promise<string>> = {
  // ... existing executors ...

  document_sign: async (params) => {
    const { documentId, signers } = params
    return JSON.stringify({
      tool: 'document_sign',
      result: 'Document signing request created',
      documentId,
      signerCount: signers?.length || 0,
    })
  },
}
```

### Step 5: Update Agent Allowed Tools

Add the new tool to relevant agents' `allowedTools`:

```typescript
fundraising: {
  // ...
  allowedTools: [
    'web_search', 'analytics_query', 'export_generate',
    'forecast_calculate', 'document_sign',  // New tool
  ],
}
```

### Step 6: Update RBAC Permission Map

Add the new permission string to the role mapping:

```typescript
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    // ... existing permissions ...
    'document.execute',
  ],
  admin: [
    // ... existing permissions ...
    'document.execute',
  ],
  // Other roles may not get access
}
```

### Step 7: Test

```typescript
// Test via executor directly
const result = await executeTool({
  toolName: 'document_sign',
  agentTaskId: 'task_test',
  input: {
    documentId: 'doc_123',
    signers: [
      { name: 'John Doe', email: 'john@example.com' },
    ],
    message: 'Please sign the investment agreement',
  },
  userId: 'user_admin',
  organizationId: 'org_123',
})

// Test via agent task (includes approval flow)
const agentResult = await executeAgentTask({
  agentType: 'fundraising',
  task: 'Send the term sheet to the lead investor for signature',
  userId: 'user_456',
  organizationId: 'org_123',
})
```

### Step 8: Validate End-to-End

1. ✅ Tool appears in `getAllToolNames()`
2. ✅ `validateToolInput()` accepts valid inputs and rejects invalid ones
3. ✅ `getTool('document_sign')` returns the correct definition
4. ✅ Agent with `document_sign` in `allowedTools` can invoke it
5. ✅ Agent without it gets "Tool not allowed for this agent type"
6. ✅ Approval flow triggers if `requiresApproval: true`
7. ✅ Audit logs are created for both success and failure
8. ✅ Tool trace records appear in `ToolExecution` table
9. ✅ Token usage is tracked (if tool uses LLM)

---

## Appendix A: Quick Reference

### Agent Type Keys

| Key | Agent | File Reference |
|-----|-------|---------------|
| `cfo` | CFO Agent | `orchestrator.ts` → `AGENT_DEFINITIONS.cfo` |
| `ceo` | CEO Agent | `orchestrator.ts` → `AGENT_DEFINITIONS.ceo` |
| `research` | Research Agent | `orchestrator.ts` → `AGENT_DEFINITIONS.research` |
| `growth` | Growth Agent | `orchestrator.ts` → `AGENT_DEFINITIONS.growth` |
| `operations` | Operations Agent | `orchestrator.ts` → `AGENT_DEFINITIONS.operations` |
| `fundraising` | Fundraising Agent | `orchestrator.ts` → `AGENT_DEFINITIONS.fundraising` |
| `browser` | Browser Agent | `orchestrator.ts` → `AGENT_DEFINITIONS.browser` |
| `reporting` | Reporting Agent | `orchestrator.ts` → `AGENT_DEFINITIONS.reporting` |

### Source File Map

| File | Purpose |
|------|---------|
| `src/lib/agents/orchestrator.ts` | Agent definitions, task execution, tool call parsing, memory injection |
| `src/lib/agents/pipeline.ts` | Pipeline CRUD, DAG resolution, parallel execution, template resolution |
| `src/lib/agents/index.ts` | Public exports for agent and pipeline modules |
| `src/lib/tools/registry.ts` | Tool definitions, schemas, validation logic |
| `src/lib/tools/executor.ts` | Tool execution lifecycle, approval system, rate limiting, audit |
| `src/lib/tools/index.ts` | Public exports for tool registry and executor |
| `src/lib/memory/engine.ts` | Memory store, retrieve, compress, age, cleanup |
| `src/lib/memory/index.ts` | Public exports for memory engine |
| `src/lib/observability/tracker.ts` | Event tracking, distributed tracing, token usage |
| `src/lib/middleware/rbac.ts` | Agent RBAC, permission checks, role mapping |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agents` | POST | Execute an agent task |
| `/api/chat` | POST | Chat with copilot (uses agents internally) |
| `/api/chat/[id]` | GET | Get chat session history |
| `/api/pipelines` | POST | Create a new pipeline |
| `/api/pipelines/[id]` | GET | Get pipeline status |
| `/api/pipelines/[id]` | PATCH | Update pipeline |
| `/api/pipelines/[id]` | DELETE | Delete pipeline |
| `/api/tools/execute` | POST | Execute a tool directly |
| `/api/tools/approvals` | GET | List pending approvals |
| `/api/tools/approvals` | POST | Approve/reject a tool execution |
| `/api/memories` | GET | List memories for organization |

### Database Tables

| Table | Purpose |
|-------|---------|
| `agent_sessions` | Agent conversation sessions (per user per agent type) |
| `agent_tasks` | Individual agent task executions with input/output |
| `tool_executions` | Tool invocation records with trace data |
| `agent_memories` | Session-local agent memory |
| `agent_pipelines` | Pipeline definitions |
| `agent_pipeline_steps` | Pipeline step definitions with dependencies |
| `agent_pipeline_runs` | Pipeline execution instances |
| `pipeline_step_runs` | Individual step execution records |
| `memory_entries` | Global cross-session memory store |
| `agent_permissions` | Per-agent RBAC permission records |
| `audit_logs` | Audit trail for all agent and tool actions |
| `token_usage` | LLM token consumption tracking |
| `observability_events` | Execution monitoring and distributed traces |

---

*This document is maintained alongside the codebase. When modifying the agent system, update this document to reflect any changes to agent types, tool definitions, or execution flows.*
