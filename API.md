# GangNiaga AI OS — API Reference

> **Version:** 4.0  
> **Base URL:** `https://your-domain.com/api`  
> **Protocol:** HTTPS only (TLS 1.2+)  
> **Format:** JSON (`Content-Type: application/json`)  

---

## Table of Contents

1. [Authentication Overview](#authentication-overview)
2. [Common Headers](#common-headers)
3. [Rate Limiting](#rate-limiting)
4. [Error Response Format](#error-response-format)
5. [Pagination](#pagination)
6. [Auth](#auth)
7. [Agents](#agents)
8. [Actuals](#actuals)
9. [Browser](#browser)
10. [Chat](#chat)
11. [Exports](#exports)
12. [Finance](#finance)
13. [Forecasts](#forecasts)
14. [Idea Canvases](#idea-canvases)
15. [KPIs](#kpis)
16. [Memories](#memories)
17. [Notifications](#notifications)
18. [Observability](#observability)
19. [Pipelines](#pipelines)
20. [Plan Reviews](#plan-reviews)
21. [Pitch Decks](#pitch-decks)
22. [Plans](#plans)
23. [Reports](#reports)
24. [Research](#research)
25. [Settings](#settings)
26. [Tools](#tools)
27. [Workflows](#workflows)

---

## Authentication Overview

GangNiaga AI OS supports **four authentication strategies**, resolved in the following priority order:

### Strategy 1: Session Cookie

The primary authentication mechanism. A `session_user` cookie is set upon successful login or registration.

| Property | Value |
|---|---|
| Cookie name | `session_user` |
| HttpOnly | `true` |
| Secure | `true` (production) |
| SameSite | `lax` |
| Max-Age | 7 days (604 800 seconds) |

```http
Cookie: session_user=clx1abc2d0003efghijk4lmno
```

### Strategy 2: Bearer Token (API Key)

Pass an API key via the `Authorization` header. Suitable for programmatic access and integrations.

```http
Authorization: Bearer gn_live_abc123def456...
```

The raw token is matched against the SHA-256 `keyHash` stored in the `api_keys` table. The `keyPrefix` (first 8 characters) is used for identification in logs.

### Strategy 3: URL Query Parameter

A fallback strategy for environments where cookies and headers are unavailable (e.g., certain WebSocket connections or iframe embeds).

```http
GET /api/plans?userId=clx1abc2d0003efghijk4lmno&organizationId=org123
```

> **Warning:** This strategy is less secure. Use only when Strategies 1–2 are not feasible.

### Strategy 4: IP-Based Pre-Authentication

Before a user is identified, the system uses the client IP (`x-forwarded-for` or `x-real-ip`) for pre-rate-limiting. This is not authentication per se, but an identity layer for rate-limit enforcement.

### Authenticated User Object

All authenticated requests resolve to the following `AuthUser` shape:

```json
{
  "id": "clx1abc2d0003efghijk4lmno",
  "email": "user@example.com",
  "name": "Jane Doe",
  "role": "user",
  "organizationId": "org_cuid123",
  "organizationRole": "owner",
  "organization": {
    "id": "org_cuid123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "industry": "Technology",
    "size": "startup",
    "currency": "USD"
  }
}
```

---

## Common Headers

### Request Headers

| Header | Required | Description |
|---|---|---|
| `Content-Type` | Yes (POST/PATCH) | `application/json` |
| `Authorization` | No | `Bearer <token>` for API key auth |
| `Cookie` | No | `session_user=<id>` for cookie auth |
| `X-Organization-Id` | No | Override the organization context |
| `X-Request-Id` | No | Client-supplied request ID for tracing |

### Response Headers

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum requests allowed per window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp (seconds) when the window resets |
| `X-RateLimit-Window` | Duration of the rate limit window (e.g., `60s`) |

---

## Rate Limiting

Rate limiting is enforced per-user (or per-IP for unauthenticated requests) using a sliding-window algorithm.

| Endpoint Category | Window | Max Requests |
|---|---|---|
| `auth` | 60 s | 10 |
| `chat` | 60 s | 20 |
| `agents` | 60 s | 10 |
| `reports` | 300 s | 5 |
| `forecasts` | 60 s | 10 |
| `plans` | 60 s | 15 |
| `exports` | 60 s | 10 |
| `workflows` | 60 s | 15 |
| `settings` | 60 s | 30 |
| `default` | 60 s | 60 |

When a rate limit is exceeded, the API returns a `429 Too Many Requests` response:

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": "Reset at 2025-07-15T10:31:00.000Z"
}
```

Rate limit headers are included in **every** response, even successful ones, so clients can proactively throttle.

---

## Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": "Optional additional context"
}
```

### Standard Error Codes

| HTTP Status | Code | Description |
|---|---|---|
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 400 | `VALIDATION_ERROR` | Request body failed schema validation |
| 401 | `UNAUTHORIZED` | Authentication required or invalid |
| 403 | `FORBIDDEN` | Insufficient permissions (RBAC) |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### RBAC Permission Matrix

Organization roles determine which resources and actions a user can access:

| Resource | owner | admin | manager | accountant | viewer |
|---|---|---|---|---|---|
| plans | CRUD+admin | CRUD+admin | CRUD+execute | read | read |
| forecasts | CRUD+admin | CRUD+execute | CRUD+execute | CRUD+execute | read |
| agents | CRUD+admin | CRUD+execute | CRUD+execute | read+execute | read |
| workflows | CRUD+admin | CRUD+execute | CRUD+execute | read | read |
| reports | CRUD+admin | CRUD+admin+execute | read+write | read+write | read |
| settings | CRUD+admin | read+write | read | read | read |
| exports | CRUD+admin | CRUD+execute | read+write | read+write | read |
| browser | CRUD+admin | CRUD+execute | read+execute | — | — |
| kpis | CRUD+admin | CRUD+execute | read+write | read+write | read |

---

## Pagination

List endpoints support cursor-free offset pagination via query parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number (1-indexed) |
| `pageSize` | integer | `20` | Items per page (max: 100) |

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

---

## Auth

### POST /api/auth/login

Authenticate a user with email and password. Sets a `session_user` cookie on success.

| Property | Value |
|---|---|
| **Authentication** | None (public) |
| **Rate Limit** | `auth` — 10 req/min |

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | User email address |
| `password` | string | Yes | User password |

**Success Response (200):**

```json
{
  "user": {
    "id": "clx1abc2d0003efghijk4lmno",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "owner"
  },
  "organization": {
    "id": "org_cuid123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "currency": "USD"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Missing `email` or `password` |
| 401 | Invalid email or password |
| 429 | Too many login attempts |

**Example:**

```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword"}'
```

---

### POST /api/auth/register

Create a new user account. Automatically creates a default organization with owner membership and sample KPIs.

| Property | Value |
|---|---|
| **Authentication** | None (public) |
| **Rate Limit** | `auth` — 10 req/min |

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Full name |
| `email` | string | Yes | Email address (must be unique) |
| `password` | string | Yes | Minimum 6 characters |

**Success Response (200):**

```json
{
  "user": {
    "id": "clx1abc2d0003efghijk4lmno",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "owner"
  },
  "organization": {
    "id": "org_cuid456",
    "name": "Jane Doe's Organization",
    "slug": "jane-doe-org",
    "currency": "USD"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Missing fields or password too short |
| 409 | Email already registered |

---

### GET /api/auth/session

Retrieve the current session state. Returns `null` objects if not authenticated.

| Property | Value |
|---|---|
| **Authentication** | Session cookie |
| **Rate Limit** | Default — 60 req/min |

**Query Parameters:** None

**Authenticated Response (200):**

```json
{
  "user": {
    "id": "clx1abc2d0003efghijk4lmno",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "owner"
  },
  "organization": {
    "id": "org_cuid123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "currency": "USD"
  }
}
```

**Unauthenticated Response (200):**

```json
{
  "user": null,
  "organization": null
}
```

---

## Agents

### GET /api/agents

List agent sessions for the authenticated user.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | Default — 60 req/min |
| **RBAC** | `agents:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `userId` | string | No | Filter by user ID (defaults to current user) |

**Success Response (200):**

```json
{
  "sessions": [
    {
      "id": "sess_cuid123",
      "userId": "clx1abc2d0003efghijk4lmno",
      "agentType": "cfo",
      "title": "Q1 Financial Analysis",
      "status": "active",
      "metadata": "{}",
      "createdAt": "2025-07-15T10:00:00.000Z",
      "updatedAt": "2025-07-15T10:30:00.000Z",
      "tasks": [
        {
          "id": "task_cuid456",
          "sessionId": "sess_cuid123",
          "type": "financial_analysis",
          "input": "Analyze Q1 revenue trends",
          "output": "...",
          "status": "completed",
          "metadata": "{}",
          "createdAt": "2025-07-15T10:00:00.000Z",
          "updatedAt": "2025-07-15T10:15:00.000Z"
        }
      ]
    }
  ]
}
```

**Available Agent Types:** `cfo`, `ceo`, `research`, `growth`, `operations`, `fundraising`, `browser`, `reporting`

---

### POST /api/agents

Execute an agent task. Creates an agent session and task, runs the task through the orchestrator, and returns the result.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `agents` — 10 req/min |
| **RBAC** | `agents:execute` |

**Request Body:**

```json
{
  "agentType": "cfo",
  "task": "Analyze Q1 revenue trends and provide recommendations"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `agentType` | string | Yes | One of: `cfo`, `ceo`, `research`, `growth`, `operations`, `fundraising`, `browser`, `reporting` |
| `task` | string | Yes | Natural language task description |

**Success Response (201):**

```json
{
  "task": {
    "id": "task_cuid789",
    "sessionId": "sess_cuid123",
    "type": "financial_analysis",
    "input": "Analyze Q1 revenue trends and provide recommendations",
    "output": null,
    "status": "completed",
    "metadata": "{}",
    "createdAt": "2025-07-15T10:00:00.000Z",
    "updatedAt": "2025-07-15T10:15:00.000Z"
  },
  "response": "Based on the Q1 financial data, here are the key findings..."
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Missing `agentType` or `task`, or invalid agent type |

---

## Actuals

### GET /api/actuals

Retrieve actual financial data, variances, alerts, or a combined dashboard view.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | Default — 60 req/min |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `type` | string | No | `dashboard` (default), `actuals`, `variances`, `alerts` |
| `forecastId` | string | No | Filter variances by forecast (when `type=variances`) |
| `includeDismissed` | boolean | No | Include dismissed alerts (when `type=alerts`) |

**Example — Dashboard (default):**

```bash
curl "https://your-domain.com/api/actuals?organizationId=org123"
```

**Example — Variances:**

```bash
curl "https://your-domain.com/api/actuals?organizationId=org123&type=variances&forecastId=fc_abc"
```

**Success Response — Actuals (200):**

```json
{
  "actuals": [
    {
      "id": "act_cuid123",
      "organizationId": "org123",
      "period": "2025-01",
      "source": "manual",
      "revenue": 102000,
      "cogs": 28000,
      "grossProfit": 74000,
      "operatingExpenses": 56000,
      "netIncome": 18000,
      "cashFlow": 22000,
      "cashBalance": 350000,
      "burnRate": 38000,
      "runway": 9.2
    }
  ]
}
```

**Success Response — Variances (200):**

```json
{
  "variances": [
    {
      "id": "var_cuid123",
      "organizationId": "org123",
      "forecastId": "fc_abc",
      "period": "2025-01",
      "metric": "revenue",
      "forecastValue": 120000,
      "actualValue": 102000,
      "variance": -18000,
      "variancePercent": -15.0,
      "alertLevel": "warning",
      "analysis": "Revenue fell 15% below forecast due to..."
    }
  ]
}
```

---

### POST /api/actuals

Import actual financial data, trigger accounting syncs, compute variances, or generate alerts.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | Default — 60 req/min |

**Request Body — Import Actuals:**

```json
{
  "organizationId": "org123",
  "action": "import",
  "data": {
    "period": "2025-01",
    "revenue": 102000,
    "cogs": 28000,
    "operatingExpenses": 56000,
    "netIncome": 18000,
    "cashFlow": 22000,
    "cashBalance": 350000,
    "sourceSyncId": "qb_txn_12345"
  }
}
```

| Action | Required Fields | Description |
|---|---|---|
| `import` | `data.period` | Import actual financial data |
| `sync_quickbooks` | — | Simulate QuickBooks sync |
| `sync_xero` | — | Simulate Xero sync |
| `compute_variances` | `forecastId` (optional) | Compute forecast vs actual variances |
| `generate_alerts` | — | Generate financial alerts |

**Success Response — Import (200):**

```json
{
  "message": "Actuals imported successfully",
  "id": "act_cuid456",
  "created": true
}
```

**Success Response — Sync (200):**

```json
{
  "message": "QuickBooks sync complete. 6 periods imported.",
  "sync": { "imported": 6 },
  "variancesComputed": 18,
  "alertsGenerated": 2
}
```

---

### GET /api/actuals/[id]

Retrieve a single actual financial record.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | Default — 60 req/min |

**Success Response (200):** Returns the `ActualFinancial` object.

---

### PATCH /api/actuals/[id]

Update an existing actual financial record.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `forecasts:write` |

**Request Body:**

```json
{
  "revenue": 105000,
  "netIncome": 21000,
  "lineItems": "{\"salaries\": 45000, \"marketing\": 11000}"
}
```

---

### DELETE /api/actuals/[id]

Delete an actual financial record.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `forecasts:admin` |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Actual financial record deleted"
}
```

---

## Browser

### GET /api/browser

List browser sessions for the authenticated user.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `browser:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `userId` | string | No | Filter by user ID |
| `status` | string | No | Filter by status: `active`, `completed`, `failed` |

**Success Response (200):**

```json
{
  "sessions": [
    {
      "id": "bs_cuid123",
      "userId": "user123",
      "status": "completed",
      "url": "https://competitor-site.com",
      "metadata": "{}",
      "createdAt": "2025-07-15T10:00:00.000Z",
      "updatedAt": "2025-07-15T10:05:00.000Z",
      "snapshots": []
    }
  ]
}
```

---

### POST /api/browser

Create a new browser session. Launches the headless browser runtime for web automation.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `browser:write` |

**Request Body:**

```json
{
  "url": "https://competitor-site.com",
  "actions": [
    { "type": "screenshot" },
    { "type": "extract", "selector": ".price-table" }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | No | Starting URL |
| `actions` | array | No | List of browser actions to perform |

**Success Response (201):**

```json
{
  "session": {
    "id": "bs_cuid456",
    "userId": "user123",
    "status": "active",
    "url": "https://competitor-site.com",
    "metadata": "{}"
  }
}
```

---

## Chat

### POST /api/chat

Send a chat message to an AI agent. Creates a new session if `sessionId` is not provided.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `chat` — 20 req/min |
| **RBAC** | `agents:execute` |

**Request Body:**

```json
{
  "message": "What is our current burn rate?",
  "sessionId": "sess_cuid123",
  "agentType": "cfo"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | Yes | The user message |
| `sessionId` | string | No | Existing chat session ID (auto-created if omitted) |
| `agentType` | string | No | Agent personality: `general`, `cfo`, `ceo`, `research`, `growth` |

**Success Response (200):**

```json
{
  "response": "Based on the latest financial data, your current monthly burn rate is $56,000...",
  "sessionId": "sess_cuid123"
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Missing `message` |

---

### GET /api/chat/[id]

Retrieve a chat session with all messages.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | Default — 60 req/min |

**Success Response (200):**

```json
{
  "session": {
    "id": "sess_cuid123",
    "userId": "user123",
    "title": "What is our current burn rate?",
    "agentType": "cfo",
    "createdAt": "2025-07-15T10:00:00.000Z",
    "updatedAt": "2025-07-15T10:30:00.000Z",
    "messages": [
      {
        "id": "msg_cuid001",
        "sessionId": "sess_cuid123",
        "role": "user",
        "content": "What is our current burn rate?",
        "metadata": "{}",
        "createdAt": "2025-07-15T10:00:00.000Z"
      },
      {
        "id": "msg_cuid002",
        "sessionId": "sess_cuid123",
        "role": "assistant",
        "content": "Based on the latest financial data...",
        "metadata": "{}",
        "createdAt": "2025-07-15T10:00:15.000Z"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| 404 | Chat session not found |

---

### DELETE /api/chat/[id]

Delete a chat session and all its messages.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Chat session deleted successfully"
}
```

---

## Exports

### GET /api/exports

List export jobs for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `exports:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `status` | string | No | Filter by status: `pending`, `processing`, `completed`, `failed` |
| `type` | string | No | Filter by type: `plan`, `report`, `forecast`, `kpi` |

**Success Response (200):**

```json
{
  "exports": [
    {
      "id": "exp_cuid123",
      "organizationId": "org123",
      "userId": "user123",
      "type": "plan",
      "format": "pdf",
      "title": "Business Plan — Q3 2025",
      "status": "completed",
      "fileUrl": "/exports/plan-q3-2025.pdf",
      "fileSize": 2450000,
      "metadata": "{}",
      "createdAt": "2025-07-15T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/exports

Create a new export job.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `exports` — 10 req/min |
| **RBAC** | `exports:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "type": "plan",
  "format": "pdf",
  "title": "Business Plan — Q3 2025",
  "resourceId": "plan_cuid456"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `type` | string | Yes | Export type: `plan`, `report`, `forecast`, `kpi` |
| `format` | string | Yes | Format: `pdf`, `docx`, `pptx`, `csv`, `xlsx`, `markdown` |
| `title` | string | Yes | Export title |
| `resourceId` | string | No | ID of the resource to export |

**Success Response (201):**

```json
{
  "export": {
    "id": "exp_cuid789",
    "status": "pending",
    "title": "Business Plan — Q3 2025",
    "format": "pdf"
  }
}
```

---

### GET /api/exports/[id]

Retrieve a single export job by ID.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `exports:read` |

**Success Response (200):** Returns the full `Export` object including `fileUrl` and `fileSize` when completed.

---

## Finance

### GET /api/finance

Calculate and retrieve financial metrics. The `type` query parameter determines which calculation is performed.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | Default — 60 req/min |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `type` | string | Yes | Calculation type (see below) |
| `forecastId` | string | Conditional | Required when `type=validation` |
| `period` | string | No | Period filter (e.g., `2025-01`) |
| `revenueMultiplier` | float | No | For `type=scenario` |
| `expenseMultiplier` | float | No | For `type=scenario` |

**Finance Types:**

| Type | Description |
|---|---|
| `saas` | SaaS metrics (MRR, ARR, churn, LTV, CAC) |
| `burn_rate` | Burn rate analysis and runway calculation |
| `scenario` | Scenario analysis with custom multipliers |
| `health` | Overall KPI health score |
| `investor` | Investor-ready metrics (valuation multiples, etc.) |
| `validation` | Forecast validation against actuals |

**Example — SaaS Metrics:**

```bash
curl "https://your-domain.com/api/finance?organizationId=org123&type=saas"
```

**Success Response (200):**

```json
{
  "metrics": {
    "mrr": 102000,
    "arr": 1224000,
    "churnRate": 3.2,
    "ltv": 4200,
    "cac": 380,
    "ltvCacRatio": 11.05,
    "paybackPeriod": 3.7,
    "grossMargin": 72.5,
    "netRevenueRetention": 108.3
  }
}
```

**Example — Burn Rate:**

```json
{
  "analysis": {
    "monthlyBurnRate": 56000,
    "runwayMonths": 9.2,
    "cashBalance": 515200,
    "burnTrend": "increasing",
    "projectedZeroCash": "2026-04-15"
  }
}
```

---

### POST /api/finance

Run financial calculations with complex request bodies (e.g., custom scenario parameters).

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | Default — 60 req/min |

**Request Body:**

```json
{
  "organizationId": "org123",
  "type": "scenario",
  "revenueMultiplier": 1.5,
  "expenseMultiplier": 1.1,
  "forecastId": "fc_cuid123",
  "period": "2025-Q3"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `type` | string | Yes | Calculation type (same as GET) |
| `revenueMultiplier` | float | No | Revenue adjustment factor for scenario analysis |
| `expenseMultiplier` | float | No | Expense adjustment factor for scenario analysis |
| `forecastId` | string | Conditional | Required for `validation` type |
| `period` | string | No | Period filter |

**Success Response (200):** Same structure as GET, with results reflecting the custom parameters.

---

## Forecasts

### GET /api/forecasts

List financial forecasts for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `forecasts:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `type` | string | No | Filter by type: `best`, `base`, `worst`, `custom` |

**Success Response (200):**

```json
{
  "forecasts": [
    {
      "id": "fc_cuid123",
      "name": "Base Case FY2025",
      "type": "base",
      "organizationId": "org123",
      "startMonth": "2025-01",
      "endMonth": "2025-12",
      "currency": "USD",
      "metadata": "{}",
      "createdAt": "2025-07-01T00:00:00.000Z",
      "updatedAt": "2025-07-01T00:00:00.000Z",
      "revenueItems": [],
      "expenseItems": [],
      "statements": []
    }
  ]
}
```

---

### POST /api/forecasts

Create a new financial forecast with revenue and expense items.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `forecasts` — 10 req/min |
| **RBAC** | `forecasts:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "name": "Base Case FY2025",
  "type": "base",
  "startMonth": "2025-01",
  "endMonth": "2025-12",
  "currency": "USD",
  "revenueItems": [
    {
      "name": "SaaS Subscriptions",
      "category": "subscription",
      "amount": 100000,
      "growthRate": 5.0,
      "startMonth": "2025-01",
      "recurring": true
    }
  ],
  "expenseItems": [
    {
      "name": "Engineering Payroll",
      "category": "payroll",
      "amount": 45000,
      "growthRate": 0,
      "startMonth": "2025-01",
      "recurring": true
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `name` | string | Yes | Forecast name |
| `type` | string | No | `best`, `base`, `worst`, `custom` (default: `base`) |
| `startMonth` | string | Yes | Start month (e.g., `2025-01`) |
| `endMonth` | string | Yes | End month (e.g., `2025-12`) |
| `currency` | string | No | ISO 4217 code (default: `USD`) |
| `revenueItems` | array | No | Revenue line items |
| `expenseItems` | array | No | Expense line items |

**Revenue Item Schema:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Revenue line item name |
| `category` | string | No | `subscription`, `transaction`, `service`, `product`, `other` |
| `amount` | float | No | Monthly amount (default: 0) |
| `growthRate` | float | No | Monthly growth % (default: 0) |
| `startMonth` | string | Yes | When revenue begins |
| `endMonth` | string | No | When revenue ends |
| `recurring` | boolean | No | Whether recurring (default: true) |

**Expense Item Schema:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Expense line item name |
| `category` | string | No | `payroll`, `infrastructure`, `saas`, `tax`, `marketing`, `operational`, `other` |
| `amount` | float | No | Monthly amount (default: 0) |
| `growthRate` | float | No | Monthly growth % (default: 0) |
| `startMonth` | string | Yes | When expense begins |
| `endMonth` | string | No | When expense ends |
| `recurring` | boolean | No | Whether recurring (default: true) |

**Success Response (201):** Returns the created forecast with all items and generated financial statements.

---

## Idea Canvases

### GET /api/idea-canvases

List idea canvases for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `status` | string | No | Filter by status: `draft`, `validating`, `validated`, `needs_rework`, `archived` |

**Success Response (200):**

```json
{
  "canvases": [
    {
      "id": "ic_cuid123",
      "userId": "user123",
      "organizationId": "org123",
      "title": "AI-Powered Invoice Platform",
      "problem": "SMEs struggle with...",
      "solution": "Automated invoice processing...",
      "targetMarket": "Southeast Asian SMEs",
      "competitiveLandscape": "Existing players include...",
      "businessModel": "SaaS subscription",
      "uniqueValue": "First AI-native solution for...",
      "channels": "Direct sales, partnerships",
      "costStructure": "Engineering, hosting, sales",
      "revenueStreams": "Monthly subscriptions",
      "validationScore": 78.5,
      "status": "validated",
      "validations": [
        { "id": "val_001", "category": "market", "riskLevel": "low", "score": 85 },
        { "id": "val_002", "category": "financial", "riskLevel": "medium", "score": 72 }
      ],
      "createdAt": "2025-07-01T00:00:00.000Z",
      "updatedAt": "2025-07-15T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/idea-canvases

Create an idea canvas with optional AI-powered validation.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `plans` — 15 req/min |
| **RBAC** | `plans:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "title": "AI-Powered Invoice Platform",
  "problem": "SMEs in Southeast Asia spend 15+ hours/week on invoicing",
  "solution": "AI-native invoice automation with multi-currency support",
  "targetMarket": "Southeast Asian SMEs (50-500 employees)",
  "competitiveLandscape": "Existing players: Xero, QuickBooks — lack AI-native approach",
  "businessModel": "SaaS subscription: $49-199/mo per company",
  "uniqueValue": "First AI-native invoicing for ASEAN markets",
  "channels": "Direct sales, accounting firm partnerships",
  "costStructure": "Engineering (60%), Hosting (15%), Sales (25%)",
  "revenueStreams": "Monthly SaaS subscriptions",
  "validateWithAI": true,
  "industry": "fintech"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `title` | string | Yes | Idea title |
| `problem` — `revenueStreams` | string | No | Canvas fields |
| `validateWithAI` | boolean | No | Run AI validation (default: false) |
| `industry` | string | No | Industry context for validation |

**Success Response (200):** Returns the full canvas with validations and benchmarks.

---

### GET /api/idea-canvases/[id]

Retrieve a single idea canvas by ID.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Success Response (200):** Returns the canvas with `validations` and `benchmarks` included.

---

### PATCH /api/idea-canvases/[id]

Update an idea canvas.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:write` |

**Request Body:** Any subset of the canvas fields (partial update).

---

### DELETE /api/idea-canvases/[id]

Delete an idea canvas.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:admin` |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Idea canvas deleted"
}
```

---

## KPIs

### GET /api/kpis

List KPIs for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `kpis:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `category` | string | No | Filter: `revenue`, `growth`, `saas`, `cash`, `customer` |
| `period` | string | No | Filter by period |

**Success Response (200):**

```json
{
  "kpis": [
    {
      "id": "kpi_cuid123",
      "name": "Monthly Revenue",
      "category": "revenue",
      "value": 102000,
      "previousValue": 91000,
      "target": 120000,
      "unit": "USD",
      "period": "2025-07",
      "organizationId": "org123",
      "createdAt": "2025-07-01T00:00:00.000Z",
      "updatedAt": "2025-07-15T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/kpis

Create a new KPI entry.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `kpis:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "name": "Net Promoter Score",
  "category": "customer",
  "value": 72,
  "previousValue": 68,
  "target": 80,
  "unit": "count",
  "period": "2025-Q3"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `name` | string | Yes | KPI name |
| `category` | string | Yes | `revenue`, `growth`, `saas`, `cash`, `customer` |
| `value` | float | No | Current value (default: 0) |
| `previousValue` | float | No | Previous period value (default: 0) |
| `target` | float | No | Target value |
| `unit` | string | No | `USD`, `percent`, `count` (default: `USD`) |
| `period` | string | Yes | Period identifier |

---

## Memories

### GET /api/memories

Retrieve memory entries.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | No | Filter by organization |
| `category` | string | No | Filter by category |
| `agentType` | string | No | Filter by agent type |
| `key` | string | No | Filter by key prefix |

**Memory Categories:** `user_preference`, `workspace_context`, `agent_knowledge`, `forecast_insight`, `workflow_pattern`, `market_intelligence`, `financial_summary`

**Success Response (200):**

```json
{
  "memories": [
    {
      "id": "mem_cuid123",
      "organizationId": "org123",
      "userId": "user123",
      "agentType": "cfo",
      "category": "financial_summary",
      "key": "quarterly_summary_2025Q2",
      "value": "Revenue grew 12% QoQ...",
      "summary": "Q2 2025 showed strong growth",
      "relevanceScore": 0.92,
      "accessCount": 15,
      "source": "agent",
      "tags": "[\"finance\",\"quarterly\"]",
      "createdAt": "2025-07-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/memories

Create or update a memory entry.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Request Body:**

```json
{
  "organizationId": "org123",
  "category": "user_preference",
  "key": "report_format",
  "value": "Prefers PDF reports with executive summary",
  "source": "user",
  "tags": ["reports", "format"],
  "relevanceScore": 0.8
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | No | Organization scope |
| `category` | string | Yes | Memory category |
| `key` | string | Yes | Unique key within scope |
| `value` | string | Yes | Memory content |
| `summary` | string | No | Compressed summary |
| `source` | string | No | `agent`, `user`, `system`, `workflow`, `import` |
| `tags` | array | No | Tags for categorization |
| `relevanceScore` | float | No | 0.0–1.0 (default: 1.0) |
| `expiresAt` | string | No | ISO 8601 datetime (optional TTL) |

---

## Notifications

### GET /api/notifications

List notifications for the current user.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `userId` | string | No | User ID (defaults to session user) |

**Success Response (200):**

```json
{
  "notifications": [
    {
      "id": "notif_cuid123",
      "userId": "user123",
      "title": "Forecast Variance Alert",
      "message": "Revenue for January is 15% below forecast",
      "type": "warning",
      "read": false,
      "link": "/actuals?period=2025-01",
      "createdAt": "2025-07-15T08:00:00.000Z"
    }
  ]
}
```

---

### POST /api/notifications

Create a notification for a user.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Request Body:**

```json
{
  "userId": "user123",
  "title": "Report Ready",
  "message": "Your Q3 investor report has been generated",
  "type": "success",
  "link": "/reports/rep_cuid123"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | string | Yes | Target user ID |
| `title` | string | Yes | Notification title |
| `message` | string | Yes | Notification body |
| `type` | string | No | `info`, `warning`, `error`, `success` (default: `info`) |
| `link` | string | No | URL for deep linking |

---

### PATCH /api/notifications

Mark a notification as read/unread.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Request Body:**

```json
{
  "id": "notif_cuid123",
  "read": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Notification ID |
| `read` | boolean | Yes | Read status |

---

## Observability

### GET /api/observability

Retrieve observability events and token usage metrics.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | No | Filter by organization |
| `eventType` | string | No | Filter: `agent_execution`, `workflow_step`, `pipeline_step`, `browser_action`, `tool_execution`, `api_request` |
| `status` | string | No | Filter: `info`, `warning`, `error`, `critical` |
| `source` | string | No | Filter by source component |
| `traceId` | string | No | Filter by distributed trace ID |

**Success Response (200):**

```json
{
  "events": [
    {
      "id": "obs_cuid123",
      "organizationId": "org123",
      "userId": "user123",
      "eventType": "agent_execution",
      "source": "agent",
      "status": "info",
      "message": "Agent task executed: cfo",
      "data": { "agentType": "cfo", "sessionId": "sess_123" },
      "traceId": "trace_abc",
      "spanId": "span_def",
      "duration": 3500,
      "createdAt": "2025-07-15T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/observability

Emit a custom observability event or track token usage.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Request Body:**

```json
{
  "organizationId": "org123",
  "eventType": "api_request",
  "source": "custom-integration",
  "status": "info",
  "message": "Webhook received from Stripe",
  "data": { "event_type": "invoice.paid" },
  "traceId": "trace_abc"
}
```

---

## Pipelines

### GET /api/pipelines

List agent pipelines for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `agents:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `status` | string | No | Filter: `draft`, `active`, `paused`, `archived` |

**Success Response (200):**

```json
{
  "pipelines": [
    {
      "id": "pipe_cuid123",
      "name": "Monthly Financial Review",
      "description": "Automated monthly financial analysis pipeline",
      "organizationId": "org123",
      "status": "active",
      "triggerType": "scheduled",
      "schedule": "0 8 1 * *",
      "steps": [
        {
          "id": "step_cuid001",
          "pipelineId": "pipe_cuid123",
          "agentType": "cfo",
          "name": "Revenue Analysis",
          "order": 0,
          "dependsOn": "[]",
          "isActive": true
        },
        {
          "id": "step_cuid002",
          "pipelineId": "pipe_cuid123",
          "agentType": "reporting",
          "name": "Generate Report",
          "order": 1,
          "dependsOn": "[\"step_cuid001\"]",
          "isActive": true
        }
      ],
      "runs": [],
      "createdAt": "2025-07-01T00:00:00.000Z",
      "updatedAt": "2025-07-15T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/pipelines

Create a new agent pipeline.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `agents` — 10 req/min |
| **RBAC** | `agents:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "name": "Monthly Financial Review",
  "description": "Automated monthly analysis",
  "triggerType": "scheduled",
  "schedule": "0 8 1 * *",
  "steps": [
    {
      "agentType": "cfo",
      "name": "Revenue Analysis",
      "inputTemplate": "{}",
      "config": "{}",
      "order": 0,
      "dependsOn": []
    },
    {
      "agentType": "reporting",
      "name": "Generate Report",
      "inputTemplate": "{\"data\": \"{{step_0.output}}\"}",
      "config": "{}",
      "order": 1,
      "dependsOn": ["step_0"]
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `name` | string | Yes | Pipeline name |
| `description` | string | No | Description |
| `triggerType` | string | No | `manual`, `scheduled`, `event` (default: `manual`) |
| `schedule` | string | No | Cron expression (required if `triggerType=scheduled`) |
| `steps` | array | No | Pipeline step definitions |

**Success Response (201):** Returns the created pipeline with steps.

---

### GET /api/pipelines/[id]

Retrieve a single pipeline with steps and recent runs.

---

### POST /api/pipelines/[id]

Execute a pipeline run.

**Request Body:**

```json
{
  "action": "execute",
  "triggeredBy": "user123"
}
```

---

### PATCH /api/pipelines/[id]

Update a pipeline's configuration.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `agents:write` |

**Request Body:**

```json
{
  "name": "Updated Pipeline Name",
  "status": "active",
  "schedule": "0 9 1 * *"
}
```

---

### DELETE /api/pipelines/[id]

Delete a pipeline and all its steps and runs.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `agents:admin` |

---

## Plan Reviews

### GET /api/plan-reviews

List plan reviews for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `planId` | string | No | Filter by plan ID |
| `reviewerType` | string | No | Filter: `lender`, `investor`, `auditor`, `internal` |
| `status` | string | No | Filter: `pending`, `reviewing`, `completed`, `needs_revision` |

**Success Response (200):**

```json
{
  "reviews": [
    {
      "id": "rev_cuid123",
      "planId": "plan_cuid456",
      "organizationId": "org123",
      "reviewerType": "lender",
      "overallScore": 72.5,
      "narrativeScore": 80,
      "financialScore": 68,
      "consistencyScore": 65,
      "riskScore": 45,
      "fundabilityScore": 70,
      "summary": "The plan demonstrates a clear market opportunity...",
      "discrepancies": "[...]",
      "recommendations": "[...]",
      "redFlags": "[...]",
      "strengths": "[...]",
      "status": "completed",
      "findings": [
        {
          "id": "find_cuid001",
          "type": "discrepancy",
          "severity": "high",
          "section": "financial",
          "description": "Revenue projection assumes 50% MoM growth but narrative states conservative approach",
          "resolved": false
        }
      ],
      "createdAt": "2025-07-15T00:00:00.000Z",
      "updatedAt": "2025-07-15T01:00:00.000Z"
    }
  ]
}
```

---

### POST /api/plan-reviews

Create a new plan review. Triggers multi-agent analysis with lender/investor persona.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "planId": "plan_cuid456",
  "reviewerType": "lender"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `planId` | string | Yes | Business plan ID to review |
| `reviewerType` | string | No | `lender`, `investor`, `auditor`, `internal` (default: `lender`) |

**Success Response (201):** Returns the review with scores and findings.

---

### GET /api/plan-reviews/[id]

Retrieve a single plan review with all findings.

---

### PATCH /api/plan-reviews/[id]

Update a plan review (e.g., mark findings as resolved).

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:write` |

**Request Body:**

```json
{
  "status": "needs_revision",
  "findings": [
    { "id": "find_cuid001", "resolved": true }
  ]
}
```

---

## Pitch Decks

### GET /api/pitch-decks

List pitch decks for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `status` | string | No | Filter: `draft`, `generating`, `ready`, `presented`, `archived` |

---

### POST /api/pitch-decks

Create a new pitch deck with auto-synced dynamic variables.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `plans` — 15 req/min |
| **RBAC** | `plans:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "planId": "plan_cuid456",
  "title": "Series A Pitch Deck",
  "templateId": "tpl_sequoia",
  "targetAudience": "investor",
  "fundingAsk": 2000000,
  "useOfFunds": "{\"product\": 40, \"sales\": 30, \"ops\": 30}",
  "dynamicVariables": {
    "company_name": "Acme Corp",
    "arr": "$1.2M",
    "growth_rate": "12% MoM"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `title` | string | Yes | Deck title |
| `planId` | string | No | Linked business plan |
| `templateId` | string | No | Template to use |
| `targetAudience` | string | No | `investor`, `lender`, `partner`, `internal` |
| `fundingAsk` | float | No | Funding amount requested |
| `useOfFunds` | string | No | JSON breakdown of fund usage |
| `dynamicVariables` | object | No | Key-value pairs auto-synced from plan data |

---

### GET /api/pitch-decks/[id]

Retrieve a single pitch deck with slides and dynamic variables.

---

### PATCH /api/pitch-decks/[id]

Update a pitch deck (slides, dynamic variables, status).

**Request Body:** Any subset of pitch deck fields.

---

### DELETE /api/pitch-decks/[id]

Delete a pitch deck.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:admin` |

---

## Plans

### GET /api/plans

List business plans for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |

**Success Response (200):**

```json
{
  "plans": [
    {
      "id": "plan_cuid123",
      "title": "Acme Corp Business Plan 2025",
      "description": "Comprehensive plan for Series A",
      "status": "review",
      "organizationId": "org123",
      "version": 1,
      "sections": [
        {
          "id": "sec_cuid001",
          "planId": "plan_cuid123",
          "type": "executive_summary",
          "title": "Executive Summary",
          "content": "# Executive Summary\n\nAcme Corp is...",
          "order": 0,
          "aiGenerated": true,
          "createdAt": "2025-07-01T00:00:00.000Z",
          "updatedAt": "2025-07-01T00:00:00.000Z"
        }
      ],
      "createdAt": "2025-07-01T00:00:00.000Z",
      "updatedAt": "2025-07-15T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/plans

Create a new business plan with optional AI-generated content.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `plans` — 15 req/min |
| **RBAC** | `plans:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "title": "Acme Corp Business Plan 2025",
  "description": "Comprehensive plan for Series A",
  "businessType": "saas",
  "industry": "fintech",
  "targetMarket": "Southeast Asia",
  "generateWithAI": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `title` | string | Yes | Plan title |
| `description` | string | No | Plan description |
| `businessType` | string | No | Business type for AI generation |
| `industry` | string | No | Industry for AI generation |
| `targetMarket` | string | No | Target market for AI generation |
| `generateWithAI` | boolean | No | Auto-generate section content (default: false) |

When `generateWithAI` is `true`, the system generates content for all 8 default sections: `executive_summary`, `market_analysis`, `swot`, `competitor`, `financial`, `marketing`, `operations`, `team`.

**Success Response (200):** Returns the full plan with all sections.

---

### GET /api/plans/[id]

Retrieve a single business plan with sections.

---

### PATCH /api/plans/[id]

Update a business plan or its sections.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:write` |

**Request Body:**

```json
{
  "title": "Updated Plan Title",
  "status": "approved",
  "sections": [
    {
      "id": "sec_cuid001",
      "content": "# Updated Executive Summary\n\n..."
    }
  ]
}
```

---

### DELETE /api/plans/[id]

Delete a business plan and all its sections.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `plans:admin` |

---

## Reports

### GET /api/reports

List reports for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `reports:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `type` | string | No | Filter: `investor`, `board`, `kpi`, `financial`, `market` |
| `status` | string | No | Filter: `draft`, `generated`, `approved`, `sent` |

**Success Response (200):**

```json
{
  "reports": [
    {
      "id": "rep_cuid123",
      "title": "Q3 Investor Report",
      "type": "investor",
      "format": "pdf",
      "status": "generated",
      "content": "{}",
      "organizationId": "org123",
      "createdAt": "2025-07-15T00:00:00.000Z",
      "updatedAt": "2025-07-15T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/reports

Generate a new report.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `reports` — 5 req/5min |
| **RBAC** | `reports:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "title": "Q3 Investor Report",
  "type": "investor",
  "format": "pdf",
  "content": {
    "includeFinancials": true,
    "includeKPIs": true,
    "period": "2025-Q3"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `title` | string | Yes | Report title |
| `type` | string | Yes | `investor`, `board`, `kpi`, `financial`, `market` |
| `format` | string | No | `pdf`, `docx`, `pptx`, `csv`, `xlsx` (default: `pdf`) |
| `content` | object | No | Report configuration and content data |

**Success Response (201):** Returns the generated report.

---

## Research

### GET /api/research

Retrieve research sources, benchmarks, and citations.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `action` | string | No | `sources` (default), `benchmarks`, `citations` |
| `geography` | string | No | Filter by geography |
| `category` | string | No | Filter sources by category |
| `industry` | string | Conditional | Required for `benchmarks` |
| `metric` | string | No | Filter benchmarks by metric |
| `organizationId` | string | Conditional | Required for `citations` |

**Example — Benchmarks:**

```bash
curl "https://your-domain.com/api/research?action=benchmarks&industry=saas&geography=global&metric=churn_rate"
```

**Success Response (200):**

```json
{
  "benchmarks": [
    {
      "id": "bm_cuid123",
      "industry": "saas",
      "subIndustry": "b2b_saas",
      "geography": "global",
      "metric": "churn_rate",
      "value": 5.2,
      "unit": "percent",
      "period": "2024",
      "percentile25": 3.1,
      "percentile50": 5.0,
      "percentile75": 7.8,
      "source": "KeyBanc SaaS Survey",
      "sampleSize": 350,
      "confidence": 0.85
    }
  ],
  "total": 1
}
```

---

### POST /api/research

Generate research reports, create citations, or seed reference data.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Request Body — Generate Report:**

```json
{
  "action": "generate_report",
  "topic": "Southeast Asian Fintech Market Size",
  "geography": "asean",
  "industry": "fintech"
}
```

**Request Body — Create Citation:**

```json
{
  "action": "create_citation",
  "sourceId": "src_cuid123",
  "claim": "ASEAN fintech market to reach $250B by 2030",
  "citation": "McKinsey Global Banking Report 2024, p.45",
  "dataPoint": "250000000000",
  "confidence": 0.75
}
```

**Request Body — Seed Data:**

```json
{
  "action": "seed_sources"
}
```

| Action | Required Fields | Description |
|---|---|---|
| `generate_report` | `topic`, `geography`, `industry` | AI-generated research report |
| `create_citation` | `sourceId`, `claim`, `citation` | Create a research citation |
| `seed_sources` | — | Seed default verified sources |
| `seed_benchmarks` | — | Seed default industry benchmarks |

---

### GET /api/research/[id]

Retrieve a single research source with its citations.

---

### DELETE /api/research/[id]

Delete a research source and its citations.

| Property | Value |
|---|---|
| **Authentication** | Required |

---

## Settings

### GET /api/settings

Retrieve organization settings (organization details + active members).

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `settings:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |

**Success Response (200):**

```json
{
  "organization": {
    "id": "org123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "logo": null,
    "industry": "fintech",
    "size": "startup",
    "country": "MY",
    "currency": "USD",
    "isActive": true,
    "memberships": [
      {
        "id": "mem_cuid123",
        "userId": "user123",
        "role": "owner",
        "isActive": true,
        "user": {
          "id": "user123",
          "email": "jane@example.com",
          "name": "Jane Doe",
          "avatar": null,
          "role": "user"
        }
      }
    ]
  }
}
```

---

### PATCH /api/settings

Update organization settings.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `settings` — 30 req/min |
| **RBAC** | `settings:write` |

**Request Body:**

```json
{
  "organizationId": "org123",
  "name": "Acme Corp (Updated)",
  "industry": "fintech",
  "size": "sme",
  "country": "SG",
  "currency": "SGD"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `name` | string | No | Organization name |
| `industry` | string | No | Industry |
| `size` | string | No | `startup`, `sme`, `enterprise` |
| `country` | string | No | Country code |
| `currency` | string | No | ISO 4217 currency code |

**Success Response (200):** Returns the updated organization with memberships.

---

## Tools

### GET /api/tools/execute

List all available tools and their definitions.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `category` | string | No | Filter by category (e.g., `analytics`, `finance`, `browser`) |

**Success Response (200):**

```json
{
  "tools": [
    {
      "name": "browser",
      "description": "Execute browser automation tasks",
      "category": "browser",
      "requiredPermissions": ["browser:execute"],
      "rateLimited": true,
      "maxExecutionsPerMinute": 5,
      "timeout": 30000,
      "sandboxed": true,
      "requiresApproval": true
    }
  ],
  "count": 1
}
```

---

### POST /api/tools/execute

Execute a registered tool with full lifecycle management.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Request Body:**

```json
{
  "toolName": "browser",
  "agentTaskId": "task_cuid123",
  "input": {
    "url": "https://competitor.com/pricing",
    "action": "screenshot"
  },
  "organizationId": "org123",
  "requiresApproval": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `toolName` | string | Yes | Registered tool name |
| `agentTaskId` | string | Yes | Parent agent task ID |
| `input` | object | Yes | Tool-specific input payload |
| `organizationId` | string | No | Organization context |
| `requiresApproval` | boolean | No | Override per-tool default |

**Success Response (200):**

```json
{
  "success": true,
  "output": {
    "screenshot": "data:image/png;base64,...",
    "url": "https://competitor.com/pricing"
  },
  "executionId": "te_cuid123"
}
```

**Pending Approval Response (202):**

```json
{
  "success": false,
  "output": {
    "status": "pending_approval",
    "approvalId": "appr_cuid456",
    "message": "This tool execution requires approval"
  }
}
```

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Missing required fields or invalid tool name |
| 400 | Input validation failed |
| 404 | Agent task not found |

---

### GET /api/tools/approvals

List pending tool execution approvals.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `userId` | string | No | Filter by user ID |

**Success Response (200):**

```json
{
  "approvals": [
    {
      "id": "appr_cuid456",
      "toolName": "browser",
      "input": { "url": "https://competitor.com", "action": "screenshot" },
      "userId": "user123",
      "agentTaskId": "task_cuid123",
      "organizationId": "org123",
      "status": "pending",
      "createdAt": "2025-07-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### POST /api/tools/approvals

Approve or reject a pending tool execution.

| Property | Value |
|---|---|
| **Authentication** | Required |

**Request Body — Approve:**

```json
{
  "approvalId": "appr_cuid456",
  "action": "approve"
}
```

**Request Body — Reject:**

```json
{
  "approvalId": "appr_cuid456",
  "action": "reject",
  "reason": "Unauthorized website access"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `approvalId` | string | Yes | Approval request ID |
| `action` | string | Yes | `approve` or `reject` |
| `reason` | string | No | Reason (recommended for reject) |

**Approve Success Response (200):**

```json
{
  "approved": true,
  "approvalId": "appr_cuid456",
  "executionResult": {
    "success": true,
    "output": { "screenshot": "data:image/png;base64,..." }
  }
}
```

**Reject Success Response (200):**

```json
{
  "approved": false,
  "approvalId": "appr_cuid456",
  "reason": "Unauthorized website access"
}
```

---

## Workflows

### GET /api/workflows

List workflows for an organization.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `workflows:read` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |

**Success Response (200):**

```json
{
  "workflows": [
    {
      "id": "wf_cuid123",
      "name": "Monthly KPI Report",
      "description": "Auto-generate KPI report on the 1st of each month",
      "trigger": "scheduled",
      "schedule": "0 9 1 * *",
      "isActive": true,
      "organizationId": "org123",
      "steps": [
        {
          "id": "ws_cuid001",
          "workflowId": "wf_cuid123",
          "type": "agent",
          "name": "Gather KPIs",
          "config": "{\"agentType\": \"cfo\"}",
          "order": 0,
          "dependsOn": "[]",
          "isActive": true
        }
      ],
      "runs": [
        {
          "id": "wr_cuid123",
          "workflowId": "wf_cuid123",
          "status": "completed",
          "triggeredBy": "user123",
          "result": "...",
          "startedAt": "2025-07-01T09:00:00.000Z",
          "completedAt": "2025-07-01T09:05:00.000Z"
        }
      ],
      "createdAt": "2025-06-01T00:00:00.000Z",
      "updatedAt": "2025-07-01T09:05:00.000Z"
    }
  ]
}
```

---

### POST /api/workflows

Create a new workflow or execute an existing one.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **Rate Limit** | `workflows` — 15 req/min |
| **RBAC** | `workflows:write` |

**Request Body — Create Workflow:**

```json
{
  "organizationId": "org123",
  "name": "Monthly KPI Report",
  "description": "Auto-generate KPI report on the 1st of each month",
  "trigger": "scheduled",
  "schedule": "0 9 1 * *",
  "steps": [
    {
      "type": "agent",
      "name": "Gather KPIs",
      "config": "{\"agentType\": \"cfo\"}",
      "order": 0,
      "dependsOn": []
    },
    {
      "type": "tool",
      "name": "Generate PDF",
      "config": "{\"toolName\": \"pdf\", \"template\": \"kpi_report\"}",
      "order": 1,
      "dependsOn": ["step_0"]
    },
    {
      "type": "notification",
      "name": "Notify Team",
      "config": "{\"channel\": \"slack\"}",
      "order": 2,
      "dependsOn": ["step_1"]
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `organizationId` | string | Yes | Organization ID |
| `name` | string | Yes | Workflow name |
| `description` | string | No | Description |
| `trigger` | string | Yes | `manual`, `scheduled`, `event` |
| `schedule` | string | No | Cron expression (required if `trigger=scheduled`) |
| `steps` | array | No | Workflow step definitions |

**Step Types:** `agent`, `tool`, `condition`, `delay`, `notification`, `pipeline`

**Request Body — Execute Workflow:**

```json
{
  "action": "execute",
  "workflowId": "wf_cuid123",
  "triggeredBy": "user123"
}
```

**Success Response — Create (201):**

```json
{
  "workflow": {
    "id": "wf_cuid456",
    "name": "Monthly KPI Report",
    "isActive": false,
    "steps": [ ... ],
    "runs": []
  }
}
```

**Success Response — Execute (201):**

```json
{
  "run": {
    "id": "wr_cuid789",
    "workflowId": "wf_cuid123",
    "status": "completed",
    "triggeredBy": "user123",
    "startedAt": "2025-07-15T10:00:00.000Z",
    "completedAt": "2025-07-15T10:03:00.000Z"
  }
}
```

---

### PATCH /api/workflows/[id]

Update a workflow's configuration or toggle active state.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `workflows:write` |

**Request Body:**

```json
{
  "name": "Updated Workflow Name",
  "isActive": true,
  "schedule": "0 10 1 * *"
}
```

---

### DELETE /api/workflows/[id]

Delete a workflow and all its steps and runs.

| Property | Value |
|---|---|
| **Authentication** | Required |
| **RBAC** | `workflows:admin` |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

---

## Appendix A: Agent Types Reference

| Agent | Type Key | Capabilities |
|---|---|---|
| CFO Agent | `cfo` | Financial analysis, burn rate, forecasting, KPI insights |
| CEO Agent | `ceo` | Strategic planning, market positioning, vision alignment |
| Research Agent | `research` | Market research, competitor analysis, industry benchmarks |
| Growth Agent | `growth` | Growth strategy, funnel optimization, acquisition channels |
| Operations Agent | `operations` | Process optimization, efficiency analysis, cost reduction |
| Fundraising Agent | `fundraising` | Pitch preparation, investor matching, due diligence |
| Browser Agent | `browser` | Web automation, data extraction, competitive monitoring |
| Reporting Agent | `reporting` | Report generation, data visualization, narrative creation |

---

## Appendix B: Tool Categories

| Category | Tools | Approval Required |
|---|---|---|
| `browser` | Web automation, screenshots, data extraction | Yes |
| `finance` | Forecast calculations, variance analysis | No |
| `communication` | Email, Slack, Discord integrations | Yes |
| `analytics` | Data analysis, chart generation | No |
| `export` | PDF, DOCX, PPTX, CSV, XLSX generation | No |
| `crm` | CRM data access, customer management | Yes |
| `code_execute` | Sandboxed code execution | Yes |

---

## Appendix C: Status Enums

### Business Plan

`draft` → `review` → `approved` → `archived`

### Forecast

`best` | `base` | `worst` | `custom`

### Idea Canvas

`draft` → `validating` → `validated` | `needs_rework` → `archived`

### Plan Review

`pending` → `reviewing` → `completed` | `needs_revision`

### Pitch Deck

`draft` → `generating` → `ready` → `presented` → `archived`

### Workflow / Pipeline Run

`pending` → `running` → `completed` | `failed` | `cancelled`

### Export

`pending` → `processing` → `completed` | `failed`

### Tool Execution

`pending` → `running` → `completed` | `failed` | `pending_approval`

### Financial Alert Level

`on_track` | `warning` | `critical` | `exceeded`

---

## Appendix D: Changelog

| Date | Version | Changes |
|---|---|---|
| 2025-07-15 | 4.0 | Initial comprehensive API documentation |
