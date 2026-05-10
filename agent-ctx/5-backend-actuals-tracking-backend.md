# Task 5-backend: Live Plan vs Actuals Tracking Backend

## Agent: actuals-tracking-backend

## Task
Create the backend engine and API routes for the Live Plan vs Actuals Tracking module.

## Work Completed

### 1. Engine File: `src/lib/actuals/engine.ts` (~580 lines)
- **importActuals()** — Import actual financial data with upsert; auto-updates AccountingConnection
- **computeVariances()** — Compare forecast vs actuals for 7 metrics; AI-powered analysis for significant variances (>=15%)
- **generateAlerts()** — 6 alert types: revenue_tracking, expense_drift, cash_warning, hiring_affordability, variance_threshold, milestone
- **getDashboardData()** — Combined actuals + variances + alerts + connections + health summary
- **simulateQuickBooksSync()** — 6 months realistic mock data via QuickBooks source
- **simulateXeroSync()** — 6 months realistic mock data via Xero source
- **dismissAlert()** — Mark alert as dismissed with optional actionTaken

### 2. Barrel Export: `src/lib/actuals/index.ts`
- Exports all 7 functions and 4 types

### 3. API Route: `src/app/api/actuals/route.ts`
- GET — Dashboard data, actuals, variances, or alerts
- POST — 5 actions: import, sync_quickbooks, sync_xero, compute_variances, generate_alerts

### 4. API Route: `src/app/api/actuals/[id]/route.ts`
- PATCH — Dismiss alert with org membership verification

## Files Created
- `src/lib/actuals/engine.ts`
- `src/lib/actuals/index.ts`
- `src/app/api/actuals/route.ts`
- `src/app/api/actuals/[id]/route.ts`
