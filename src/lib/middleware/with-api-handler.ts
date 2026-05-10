import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError, type AuthUser } from './auth'
import { requirePermission, RbacError } from './rbac'
import { checkRateLimit, getRateLimitHeaders } from './rate-limit'
import { logAudit } from './audit'

// ============================================
// API HANDLER WRAPPER
// ============================================

/**
 * Configuration for the withApiHandler wrapper.
 * Controls which middleware layers are applied to the route.
 */
export interface ApiHandlerConfig {
  /** Resource name for RBAC check (e.g. 'plans', 'forecasts') */
  resource?: string
  /** Action for RBAC check (e.g. 'read', 'write', 'execute') */
  action?: string
  /** Custom rate limit endpoint name (defaults to resource if not specified) */
  rateLimitEndpoint?: string
  /** Custom audit action name (defaults to 'resource.action') */
  auditAction?: string
  /** Skip authentication check (for public endpoints) */
  skipAuth?: boolean
  /** Skip RBAC permission check (auth still required unless skipAuth) */
  skipRbac?: boolean
}

/**
 * Type for the API handler function that receives the authenticated user.
 */
export type ApiHandler = (
  req: NextRequest,
  user: AuthUser,
  context?: unknown
) => Promise<NextResponse>

/**
 * Standard API error response shape.
 */
interface ApiErrorResponse {
  error: string
  code: string
  details?: string
}

/**
 * Create a standardized error response.
 */
function errorResponse(
  message: string,
  statusCode: number,
  code: string,
  details?: string,
  headers?: Record<string, string>
): NextResponse {
  const body: ApiErrorResponse = {
    error: message,
    code,
  }
  if (details) {
    body.details = details
  }
  return NextResponse.json(body, { status: statusCode, headers })
}

/**
 * Higher-order function that wraps an API route handler with:
 * 1. Authentication check (unless skipAuth)
 * 2. Rate limiting with standard headers
 * 3. RBAC permission check (unless skipRbac)
 * 4. Audit logging on success/failure
 * 5. Standardized error responses
 *
 * @example
 * ```ts
 * // In src/app/api/plans/route.ts
 * export const POST = withApiHandler(
 *   { resource: 'plans', action: 'write' },
 *   async (req, user) => {
 *     const body = await req.json()
 *     // ... handle the request
 *     return NextResponse.json({ success: true })
 *   }
 * )
 * ```
 */
