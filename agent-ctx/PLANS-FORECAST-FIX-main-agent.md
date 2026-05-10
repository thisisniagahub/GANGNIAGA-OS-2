# Task: PLANS-FORECAST-FIX - Fix Business Plans and Financial Forecasting pages to use real API data

## Agent: Main Agent

## Changes Made

### Plans Page (`src/components/plans/plans-page.tsx`)
- Added `handleSaveSection()` - saves section content via PATCH /api/plans/[planId] with `{ sections: [{ id, content }] }`
- Added `handleStatusChange()` - changes plan status via PATCH /api/plans/[planId] with `{ status }`
- Added `handleDeletePlan()` - deletes plan via DELETE /api/plans/[planId], navigates back to list
- Added Save button per section with loading state and "Unsaved changes" indicator
- Added status dropdown (draft/review/approved/archived) in editor header
- Added Delete Plan button in editor header
- Plan list already uses GET /api/plans?organizationId=xxx with loading skeletons

### Forecasting Page (`src/components/forecasting/forecasting-page.tsx`)
- Added SavedForecast interface for API data mapping
- Added `handleSaveForecast()` - saves current forecast via POST /api/forecasts with revenue/expense mapping
- Added `handleLoadForecast()` - loads a saved forecast, maps API format to frontend state
- Added `handleNewForecast()` - resets form to defaults
- Added "Save" button with dialog (name input + summary)
- Added "Load" button with dialog listing saved forecasts with loading skeletons
- Added "New" button to reset the form
- Shows "Editing saved forecast" indicator when a forecast is loaded
- Fetches saved forecasts on mount via GET /api/forecasts?organizationId=xxx
- All chart/visualization logic preserved - automatically reacts to loaded data via useMemo

## API Routes Used (already existed)
- `GET /api/plans?organizationId=xxx` - list plans
- `PATCH /api/plans/[id]` - update plan (status, sections)
- `DELETE /api/plans/[id]` - delete plan
- `GET /api/forecasts?organizationId=xxx` - list forecasts
- `POST /api/forecasts` - create forecast

## Lint Status
- Passes cleanly
