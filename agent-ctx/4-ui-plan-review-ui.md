# Task 4-ui — Plan Review UI Agent

## Task
Create the UI component for the Plan Review Agent (Lender Persona) page

## Work Completed

### Created: `src/components/plan-review/plan-review-page.tsx` (~800 lines)
A `'use client'` React component with 3 tabs:

1. **Dashboard Tab**
   - Summary stats cards (total, completed, in-progress, needs revision)
   - Review cards with: circular gauge for overall score, status badge, reviewer type badge, consistency/fundability scores, finding counts by severity
   - "Start New Review" dialog with plan selector and reviewer type selector (lender, investor, auditor, internal)
   - Click a review card to navigate to Detail tab

2. **Detail Tab**
   - 6 circular score gauges: overall, narrative, financial, consistency, risk, fundability
   - Radar chart (recharts) showing all 6 scores
   - Score labels with grade text (Exceptional/Strong/Good/etc.)
   - Executive Summary card
   - Findings Panel with type filter buttons (All, Discrepancies, Red Flags, Strengths, Recommendations, Data Gaps)
   - Each finding: severity badge, section badge, description, evidence, suggestion, narrative/financial refs, resolve/unresolve toggle
   - Narrative vs Financial Cross-Check visualization: side-by-side cards with mismatch arrows
   - Lender Questions section
   - Red Flags, Strengths, Recommendations, Discrepancies summary lists

3. **LangGraph Flow Tab**
   - 3-agent pipeline: Narrative Agent → Financial Agent → Cross-Check Agent
   - Step status (pending/running/completed/failed) with progress bar
   - Finding counts per agent step
   - Review status cards (in-progress, complete, needs revision)

### Modified Files
- `src/lib/stores/app-store.ts` — Added `'plan-review'` to PageId type
- `src/components/layout/app-sidebar.tsx` — Added ShieldCheck icon import and Plan Review nav item
- `src/app/page.tsx` — Added PlanReviewPage import and route case

### API Integration
- `GET /api/plan-reviews?organizationId=xxx` — Fetch reviews list
- `GET /api/plan-reviews/[id]` — Fetch review detail with findings
- `POST /api/plan-reviews` — Create new review (planId, organizationId, reviewerType)
- `PATCH /api/plan-reviews/[id]` — Resolve/unresolve findings
- `GET /api/plans?organizationId=xxx` — Fetch plans for selector

### Features
- Auto-polling every 5s when review is in 'reviewing' status
- Uses useAuthStore for organization context
- Responsive design with mobile-friendly layout
- Loading skeletons and empty states
- shadcn/ui components throughout
- recharts RadarChart for score visualization
- Proper TypeScript types for all data structures
