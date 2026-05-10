# GangNiaga AI OS — Contributing Guide

Thank you for your interest in contributing to GangNiaga AI OS! This document provides guidelines and instructions for contributing to the project.

> **Version:** 4.0  
> **Last Updated:** 2026-03-04

---

## Table of Contents

1. [Code of Conduct](#1-code-of-conduct)
2. [How to Contribute](#2-how-to-contribute)
3. [Development Setup](#3-development-setup)
4. [Code Style](#4-code-style)
5. [Git Workflow](#5-git-workflow)
6. [Component Development](#6-component-development)
7. [API Route Development](#7-api-route-development)
8. [Testing Guidelines](#8-testing-guidelines)
9. [Documentation Guidelines](#9-documentation-guidelines)
10. [Release Process](#10-release-process)

---

## 1. Code of Conduct

### 1.1 Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please read and follow our Code of Conduct.

### 1.2 Standards

**Expected behavior:**

- Be respectful and inclusive in all interactions
- Provide constructive feedback and accept it gracefully
- Focus on what is best for the community and the project
- Show empathy towards other community members
- Use welcoming and inclusive language

**Unacceptable behavior:**

- Harassment, discrimination, or offensive comments
- Trolling, insulting, or derogatory remarks
- Publishing others' private information without permission
- Any conduct that would be inappropriate in a professional setting

### 1.3 Enforcement

Violations of the Code of Conduct may result in:

1. A private warning from maintainers
2. A public warning and temporary ban
3. Permanent ban from the community

Report violations to: conduct@gangniaga.com

---

## 2. How to Contribute

### 2.1 Bug Reports

Before submitting a bug report, please:

1. **Search existing issues** to avoid duplicates
2. **Reproduce the bug** on the latest version
3. **Gather information**: OS, browser, Node.js version, error messages

**Bug Report Template:**

```markdown
## Bug Description
A clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., macOS 14.2]
- Browser: [e.g., Chrome 120]
- Node.js: [e.g., 20.10.0]
- GangNiaga version: [e.g., 4.0.1]

## Additional Context
Screenshots, logs, or other relevant information.
```

### 2.2 Feature Requests

**Feature Request Template:**

```markdown
## Problem Statement
What problem does this feature solve?

## Proposed Solution
How would you like the feature to work?

## Alternatives Considered
Other approaches you've thought about.

## Additional Context
Mockups, examples from other products, etc.

## Would you be willing to implement this?
[ ] Yes, I'd like to submit a PR for this feature
```

### 2.3 Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main` (see Git Workflow below)
3. **Make changes** following our code style guidelines
4. **Write tests** for new functionality
5. **Update documentation** if needed
6. **Submit a PR** with a clear description

**PR Checklist:**

- [ ] Code compiles without errors (`bun run build`)
- [ ] Linting passes (`bun run lint`)
- [ ] New code has appropriate tests
- [ ] All tests pass
- [ ] Documentation updated (if applicable)
- [ ] No unnecessary files committed (build artifacts, env files)
- [ ] PR description clearly explains the change

---

## 3. Development Setup

### 3.1 Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | `nvm install 20` |
| Bun | 1.0+ | `curl -fsSL https://bun.sh/install \| bash` |
| Git | 2.30+ | System package manager |

### 3.2 Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/gangniaga-ai-os.git
cd gangniaga-ai-os

# Add upstream remote
git remote add upstream https://github.com/gangniaga/gangniaga-ai-os.git

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and Z_AI_API_KEY

# Initialize database
bun run db:push

# Start development server
bun run dev
```

### 3.3 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Root SPA page
│   ├── layout.tsx                # Root layout with providers
│   ├── globals.css               # Tailwind base styles
│   └── api/                      # API route handlers
│       ├── auth/                 # Authentication routes
│       ├── agents/               # AI agent routes
│       ├── plans/                # Business plan routes
│       ├── forecasts/            # Forecast routes
│       └── ...                   # Other domain routes
├── components/
│   ├── ui/                       # 50 shadcn/ui primitives
│   ├── layout/                   # App shell (header, sidebar, command palette)
│   ├── providers/                # Theme provider
│   └── {feature}/               # Feature page components (15 pages)
├── lib/
│   ├── middleware/               # Auth, RBAC, rate-limit, audit, withApiHandler
│   ├── agents/                   # Agent orchestrator, pipeline engine
│   ├── finance/                  # Finance engine
│   ├── idea-validation/          # Idea validation engine
│   ├── plan-review/              # Plan review engine
│   ├── pitch-deck/               # Pitch deck engine
│   ├── research/                 # Research engine
│   ├── browser/                  # Browser runtime
│   ├── exports/                  # Export engine
│   ├── observability/            # Observability tracker
│   ├── memory/                   # Memory engine
│   ├── actuals/                  # Actuals tracking engine
│   ├── workflows/                # Workflow engine
│   ├── tools/                    # Tool executor and registry
│   ├── stores/                   # Zustand stores (app-store, auth-store)
│   ├── db.ts                     # Prisma client singleton
│   └── utils.ts                  # Shared utilities (cn helper)
├── hooks/
│   ├── use-mobile.ts             # Mobile breakpoint hook
│   ├── use-api.ts                # API fetch wrapper hook
│   └── use-toast.ts              # Toast notification hook
└── prisma/
    └── schema.prisma             # Database schema (36+ models)
```

---

## 4. Code Style

### 4.1 TypeScript

| Rule | Convention | Example |
|------|-----------|---------|
| Strict mode | Enabled (tsconfig) | All code must pass strict checks |
| No `any` | Avoid `any`, use `unknown` | `catch (error: unknown)` |
| Explicit return types | Required for exported functions | `export function calc(x: number): number` |
| Interfaces over types | Prefer `interface` for objects | `interface User { id: string }` |
| Enums as const objects | No runtime enums | `const ROLE = { Admin: 'admin' } as const` |
| Nullish coalescing | Use `??` over `\|\|` | `value ?? 'default'` |
| Optional chaining | Use `?.` for safety | `user?.organization?.name` |

### 4.2 ESLint Configuration

The project uses `eslint-config-next` with the default ruleset:

```javascript
// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

Run linting:

```bash
bun run lint
```

### 4.3 Prettier (Recommended)

While not enforced via config, we recommend these formatting conventions:

| Setting | Value |
|---------|-------|
| Print width | 100 |
| Tab width | 2 |
| Semi | No semicolons (following Next.js convention) |
| Single quote | Yes |
| Trailing commas | All |
| Arrow parens | Always |

### 4.4 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (components) | kebab-case | `plan-review-page.tsx` |
| Files (utilities) | kebab-case | `with-api-handler.ts` |
| Files (stores) | kebab-case | `app-store.ts` |
| React components | PascalCase | `PlanReviewPage` |
| Functions | camelCase | `calculateBurnRate` |
| Constants | UPPER_SNAKE | `MAX_CONCURRENT_TASKS` |
| Types/Interfaces | PascalCase | `AuthUser`, `ApiHandlerConfig` |
| Prisma models | PascalCase | `BusinessPlan`, `AgentSession` |
| Database tables | snake_case | `business_plans`, `agent_sessions` |
| API routes | kebab-case | `/api/plan-reviews` |
| Environment variables | UPPER_SNAKE | `DATABASE_URL` |

### 4.5 Import Order

```typescript
// 1. React and Next.js
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 2. Third-party libraries
import { z } from 'zod'
import { create } from 'zustand'

// 3. Internal modules (using @/ alias)
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/middleware/auth'
import type { AuthUser } from '@/lib/middleware/auth'

// 4. Relative imports
import { calculateBurnRate } from './engine'
import type { ForecastResult } from './types'

// 5. Types (always at the end)
```

---

## 5. Git Workflow

### 5.1 Branching Strategy

| Branch | Purpose | Naming Convention |
|--------|---------|-------------------|
| `main` | Production-ready code | `main` |
| `develop` | Integration branch for next release | `develop` |
| Feature | New features | `feat/short-description` |
| Bug fix | Bug fixes | `fix/short-description` |
| Hotfix | Urgent production fixes | `hotfix/short-description` |
| Documentation | Doc changes | `docs/short-description` |

**Examples:**

```
feat/quickbooks-oauth-flow
fix/forecast-calculation-overflow
hotfix/session-cookie-expiry
docs/api-reference-update
```

### 5.2 Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, no logic change) |
| `refactor` | Code refactoring without feature change |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, or infrastructure changes |
| `ci` | CI/CD pipeline changes |

**Scopes:**

| Scope | Area |
|-------|------|
| `agents` | AI agent system |
| `auth` | Authentication and authorization |
| `api` | API routes |
| `db` | Database schema or migrations |
| `finance` | Finance engine |
| `forecast` | Forecasting engine |
| `ui` | UI components and pages |
| `mem` | Memory system |
| `pipeline` | Pipeline engine |
| `tools` | Tool registry and execution |

**Examples:**

```bash
feat(agents): add streaming support for agent task execution
fix(finance): correct burn rate calculation for partial months
docs(api): add curl examples for forecast endpoints
refactor(auth): extract user resolution into separate strategies
test(pipeline): add unit tests for Kahn's algorithm
chore(deps): update z-ai-web-dev-sdk to 0.0.18
```

### 5.3 Pull Request Process

1. **Create a branch** from `main` with the appropriate naming convention
2. **Make your changes** following the code style guidelines
3. **Write tests** for new functionality
4. **Ensure all checks pass**:
   - `bun run lint` — no linting errors
   - `bun run build` — builds successfully
   - All existing tests pass
5. **Push your branch** and create a PR against `main`
6. **Fill out the PR template** completely
7. **Request review** from a maintainer
8. **Address review feedback** and push updates
9. **Squash merge** once approved

### 5.4 PR Size Guidelines

| Size | Lines Changed | Review Time |
|------|--------------|-------------|
| Small | < 100 | < 1 day |
| Medium | 100-500 | 1-2 days |
| Large | 500-1000 | 2-4 days |
| Extra Large | > 1000 | Split into multiple PRs |

---

## 6. Component Development

### 6.1 shadcn/ui Pattern

GangNiaga uses shadcn/ui components built on Radix UI primitives. Follow these patterns:

**Creating a new page component:**

```tsx
// src/components/my-feature/my-feature-page.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth-store'

export function MyFeaturePage() {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Feature</h1>
        <p className="text-muted-foreground">Description of this feature</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Content here */}
        </CardContent>
      </Card>
    </div>
  )
}
```

### 6.2 Component Checklist

- [ ] Use `'use client'` directive for components with state/effects
- [ ] Use shadcn/ui primitives as building blocks
- [ ] Follow Tailwind CSS utility patterns (spacing, typography, colors)
- [ ] Use `cn()` utility for conditional class merging
- [ ] Implement loading states with `<Skeleton />` component
- [ ] Handle error states with appropriate UI (empty states, error messages)
- [ ] Use `useToast()` for user notifications
- [ ] Respect dark mode (use CSS variables from the theme)
- [ ] Ensure responsive design (mobile-first with `md:` and `lg:` breakpoints)

### 6.3 State Management

```tsx
// Use Zustand stores for global state
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAppStore } from '@/lib/stores/app-store'

// Use local useState for component-local state
const [value, setValue] = useState('')

// Use the useApi hook for data fetching
import { useApi } from '@/hooks/use-api'
const { data, isLoading, error, execute } = useApi('/api/plans')
```

### 6.4 Adding New shadcn/ui Components

```bash
# Add a new shadcn/ui component
bunx shadcn@latest add [component-name]

# Example:
bunx shadcn@latest add dialog
```

This creates the component at `src/components/ui/[component-name].tsx` with the correct patterns.

---

## 7. API Route Development

### 7.1 withApiHandler Pattern

All API routes must use the `withApiHandler` wrapper for consistent auth, RBAC, rate limiting, and audit logging:

```typescript
// src/app/api/my-resource/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, successResponse, paginatedResponse } from '@/lib/middleware/with-api-handler'
import { db } from '@/lib/db'

// GET handler — list resources
export const GET = withApiHandler(
  {
    resource: 'my-resource',
    action: 'read',
  },
  async (req, user) => {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const [items, total] = await Promise.all([
      db.myModel.findMany({
        where: { organizationId: user.organizationId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.myModel.count({
        where: { organizationId: user.organizationId },
      }),
    ])

    return paginatedResponse(items, { page, pageSize, total })
  }
)

// POST handler — create resource
export const POST = withApiHandler(
  {
    resource: 'my-resource',
    action: 'write',
    rateLimitEndpoint: 'my-resource', // Optional: custom rate limit category
  },
  async (req, user) => {
    const body = await req.json()

    // Validate input
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const item = await db.myModel.create({
      data: {
        name: body.name,
        organizationId: user.organizationId,
      },
    })

    return successResponse(item, { status: 201 })
  }
)
```

### 7.2 Dynamic Route Handlers

```typescript
// src/app/api/my-resource/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, successResponse } from '@/lib/middleware/with-api-handler'
import { db } from '@/lib/db'

export const GET = withApiHandler(
  { resource: 'my-resource', action: 'read' },
  async (req, user, context) => {
    const id = req.url.split('/').pop()
    const item = await db.myModel.findUnique({
      where: { id, organizationId: user.organizationId },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return successResponse(item)
  }
)

export const PATCH = withApiHandler(
  { resource: 'my-resource', action: 'write' },
  async (req, user) => {
    const id = req.url.split('/').pop()
    const body = await req.json()

    const item = await db.myModel.update({
      where: { id, organizationId: user.organizationId },
      data: body,
    })

    return successResponse(item)
  }
)

export const DELETE = withApiHandler(
  { resource: 'my-resource', action: 'admin' },
  async (req, user) => {
    const id = req.url.split('/').pop()

    await db.myModel.delete({
      where: { id, organizationId: user.organizationId },
    })

    return NextResponse.json({ success: true, message: 'Deleted' })
  }
)
```

### 7.3 Engine Pattern

Each domain has a standalone engine module under `src/lib/{domain}/engine.ts`. Engines contain pure business logic with no HTTP concerns:

```typescript
// src/lib/my-domain/engine.ts
import { db } from '@/lib/db'

export interface MyDomainInput {
  name: string
  organizationId: string
}

export interface MyDomainOutput {
  id: string
  name: string
  result: string
}

export async function processMyDomain(input: MyDomainInput): Promise<MyDomainOutput> {
  // Business logic here — no HTTP, no NextRequest, no NextResponse
  // This function can be called from API routes, agent tools, or pipelines

  return {
    id: 'generated-id',
    name: input.name,
    result: 'processed',
  }
}
```

### 7.4 API Handler Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `resource` | `string` | — | Resource name for RBAC and audit |
| `action` | `string` | — | Action for RBAC (read, write, execute, admin) |
| `rateLimitEndpoint` | `string` | `resource` | Custom rate limit category |
| `auditAction` | `string` | `resource.action` | Custom audit action name |
| `skipAuth` | `boolean` | `false` | Skip authentication check |
| `skipRbac` | `boolean` | `false` | Skip RBAC permission check |

---

## 8. Testing Guidelines

### 8.1 Testing Stack (Planned for v4.1)

| Tool | Purpose | Config |
|------|---------|--------|
| Vitest | Unit and integration testing | `vitest.config.ts` |
| React Testing Library | Component testing | Setup in vitest config |
| Playwright | End-to-end testing | `playwright.config.ts` |
| MSW | API mocking | In-test setup |

### 8.2 Test File Organization

```
src/
├── lib/
│   ├── finance/
│   │   ├── engine.ts
│   │   └── __tests__/
│   │       └── engine.test.ts       # Unit tests for finance engine
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── __tests__/
│   │       └── auth.test.ts         # Unit tests for auth middleware
│   └── ...
├── app/api/
│   ├── plans/
│   │   ├── route.ts
│   │   └── __tests__/
│   │       └── route.test.ts        # Integration tests for plans API
│   └── ...
└── components/
    ├── plans/
    │   ├── plans-page.tsx
    │   └── __tests__/
    │       └── plans-page.test.tsx   # Component tests
    └── ...
```

### 8.3 Unit Test Example

```typescript
// src/lib/finance/__tests__/engine.test.ts
import { describe, it, expect } from 'vitest'
import { calculateBurnRate } from '../engine'

describe('calculateBurnRate', () => {
  it('should calculate burn rate from monthly expenses', () => {
    const result = calculateBurnRate({
      totalExpenses: 50000,
      totalRevenue: 30000,
    })
    expect(result.monthlyBurnRate).toBe(20000)
  })

  it('should calculate runway from cash balance and burn rate', () => {
    const result = calculateBurnRate({
      totalExpenses: 50000,
      totalRevenue: 30000,
      cashBalance: 180000,
    })
    expect(result.runwayMonths).toBe(9)
  })

  it('should return Infinity runway when burn rate is zero', () => {
    const result = calculateBurnRate({
      totalExpenses: 30000,
      totalRevenue: 30000,
      cashBalance: 100000,
    })
    expect(result.runwayMonths).toBe(Infinity)
  })
})
```

### 8.4 API Integration Test Example

```typescript
// src/app/api/plans/__tests__/route.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

describe('POST /api/plans', () => {
  it('should create a plan with valid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Plan',
        description: 'A test business plan',
      }),
      headers: {
        'content-type': 'application/json',
        cookie: 'session_user=test-user-id',
      },
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe('Test Plan')
  })

  it('should return 401 without authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Plan' }),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})
```

### 8.5 Coverage Targets

| Module | Target Coverage | Priority |
|--------|----------------|----------|
| Engine functions | 80% | P0 |
| API routes | 60% | P0 |
| Middleware | 70% | P1 |
| UI components | 40% | P2 |
| Utility functions | 90% | P1 |

---

## 9. Documentation Guidelines

### 9.1 Code Documentation

**Functions:**

```typescript
/**
 * Calculate burn rate and runway from financial data.
 *
 * @param input - Financial input with expenses, revenue, and cash balance
 * @returns Object containing monthlyBurnRate, runwayMonths, and burnTrend
 *
 * @example
 * ```ts
 * const result = calculateBurnRate({
 *   totalExpenses: 50000,
 *   totalRevenue: 30000,
 *   cashBalance: 180000,
 * })
 * // result.runwayMonths === 9
 * ```
 */
export function calculateBurnRate(input: BurnRateInput): BurnRateOutput {
  // ...
}
```

**Types:**

```typescript
/** Authenticated user object resolved from the 4-strategy auth pipeline */
export interface AuthUser {
  /** Unique user identifier (CUID) */
  id: string
  /** User email address */
  email: string
  /** Display name (nullable for OAuth-only users) */
  name: string | null
  /** Global role: 'user', 'admin', or 'super_admin' */
  role: string
  /** Primary organization ID */
  organizationId: string
  /** Organization role: 'owner', 'admin', 'manager', 'accountant', or 'viewer' */
  organizationRole: string
}
```

### 9.2 API Documentation

All new API endpoints must be documented in `API.md` with:

1. HTTP method and path
2. Authentication and RBAC requirements
3. Request body schema (with types and required flags)
4. Success response schema
5. Error response codes
6. curl example

### 9.3 Architecture Documentation

New engine modules or significant architectural changes must update `ARCHITECTURE.md` with:

1. Module purpose and location
2. Key functions and their signatures
3. Data flow diagrams (if applicable)
4. Integration points with other modules

---

## 10. Release Process

### 10.1 Version Numbering

GangNiaga follows [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (e.g., API route signature changes, schema migrations)
MINOR: New features, non-breaking changes (e.g., new agent type, new page)
PATCH: Bug fixes, security patches (e.g., auth fix, UI bug fix)
```

### 10.2 Release Checklist

- [ ] All PRs merged to `main` since last release are reviewed
- [ ] All tests pass on `main`
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated with all changes
- [ ] Database migration tested (if applicable)
- [ ] Documentation updated (API.md, ARCHITECTURE.md)
- [ ] Tag created: `git tag -a v4.x.x -m "Release v4.x.x"`
- [ ] Docker image built and pushed
- [ ] Deployment to staging verified
- [ ] Deployment to production
- [ ] Post-deployment smoke tests pass

### 10.3 Hotfix Process

```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-auth-fix main

# Make the fix
# ...

# Test thoroughly
bun run lint && bun run build

# Create PR against main
# After merge, also cherry-pick to develop
git checkout develop
git cherry-pick <commit-hash>
```

### 10.4 Branch Protection Rules

| Branch | Protection |
|--------|-----------|
| `main` | Require PR review, require status checks, no direct pushes |
| `develop` | Require PR review, require status checks |

---

*Thank you for contributing to GangNiaga AI OS! Your efforts help make autonomous business intelligence accessible to everyone.*
