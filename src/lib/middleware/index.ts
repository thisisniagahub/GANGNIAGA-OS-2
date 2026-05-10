// ============================================
// MIDDLEWARE BARREL EXPORTS
// ============================================

// Authentication
export { getAuthUser, requireAuth, AuthError, type AuthUser } from './auth'

// RBAC Permissions
export {
  hasPermission,
  checkAgentPermission,
  getUserPermissions,
  requirePermission,
  getResourcePermissions,
  RbacError,
  type ResourcePermission,
} from './rbac'

// Rate Limiting
export {
  checkRateLimit,
  getRateLimitHeaders,
  setRateLimitConfig,
  resetRateLimit,
  getRateLimitStats,
} from './rate-limit'

// Audit Logging
export {
  logAudit,
  logAction,
  logDenied,
  logError,
  logApiAction,
  type AuditLogEntry,
} from './audit'

// API Handler Wrapper
export {
  withApiHandler,
  successResponse,
  paginatedResponse,
  type ApiHandlerConfig,
  type ApiHandler,
} from './with-api-handler'
