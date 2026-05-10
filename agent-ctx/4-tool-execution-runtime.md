# Task 4 — Tool Execution Runtime Agent

## Task: Build the Tool Execution Runtime

A registry, permission system, and execution tracing framework for agent tools.

## Work Record

### Files Created

1. **`/src/lib/tools/registry.ts`** (~280 lines)
   - `ToolDefinition` interface with full schema: name, description, category, requiredPermissions, inputSchema, outputSchema, rateLimited, maxExecutionsPerMinute, timeout, sandboxed, requiresApproval
   - `TOOL_DEFINITIONS` — 10 tools registered: `web_search`, `forecast_calculate`, `browser_navigate`, `email_send`, `export_generate`, `crm_lookup`, `analytics_query`, `kpi_update`, `notification_send`, `code_execute`
   - Helper functions: `getTool()`, `getToolsByCategory()`, `getAllToolNames()`
   - `validateToolInput()` — schema validation checking required fields, type matching, and enum values

2. **`/src/lib/tools/executor.ts`** (~560 lines)
   - `ToolExecutionRequest` and `ToolExecutionResult` types
   - Rate limiting with 1-minute sliding window per tool+user
   - Permission checking via role-based access control (owner/admin/manager/accountant/viewer)
   - Execution tracing — creates `ToolExecution` records in DB (status: running → completed/failed)
   - Audit logging — creates `AuditLog` entries for every execution
   - Token usage tracking — creates `TokenUsage` records for AI-powered tools
   - Approval system — in-memory store with `requestApproval()`, `approveExecution()`, `rejectExecution()`, `getApproval()`, `listPendingApprovals()`
   - 10 tool handlers:
     - `executeWebSearch` — uses z-ai-web-dev-sdk for AI-powered search simulation
     - `executeForecastCalculate` — queries forecast from DB, calculates scenario projections with multipliers
     - `executeBrowserNavigate` — uses AI for text/link extraction simulation
     - `executeEmailSend` — records email in audit log
     - `executeExportGenerate` — creates Export record in DB
     - `executeCrmLookup` — returns structured placeholder (CRM integration placeholder)
     - `executeAnalyticsQuery` — queries KPI data from DB
     - `executeKpiUpdate` — updates KPI value in DB with previous value tracking
     - `executeNotificationSend` — creates Notification record in DB
     - `executeCodeExecute` — returns simulated sandboxed execution result
   - `executeTool()` — main execution function with full lifecycle: validate → permissions → rate limit → approval → trace → execute → audit → return
   - Timeout handling with `executeWithTimeout()` wrapper

3. **`/src/lib/tools/index.ts`** (~20 lines)
   - Barrel exports for all registry and executor types/functions

4. **`/src/app/api/tools/execute/route.ts`** (~120 lines)
   - POST — Execute a tool with full validation and lifecycle management
   - GET — List all available tools (optionally filtered by category)

5. **`/src/app/api/tools/approvals/route.ts`** (~170 lines)
   - GET — List pending approvals (optionally filtered by userId)
   - POST — Approve or reject a pending approval; auto-executes tool on approval

### Architecture Decisions

- **In-memory approval store**: Used `Map<string, ApprovalRecord>` for simplicity. In production, this would be a database table or Redis.
- **Role-based permissions**: Static mapping of roles to permission strings. The `AgentPermission` table exists in the schema for future fine-grained control.
- **Rate limiting**: Sliding window algorithm per tool+user, stored in memory. Production would use Redis.
- **Token tracking**: Integrates with the existing `TokenUsage` model in the Prisma schema.
- **Timeout handling**: Uses `Promise.race` pattern with `setTimeout` for per-tool timeouts.
- **Approval flow**: Tools requiring approval return 202 with approval ID. Approving via `/api/tools/approvals` auto-re-executes the tool.

### Lint Status
- All new code passes ESLint cleanly
- 1 pre-existing error in `src/lib/agents/orchestrator.ts` (not part of this task)