export function withApiHandler(
  config: ApiHandlerConfig,
  handler: ApiHandler
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const rateLimitEndpoint = config.rateLimitEndpoint || config.resource || 'default'
    const auditAction = config.auditAction || (config.resource && config.action ? `${config.resource}.${config.action}` : undefined)

    // ---- STEP 1: Rate Limiting ----
    // Use a preliminary identifier (IP or 'anonymous') before auth
    const preIdentifier =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'anonymous'

    const preRateLimit = checkRateLimit(preIdentifier, rateLimitEndpoint)
    if (!preRateLimit.allowed) {
      const headers = getRateLimitHeaders(preIdentifier, rateLimitEndpoint)
      // Log rate limit hit
      logAudit({
        action: 'rate_limit.exceeded',
        resource: rateLimitEndpoint,
        status: 'denied',
        ipAddress: preIdentifier,
        userAgent: req.headers.get('user-agent') || undefined,
        details: JSON.stringify({ endpoint: rateLimitEndpoint }),
      }).catch(() => {})

      return errorResponse(
        'Rate limit exceeded. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        `Reset at ${new Date(preRateLimit.resetAt).toISOString()}`,
        headers
      )
    }

    // ---- STEP 2: Authentication ----
    let user: AuthUser

    if (!config.skipAuth) {
      try {
        user = await requireAuth(req)
      } catch (error) {
        const message = error instanceof AuthError ? error.message : 'Authentication required'
        const statusCode = error instanceof AuthError ? error.statusCode : 401

        // Log auth failure
        logAudit({
          action: 'auth.failure',
          resource: config.resource || 'unknown',
          status: 'denied',
          ipAddress: preIdentifier,
          userAgent: req.headers.get('user-agent') || undefined,
          details: JSON.stringify({ error: message }),
        }).catch(() => {})

        const headers = getRateLimitHeaders(preIdentifier, rateLimitEndpoint)
        return errorResponse(message, statusCode, 'UNAUTHORIZED', undefined, headers)
      }

      // Re-check rate limit with user ID as identifier (more granular)
      const userRateLimit = checkRateLimit(user.id, rateLimitEndpoint)
      if (!userRateLimit.allowed) {
        const headers = getRateLimitHeaders(user.id, rateLimitEndpoint)

        logAudit({
          userId: user.id,
          organizationId: user.organizationId,
          action: 'rate_limit.exceeded',
          resource: rateLimitEndpoint,
          status: 'denied',
          ipAddress: preIdentifier,
          userAgent: req.headers.get('user-agent') || undefined,
        }).catch(() => {})

        return errorResponse(
          'Rate limit exceeded. Please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED',
          `Reset at ${new Date(userRateLimit.resetAt).toISOString()}`,
          headers
        )
      }
    } else {
      // Skip auth — create a placeholder user object
      user = {
        id: 'anonymous',
        email: '',
        name: null,
        role: 'anonymous',
        organizationId: '',
        organizationRole: 'viewer',
      }
    }

    // ---- STEP 3: RBAC Permission Check ----
    if (!config.skipRbac && config.resource && config.action) {
      try {
        await requirePermission(user, config.resource, config.action)
      } catch (error) {
        const message = error instanceof RbacError ? error.message : 'Permission denied'
        const statusCode = error instanceof RbacError ? error.statusCode : 403

        // Log permission denial
        logAudit({
          userId: user.id,
          organizationId: user.organizationId,
          action: auditAction || `${config.resource}.${config.action}`,
          resource: config.resource,
          status: 'denied',
          ipAddress: preIdentifier,
          userAgent: req.headers.get('user-agent') || undefined,
          details: JSON.stringify({
            reason: message,
            requiredAction: config.action,
          }),
        }).catch(() => {})

        const headers = getRateLimitHeaders(user.id !== 'anonymous' ? user.id : preIdentifier, rateLimitEndpoint)
        return errorResponse(message, statusCode, 'FORBIDDEN', undefined, headers)
      }
    }

    // ---- STEP 4: Execute Handler ----
    try {
      const response = await handler(req, user)

      // Add rate limit headers to the response
      const rateLimitHeaders = getRateLimitHeaders(
        user.id !== 'anonymous' ? user.id : preIdentifier,
        rateLimitEndpoint
      )

      // Clone response with additional headers
      const newHeaders = new Headers(response.headers)
      for (const [key, value] of Object.entries(rateLimitHeaders)) {
        newHeaders.set(key, value)
      }

      // Log successful action (non-blocking)
      if (auditAction && user.id !== 'anonymous') {
        logAudit({
          userId: user.id,
          organizationId: user.organizationId,
          action: auditAction,
          resource: config.resource || 'unknown',
          status: 'success',
          ipAddress: preIdentifier,
          userAgent: req.headers.get('user-agent') || undefined,
          metadata: {
            duration: Date.now() - startTime,
            statusCode: response.status,
          },
        }).catch(() => {})
      }

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Internal server error'

      // Log error (non-blocking)
      if (auditAction) {
        logAudit({
          userId: user.id !== 'anonymous' ? user.id : undefined,
          organizationId: user.organizationId || undefined,
          action: auditAction,
          resource: config.resource || 'unknown',
          status: 'failure',
          ipAddress: preIdentifier,
          userAgent: req.headers.get('user-agent') || undefined,
          details: JSON.stringify({
            error: errorMessage,
            duration,
          }),
        }).catch(() => {})
      }

      const rateLimitHeaders = getRateLimitHeaders(
        user.id !== 'anonymous' ? user.id : preIdentifier,
        rateLimitEndpoint
      )

      // Handle known error types
      if (error instanceof AuthError) {
        return errorResponse(error.message, error.statusCode, 'UNAUTHORIZED', undefined, rateLimitHeaders)
      }

      if (error instanceof RbacError) {
        return errorResponse(error.message, error.statusCode, 'FORBIDDEN', undefined, rateLimitHeaders)
      }

      // Handle JSON parse errors
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return errorResponse('Invalid JSON in request body', 400, 'INVALID_JSON', undefined, rateLimitHeaders)
      }

      // Generic server error (don't leak internal details)
      console.error(`[API] Unhandled error in ${auditAction || 'handler'}:`, error)
      return errorResponse('Internal server error', 500, 'INTERNAL_ERROR', undefined, rateLimitHeaders)
    }
  }
}

/**
 * Create a success response with consistent shape.
 */
export function successResponse<T>(
  data: T,
  options?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(
    { success: true, data },
    {
      status: options?.status || 200,
      headers: options?.headers,
    }
  )
}

/**
 * Create a paginated response with consistent shape.
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; pageSize: number; total: number },
  options?: { headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.pageSize),
      },
    },
    { headers: options?.headers }
  )
}
