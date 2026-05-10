# Task 3 — API Middleware System

## Agent: Middleware Agent

## Summary
Built the complete API middleware system for GangNiaga AI covering authentication, RBAC, rate limiting, and audit logging.

## Files Created
| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/middleware/auth.ts` | Authentication — session cookie extraction, DB validation, AuthUser type, AuthError | ~90 |
| `src/lib/middleware/rbac.ts` | RBAC — role hierarchy, resource-action matrix, agent permissions, RbacError | ~250 |
| `src/lib/middleware/rate-limit.ts` | Rate limiting — in-memory Map, 9 endpoint configs, IETF headers, auto-cleanup | ~178 |
| `src/lib/middleware/audit.ts` | Audit logging — fire-and-forget DB writes, convenience methods, request metadata | ~120 |
| `src/lib/middleware/with-api-handler.ts` | API route wrapper — combines all middleware into single HOF | ~280 |
| `src/lib/middleware/index.ts` | Barrel exports | ~30 |

## Key Design Decisions
- **Not Next.js middleware.ts**: These are utility functions for API route handlers, not a Next.js middleware file
- **Dual cookie access**: Supports both `NextRequest.cookies` and `next/headers cookies()` for flexibility
- **Fire-and-forget audit**: All `logAudit()` calls are non-blocking; errors are caught and logged to console
- **Dual rate limiting**: IP-based pre-auth check + user ID-based post-auth check for finer granularity
- **Compound actions**: `execute:finance` inherits from `execute` permission automatically
- **In-memory rate limit**: No Redis dependency; entries auto-clean every 2 minutes

## Usage Example
```typescript
import { withApiHandler } from '@/lib/middleware'

export const POST = withApiHandler(
  { resource: 'plans', action: 'write' },
  async (req, user) => {
    const body = await req.json()
    // ... business logic
    return NextResponse.json({ success: true, data: plan })
  }
)
```
