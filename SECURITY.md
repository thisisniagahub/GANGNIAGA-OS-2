# GangNiaga AI OS — Security Documentation

> **Version:** 4.0  
> **Last Updated:** 2026-03-04  
> **Classification:** Internal  
> **Review Cadence:** Quarterly

---

## Table of Contents

1. [Security Architecture Overview](#1-security-architecture-overview)
2. [Authentication](#2-authentication)
3. [Authorization](#3-authorization)
4. [Rate Limiting](#4-rate-limiting)
5. [Audit Logging](#5-audit-logging)
6. [API Key Security](#6-api-key-security)
7. [Data Protection](#7-data-protection)
8. [OWASP Top 10 Compliance](#8-owasp-top-10-compliance)
9. [Vulnerability Reporting](#9-vulnerability-reporting)
10. [Security Headers](#10-security-headers)
11. [Dependency Security](#11-dependency-security)

---

## 1. Security Architecture Overview

### 1.1 Defense in Depth

GangNiaga AI OS employs a layered security model where each request passes through multiple security checkpoints before reaching business logic:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     GangNiaga Security Architecture                      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Layer 1: Network                                                   │  │
│  │ TLS 1.2+ · HTTPS enforcement · Caddy reverse proxy · IP allowlist │  │
│  └──────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                            │
│  ┌──────────────────────────▼─────────────────────────────────────────┐  │
│  │ Layer 2: Rate Limiting                                             │  │
│  │ IP-based pre-check → User-based granular check per endpoint        │  │
│  └──────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                            │
│  ┌──────────────────────────▼─────────────────────────────────────────┐  │
│  │ Layer 3: Authentication                                            │  │
│  │ 4-strategy resolution: Cookie → Server cookie → URL param → Bearer │  │
│  └──────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                            │
│  ┌──────────────────────────▼─────────────────────────────────────────┐  │
│  │ Layer 4: Authorization (RBAC)                                      │  │
│  │ Global role check → Organization role check → Resource-action check │  │
│  └──────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                            │
│  ┌──────────────────────────▼─────────────────────────────────────────┐  │
│  │ Layer 5: Business Logic                                            │  │
│  │ Input validation · Tool permission checks · Sandboxed execution    │  │
│  └──────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                            │
│  ┌──────────────────────────▼─────────────────────────────────────────┐  │
│  │ Layer 6: Audit & Observability                                     │  │
│  │ Non-blocking audit logs · Token usage tracking · Error monitoring  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Security Principles

| Principle | Implementation |
|-----------|---------------|
| **Least Privilege** | RBAC with granular resource-action permissions; agents restricted to allowed tools |
| **Defense in Depth** | 6-layer security pipeline on every API request |
| **Fail Securely** | Auth failures return 401, RBAC failures return 403, rate limit failures return 429 |
| **No Security Through Obscurity** | All security mechanisms are documented; API keys are hashed, not just hidden |
| **Non-Blocking Audit** | Audit logs never block request processing (fire-and-forget pattern) |
| **Zero Trust Agents** | Every agent tool call is permission-checked and recorded |

### 1.3 Trust Boundaries

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Browser/Client │────▶│   API Gateway    │────▶│   Engine Layer   │
│   (Untrusted)    │     │   (withApiHandler)│     │   (Trusted)      │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                              │                          │
                              ▼                          ▼
                        ┌──────────┐              ┌──────────────┐
                        │ Database │              │ LLM Provider │
                        │ (Trusted)│              │ (Semi-trusted)│
                        └──────────┘              └──────────────┘
```

- **Untrusted**: All client-side input, including cookies, headers, URL parameters, and request bodies
- **Semi-trusted**: LLM-generated content (agent responses may contain tool calls that require separate permission checks)
- **Trusted**: Database, engine business logic, and server-side computed values

---

## 2. Authentication

### 2.1 Four-Strategy Resolution Chain

GangNiaga resolves the authenticated user through a 4-strategy fallback chain. Each strategy is tried in order, and the first successful resolution is used:

| Priority | Strategy | Source | Use Case | Security Level |
|----------|----------|--------|----------|---------------|
| 1 | Request Cookie | `req.cookies.get('session_user')` | Browser API calls via Next.js | High |
| 2 | Server Cookie | `cookies().get('session_user')` | Server components and actions | High |
| 3 | URL Parameter | `?userId=...` query param | WebSocket fallback, iframe embeds | Low |
| 4 | Bearer Token | `Authorization: Bearer <token>` | API keys, programmatic access | Medium |

### 2.2 Session Cookie Configuration

| Property | Value | Rationale |
|----------|-------|-----------|
| Name | `session_user` | Explicit naming for clarity |
| HttpOnly | `true` | Prevents JavaScript access (XSS protection) |
| Secure | `true` (production) | HTTPS-only transmission |
| SameSite | `lax` | CSRF protection while allowing top-level navigations |
| Max-Age | 7 days (604,800 seconds) | Balance between security and usability |
| Value | CUID user ID | Direct user identifier from the `users` table |

### 2.3 Authentication Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      Authentication Flow                           │
│                                                                    │
│  1. POST /api/auth/login { email, password }                      │
│     ├── Validate email exists in database                         │
│     ├── Compare password with bcrypt hash (passwordHash field)    │
│     ├── On success:                                               │
│     │   ├── Set session_user cookie with user.id                  │
│     │   ├── Update lastLoginAt timestamp                          │
│     │   └── Return user + organization data                       │
│     └── On failure: Return 401 UNAUTHORIZED                       │
│                                                                    │
│  2. POST /api/auth/register { name, email, password }             │
│     ├── Validate email uniqueness                                 │
│     ├── Hash password with bcrypt (10 rounds)                     │
│     ├── Create User record                                        │
│     ├── Create Organization with slug                              │
│     ├── Create Membership (owner role)                             │
│     ├── Create sample KPIs                                        │
│     ├── Set session_user cookie                                   │
│     └── Return user + organization data                           │
│                                                                    │
│  3. GET /api/auth/session                                         │
│     ├── Resolve user via 4-strategy chain                         │
│     ├── Query user with membership and organization               │
│     └── Return user + organization (or null if unauthenticated)   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 2.4 Password Security

| Property | Implementation |
|----------|---------------|
| Hashing algorithm | bcrypt |
| Default rounds | 10 (configurable via `BCRYPT_ROUNDS` env var) |
| Password requirements | Minimum 6 characters (enforced on registration) |
| Password storage | `passwordHash` field in `User` model |
| Null passwords | Supported for OAuth-only users (`passwordHash` is nullable) |

### 2.5 Known Authentication Limitations (v4.0)

| Limitation | Risk | Mitigation | Planned Fix |
|------------|------|------------|-------------|
| No JWT tokens | Cannot validate tokens without DB lookup | Acceptable for current scale | v4.1: JWT support |
| No refresh token rotation | Long-lived session cookie | 7-day max age limits exposure | v4.1: Token rotation |
| No password reset | Users cannot recover accounts | Manual admin intervention | v4.1: Email-based reset |
| No email verification | Anyone can register | Rate limiting on registration | v4.1: Email verification |
| URL parameter auth fallback | Potential for credential leakage in logs | Only used when other strategies fail | v5.0: Remove URL param strategy |
| No 2FA | Single-factor authentication only | Acceptable for current user base | v5.0: TOTP-based 2FA |

---

## 3. Authorization

### 3.1 Role-Based Access Control (RBAC)

GangNiaga implements a two-tier RBAC system:

**Tier 1: Global Roles** (system-wide, stored in `User.role`)

| Role | Permissions | Assignment |
|------|-------------|------------|
| `super_admin` | Wildcard (`*`) — full access to everything | Manual database assignment |
| `admin` | Read, write, execute, admin | Manual database assignment |
| `user` | Read, write | Default on registration |

**Tier 2: Organization Roles** (per-organization, stored in `Membership.role`)

| Role | Permissions | Assignment |
|------|-------------|------------|
| `owner` | Wildcard (`*`) — full org access | Created on organization creation |
| `admin` | Read, write, execute, admin (most resources) | Invited by owner/admin |
| `manager` | Read, write, execute (no admin) | Invited by owner/admin |
| `accountant` | Read, write, execute:finance (limited) | Invited by owner/admin |
| `viewer` | Read only | Invited by owner/admin |

### 3.2 Resource-Action Permission Matrix

| Resource | owner | admin | manager | accountant | viewer |
|----------|-------|-------|---------|------------|--------|
| `plans` | CRUD+X+A | CRUD+X+A | CRUD+X | R | R |
| `forecasts` | CRUD+X+A | CRUD+X | CRUD+X | CRUD+X | R |
| `agents` | CRUD+X+A | CRUD+X | CRUD+X | R+X | R |
| `workflows` | CRUD+X+A | CRUD+X | CRUD+X | R | R |
| `reports` | CRUD+X+A | CRUD+X+A | CRU | CRU | R |
| `settings` | CRUD+X+A | CRU | R | R | R |
| `exports` | CRUD+X+A | CRUD+X | CRU | CRU | R |
| `integrations` | CRUD+X+A | CRUD+X | R | R | R |
| `browser` | CRUD+X+A | CRUD+X | R+X | — | — |
| `kpis` | CRUD+X+A | CRUD+X | CRU | CRU | R |

**Legend:** C=Create, R=Read, U=Update, D=Delete, X=Execute, A=Admin

### 3.3 Permission Resolution Logic

```typescript
function hasPermission(userRole, orgRole, resource, action): boolean {
  // Step 1: Super admin / owner gets wildcard
  if (GLOBAL_ROLE_PERMISSIONS[userRole]?.includes('*')) return true
  if (ORG_ROLE_PERMISSIONS[orgRole]?.includes('*')) return true

  // Step 2: Check resource-action matrix for org role
  const resourcePermissions = ROLE_RESOURCE_PERMISSIONS[orgRole]
  if (!resourcePermissions) return false

  const resourcePerm = resourcePermissions.find(rp => rp.resource === resource)
  if (!resourcePerm) return false

  // Step 3: Direct action match
  if (resourcePerm.actions.includes(action)) return true

  // Step 4: Scoped action match (e.g., 'execute:finance' matches 'execute')
  if (action.includes(':')) {
    const [baseAction] = action.split(':')
    if (resourcePerm.actions.includes(baseAction)) return true
  }

  // Step 5: Admin implies all actions for the resource
  if (resourcePerm.actions.includes('admin')) return true

  return false
}
```

### 3.4 Agent Permissions

In addition to user RBAC, agents have their own permission model via the `AgentPermission` table:

| Agent Type | Allowed Tools | Max Concurrent Tasks |
|------------|--------------|---------------------|
| CFO | `forecast_calculate`, `kpi_update`, `analytics_query`, `export_generate` | 3 |
| CEO | `web_search`, `analytics_query`, `crm_lookup` | 2 |
| Research | `web_search`, `browser_navigate`, `analytics_query` | 5 |
| Growth | `web_search`, `analytics_query`, `crm_lookup`, `notification_send` | 3 |
| Operations | `analytics_query`, `kpi_update`, `notification_send` | 3 |
| Fundraising | `web_search`, `analytics_query`, `export_generate`, `forecast_calculate` | 2 |
| Browser | `browser_navigate`, `web_search` | 2 |
| Reporting | `analytics_query`, `export_generate`, `kpi_update`, `forecast_calculate` | 3 |

Agent permissions are enforced at two levels:

1. **Tool access** — Agents can only call tools in their `allowedTools` list
2. **Database permissions** — The `AgentPermission` table controls resource-action access per agent type

### 3.5 Tool Approval Requirements

High-risk tools require explicit user approval before execution:

| Tool | Requires Approval | Sandboxed | Rate Limit |
|------|-------------------|-----------|------------|
| `web_search` | No | No | 10/min |
| `forecast_calculate` | No | No | — |
| `browser_navigate` | No | Yes | 5/min |
| `email_send` | **Yes** | No | 10/min |
| `export_generate` | No | No | — |
| `crm_lookup` | No | No | — |
| `analytics_query` | No | No | — |
| `kpi_update` | No | No | — |
| `notification_send` | No | No | — |
| `code_execute` | **Yes** | **Yes** | — |

---

## 4. Rate Limiting

### 4.1 Implementation

GangNiaga uses an **in-memory sliding window rate limiter** implemented in `src/lib/middleware/rate-limit.ts`. The limiter operates on two levels:

1. **Pre-auth (IP-based)** — Applied before user identification using `x-forwarded-for` or `x-real-ip` headers
2. **Post-auth (User-based)** — Applied after user identification using the user's CUID

### 4.2 Endpoint Configuration

| Endpoint | Window | Max Requests | Rationale |
|----------|--------|-------------|-----------|
| `auth` | 60s | 10 | Prevent brute-force login attacks |
| `chat` | 60s | 20 | Moderate LLM usage |
| `agents` | 60s | 10 | Expensive LLM operations |
| `reports` | 300s | 5 | Heavy generation operations |
| `forecasts` | 60s | 10 | Computation-intensive |
| `plans` | 60s | 15 | Standard CRUD operations |
| `exports` | 60s | 10 | File generation overhead |
| `workflows` | 60s | 15 | Standard operations |
| `settings` | 60s | 30 | Low-risk configuration |
| `default` | 60s | 60 | Catch-all for unspecified endpoints |

### 4.3 Rate Limit Headers

All API responses include IETF draft standard rate limit headers:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1709554800
X-RateLimit-Window: 60s
```

### 4.4 Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": "Reset at 2025-07-15T10:31:00.000Z"
}
```

### 4.5 Rate Limit Store Management

| Function | Purpose |
|----------|---------|
| `checkRateLimit(identifier, endpoint)` | Check if a request is allowed |
| `getRateLimitHeaders(identifier, endpoint)` | Generate rate limit response headers |
| `setRateLimitConfig(endpoint, config)` | Dynamically update rate limit configuration |
| `resetRateLimit(identifier, endpoint)` | Reset rate limit for a specific identifier |
| `getRateLimitStats()` | Get current store statistics for monitoring |

### 4.6 Rate Limiting Limitations (v4.0)

| Limitation | Impact | Planned Fix |
|------------|--------|-------------|
| In-memory only | Lost on server restart; not shared across instances | v5.0: Redis-backed rate limiting |
| No per-organization limits | All organizations share the same rate limits | v5.0: Per-tenant rate limiting |
| No graduated throttling | Hard stop when limit reached (no slow-down) | v5.0: Graduated response |
| No blocklist | Cannot permanently block abusive IPs | v5.0: IP blocklist in Redis |

---

## 5. Audit Logging

### 5.1 Audit Log Schema

All significant actions are recorded in the `AuditLog` table:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | CUID | Unique log entry identifier |
| `userId` | String? (FK, SetNull) | Who performed the action (preserved even if user is deleted) |
| `organizationId` | String? | Organization context |
| `action` | String | Dot-notation action (e.g., `plan.create`, `agent.execute`) |
| `resource` | String | Resource type (e.g., `business_plans`, `agent_sessions`) |
| `resourceId` | String? | Specific resource instance ID |
| `status` | String | `success`, `failure`, or `denied` |
| `ipAddress` | String? | Client IP address |
| `userAgent` | String? | Client browser/client info |
| `details` | String? (JSON) | Context of the action |
| `metadata` | String (JSON) | Additional structured data (duration, statusCode) |
| `createdAt` | DateTime | Immutable timestamp |

### 5.2 Audited Actions

| Category | Actions Logged |
|----------|---------------|
| Authentication | `auth.failure`, `auth.success` |
| Rate Limiting | `rate_limit.exceeded` |
| Plans | `plans.read`, `plans.write`, `plans.admin` |
| Forecasts | `forecasts.read`, `forecasts.write` |
| Agents | `agents.read`, `agents.execute` |
| Workflows | `workflows.read`, `workflows.write`, `workflows.execute` |
| Reports | `reports.read`, `reports.write` |
| Settings | `settings.read`, `settings.write` |
| Exports | `exports.read`, `exports.write` |
| Browser | `browser.read`, `browser.write`, `browser.execute` |
| KPIs | `kpis.read`, `kpis.write` |

### 5.3 Audit Log Properties

| Property | Implementation |
|----------|---------------|
| **Non-blocking** | Audit logs use fire-and-forget pattern (`logAudit().catch(() => {})`) |
| **Immutable** | No update or delete operations on audit records |
| **User deletion safe** | `userId` uses `SetNull` on delete, preserving the audit trail |
| **IP capture** | Client IP from `x-forwarded-for` or `x-real-ip` header |
| **Performance data** | `metadata.duration` and `metadata.statusCode` captured for all successful actions |

### 5.4 Data Retention

| Data Type | Retention Period | Purge Method |
|-----------|-----------------|-------------|
| Audit logs | 1 year | Scheduled job |
| Rate limit logs | 90 days | Scheduled job |
| Observability events | 90 days | Scheduled job |
| Token usage | 90 days | Scheduled job |
| Business data | Indefinite | Manual only |

---

## 6. API Key Security

### 6.1 API Key Lifecycle

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Create     │────▶│    Store      │────▶│    Validate   │────▶│   Revoke     │
│              │     │   (Hashed)    │     │   (Compare)   │     │  (Soft delete)│
│              │     │              │     │              │     │              │
│ Generate:    │     │ keyHash:     │     │ SHA-256 of   │     │ isActive:    │
│ gn_live_...  │     │ SHA-256(raw) │     │ Bearer token │     │ false        │
│              │     │              │     │ == keyHash    │     │              │
│ keyPrefix:   │     │ keyPrefix:   │     │              │     │ lastUsedAt:  │
│ First 8 chars│     │ gn_live_     │     │              │     │ preserved    │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 6.2 API Key Properties

| Property | Implementation |
|----------|---------------|
| **Format** | `gn_live_` prefix + random string |
| **Hashing** | SHA-256 hash stored in `ApiKey.keyHash` |
| **Prefix** | First 8 characters stored in `ApiKey.keyPrefix` for identification |
| **Permissions** | JSON array of permission strings in `ApiKey.permissions` |
| **Expiration** | Optional `expiresAt` timestamp |
| **Revocation** | Soft delete via `isActive = false` |
| **Last used** | `lastUsedAt` timestamp updated on each use |

### 6.3 API Key Authentication Flow

1. Client sends `Authorization: Bearer gn_live_abc123...`
2. Server extracts the raw token
3. Server computes SHA-256 hash of the raw token
4. Server queries `ApiKey` table: `findUnique({ where: { keyHash } })`
5. If found and `isActive = true` and not expired → authenticate as the key's owner
6. Update `lastUsedAt` timestamp

### 6.4 API Key Best Practices

- **Never store raw API keys** — Only the SHA-256 hash is persisted
- **Show key once** — The raw key is only shown at creation time
- **Prefix for identification** — The `keyPrefix` allows support to identify which key was used without seeing the full key
- **Expiration** — Encourage setting `expiresAt` on all keys
- **Principle of least privilege** — Only grant the minimum required permissions

---

## 7. Data Protection

### 7.1 Data Classification

| Classification | Examples | Storage | Access |
|---------------|----------|---------|--------|
| **Public** | Product descriptions, public research | Database | All authenticated users |
| **Internal** | Business plans, forecasts, KPIs | Database | RBAC-protected |
| **Confidential** | OAuth tokens, API keys, passwords | Database (hashed/encrypted) | System-only |
| **Restricted** | Audit logs with PII | Database | Admin-only |

### 7.2 Encryption at Rest

| Data Type | Current Protection | Planned Protection |
|-----------|-------------------|-------------------|
| Passwords | bcrypt hash (10 rounds) | bcrypt (12 rounds, configurable) |
| API keys | SHA-256 hash | SHA-256 hash (current is sufficient) |
| OAuth tokens | Plaintext (v4.0) | AES-256 encryption (v4.1) |
| SQLite database file | No encryption | SQLCipher or filesystem encryption (v5.0) |
| PostgreSQL | N/A | pgcrypto extension + TDE (v5.0) |

### 7.3 PII Handling

| PII Type | Field | Storage | Masking | Retention |
|----------|-------|---------|---------|-----------|
| Email | `User.email` | Plaintext (unique constraint) | Partial (`j***@example.com`) | Account lifetime |
| Name | `User.name` | Plaintext | Full display | Account lifetime |
| IP Address | `AuditLog.ipAddress` | Plaintext | Last octet masked in UI | 1 year |
| User Agent | `AuditLog.userAgent` | Plaintext | Not displayed in UI | 1 year |
| Password | `User.passwordHash` | bcrypt hash | Never displayed | Account lifetime |

### 7.4 Data Isolation

| Boundary | Implementation |
|----------|---------------|
| Organization | All domain models scoped by `organizationId`; queries always filter by user's org |
| User | Personal data (sessions, notifications, exports) scoped by `userId` |
| Session | Agent sessions and chat sessions scoped by `userId` |
| API Key | API keys scoped by `userId` with org-context from user membership |

### 7.5 Data Deletion

| Scenario | Behavior |
|----------|----------|
| User deletion | Cascades: memberships, chat sessions, agent sessions, browser sessions, exports, API keys. SetNull: audit logs (preserved) |
| Organization deletion | Cascades: all organization-scoped data (plans, forecasts, KPIs, etc.) |
| Plan deletion | Cascades: plan sections |
| Agent session deletion | Cascades: tasks, memories |
| No bulk delete | No API endpoint for bulk data deletion (intentional safety) |

---

## 8. OWASP Top 10 Compliance

### 8.1 Compliance Matrix

| OWASP Category | Status | Implementation | Notes |
|----------------|--------|---------------|-------|
| **A01: Broken Access Control** | ✅ Partial | RBAC with 5 org roles, resource-action matrix, agent permissions | No ABAC yet |
| **A02: Cryptographic Failures** | ⚠️ Partial | bcrypt for passwords, SHA-256 for API keys, TLS 1.2+ | OAuth tokens not encrypted at rest |
| **A03: Injection** | ✅ Good | Prisma ORM parameterized queries, Zod input validation | No raw SQL used |
| **A04: Insecure Design** | ✅ Good | Defense-in-depth architecture, withApiHandler pipeline | URL param auth is a design weakness |
| **A05: Security Misconfiguration** | ⚠️ Partial | No default credentials, secure cookies in production | CSP headers not yet configured |
| **A06: Vulnerable Components** | ⚠️ Partial | Regular `bun install` updates, no known vulnerabilities | No automated dependency scanning |
| **A07: Auth Failures** | ✅ Good | Rate limiting on auth endpoints, bcrypt hashing, session cookies | No account lockout mechanism |
| **A08: Data Integrity Failures** | ⚠️ Partial | Prisma type safety, Zod validation | No subresource integrity for CDN assets |
| **A09: Logging Failures** | ✅ Good | Comprehensive audit logging on all API actions | No centralized log management |
| **A10: SSRF** | ✅ Good | Browser runtime is sandboxed, no arbitrary URL fetching from server | N/A |

### 8.2 Detailed Analysis

#### A01: Broken Access Control — ✅ Partial

**Implemented:**
- 5-tier organization RBAC with resource-action matrix
- Agent-level RBAC with tool permission checks
- `withApiHandler` enforces RBAC on every route
- Super admin and owner roles have wildcard access

**Gaps:**
- No attribute-based access control (ABAC) for fine-grained data filtering
- No row-level security in SQLite
- Viewer role can read all data within their organization (no per-record restrictions)

#### A02: Cryptographic Failures — ⚠️ Partial

**Implemented:**
- bcrypt password hashing (10 rounds default)
- SHA-256 API key hashing
- TLS 1.2+ via Caddy reverse proxy
- Secure session cookies in production

**Gaps:**
- OAuth tokens stored in plaintext in `AccountingConnection` table
- SQLite database file is not encrypted at rest
- No encryption key rotation mechanism

#### A03: Injection — ✅ Good

**Implemented:**
- Prisma ORM uses parameterized queries exclusively
- No raw SQL queries in the codebase
- Zod schema validation on API inputs
- React auto-escapes rendered content (XSS prevention)

**Gaps:**
- JSON fields stored as strings require manual `JSON.parse()` — potential for injection if not validated

#### A05: Security Misconfiguration — ⚠️ Partial

**Implemented:**
- No default credentials
- `ignoreBuildErrors: true` is a known misconfiguration (to be removed in v4.1)
- Debug mode disabled in production

**Gaps:**
- Content Security Policy (CSP) headers not configured
- No HTTP Strict Transport Security (HSTS) header
- No X-Frame-Options or X-Content-Type-Options headers in Next.js responses

---

## 9. Vulnerability Reporting

### 9.1 Reporting Process

We take security vulnerabilities seriously. If you discover a security vulnerability in GangNiaga AI OS, please report it responsibly:

**Do NOT:**
- Open a public GitHub issue
- Post about it on social media
- Exploit the vulnerability beyond what is necessary to demonstrate it

**Do:**
1. Email security@gangniaga.com with the subject: `[SECURITY] Brief Description`
2. Include the following information:
   - Vulnerability type (XSS, SQLi, IDOR, etc.)
   - Affected component or endpoint
   - Steps to reproduce
   - Potential impact
   - Any proof-of-concept code
3. Expect an acknowledgment within 48 hours
4. Allow 90 days for a fix before public disclosure

### 9.2 Vulnerability Severity Classification

| Severity | Criteria | Response Time | Examples |
|----------|----------|--------------|----------|
| **Critical** | Remote code execution, data breach, auth bypass | 24 hours | SQL injection in auth, admin access without credentials |
| **High** | Privilege escalation, significant data exposure | 72 hours | IDOR allowing cross-org data access, RBAC bypass |
| **Medium** | Limited data exposure, DoS vectors | 7 days | Reflected XSS, rate limit bypass |
| **Low** | Information disclosure, minor misconfigurations | 30 days | Verbose error messages, missing security headers |

### 9.3 Bug Bounty Program

A formal bug bounty program is planned for Q4 2026. Until then, we acknowledge and credit all responsible disclosures.

---

## 10. Security Headers

### 10.1 Current Headers

| Header | Status | Value | Notes |
|--------|--------|-------|-------|
| `Content-Type` | ✅ Set | `application/json` | All API responses |
| `X-RateLimit-*` | ✅ Set | Various | All API responses |
| `Set-Cookie` | ✅ Set | `session_user=...` | Login/register responses only |

### 10.2 Recommended Headers (To Be Added in v4.1)

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'` | XSS prevention |
| `X-Content-Type-Options` | `nosniff` | MIME type sniffing prevention |
| `X-Frame-Options` | `DENY` | Clickjacking prevention |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer information leakage |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restrict browser features |

### 10.3 Caddy Security Headers

When using Caddy as a reverse proxy, security headers should be configured in the Caddyfile:

```caddyfile
app.gangniaga.com {
    reverse_proxy localhost:3000

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }
}
```

---

## 11. Dependency Security

### 11.1 Dependency Audit

| Tool | Command | Frequency |
|------|---------|-----------|
| `bun audit` | `bun audit` | Before every release |
| npm audit | `npm audit` | Weekly CI check |
| Snyk | (planned) | Continuous monitoring |

### 11.2 Dependency Update Policy

| Update Type | Policy | Review Required |
|-------------|--------|-----------------|
| Patch updates | Auto-merge if tests pass | No |
| Minor updates | Review changelog, test, merge | Yes |
| Major updates | Full security review, manual testing | Yes |
| Security patches | Priority merge within 48 hours | Minimal |

### 11.3 Known Vulnerable Dependencies

| Package | Version | Risk | Mitigation | Status |
|---------|---------|------|------------|--------|
| None known | — | — | — | ✅ Clear |

### 11.4 Supply Chain Security

| Measure | Status | Notes |
|---------|--------|-------|
| Lock file committed | ✅ Yes | `bun.lock` in repository |
| Integrity hashes | ✅ Yes | Bun verifies package integrity |
| No `*` version ranges | ⚠️ Partial | Some dev dependencies use `^` ranges |
| No install scripts | ✅ Yes | No postinstall scripts in dependencies |
| Minimal dependencies | ✅ Good | 40 production dependencies, all well-maintained |

### 11.5 Key Dependency Security Assessment

| Dependency | Version | Purpose | Risk Level | Notes |
|-----------|---------|---------|-----------|-------|
| `next` | 16.1+ | Framework | Low | Vercel-maintained, frequent security patches |
| `@prisma/client` | 6.11 | ORM | Low | Parameterized queries, no SQL injection risk |
| `z-ai-web-dev-sdk` | 0.0.17 | LLM access | Medium | Pre-1.0, API may change; no known vulns |
| `zod` | 4.x | Validation | Low | Runtime input validation, prevents injection |
| `bcrypt` (via next-auth) | — | Password hashing | Low | Industry-standard password hashing |
| `react` / `react-dom` | 19.0 | UI | Low | Meta-maintained, auto-escaping XSS protection |

---

## Security Review Log

| Date | Reviewer | Scope | Findings | Actions |
|------|----------|-------|----------|---------|
| 2026-03-04 | Engineering | Full security audit | 5 medium findings, 3 low findings | Scheduled for v4.1 |
| — | — | Next review scheduled: Q2 2026 | — | — |

---

*This document is reviewed quarterly and updated with each major release. For questions, contact security@gangniaga.com.*
