import { db } from '@/lib/db'

// ============================================
// AUDIT LOGGING SYSTEM
// ============================================

export interface AuditLogEntry {
  userId?: string
  organizationId?: string
  action: string          // e.g. 'plan.create', 'agent.execute', 'workflow.run'
  resource: string        // e.g. 'business_plans', 'agent_sessions'
  resourceId?: string
  status?: string         // 'success', 'failure', 'denied'
  ipAddress?: string
  userAgent?: string
  details?: string        // JSON details
  metadata?: Record<string, unknown>
}

/**
 * Log an audit entry to the database.
 * This function is designed to be non-blocking (fire-and-forget).
 * Errors are caught and logged to prevent audit logging from affecting the main flow.
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId || null,
        organizationId: entry.organizationId || null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId || null,
        status: entry.status || 'success',
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        details: entry.details || null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : '{}',
      },
    })
  } catch (error) {
    // Audit logging should never block the main request flow
    console.error('[Audit] Failed to log audit entry:', error)
  }
}

/**
 * Log a successful action.
 * Convenience method for common audit logging patterns.
 */
export async function logAction(
  userId: string,
  action: string,
  resource: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    action,
    resource,
    status: 'success',
    details: details ? JSON.stringify(details) : undefined,
  })
}

/**
 * Log a denied/unauthorized action attempt.
 */
export async function logDenied(
  userId: string,
  action: string,
  resource: string,
  reason?: string
): Promise<void> {
  await logAudit({
    userId,
    action,
    resource,
    status: 'denied',
    details: reason ? JSON.stringify({ reason }) : undefined,
  })
}

/**
 * Log an error that occurred during an action.
 */
export async function logError(
  userId: string,
  action: string,
  resource: string,
  error: string
): Promise<void> {
  await logAudit({
    userId,
    action,
    resource,
    status: 'failure',
    details: JSON.stringify({ error }),
  })
}

/**
 * Log an action with full context from an API request.
 * Extracts IP and user-agent from the request automatically.
 */
export async function logApiAction(
  entry: AuditLogEntry & { req?: Request }
): Promise<void> {
  const { req, ...rest } = entry

  // Extract request metadata if available
  let ipAddress: string | undefined
  let userAgent: string | undefined

  if (req) {
    // Try various header names for IP address
    ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined
    userAgent = req.headers.get('user-agent') || undefined
  }

  await logAudit({
    ...rest,
    ipAddress,
    userAgent,
  })
}
