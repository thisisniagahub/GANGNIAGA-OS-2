# GangNiaga AI OS — Database Schema Documentation

> **Version:** 4.0 — LivePlan x GangNiaga Enterprise Architecture
> **ORM:** Prisma (prisma-client-js)
> **Engine:** SQLite
> **Schema File:** `prisma/schema.prisma`
> **Last Updated:** 2025

---

## Table of Contents

1. [Database Configuration](#1-database-configuration)
2. [Entity Relationship Diagram (ASCII)](#2-entity-relationship-diagram-ascii)
3. [Core Domain Models](#3-core-domain-models)
4. [Auth & Security Models](#4-auth--security-models)
5. [Business Plan Builder Models](#5-business-plan-builder-models)
6. [Financial Forecasting Models](#6-financial-forecasting-models)
7. [KPI Intelligence Models](#7-kpi-intelligence-models)
8. [AI Agent System Models](#8-ai-agent-system-models)
9. [Agent Pipeline Models](#9-agent-pipeline-models)
10. [Memory Architecture Models](#10-memory-architecture-models)
11. [Chat System Models](#11-chat-system-models)
12. [Workflow Automation Models](#12-workflow-automation-models)
13. [Reports Models](#13-reports-models)
14. [Notifications Models](#14-notifications-models)
15. [Billing & Subscription Models](#15-billing--subscription-models)
16. [Exports Models](#16-exports-models)
17. [Browser Automation Models](#17-browser-automation-models)
18. [Integrations Models](#18-integrations-models)
19. [Scheduling Models](#19-scheduling-models)
20. [Automation Logs Models](#20-automation-logs-models)
21. [Skill Registry Models](#21-skill-registry-models)
22. [Agent RBAC Models](#22-agent-rbac-models)
23. [Observability Models](#23-observability-models)
24. [Idea Canvas Models](#24-idea-canvas-models)
25. [Research System Models](#25-research-system-models)
26. [Plan Review Models](#26-plan-review-models)
27. [Actuals & Variance Models](#27-actuals--variance-models)
28. [Pitch Deck Models](#28-pitch-deck-models)
29. [Migration Strategy](#29-migration-strategy)
30. [Index Strategy](#30-index-strategy)
31. [Data Retention Policy](#31-data-retention-policy)
32. [Model Summary Table](#32-model-summary-table)

---

## 1. Database Configuration

| Parameter | Value |
|---|---|
| **Provider** | SQLite |
| **URL** | `env("DATABASE_URL")` |
| **Client Generator** | `prisma-client-js` |
| **ID Strategy** | CUID (`@default(cuid())`) |
| **Timestamps** | `createdAt` (`@default(now())`), `updatedAt` (`@updatedAt`) |
| **JSON Fields** | Stored as `String` with `@default("{}")` or `@default("[]")` |
| **Cascade Deletes** | Enabled on most foreign keys |
| **Soft Deletes** | `isActive` boolean flag on select models |

### Connection String

```bash
# .env
DATABASE_URL="file:./db/custom.db"
```

### Design Principles

- **CUID primary keys** — collision-resistant, sortable, URL-safe identifiers
- **JSON-as-String** — SQLite does not support native JSON columns; all structured data is stored as stringified JSON with `@default("{}")` or `@default("[]")`
- **Cascade deletes** — parent deletion propagates to children (e.g., deleting a BusinessPlan cascades to PlanSections)
- **SetNull deletes** — selective use (e.g., AuditLog.userId → SetNull) to preserve audit trails when users are deleted
- **Status enums as strings** — avoids SQLite enum limitations while maintaining type documentation in comments

---

## 2. Entity Relationship Diagram (ASCII)

```
                              ┌─────────────┐
                              │    User      │
                              │  (users)     │
                              └──────┬───────┘
                                     │
           ┌──────────┬──────────┬───┼───┬──────────┬──────────┬──────────┐
           │          │          │   │   │          │          │          │
           ▼          ▼          ▼   │   ▼          ▼          ▼          ▼
    ┌────────────┐ ┌────────┐ ┌──────────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐
    │  ApiKey    │ │AuditLog│ │ ChatSession  │ │ AgentSes │ │Browser │ │  Export   │
    │(api_keys)  │ │(audit_ │ │(chat_session │ │(agent_se │ │(browse │ │(exports)  │
    └────────────┘ │ logs)  │ │  s)          │ │  ssions) │ │ r_sess │ └─────┬────┘
                   └────────┘ └──────┬───────┘ └────┬─────┘ └───┬────┘       │
                                     │              │            │            │
                                     ▼              ▼            ▼            │
                              ┌─────────────┐ ┌──────────┐ ┌──────────┐      │
                              │ ChatMessage  │ │AgentTask │ │BrowserSn │      │
                              │(chat_message │ │(agent_ta │ │(browser_ │      │
                              │     s)       │ │  sks)    │ │ snapshots│      │
                              └─────────────┘ └────┬─────┘ └──────────┘      │
                                                    │                        │
                                                    ▼                        │
                                              ┌──────────────┐              │
                                              │ToolExecution │              │
                                              │(tool_executi │              │
                                              │     ons)     │              │
                                              └──────────────┘              │
                                                                            │
  ┌──────────────────┐                                                      │
  │  Organization    │◄─────────────────────────────────────────────────────┘
  │(organizations)   │
  └──────┬───────────┘
         │
    ┌────┼────┬────────┬─────────┬──────────┬──────────┬──────────┬─────────┐
    │    │    │        │         │          │          │          │         │
    │    │    ▼        ▼         ▼          ▼          ▼          ▼         ▼
    │    │ ┌────────┐┌───────┐┌───────┐┌──────┐┌──────────┐┌──────┐┌──────────┐
    │    │ │Workspac││Members││Busines││Foreca││   Kpi    ││Repor ││Workflow  │
    │    │ │(worksp ││(membe ││sPlan  ││st(for││ (kpis)   ││t(rep ││(workflow │
    │    │ │ aces)  ││rships)││(busin ││ecasts││          ││orts) ││   s)     │
    │    │ └────────┘└───────┘│ess_pl │└──┬───┘└──────────┘└──────┘└─────┬────┘
    │    │                    │ans)   │    │                         │         │
    │    │                    └───┬───┘    ▼                         │         ▼
    │    │                        │   ┌───────────────┐             │   ┌──────────┐
    │    │                        ▼   │ForecastRevenue│             │   │WorkflowSt│
    │    │                   ┌───────┐│(forecast_reve │             │   │ep(workfl │
    │    │                   │PlanSe ││    nues)      │             │   │ow_steps) │
    │    │                   │ction  │└───────────────┘             │   └──────────┘
    │    │                   │(plan_ │┌────────────────┐            │
    │    │                   │sectio ││ForecastExpense │            │
    │    │                   │ns)    ││(forecast_expen │            │
    │    │                   └───────┘│    ses)        │            ▼
    │    │                            └────────────────┘    ┌──────────────┐
    │    │                            ┌──────────────────┐   │WorkflowRun   │
    │    │                            │FinancialStatemen │   │(workflow_runs│
    │    │                            │t(financial_state │   └──────┬───────┘
    │    │                            │    ments)        │          │
    │    │                            └──────────────────┘          ▼
    │    │                                                   ┌──────────────┐
    │    │                                                   │WorkflowStepR │
    │    │                                                   │un(workflow_s │
    │    │                                                   │tep_runs)     │
    │    │                                                   └──────────────┘
    │    │
    │    ├──────────┬──────────┬───────────┬──────────┬──────────┬──────────────┐
    │    ▼          ▼          ▼           ▼          ▼          ▼              ▼
    │ ┌────────┐┌──────────┐┌──────────┐┌────────┐┌──────────┐┌──────────┐┌──────────┐
    │ │Subscri ││Automatio ││Integrati ││AgentPi ││Scheduled ││RateLimit ││  Export  │
    │ │ption   ││nLog     ││on       ││peline  ││Job       ││Log       ││          │
    │ │(subscr ││(automat ││(integra ││(agent_ ││(schedule ││(rate_li ││          │
    │ │iptions)││ion_logs)││tions)   ││pipeli ││d_jobs)   ││mit_logs)││          │
    │ └────────┘└──────────┘└────┬─────┘│nes)   │└──────────┘└──────────┘└──────────┘
    │                              │     └───┬────┘
    │                              ▼         │
    │                        ┌──────────┐    ▼
    │                        │Integrati │  ┌──────────────┐
    │                        │onEvent   │  │AgentPipelineS│
    │                        │(integra │  │tep(agent_pi  │
    │                        │tion_even│  │peline_steps) │
    │                        │ts)      │  └──────────────┘
    │                        └──────────┘
    │                                        ┌──────────────────┐
    │                                   ┌────│AgentPipelineRun   │
    │                                   │    │(agent_pipeline_ru │
    │                                   │    │        ns)        │
    │                                   │    └────────┬─────────┘
    │                                   │             ▼
    │                                   │    ┌──────────────────┐
    │                                   │    │PipelineStepRun   │
    │                                   │    │(pipeline_step_ru │
    │                                   │    │        ns)       │
    │                                   │    └──────────────────┘
    │
    │    ┌───────────────── Independent Models ─────────────────┐
    │    │                                                     │
    │    │  ┌──────────────┐  ┌───────────────┐  ┌───────────┐ │
    │    │  │ MemoryEntry  │  │ SkillRegistry  │  │AgentPermi │ │
    │    │  │(memory_entri │  │(skill_registry │  │ssion(agent│ │
    │    │  │     es)      │  │               )│  │_permissio │ │
    │    │  └──────────────┘  └───────────────┘  │    ns)    │ │
    │    │                                     └───────────┘ │
    │    │  ┌──────────────┐  ┌──────────────────────┐        │
    │    │  │ TokenUsage   │  │ ObservabilityEvent    │        │
    │    │  │(token_usage) │  │(observability_events) │        │
    │    │  └──────────────┘  └──────────────────────┘        │
    │    └─────────────────────────────────────────────────────┘
    │
    ├─── v4.0 Domain Models ────────────────────────────────────────┐
    │                                                                │
    │  ┌─────────────┐      ┌──────────────┐   ┌──────────────┐    │
    │  │ IdeaCanvas  │─────▶│IdeaValidation│   │IdeaBenchmark │    │
    │  │(idea_canvas │      │(idea_validat │   │(idea_benchma │    │
    │  │    es)      │      │    ions)     │   │    rks)      │    │
    │  └─────────────┘      └──────────────┘   └──────────────┘    │
    │                                                                │
    │  ┌────────────────┐    ┌──────────────────┐                   │
    │  │ResearchSource  │───▶│ResearchCitation   │                   │
    │  │(research_sourc │    │(research_citation │                   │
    │  │      es)       │    │        s)        │                   │
    │  └────────────────┘    └──────────────────┘                   │
    │                                                                │
    │  ┌──────────────────┐                                         │
    │  │IndustryBenchmark │                                         │
    │  │(industry_benchma │                                         │
    │  │       rks)       │                                         │
    │  └──────────────────┘                                         │
    │                                                                │
    │  ┌────────────┐       ┌───────────────────┐                   │
    │  │ PlanReview │──────▶│PlanReviewFinding   │                   │
    │  │(plan_revie │       │(plan_review_findin │                   │
    │  │    ews)    │       │         gs)        │                   │
    │  └────────────┘       └───────────────────┘                   │
    │                                                                │
    │  ┌─────────────────┐  ┌──────────────────┐                   │
    │  │ActualFinancial  │  │ForecastVariance   │                   │
    │  │(actual_financia │  │(forecast_variance │                   │
    │  │       ls)       │  │         s)       │                   │
    │  └─────────────────┘  └──────────────────┘                   │
    │                                                                │
    │  ┌────────────────┐  ┌────────────────────┐                   │
    │  │FinancialAlert  │  │AccountingConnection│                   │
    │  │(financial_aler │  │(accounting_connect │                   │
    │  │      ts)       │  │       ions)        │                   │
    │  └────────────────┘  └────────────────────┘                   │
    │                                                                │
    │  ┌───────────┐    ┌────────────────┐  ┌──────────────────┐   │
    │  │ PitchDeck │───▶│PitchDeckSlide  │  │PitchDeckQuestion │   │
    │  │(pitch_dec │    │(pitch_deck_sli │  │(pitch_deck_quest │   │
    │  │   ks)     │    │     des)       │  │      ions)       │   │
    │  └───────────┘    └────────────────┘  └──────────────────┘   │
    │                                                                │
    │  ┌──────────────────┐                                         │
    │  │PitchDeckTemplate │                                         │
    │  │(pitch_deck_templ │                                         │
    │  │       ates)      │                                         │
    │  └──────────────────┘                                         │
    └────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Domain Models

### 3.1 User

**Table:** `users`
**Purpose:** Represents authenticated users of the platform. Central identity model linked to all user-scoped resources.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `email` | String | `@unique` | — | User email, must be unique |
| `name` | String? | — | — | Display name |
| `passwordHash` | String? | — | — | Bcrypt hash (null for OAuth users) |
| `avatar` | String? | — | — | Avatar URL |
| `role` | String | — | `"user"` | Role: `user`, `admin`, `super_admin` |
| `isActive` | Boolean | — | `true` | Soft-delete flag |
| `lastLoginAt` | DateTime? | — | — | Last successful login |
| `createdAt` | DateTime | — | `now()` | Record creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | — | Auto-updated modification timestamp |

**Relationships:**

| Relation | Target | Type | FK | Delete |
|---|---|---|---|---|
| `memberships` | Membership | One-to-Many | — | Cascade |
| `chatSessions` | ChatSession | One-to-Many | — | Cascade |
| `notifications` | Notification | One-to-Many | — | Cascade |
| `agentSessions` | AgentSession | One-to-Many | — | Cascade |
| `browserSessions` | BrowserSession | One-to-Many | — | Cascade |
| `exports` | Export | One-to-Many | — | Cascade |
| `apiKeys` | ApiKey | One-to-Many | — | Cascade |
| `auditLogs` | AuditLog | One-to-Many | — | SetNull |

**Indexes:**

| Name | Fields | Type |
|---|---|---|
| Primary | `id` | PK |
| users_email_key | `email` | Unique |

---

### 3.2 Organization

**Table:** `organizations`
**Purpose:** Tenant entity representing a company/workspace group. Most domain models are scoped to an organization.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `name` | String | — | — | Organization display name |
| `slug` | String | `@unique` | — | URL-friendly identifier |
| `logo` | String? | — | — | Logo image URL |
| `industry` | String? | — | — | Industry classification |
| `size` | String? | — | — | Size: `startup`, `sme`, `enterprise` |
| `country` | String? | — | — | ISO country code |
| `currency` | String | — | `"USD"` | Default accounting currency |
| `isActive` | Boolean | — | `true` | Soft-delete flag |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | Type | Delete |
|---|---|---|---|
| `memberships` | Membership | One-to-Many | Cascade |
| `workspaces` | Workspace | One-to-Many | Cascade |
| `plans` | BusinessPlan | One-to-Many | Cascade |
| `forecasts` | Forecast | One-to-Many | Cascade |
| `kpis` | Kpi | One-to-Many | Cascade |
| `reports` | Report | One-to-Many | Cascade |
| `workflows` | Workflow | One-to-Many | Cascade |
| `subscriptions` | Subscription | One-to-Many | Cascade |
| `exports` | Export | One-to-Many | Cascade |
| `automationLogs` | AutomationLog | One-to-Many | Cascade |
| `integrations` | Integration | One-to-Many | Cascade |
| `pipelines` | AgentPipeline | One-to-Many | Cascade |
| `scheduledJobs` | ScheduledJob | One-to-Many | Cascade |
| `rateLimitLogs` | RateLimitLog | One-to-Many | Cascade |

**Indexes:**

| Name | Fields | Type |
|---|---|---|
| Primary | `id` | PK |
| organizations_slug_key | `slug` | Unique |

---

### 3.3 Workspace

**Table:** `workspaces`
**Purpose:** Sub-organizational grouping for team collaboration and resource partitioning.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `name` | String | — | — | Workspace name |
| `description` | String? | — | — | — |
| `organizationId` | String | FK | — | Parent organization |
| `isActive` | Boolean | — | `true` | Soft-delete flag |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |

---

### 3.4 Membership

**Table:** `memberships`
**Purpose:** Join table linking users to organizations with role-based access control.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `userId` | String | FK | — | User reference |
| `organizationId` | String | FK | — | Organization reference |
| `role` | String | — | `"viewer"` | `owner`, `admin`, `manager`, `accountant`, `viewer` |
| `invitedAt` | DateTime | — | `now()` | When invitation was sent |
| `acceptedAt` | DateTime? | — | — | When invitation was accepted |
| `isActive` | Boolean | — | `true` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `user` | User | `userId` | Cascade |
| `organization` | Organization | `organizationId` | Cascade |

**Indexes:**

| Name | Fields | Type |
|---|---|---|
| Primary | `id` | PK |
| memberships_userId_organizationId_key | `[userId, organizationId]` | Unique |

---

## 4. Auth & Security Models

### 4.1 ApiKey

**Table:** `api_keys`
**Purpose:** Stores hashed API keys for programmatic access with granular permission control.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `userId` | String | FK | — | Owning user |
| `name` | String | — | — | Human-readable key label |
| `keyHash` | String | — | — | SHA-256 hash of the raw key |
| `keyPrefix` | String | — | — | First 8 chars for identification |
| `permissions` | String | — | `"[]"` | JSON array of permission strings |
| `lastUsedAt` | DateTime? | — | — | Last time key was used |
| `expiresAt` | DateTime? | — | — | Optional expiration |
| `isActive` | Boolean | — | `true` | Revocation flag |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `user` | User | `userId` | Cascade |

---

### 4.2 AuditLog

**Table:** `audit_logs`
**Purpose:** Immutable audit trail recording all significant actions across the platform for compliance and debugging.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `userId` | String? | FK | — | Acting user (SetNull on delete) |
| `organizationId` | String? | — | — | Affected organization |
| `action` | String | — | — | Action type, e.g. `plan.create` |
| `resource` | String | — | — | Resource type, e.g. `business_plans` |
| `resourceId` | String? | — | — | Specific resource ID |
| `status` | String | — | `"success"` | `success`, `failure`, `denied` |
| `ipAddress` | String? | — | — | Client IP address |
| `userAgent` | String? | — | — | Client user-agent |
| `details` | String? | — | — | JSON action details |
| `metadata` | String | — | `"{}"` | Additional metadata |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `user` | User? | `userId` | SetNull |

> **Note:** `userId` uses `SetNull` instead of `Cascade` so audit records survive user deletion.

---

### 4.3 RateLimitLog

**Table:** `rate_limit_logs`
**Purpose:** Tracks API request metrics for rate limiting enforcement and usage analytics.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String? | FK | — | Scoped organization |
| `userId` | String? | — | — | Requesting user |
| `endpoint` | String | — | — | API endpoint path |
| `method` | String | — | — | HTTP method: `GET`, `POST`, etc. |
| `statusCode` | Int | — | `200` | HTTP response status |
| `responseTime` | Int | — | `0` | Response time in ms |
| `tokenCount` | Int | — | `0` | AI tokens consumed |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization? | `organizationId` | Cascade |

---

## 5. Business Plan Builder Models

### 5.1 BusinessPlan

**Table:** `business_plans`
**Purpose:** Central business plan document with versioning, linked to an organization and composed of typed sections.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `title` | String | — | — | Plan title |
| `description` | String? | — | — | — |
| `status` | String | — | `"draft"` | `draft`, `review`, `approved`, `archived` |
| `organizationId` | String | FK | — | Owning organization |
| `version` | Int | — | `1` | Plan version number |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |
| `sections` | PlanSection | — | Cascade |

---

### 5.2 PlanSection

**Table:** `plan_sections`
**Purpose:** Typed, ordered sections within a business plan (e.g., executive summary, market analysis, SWOT).

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `planId` | String | FK | — | Parent plan |
| `type` | String | — | — | `executive_summary`, `market_analysis`, `swot`, `financial`, `competitor`, `team`, `marketing`, `operations` |
| `title` | String | — | — | Section heading |
| `content` | String | — | `""` | Section body content |
| `order` | Int | — | `0` | Display order |
| `aiGenerated` | Boolean | — | `false` | Whether content was AI-generated |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `plan` | BusinessPlan | `planId` | Cascade |

---

## 6. Financial Forecasting Models

### 6.1 Forecast

**Table:** `forecasts`
**Purpose:** Scenario-based financial forecast with date range, currency, and type classification.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `name` | String | — | — | Forecast name |
| `type` | String | — | `"base"` | `best`, `base`, `worst`, `custom` |
| `organizationId` | String | FK | — | Owning organization |
| `startMonth` | String | — | — | Start month, e.g. `"2025-01"` |
| `endMonth` | String | — | — | End month, e.g. `"2026-12"` |
| `currency` | String | — | `"USD"` | Forecast currency |
| `metadata` | String | — | `"{}"` | JSON config |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |
| `revenueItems` | ForecastRevenue | — | Cascade |
| `expenseItems` | ForecastExpense | — | Cascade |
| `statements` | FinancialStatement | — | Cascade |

---

### 6.2 ForecastRevenue

**Table:** `forecast_revenues`
**Purpose:** Individual revenue line item within a forecast, supporting growth rates and recurring models.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `forecastId` | String | FK | — | Parent forecast |
| `name` | String | — | — | Revenue line label |
| `category` | String | — | `"subscription"` | `subscription`, `transaction`, `service`, `product`, `other` |
| `amount` | Float | — | `0` | Monthly base amount |
| `growthRate` | Float | — | `0` | Monthly growth percentage |
| `startMonth` | String | — | — | When revenue begins |
| `endMonth` | String? | — | — | When revenue ends (null = ongoing) |
| `recurring` | Boolean | — | `true` | Whether revenue recurs monthly |
| `metadata` | String | — | `"{}"` | — |
| `order` | Int | — | `0` | Display order |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `forecast` | Forecast | `forecastId` | Cascade |

---

### 6.3 ForecastExpense

**Table:** `forecast_expenses`
**Purpose:** Individual expense line item within a forecast, mirroring the revenue structure with expense-specific categories.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `forecastId` | String | FK | — | Parent forecast |
| `name` | String | — | — | Expense line label |
| `category` | String | — | `"operational"` | `payroll`, `infrastructure`, `saas`, `tax`, `marketing`, `operational`, `other` |
| `amount` | Float | — | `0` | Monthly base amount |
| `growthRate` | Float | — | `0` | Monthly growth percentage |
| `startMonth` | String | — | — | When expense begins |
| `endMonth` | String? | — | — | When expense ends (null = ongoing) |
| `recurring` | Boolean | — | `true` | Whether expense recurs monthly |
| `metadata` | String | — | `"{}"` | — |
| `order` | Int | — | `0` | Display order |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `forecast` | Forecast | `forecastId` | Cascade |

---

### 6.4 FinancialStatement

**Table:** `financial_statements`
**Purpose:** Pre-computed monthly financial snapshots (P&L, balance sheet, cash flow) for a forecast.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `forecastId` | String | FK | — | Parent forecast |
| `month` | String | — | — | Month key, e.g. `"2025-01"` |
| `type` | String | — | — | `pnl`, `balance_sheet`, `cash_flow` |
| `revenue` | Float | — | `0` | Total revenue |
| `expenses` | Float | — | `0` | Total expenses |
| `netIncome` | Float | — | `0` | Revenue minus expenses |
| `assets` | Float | — | `0` | Total assets |
| `liabilities` | Float | — | `0` | Total liabilities |
| `equity` | Float | — | `0` | Owner equity |
| `cashFlow` | Float | — | `0` | Net cash flow |
| `cashBalance` | Float | — | `0` | Cash on hand |
| `burnRate` | Float | — | `0` | Monthly burn rate |
| `runway` | Float | — | `0` | Runway in months |
| `metadata` | String | — | `"{}"` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `forecast` | Forecast | `forecastId` | Cascade |

**Indexes:**

| Name | Fields | Type |
|---|---|---|
| Primary | `id` | PK |
| financial_statements_forecastId_month_type_key | `[forecastId, month, type]` | Unique |

---

## 7. KPI Intelligence Models

### 7.1 Kpi

**Table:** `kpis`
**Purpose:** Tracks key performance indicators with period-over-period comparison and target tracking.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `name` | String | — | — | KPI display name |
| `category` | String | — | — | `revenue`, `growth`, `saas`, `cash`, `customer` |
| `value` | Float | — | `0` | Current value |
| `previousValue` | Float | — | `0` | Prior period value |
| `target` | Float? | — | — | Target value (nullable) |
| `unit` | String | — | `"USD"` | `USD`, `percent`, `count` |
| `period` | String | — | — | Period key: `"2025-01"`, `"Q1-2025"`, `"2025"` |
| `organizationId` | String | FK | — | Owning organization |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |

---

## 8. AI Agent System Models

### 8.1 AgentSession

**Table:** `agent_sessions`
**Purpose:** Represents a single conversational session with an AI agent (CFO, CEO, Research, etc.).

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `userId` | String | FK | — | Initiating user |
| `agentType` | String | — | — | `cfo`, `ceo`, `research`, `growth`, `operations`, `fundraising`, `browser`, `reporting` |
| `title` | String? | — | — | Session title |
| `status` | String | — | `"active"` | `active`, `completed`, `failed` |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `user` | User | `userId` | Cascade |
| `tasks` | AgentTask | — | Cascade |
| `memories` | AgentMemory | — | Cascade |

---

### 8.2 AgentTask

**Table:** `agent_tasks`
**Purpose:** Individual task within an agent session, tracking input/output and execution status.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `sessionId` | String | FK | — | Parent session |
| `type` | String | — | — | Task type |
| `input` | String | — | — | Task input (prompt/data) |
| `output` | String? | — | — | Task output |
| `status` | String | — | `"pending"` | `pending`, `running`, `completed`, `failed` |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `session` | AgentSession | `sessionId` | Cascade |
| `executions` | ToolExecution | — | Cascade |

---

### 8.3 AgentMemory

**Table:** `agent_memories`
**Purpose:** Session-scoped memory entries for agent context continuity within a conversation.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `sessionId` | String | FK | — | Parent session |
| `type` | String | — | — | `user`, `workspace`, `agent`, `forecast`, `workflow` |
| `key` | String | — | — | Memory key |
| `value` | String | — | — | Memory content |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `session` | AgentSession | `sessionId` | Cascade |

---

### 8.4 ToolExecution

**Table:** `tool_executions`
**Purpose:** Records individual tool calls made by agent tasks (browser, email, forecast, etc.).

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `taskId` | String | FK | — | Parent task |
| `tool` | String | — | — | `browser`, `email`, `forecast`, `pdf`, `crm`, `spreadsheet`, `analytics`, `web_search`, `code_execute` |
| `input` | String | — | — | Tool input |
| `output` | String? | — | — | Tool output |
| `status` | String | — | `"pending"` | `pending`, `running`, `completed`, `failed` |
| `duration` | Int? | — | — | Execution time in ms |
| `metadata` | String | — | `"{}"` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `task` | AgentTask | `taskId` | Cascade |

---

## 9. Agent Pipeline Models

### 9.1 AgentPipeline

**Table:** `agent_pipelines`
**Purpose:** Defines a DAG-based orchestration pipeline composing multiple agent steps with dependency resolution.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `name` | String | — | — | Pipeline name |
| `description` | String? | — | — | — |
| `organizationId` | String | FK | — | Owning organization |
| `status` | String | — | `"draft"` | `draft`, `active`, `paused`, `archived` |
| `triggerType` | String | — | `"manual"` | `manual`, `scheduled`, `event` |
| `schedule` | String? | — | — | Cron expression |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |
| `steps` | AgentPipelineStep | — | Cascade |
| `runs` | AgentPipelineRun | — | Cascade |

---

### 9.2 AgentPipelineStep

**Table:** `agent_pipeline_steps`
**Purpose:** Individual step within a pipeline, defining agent type, input template, and DAG dependencies.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `pipelineId` | String | FK | — | Parent pipeline |
| `agentType` | String | — | — | Agent type for this step |
| `name` | String | — | — | Step name |
| `description` | String? | — | — | — |
| `inputTemplate` | String | — | `"{}"` | JSON template (can reference prior step outputs) |
| `config` | String | — | `"{}"` | Agent-specific configuration |
| `order` | Int | — | `0` | Execution order hint |
| `dependsOn` | String | — | `"[]"` | JSON array of step IDs this step depends on |
| `isActive` | Boolean | — | `true` | Enable/disable step |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `pipeline` | AgentPipeline | `pipelineId` | Cascade |

---

### 9.3 AgentPipelineRun

**Table:** `agent_pipeline_runs`
**Purpose:** Execution instance of a pipeline, tracking overall status and timing.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `pipelineId` | String | FK | — | Parent pipeline |
| `status` | String | — | `"pending"` | `pending`, `running`, `completed`, `failed`, `cancelled` |
| `triggeredBy` | String? | — | — | User or system trigger |
| `result` | String? | — | — | JSON summary of execution |
| `startedAt` | DateTime? | — | — | — |
| `completedAt` | DateTime? | — | — | — |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `pipeline` | AgentPipeline | `pipelineId` | Cascade |
| `stepRuns` | PipelineStepRun | — | Cascade |

---

### 9.4 PipelineStepRun

**Table:** `pipeline_step_runs`
**Purpose:** Execution record for a single step within a pipeline run.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `pipelineRunId` | String | FK | — | Parent pipeline run |
| `stepId` | String | — | — | Referenced step definition |
| `agentType` | String | — | — | Agent type used |
| `status` | String | — | `"pending"` | `pending`, `running`, `completed`, `failed`, `skipped` |
| `input` | String? | — | — | Resolved input for this step |
| `output` | String? | — | — | Agent output |
| `error` | String? | — | — | Error message if failed |
| `duration` | Int? | — | — | Execution time in ms |
| `startedAt` | DateTime? | — | — | — |
| `completedAt` | DateTime? | — | — | — |
| `metadata` | String | — | `"{}"` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `pipelineRun` | AgentPipelineRun | `pipelineRunId` | Cascade |

---

## 10. Memory Architecture Models

### 10.1 MemoryEntry

**Table:** `memory_entries`
**Purpose:** Global cross-session memory store for persistent agent knowledge, user preferences, and contextual intelligence.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String? | — | — | Scoped organization |
| `userId` | String? | — | — | Scoped user |
| `agentType` | String? | — | — | Which agent created this |
| `category` | String | — | — | `user_preference`, `workspace_context`, `agent_knowledge`, `forecast_insight`, `workflow_pattern`, `market_intelligence`, `financial_summary` |
| `key` | String | — | — | Memory key identifier |
| `value` | String | — | — | Memory content |
| `summary` | String? | — | — | Compressed/summarized version |
| `relevanceScore` | Float | — | `1.0` | 0.0–1.0 ranking score |
| `accessCount` | Int | — | `0` | Retrieval counter |
| `source` | String | — | `"agent"` | `agent`, `user`, `system`, `workflow`, `import` |
| `tags` | String | — | `"[]"` | JSON array of tags |
| `metadata` | String | — | `"{}"` | — |
| `expiresAt` | DateTime? | — | — | Optional TTL |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

> **Note:** This is an independent model — not linked via FK to User or Organization. Scoping is done via nullable `organizationId` and `userId` fields for flexibility.

---

## 11. Chat System Models

### 11.1 ChatSession

**Table:** `chat_sessions`
**Purpose:** Conversational session between a user and an AI agent, optionally specialized by agent type.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `userId` | String | FK | — | Chat owner |
| `title` | String | — | `"New Chat"` | Session title |
| `agentType` | String? | — | — | `general`, `cfo`, `ceo`, `research`, `growth` |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `user` | User | `userId` | Cascade |
| `messages` | ChatMessage | — | Cascade |

---

### 11.2 ChatMessage

**Table:** `chat_messages`
**Purpose:** Individual message within a chat session (user, assistant, or system role).

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `sessionId` | String | FK | — | Parent session |
| `role` | String | — | — | `user`, `assistant`, `system` |
| `content` | String | — | — | Message body |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `session` | ChatSession | `sessionId` | Cascade |

---

## 12. Workflow Automation Models

### 12.1 Workflow

**Table:** `workflows`
**Purpose:** User-defined automation workflows with trigger configuration and DAG step orchestration.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `name` | String | — | — | Workflow name |
| `description` | String? | — | — | — |
| `trigger` | String | — | — | `manual`, `scheduled`, `event` |
| `schedule` | String? | — | — | Cron expression |
| `isActive` | Boolean | — | `false` | Active flag |
| `organizationId` | String | FK | — | Owning organization |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |
| `steps` | WorkflowStep | — | Cascade |
| `runs` | WorkflowRun | — | Cascade |

---

### 12.2 WorkflowStep

**Table:** `workflow_steps`
**Purpose:** Individual step definition within a workflow, supporting DAG dependencies.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `workflowId` | String | FK | — | Parent workflow |
| `type` | String | — | — | `agent`, `tool`, `condition`, `delay`, `notification`, `pipeline` |
| `name` | String | — | — | Step name |
| `config` | String | — | `"{}"` | Step configuration JSON |
| `order` | Int | — | `0` | Execution order |
| `dependsOn` | String | — | `"[]"` | JSON array of step IDs |
| `isActive` | Boolean | — | `true` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `workflow` | Workflow | `workflowId` | Cascade |

---

### 12.3 WorkflowRun

**Table:** `workflow_runs`
**Purpose:** Execution instance of a workflow.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `workflowId` | String | FK | — | Parent workflow |
| `status` | String | — | `"pending"` | `pending`, `running`, `completed`, `failed` |
| `triggeredBy` | String? | — | — | Who/what triggered the run |
| `result` | String? | — | — | JSON result |
| `startedAt` | DateTime? | — | — | — |
| `completedAt` | DateTime? | — | — | — |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `workflow` | Workflow | `workflowId` | Cascade |
| `stepRuns` | WorkflowStepRun | — | Cascade |

---

### 12.4 WorkflowStepRun

**Table:** `workflow_step_runs`
**Purpose:** Execution record for a single step within a workflow run.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `workflowRunId` | String | FK | — | Parent run |
| `stepId` | String | — | — | Referenced step |
| `status` | String | — | `"pending"` | `pending`, `running`, `completed`, `failed`, `skipped` |
| `input` | String? | — | — | Step input |
| `output` | String? | — | — | Step output |
| `error` | String? | — | — | Error details |
| `duration` | Int? | — | — | Execution time in ms |
| `startedAt` | DateTime? | — | — | — |
| `completedAt` | DateTime? | — | — | — |
| `metadata` | String | — | `"{}"` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `workflowRun` | WorkflowRun | `workflowRunId` | Cascade |

---

## 13. Reports Models

### 13.1 Report

**Table:** `reports`
**Purpose:** Generated reports (investor decks, board reports, KPI summaries) with multi-format export.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `title` | String | — | — | Report title |
| `type` | String | — | — | `investor`, `board`, `kpi`, `financial`, `market` |
| `format` | String | — | `"pdf"` | `pdf`, `docx`, `pptx`, `csv`, `xlsx` |
| `status` | String | — | `"draft"` | `draft`, `generated`, `approved`, `sent` |
| `content` | String | — | `"{}"` | JSON report content |
| `organizationId` | String | FK | — | Owning organization |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |

---

## 14. Notifications Models

### 14.1 Notification

**Table:** `notifications`
**Purpose:** In-app notifications for users, covering alerts, warnings, and informational messages.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `userId` | String | FK | — | Target user |
| `title` | String | — | — | Notification title |
| `message` | String | — | — | Notification body |
| `type` | String | — | `"info"` | `info`, `warning`, `error`, `success` |
| `read` | Boolean | — | `false` | Read status |
| `link` | String? | — | — | Optional navigation link |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `user` | User | `userId` | Cascade |

---

## 15. Billing & Subscription Models

### 15.1 Subscription

**Table:** `subscriptions`
**Purpose:** Organization subscription state with Stripe integration for billing lifecycle management.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | FK | — | Billed organization |
| `plan` | String | — | `"free"` | `free`, `starter`, `pro`, `enterprise` |
| `status` | String | — | `"active"` | `active`, `cancelled`, `past_due`, `trialing` |
| `stripeCustomerId` | String? | — | — | Stripe customer ID |
| `stripePriceId` | String? | — | — | Stripe price ID |
| `currentPeriodStart` | DateTime? | — | — | Current billing period start |
| `currentPeriodEnd` | DateTime? | — | — | Current billing period end |
| `cancelAtPeriodEnd` | Boolean | — | `false` | Scheduled cancellation |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |

---

## 16. Exports Models

### 16.1 Export

**Table:** `exports`
**Purpose:** Asynchronous export jobs for plans, reports, forecasts, and KPIs in various file formats.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | FK | — | Owning organization |
| `userId` | String | FK | — | Requesting user |
| `type` | String | — | — | `plan`, `report`, `forecast`, `kpi` |
| `format` | String | — | — | `pdf`, `docx`, `pptx`, `csv`, `xlsx`, `markdown` |
| `title` | String | — | — | Export title |
| `status` | String | — | `"pending"` | `pending`, `processing`, `completed`, `failed` |
| `fileUrl` | String? | — | — | Generated file URL |
| `fileSize` | Int? | — | — | File size in bytes |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `user` | User | `userId` | Cascade |
| `organization` | Organization | `organizationId` | Cascade |

---

## 17. Browser Automation Models

### 17.1 BrowserSession

**Table:** `browser_sessions`
**Purpose:** Headless browser session for web scraping, form filling, and automated browsing tasks.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `userId` | String | FK | — | Initiating user |
| `status` | String | — | `"active"` | `active`, `completed`, `failed` |
| `url` | String? | — | — | Current/last URL |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `user` | User | `userId` | Cascade |
| `snapshots` | BrowserSnapshot | — | Cascade |

---

### 17.2 BrowserSnapshot

**Table:** `browser_snapshots`
**Purpose:** Captured snapshots from browser sessions (screenshots, HTML, PDF, extracted data).

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `sessionId` | String | FK | — | Parent session |
| `type` | String | — | — | `screenshot`, `html`, `pdf`, `data` |
| `url` | String? | — | — | Page URL at capture time |
| `data` | String? | — | — | Base64 or extracted data |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `session` | BrowserSession | `sessionId` | Cascade |

---

## 18. Integrations Models

### 18.1 Integration

**Table:** `integrations`
**Purpose:** Third-party service integrations (QuickBooks, Xero, Stripe, Slack, etc.) with connection state tracking.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | FK | — | Owning organization |
| `type` | String | — | — | `quickbooks`, `xero`, `stripe`, `google_analytics`, `slack`, `discord`, `github`, `hubspot`, `salesforce` |
| `name` | String | — | — | Integration display name |
| `config` | String | — | `"{}"` | Encrypted config JSON |
| `status` | String | — | `"disconnected"` | `connected`, `disconnected`, `error` |
| `lastSyncAt` | DateTime? | — | — | Last successful sync |
| `metadata` | String | — | `"{}"` | — |
| `isActive` | Boolean | — | `false` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |
| `events` | IntegrationEvent | — | Cascade |

---

### 18.2 IntegrationEvent

**Table:** `integration_events`
**Purpose:** Event log for integration webhooks, syncs, actions, and errors.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `integrationId` | String | FK | — | Parent integration |
| `type` | String | — | — | `webhook`, `sync`, `action`, `error` |
| `payload` | String | — | `"{}"` | JSON payload |
| `status` | String | — | `"pending"` | `pending`, `processed`, `failed` |
| `processedAt` | DateTime? | — | — | When event was processed |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `integration` | Integration | `integrationId` | Cascade |

---

## 19. Scheduling Models

### 19.1 ScheduledJob

**Table:** `scheduled_jobs`
**Purpose:** Cron-based job scheduler for workflows, pipelines, reports, browser scans, and syncs.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | FK | — | Owning organization |
| `type` | String | — | — | `workflow`, `pipeline`, `report`, `browser_scan`, `sync` |
| `name` | String | — | — | Job name |
| `schedule` | String | — | — | Cron expression |
| `config` | String | — | `"{}"` | Job configuration JSON |
| `lastRunAt` | DateTime? | — | — | Last execution time |
| `nextRunAt` | DateTime? | — | — | Next scheduled execution |
| `isActive` | Boolean | — | `true` | — |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |

---

## 20. Automation Logs Models

### 20.1 AutomationLog

**Table:** `automation_logs`
**Purpose:** Aggregated logging for all automation types (agents, workflows, browser, etc.) for debugging and auditing.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | FK | — | Owning organization |
| `type` | String | — | — | `agent`, `workflow`, `browser`, `report`, `pipeline`, `integration`, `export` |
| `action` | String | — | — | Action identifier |
| `status` | String | — | `"success"` | `success`, `failure`, `warning` |
| `details` | String? | — | — | Detailed message |
| `userId` | String? | — | — | Triggering user |
| `duration` | Int? | — | — | Duration in ms |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `organization` | Organization | `organizationId` | Cascade |

---

## 21. Skill Registry Models

### 21.1 SkillRegistry

**Table:** `skill_registry`
**Purpose:** Global catalog of available skills (tools, agents, integrations) with permission requirements.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `name` | String | — | — | Skill name |
| `description` | String? | — | — | — |
| `type` | String | — | — | `tool`, `agent`, `integration` |
| `category` | String | — | `"general"` | `browser`, `finance`, `communication`, `analytics`, `export`, `crm` |
| `config` | String | — | `"{}"` | Skill configuration |
| `permissions` | String | — | `"[]"` | JSON: required permissions |
| `isActive` | Boolean | — | `true` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

> **Note:** This is a global model — not scoped to any organization.

---

## 22. Agent RBAC Models

### 22.1 AgentPermission

**Table:** `agent_permissions`
**Purpose:** Fine-grained role-based access control for AI agents, defining what resources each agent type can access.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `agentType` | String | — | — | `cfo`, `ceo`, `research`, etc. |
| `resource` | String | — | — | `kpis`, `forecasts`, `plans`, `reports`, `workflows`, `integrations`, `browser`, `exports` |
| `action` | String | — | — | `read`, `write`, `execute`, `admin` |
| `isAllowed` | Boolean | — | `false` | Permission grant flag |
| `constraints` | String | — | `"{}"` | JSON: rate limits, field restrictions |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Indexes:**

| Name | Fields | Type |
|---|---|---|
| Primary | `id` | PK |
| agent_permissions_agentType_resource_action_key | `[agentType, resource, action]` | Unique |

> **Note:** Global model — no organization FK. Permissions are per agent type across all tenants.

---

## 23. Observability Models

### 23.1 TokenUsage

**Table:** `token_usage`
**Purpose:** LLM token consumption tracking for cost management and billing attribution.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String? | — | — | Cost attribution |
| `userId` | String? | — | — | User who triggered |
| `agentType` | String? | — | — | Agent that consumed tokens |
| `model` | String | — | `"default"` | LLM model identifier |
| `promptTokens` | Int | — | `0` | Tokens in prompt |
| `completionTokens` | Int | — | `0` | Tokens in completion |
| `totalTokens` | Int | — | `0` | Total tokens used |
| `requestType` | String | — | — | `chat`, `plan_generate`, `forecast_analyze`, `report_generate`, `agent_task`, `pipeline_step` |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

---

### 23.2 ObservabilityEvent

**Table:** `observability_events`
**Purpose:** Distributed tracing and event logging for system observability across all components.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String? | — | — | — |
| `userId` | String? | — | — | — |
| `eventType` | String | — | — | `agent_execution`, `workflow_step`, `pipeline_step`, `browser_action`, `tool_execution`, `api_request` |
| `source` | String | — | — | Component that generated event |
| `status` | String | — | `"info"` | `info`, `warning`, `error`, `critical` |
| `message` | String | — | — | Event message |
| `data` | String | — | `"{}"` | JSON event data |
| `traceId` | String? | — | — | Distributed tracing ID |
| `spanId` | String? | — | — | Span within trace |
| `duration` | Int? | — | — | Duration in ms |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

---

## 24. Idea Canvas Models

### 24.1 IdeaCanvas

**Table:** `idea_canvases`
**Purpose:** Pre-workflow idea pressure-testing canvas (Lean Canvas style) with AI validation scoring.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `userId` | String | — | — | Creator |
| `organizationId` | String | — | — | Owning organization |
| `title` | String | — | — | Idea title |
| `problem` | String | — | `""` | Problem statement |
| `solution` | String | — | `""` | Proposed solution |
| `targetMarket` | String | — | `""` | Target market description |
| `competitiveLandscape` | String | — | `""` | Competitive analysis |
| `businessModel` | String | — | `""` | Business model |
| `uniqueValue` | String | — | `""` | Unique value proposition |
| `channels` | String | — | `""` | Distribution channels |
| `costStructure` | String | — | `""` | Cost structure |
| `revenueStreams` | String | — | `""` | Revenue streams |
| `riskAssessment` | String | — | `"{}"` | JSON: `{ market_risk, tech_risk, financial_risk, team_risk }` |
| `validationScore` | Float | — | `0` | 0–100 aggregate score |
| `validationReport` | String | — | `"{}"` | JSON structured report |
| `status` | String | — | `"draft"` | `draft`, `validating`, `validated`, `needs_rework`, `archived` |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `validations` | IdeaValidation | — | Cascade |
| `benchmarks` | IdeaBenchmark | — | Cascade |

---

### 24.2 IdeaValidation

**Table:** `idea_validations`
**Purpose:** Individual validation question/answer pair for idea pressure-testing, scored by AI.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `canvasId` | String | FK | — | Parent canvas |
| `category` | String | — | — | `market`, `financial`, `technical`, `competitive`, `team`, `regulatory` |
| `question` | String | — | — | Validation question |
| `answer` | String | — | `""` | Provided answer |
| `riskLevel` | String | — | `"medium"` | `low`, `medium`, `high`, `critical` |
| `score` | Float | — | `0` | 0–100 score |
| `suggestion` | String? | — | — | AI-generated improvement suggestion |
| `source` | String? | — | — | Assessment source |
| `order` | Int | — | `0` | Display order |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `canvas` | IdeaCanvas | `canvasId` | Cascade |

---

### 24.3 IdeaBenchmark

**Table:** `idea_benchmarks`
**Purpose:** Industry benchmark data points linked to an idea canvas for market comparison.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `canvasId` | String | FK | — | Parent canvas |
| `benchmarkType` | String | — | — | `market_size`, `growth_rate`, `avg_revenue`, `customer_acquisition_cost`, `churn_rate`, `margin` |
| `industry` | String | — | — | Industry name |
| `geography` | String | — | `"global"` | `my`, `sg`, `id`, `us`, `global` |
| `value` | Float | — | `0` | Benchmark value |
| `unit` | String | — | `"USD"` | `USD`, `percent`, `count` |
| `year` | Int | — | `2024` | Data year |
| `source` | String | — | — | Data source name |
| `sourceUrl` | String? | — | — | URL for citation |
| `confidence` | Float | — | `0.5` | 0–1 reliability score |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `canvas` | IdeaCanvas | `canvasId` | Cascade |

---

## 25. Research System Models

### 25.1 ResearchSource

**Table:** `research_sources`
**Purpose:** Verified research data source registry for bank-grade research integrity.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `name` | String | — | — | Source name |
| `type` | String | — | — | `government`, `industry_report`, `academic`, `financial_institution`, `news`, `database` |
| `url` | String? | — | — | Source URL |
| `geography` | String | — | `"global"` | `my`, `sg`, `id`, `us`, `global`, `asean` |
| `category` | String | — | — | `economic`, `industry`, `demographic`, `financial`, `regulatory`, `technology` |
| `verified` | Boolean | — | `false` | Verification status |
| `rating` | Float | — | `0` | 0–5 reliability rating |
| `lastUpdated` | DateTime? | — | — | Last data update |
| `metadata` | String | — | `"{}"` | — |
| `isActive` | Boolean | — | `true` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `citations` | ResearchCitation | — | Cascade |

---

### 25.2 ResearchCitation

**Table:** `research_citations`
**Purpose:** Individual citations linking claims to research sources with confidence scoring.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `sourceId` | String | FK | — | Parent source |
| `sessionId` | String? | — | — | Agent session that produced this |
| `organizationId` | String? | — | — | Organization context |
| `claim` | String | — | — | The assertion being cited |
| `citation` | String | — | — | Exact citation text |
| `dataPoint` | String? | — | — | Specific data point |
| `confidence` | Float | — | `0.5` | 0–1 confidence |
| `verified` | Boolean | — | `false` | Human verification |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `source` | ResearchSource | `sourceId` | Cascade |

---

### 25.3 IndustryBenchmark

**Table:** `industry_benchmarks`
**Purpose:** Curated industry benchmark dataset with percentile distributions for financial modeling.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `industry` | String | — | — | e.g. `saas`, `fintech`, `ecommerce`, `healthcare` |
| `subIndustry` | String? | — | — | e.g. `b2b_saas`, `insurtech`, `d2c_ecommerce` |
| `geography` | String | — | `"global"` | — |
| `metric` | String | — | — | e.g. `revenue_growth`, `gross_margin`, `churn_rate`, `cac`, `ltv` |
| `value` | Float | — | `0` | Benchmark value |
| `unit` | String | — | `"percent"` | `percent`, `USD`, `ratio`, `count` |
| `period` | String? | — | — | e.g. `"2024"`, `"Q1-2024"` |
| `percentile25` | Float? | — | `0` | 25th percentile |
| `percentile50` | Float? | — | `0` | Median |
| `percentile75` | Float? | — | `0` | 75th percentile |
| `source` | String | — | — | Research firm name |
| `sourceUrl` | String? | — | — | Verification URL |
| `sampleSize` | Int? | — | — | Companies in dataset |
| `confidence` | Float | — | `0.7` | 0–1 confidence |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

> **Note:** Global model — not scoped to an organization. Serves as reference data.

---

## 26. Plan Review Models

### 26.1 PlanReview

**Table:** `plan_reviews`
**Purpose:** Multi-agent plan review with lender/investor persona, narrative vs financial cross-check scoring.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `planId` | String | — | — | Reviewed plan |
| `organizationId` | String | — | — | Owning organization |
| `reviewerType` | String | — | `"lender"` | `lender`, `investor`, `auditor`, `internal` |
| `overallScore` | Float | — | `0` | 0–100 |
| `narrativeScore` | Float | — | `0` | 0–100 |
| `financialScore` | Float | — | `0` | 0–100 |
| `consistencyScore` | Float | — | `0` | 0–100 narrative vs financial alignment |
| `riskScore` | Float | — | `0` | 0–100 |
| `fundabilityScore` | Float | — | `0` | 0–100 |
| `summary` | String | — | `""` | AI-generated executive summary |
| `discrepancies` | String | — | `"[]"` | JSON: narrative vs financial mismatches |
| `recommendations` | String | — | `"[]"` | JSON: improvement suggestions |
| `redFlags` | String | — | `"[]"` | JSON: critical issues |
| `strengths` | String | — | `"[]"` | JSON: plan strengths |
| `status` | String | — | `"pending"` | `pending`, `reviewing`, `completed`, `needs_revision` |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `findings` | PlanReviewFinding | — | Cascade |

---

### 26.2 PlanReviewFinding

**Table:** `plan_review_findings`
**Purpose:** Individual findings from a plan review (discrepancies, red flags, strengths, recommendations).

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `reviewId` | String | FK | — | Parent review |
| `type` | String | — | — | `discrepancy`, `red_flag`, `strength`, `recommendation`, `data_gap` |
| `severity` | String | — | `"medium"` | `info`, `low`, `medium`, `high`, `critical` |
| `section` | String | — | — | Plan section reference |
| `description` | String | — | — | Finding description |
| `evidence` | String? | — | — | Supporting data |
| `suggestion` | String? | — | — | How to fix/improve |
| `narrativeRef` | String? | — | — | Narrative text reference |
| `financialRef` | String? | — | — | Financial data reference |
| `resolved` | Boolean | — | `false` | Resolution status |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `review` | PlanReview | `reviewId` | Cascade |

---

## 27. Actuals & Variance Models

### 27.1 ActualFinancial

**Table:** `actual_financials`
**Purpose:** Real financial data imported from accounting software or manual entry, for plan-vs-actual comparison.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | — | — | Owning organization |
| `period` | String | — | — | Period key: `"2025-01"`, `"Q1-2025"` |
| `source` | String | — | — | `quickbooks`, `xero`, `manual`, `csv_import` |
| `sourceSyncId` | String? | — | — | External system ID |
| `revenue` | Float | — | `0` | — |
| `cogs` | Float | — | `0` | Cost of goods sold |
| `grossProfit` | Float | — | `0` | — |
| `operatingExpenses` | Float | — | `0` | — |
| `netIncome` | Float | — | `0` | — |
| `cashFlow` | Float | — | `0` | — |
| `cashBalance` | Float | — | `0` | — |
| `accountsReceivable` | Float | — | `0` | — |
| `accountsPayable` | Float | — | `0` | — |
| `totalAssets` | Float | — | `0` | — |
| `totalLiabilities` | Float | — | `0` | — |
| `equity` | Float | — | `0` | — |
| `burnRate` | Float | — | `0` | — |
| `runway` | Float | — | `0` | Runway in months |
| `lineItems` | String | — | `"{}"` | JSON: detailed breakdown |
| `metadata` | String | — | `"{}"` | — |
| `importedAt` | DateTime | — | `now()` | Import timestamp |
| `createdAt` | DateTime | — | `now()` | — |

**Indexes:**

| Name | Fields | Type |
|---|---|---|
| Primary | `id` | PK |
| actual_financials_organizationId_period_source_key | `[organizationId, period, source]` | Unique |

---

### 27.2 ForecastVariance

**Table:** `forecast_variances`
**Purpose:** Computed variance between forecasted and actual financial values with AI analysis.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | — | — | Owning organization |
| `forecastId` | String? | — | — | Source forecast |
| `period` | String | — | — | Period key |
| `metric` | String | — | — | `revenue`, `cogs`, `gross_profit`, `operating_expenses`, `net_income`, `cash_flow`, `burn_rate` |
| `forecastValue` | Float | — | `0` | — |
| `actualValue` | Float | — | `0` | — |
| `variance` | Float | — | `0` | Absolute variance |
| `variancePercent` | Float | — | `0` | Percentage variance |
| `alertLevel` | String | — | `"on_track"` | `on_track`, `warning`, `critical`, `exceeded` |
| `analysis` | String? | — | — | AI-generated explanation |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Indexes:**

| Name | Fields | Type |
|---|---|---|
| Primary | `id` | PK |
| forecast_variances_organizationId_forecastId_period_metric_key | `[organizationId, forecastId, period, metric]` | Unique |

---

### 27.3 FinancialAlert

**Table:** `financial_alerts`
**Purpose:** Proactive financial alerts when metrics deviate from thresholds (cash warnings, expense drift, etc.).

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | — | — | Owning organization |
| `type` | String | — | — | `revenue_tracking`, `expense_drift`, `cash_warning`, `hiring_affordability`, `milestone`, `variance_threshold` |
| `metric` | String | — | — | Metric identifier |
| `message` | String | — | — | Alert message |
| `severity` | String | — | `"info"` | `info`, `warning`, `critical` |
| `period` | String? | — | — | Relevant period |
| `data` | String | — | `"{}"` | JSON: supporting data |
| `dismissed` | Boolean | — | `false` | — |
| `dismissedAt` | DateTime? | — | — | When dismissed |
| `actionTaken` | String? | — | — | Action description |
| `createdAt` | DateTime | — | `now()` | — |

---

### 27.4 AccountingConnection

**Table:** `accounting_connections`
**Purpose:** OAuth connection state for QuickBooks/Xero accounting software integration.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | — | — | Owning organization |
| `provider` | String | — | — | `quickbooks`, `xero` |
| `status` | String | — | `"disconnected"` | `connected`, `disconnected`, `expired`, `error` |
| `accessToken` | String? | — | — | Encrypted OAuth access token |
| `refreshToken` | String? | — | — | Encrypted OAuth refresh token |
| `tokenExpiresAt` | DateTime? | — | — | Token expiration |
| `companyId` | String? | — | — | RealmId (QB) or tenant ID (Xero) |
| `companyName` | String? | — | — | Connected company name |
| `lastSyncAt` | DateTime? | — | — | Last successful sync |
| `syncFrequency` | String | — | `"daily"` | `hourly`, `daily`, `weekly`, `monthly` |
| `syncStartDate` | String? | — | — | How far back to pull data |
| `scopes` | String | — | `"[]"` | JSON: granted OAuth scopes |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Indexes:**

| Name | Fields | Type |
|---|---|---|
| Primary | `id` | PK |
| accounting_connections_organizationId_provider_key | `[organizationId, provider]` | Unique |

---

## 28. Pitch Deck Models

### 28.1 PitchDeck

**Table:** `pitch_decks`
**Purpose:** Dynamic pitch deck orchestrator with auto-synced financial variables and investor Q&A preparation.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `organizationId` | String | — | — | Owning organization |
| `planId` | String? | — | — | Linked business plan |
| `title` | String | — | — | Deck title |
| `templateId` | String? | — | — | Template used |
| `status` | String | — | `"draft"` | `draft`, `generating`, `ready`, `presented`, `archived` |
| `slides` | String | — | `"[]"` | JSON: ordered slide IDs |
| `dynamicVariables` | String | — | `"{}"` | JSON: auto-synced variable values |
| `totalSlides` | Int | — | `0` | — |
| `fundingAsk` | Float? | — | — | Amount being raised |
| `useOfFunds` | String? | — | — | JSON: fund allocation |
| `targetAudience` | String | — | `"investor"` | `investor`, `lender`, `partner`, `internal` |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `slideData` | PitchDeckSlide | — | Cascade |
| `questions` | PitchDeckQuestion | — | Cascade |

---

### 28.2 PitchDeckSlide

**Table:** `pitch_deck_slides`
**Purpose:** Individual slide within a pitch deck with dynamic data binding.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `deckId` | String | FK | — | Parent deck |
| `order` | Int | — | `0` | Slide order |
| `type` | String | — | — | `title`, `problem`, `solution`, `market`, `product`, `business_model`, `traction`, `team`, `financials`, `ask`, `appendix` |
| `title` | String | — | — | Slide title |
| `content` | String | — | `"{}"` | JSON: structured slide content |
| `layout` | String | — | `"default"` | `default`, `centered`, `split`, `data_heavy`, `visual` |
| `dataSource` | String? | — | — | JSON: reference to plan/forecast data |
| `dynamicFields` | String | — | `"[]"` | JSON: auto-updating fields |
| `speakerNotes` | String? | — | — | Presenter notes |
| `imageUrl` | String? | — | — | Generated/uploaded image |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `deck` | PitchDeck | `deckId` | Cascade |

---

### 28.3 PitchDeckQuestion

**Table:** `pitch_deck_questions`
**Purpose:** Anticipated investor questions with AI-generated responses for pitch preparation.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `deckId` | String | FK | — | Parent deck |
| `question` | String | — | — | Anticipated question |
| `category` | String | — | — | `financial`, `market`, `team`, `product`, `competition`, `risk`, `terms` |
| `suggestedAnswer` | String? | — | — | AI-generated response |
| `likelihood` | String | — | `"medium"` | `low`, `medium`, `high` |
| `difficulty` | String | — | `"medium"` | `easy`, `medium`, `hard` |
| `slideReference` | String? | — | — | Related slide |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |

**Relationships:**

| Relation | Target | FK | Delete |
|---|---|---|---|
| `deck` | PitchDeck | `deckId` | Cascade |

---

### 28.4 PitchDeckTemplate

**Table:** `pitch_deck_templates`
**Purpose:** Reusable pitch deck templates categorized by funding stage and audience.

| Field | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | String | `@id` | `cuid()` | Primary key |
| `name` | String | — | — | Template name |
| `description` | String? | — | — | — |
| `category` | String | — | — | `seed`, `series_a`, `series_b`, `debt`, `partner`, `internal` |
| `slideCount` | Int | — | `0` | Number of slides |
| `slides` | String | — | `"[]"` | JSON: template slide definitions |
| `thumbnail` | String? | — | — | Template preview image |
| `isDefault` | Boolean | — | `false` | Built-in template flag |
| `isActive` | Boolean | — | `true` | — |
| `metadata` | String | — | `"{}"` | — |
| `createdAt` | DateTime | — | `now()` | — |
| `updatedAt` | DateTime | `@updatedAt` | — | — |

> **Note:** Global model — not scoped to an organization. Serves as shared template library.

---

## 29. Migration Strategy

### Approach

| Strategy | Description |
|---|---|
| **Development** | `prisma migrate dev` — auto-generates migrations from schema changes |
| **Production** | `prisma migrate deploy` — applies pending migrations without prompting |
| **Baseline** | For existing databases, use `prisma migrate resolve --applied` to mark baseline |
| **Reset** | `prisma migrate reset` — destructive, dev-only |

### Migration Workflow

```bash
# 1. Modify schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive_name

# 3. Review generated SQL in prisma/migrations/

# 4. Apply to production
npx prisma migrate deploy

# 5. Generate client
npx prisma generate
```

### Migration Naming Convention

```
YYYYMMDDHHMMSS_descriptive_name
├── migration.sql
```

Examples:
- `20250101_init_schema`
- `20250115_add_pitch_deck_models`
- `20250201_add_actuals_tracking`

### Breaking Change Protocol

1. **Additive changes** (new fields, new models) — safe, non-breaking
2. **Field renames** — use multi-step migration: add new → backfill → drop old
3. **Field removal** — deprecate first, remove after grace period
4. **Type changes** — create parallel field, migrate data, swap, drop old

### Seed Data

```bash
npx prisma db seed
```

Essential seed data includes:
- Default `AgentPermission` records for all agent types
- Default `PitchDeckTemplate` records for each funding stage
- Default `SkillRegistry` entries for core tools
- Global `IndustryBenchmark` reference data
- Super admin `User` and `Organization`

---

## 30. Index Strategy

### Explicit Indexes (Defined in Schema)

| Model | Index Fields | Type | Rationale |
|---|---|---|---|
| User | `email` | Unique | Login lookup |
| Organization | `slug` | Unique | URL routing |
| Membership | `[userId, organizationId]` | Unique | Prevent duplicate memberships |
| FinancialStatement | `[forecastId, month, type]` | Unique | One statement per month per type per forecast |
| AgentPermission | `[agentType, resource, action]` | Unique | One permission per agent+resource+action combo |
| ActualFinancial | `[organizationId, period, source]` | Unique | Prevent duplicate imports |
| ForecastVariance | `[organizationId, forecastId, period, metric]` | Unique | One variance per metric per period per forecast |
| AccountingConnection | `[organizationId, provider]` | Unique | One connection per provider per org |

### Recommended Application-Level Indexes (for SQLite optimization)

Since Prisma with SQLite does not support `@@index`, these should be added via raw SQL migrations:

| Table | Column(s) | Type | Query Pattern |
|---|---|---|---|
| `audit_logs` | `organizationId, createdAt` | Composite | Org audit trail queries |
| `audit_logs` | `action` | Single | Action-type filtering |
| `notifications` | `userId, read` | Composite | Unread notification count |
| `agent_sessions` | `userId, status` | Composite | Active sessions per user |
| `chat_messages` | `sessionId, createdAt` | Composite | Message ordering |
| `forecasts` | `organizationId` | Single | Org forecast list |
| `business_plans` | `organizationId, status` | Composite | Plan list by status |
| `memory_entries` | `organizationId, category` | Composite | Memory lookup by category |
| `memory_entries` | `key` | Single | Key-based retrieval |
| `token_usage` | `organizationId, createdAt` | Composite | Billing queries |
| `observability_events` | `traceId` | Single | Distributed tracing lookup |
| `financial_alerts` | `organizationId, dismissed` | Composite | Active alerts |
| `automation_logs` | `organizationId, type, createdAt` | Composite | Log filtering |
| `rate_limit_logs` | `createdAt` | Single | TTL cleanup |
| `idea_canvases` | `organizationId, status` | Composite | Canvas listing |
| `plan_reviews` | `planId` | Single | Reviews for a plan |
| `pitch_decks` | `organizationId, status` | Composite | Deck listing |

---

## 31. Data Retention Policy

### Retention by Category

| Category | Models | Retention Period | Cleanup Strategy |
|---|---|---|---|
| **Core (Permanent)** | User, Organization, Workspace, Membership | Indefinite | Soft-delete via `isActive` |
| **Financial (7 Years)** | ActualFinancial, FinancialStatement, ForecastVariance | 7 years | Aligned with tax/regulatory requirements |
| **Audit (5 Years)** | AuditLog, AutomationLog | 5 years | Cron job: `DELETE WHERE createdAt < NOW() - 5yr` |
| **Observability (90 Days)** | ObservabilityEvent, TokenUsage, RateLimitLog | 90 days | Cron job: `DELETE WHERE createdAt < NOW() - 90d` |
| **Agent Sessions (1 Year)** | AgentSession, AgentTask, ToolExecution, AgentMemory | 1 year | Cascade delete from AgentSession |
| **Browser Sessions (30 Days)** | BrowserSession, BrowserSnapshot | 30 days | Snapshot data is storage-heavy |
| **Chat (1 Year)** | ChatSession, ChatMessage | 1 year | Archive to cold storage |
| **Integration Events (90 Days)** | IntegrationEvent | 90 days | `DELETE WHERE status = 'processed' AND createdAt < NOW() - 90d` |
| **Memory (TTL-Based)** | MemoryEntry | Until `expiresAt` | `DELETE WHERE expiresAt < NOW()` |
| **Notifications (90 Days)** | Notification | 90 days | `DELETE WHERE read = true AND createdAt < NOW() - 90d` |
| **Exports (30 Days)** | Export | 30 days | Delete file + record after 30d |
| **Subscriptions (Permanent)** | Subscription | Indefinite | Billing history must be preserved |
| **Research (Permanent)** | ResearchSource, ResearchCitation, IndustryBenchmark | Indefinite | Reference data |
| **Skill Registry (Permanent)** | SkillRegistry | Indefinite | System configuration |
| **Idea Canvas (1 Year after archive)** | IdeaCanvas, IdeaValidation, IdeaBenchmark | 1 year post-archive | `DELETE WHERE status = 'archived' AND updatedAt < NOW() - 1yr` |
| **Plan Reviews (5 Years)** | PlanReview, PlanReviewFinding | 5 years | Compliance record |
| **Pitch Decks (2 Years)** | PitchDeck, PitchDeckSlide, PitchDeckQuestion, PitchDeckTemplate | 2 years post-archive | User content |

### Cleanup Implementation

```typescript
// Scheduled job example for retention cleanup
async function runRetentionCleanup() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  await prisma.observabilityEvent.deleteMany({
    where: { createdAt: { lt: ninetyDaysAgo } }
  });

  await prisma.tokenUsage.deleteMany({
    where: { createdAt: { lt: ninetyDaysAgo } }
  });

  await prisma.rateLimitLog.deleteMany({
    where: { createdAt: { lt: ninetyDaysAgo } }
  });

  // Expired memories
  await prisma.memoryEntry.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });

  // Read notifications older than 90 days
  await prisma.notification.deleteMany({
    where: { read: true, createdAt: { lt: ninetyDaysAgo } }
  });
}
```

---

## 32. Model Summary Table

| # | Model | Table | Domain | FK Depth | Records Est. |
|---|---|---|---|---|---|
| 1 | User | `users` | Core | 0 | 10K–100K |
| 2 | Organization | `organizations` | Core | 0 | 1K–10K |
| 3 | Workspace | `workspaces` | Core | 1 | 5K–50K |
| 4 | Membership | `memberships` | Core | 1 | 20K–200K |
| 5 | ApiKey | `api_keys` | Auth & Security | 1 | 5K–50K |
| 6 | AuditLog | `audit_logs` | Auth & Security | 1 | 1M+ |
| 7 | RateLimitLog | `rate_limit_logs` | Auth & Security | 1 | 10M+ |
| 8 | BusinessPlan | `business_plans` | Business Plans | 1 | 10K–100K |
| 9 | PlanSection | `plan_sections` | Business Plans | 2 | 50K–500K |
| 10 | Forecast | `forecasts` | Forecasting | 1 | 10K–100K |
| 11 | ForecastRevenue | `forecast_revenues` | Forecasting | 2 | 50K–500K |
| 12 | ForecastExpense | `forecast_expenses` | Forecasting | 2 | 50K–500K |
| 13 | FinancialStatement | `financial_statements` | Forecasting | 2 | 100K–1M |
| 14 | Kpi | `kpis` | KPI Intelligence | 1 | 50K–500K |
| 15 | AgentSession | `agent_sessions` | AI Agents | 1 | 100K–1M |
| 16 | AgentTask | `agent_tasks` | AI Agents | 2 | 500K–5M |
| 17 | AgentMemory | `agent_memories` | AI Agents | 2 | 500K–5M |
| 18 | ToolExecution | `tool_executions` | AI Agents | 3 | 1M–10M |
| 19 | AgentPipeline | `agent_pipelines` | Agent Pipelines | 1 | 1K–10K |
| 20 | AgentPipelineStep | `agent_pipeline_steps` | Agent Pipelines | 2 | 5K–50K |
| 21 | AgentPipelineRun | `agent_pipeline_runs` | Agent Pipelines | 2 | 50K–500K |
| 22 | PipelineStepRun | `pipeline_step_runs` | Agent Pipelines | 3 | 200K–2M |
| 23 | MemoryEntry | `memory_entries` | Memory | 0 | 100K–1M |
| 24 | ChatSession | `chat_sessions` | Chat | 1 | 100K–1M |
| 25 | ChatMessage | `chat_messages` | Chat | 2 | 1M–10M |
| 26 | Workflow | `workflows` | Workflows | 1 | 5K–50K |
| 27 | WorkflowStep | `workflow_steps` | Workflows | 2 | 20K–200K |
| 28 | WorkflowRun | `workflow_runs` | Workflows | 2 | 100K–1M |
| 29 | WorkflowStepRun | `workflow_step_runs` | Workflows | 3 | 500K–5M |
| 30 | Report | `reports` | Reports | 1 | 10K–100K |
| 31 | Notification | `notifications` | Notifications | 1 | 500K–5M |
| 32 | Subscription | `subscriptions` | Billing | 1 | 1K–10K |
| 33 | Export | `exports` | Exports | 2 | 50K–500K |
| 34 | BrowserSession | `browser_sessions` | Browser | 1 | 10K–100K |
| 35 | BrowserSnapshot | `browser_snapshots` | Browser | 2 | 50K–500K |
| 36 | Integration | `integrations` | Integrations | 1 | 1K–10K |
| 37 | IntegrationEvent | `integration_events` | Integrations | 2 | 100K–1M |
| 38 | ScheduledJob | `scheduled_jobs` | Scheduling | 1 | 1K–10K |
| 39 | AutomationLog | `automation_logs` | Automation | 1 | 1M–10M |
| 40 | SkillRegistry | `skill_registry` | Skills | 0 | 100–500 |
| 41 | AgentPermission | `agent_permissions` | Agent RBAC | 0 | 100–500 |
| 42 | TokenUsage | `token_usage` | Observability | 0 | 10M+ |
| 43 | ObservabilityEvent | `observability_events` | Observability | 0 | 10M+ |
| 44 | IdeaCanvas | `idea_canvases` | Idea Canvas | 0 | 10K–100K |
| 45 | IdeaValidation | `idea_validations` | Idea Canvas | 1 | 50K–500K |
| 46 | IdeaBenchmark | `idea_benchmarks` | Idea Canvas | 1 | 50K–500K |
| 47 | ResearchSource | `research_sources` | Research | 0 | 1K–10K |
| 48 | ResearchCitation | `research_citations` | Research | 1 | 10K–100K |
| 49 | IndustryBenchmark | `industry_benchmarks` | Research | 0 | 10K–100K |
| 50 | PlanReview | `plan_reviews` | Plan Review | 0 | 10K–100K |
| 51 | PlanReviewFinding | `plan_review_findings` | Plan Review | 1 | 50K–500K |
| 52 | ActualFinancial | `actual_financials` | Actuals | 0 | 100K–1M |
| 53 | ForecastVariance | `forecast_variances` | Actuals | 0 | 100K–1M |
| 54 | FinancialAlert | `financial_alerts` | Actuals | 0 | 10K–100K |
| 55 | AccountingConnection | `accounting_connections` | Actuals | 0 | 1K–10K |
| 56 | PitchDeck | `pitch_decks` | Pitch Deck | 0 | 10K–100K |
| 57 | PitchDeckSlide | `pitch_deck_slides` | Pitch Deck | 1 | 100K–1M |
| 58 | PitchDeckQuestion | `pitch_deck_questions` | Pitch Deck | 1 | 50K–500K |
| 59 | PitchDeckTemplate | `pitch_deck_templates` | Pitch Deck | 0 | 50–200 |

---

**Total Models:** 59
**Total Tables:** 59
**Unique Constraints:** 8 explicit (`@@unique`)
**Cascade Delete Relations:** 45+
**SetNull Delete Relations:** 1 (AuditLog → User)

---

*This document is auto-generated from `prisma/schema.prisma`. When the schema is modified, update this document accordingly.*
