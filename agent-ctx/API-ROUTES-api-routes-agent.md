# Task: API-ROUTES - Create Missing API Routes

## Summary
Created all 7 missing API route files for the GangNiaga AI project.

## Files Created

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/kpis/route.ts` | GET, POST | KPI listing by org + KPI creation |
| `/api/workflows/route.ts` | GET, POST | Workflow listing (with steps + runs) + workflow creation with nested steps |
| `/api/workflows/[id]/route.ts` | PATCH, DELETE | Workflow update (with step replacement) + deletion |
| `/api/notifications/route.ts` | GET, POST, PATCH | Notifications with session cookie fallback + creation + mark-as-read |
| `/api/settings/route.ts` | GET, PATCH | Organization settings with memberships/users + org update |
| `/api/chat/[id]/route.ts` | GET, DELETE | Chat session with messages + session deletion |
| `/api/exports/route.ts` | GET, POST | Export history + processing export creation |

## Key Implementation Details
- All routes import `db` from `@/lib/db`
- Session cookie resolution via `cookies()` from `next/headers` (used in notifications)
- Consistent error handling and validation patterns matching existing routes
- Next.js 16 App Router conventions with `params: Promise<{ id: string }>` for dynamic routes
- Workflow PATCH replaces steps (delete old → create new) when steps array provided
- Exports POST creates record with status "processing" for MVP
- Lint passes cleanly
