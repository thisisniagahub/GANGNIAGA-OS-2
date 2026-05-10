import { db } from '@/lib/db'
import type { AuthUser } from './auth'

// ============================================
// ROLE PERMISSIONS HIERARCHY
// ============================================

/**
 * Global role permissions (User.role — system-wide)
 * super_admin gets wildcard access to everything
 */
const GLOBAL_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: ['read', 'write', 'execute', 'admin'],
  user: ['read', 'write'],
}

/**
 * Organization role permissions (Membership.role — per-org)
 * owner/admin get broad access; viewer is read-only
 */
const ORG_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ['*'], // full access within org
  admin: ['read', 'write', 'execute', 'admin'],
  manager: ['read', 'write', 'execute'],
  accountant: ['read', 'write', 'execute:finance'],
  viewer: ['read'],
}

// ============================================
// RESOURCE-ACTION PERMISSION MATRIX
// ============================================

export interface ResourcePermission {
  resource: string
  actions: string[]
}

/**
 * Maps organization roles to the resources and actions they can access.
 * This is used to provide fine-grained RBAC beyond the simple permission strings.
 */
const ROLE_RESOURCE_PERMISSIONS: Record<string, ResourcePermission[]> = {
  owner: [
    { resource: 'plans', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'forecasts', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'agents', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'workflows', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'reports', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'settings', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'exports', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'integrations', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'browser', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'kpis', actions: ['read', 'write', 'execute', 'admin'] },
  ],
  admin: [
    { resource: 'plans', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'forecasts', actions: ['read', 'write', 'execute'] },
    { resource: 'agents', actions: ['read', 'write', 'execute'] },
    { resource: 'workflows', actions: ['read', 'write', 'execute'] },
    { resource: 'reports', actions: ['read', 'write', 'execute', 'admin'] },
    { resource: 'settings', actions: ['read', 'write'] },
    { resource: 'exports', actions: ['read', 'write', 'execute'] },
    { resource: 'integrations', actions: ['read', 'write', 'execute'] },
    { resource: 'browser', actions: ['read', 'write', 'execute'] },
    { resource: 'kpis', actions: ['read', 'write', 'execute'] },
  ],
  manager: [
    { resource: 'plans', actions: ['read', 'write', 'execute'] },
    { resource: 'forecasts', actions: ['read', 'write', 'execute'] },
    { resource: 'agents', actions: ['read', 'write', 'execute'] },
    { resource: 'workflows', actions: ['read', 'write', 'execute'] },
    { resource: 'reports', actions: ['read', 'write'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'exports', actions: ['read', 'write'] },
    { resource: 'integrations', actions: ['read'] },
    { resource: 'browser', actions: ['read', 'execute'] },
    { resource: 'kpis', actions: ['read', 'write'] },
  ],
  accountant: [
    { resource: 'plans', actions: ['read'] },
    { resource: 'forecasts', actions: ['read', 'write', 'execute'] },
    { resource: 'agents', actions: ['read', 'execute'] },
    { resource: 'workflows', actions: ['read'] },
    { resource: 'reports', actions: ['read', 'write'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'exports', actions: ['read', 'write'] },
    { resource: 'integrations', actions: ['read'] },
    { resource: 'browser', actions: [] },
    { resource: 'kpis', actions: ['read', 'write'] },
  ],
  viewer: [
    { resource: 'plans', actions: ['read'] },
    { resource: 'forecasts', actions: ['read'] },
    { resource: 'agents', actions: ['read'] },
    { resource: 'workflows', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'exports', actions: ['read'] },
    { resource: 'integrations', actions: ['read'] },
    { resource: 'browser', actions: [] },
    { resource: 'kpis', actions: ['read'] },
  ],
}

// ============================================
// RBAC ERROR
// ============================================

export class RbacError extends Error {
  public statusCode: number

  constructor(message: string, statusCode: number = 403) {
    super(message)
    this.name = 'RbacError'
    this.statusCode = statusCode
  }
}

// ============================================
// PERMISSION CHECK FUNCTIONS
// ============================================

/**
 * Check if a user has permission for a specific resource + action.
 * Considers both global role and organization role.
 */
export function hasPermission(
  userRole: string,
  orgRole: string,
  resource: string,
  action: string
): boolean {
  // Super admin or owner gets wildcard access
  if (GLOBAL_ROLE_PERMISSIONS[userRole]?.includes('*') || ORG_ROLE_PERMISSIONS[orgRole]?.includes('*')) {
    return true
  }

  // Check resource-action permissions for the org role
  const resourcePermissions = ROLE_RESOURCE_PERMISSIONS[orgRole]
  if (!resourcePermissions) {
    return false
  }

  const resourcePerm = resourcePermissions.find((rp) => rp.resource === resource)
  if (!resourcePerm) {
    return false
  }

  // Check for direct action match
  if (resourcePerm.actions.includes(action)) {
    return true
  }

  // Check for wildcard action within the resource (e.g. 'execute' covers 'execute:finance')
  if (action.includes(':')) {
    const [baseAction] = action.split(':')
    if (resourcePerm.actions.includes(baseAction)) {
      return true
    }
  }

  // Admin action implies all other actions for the resource
  if (resourcePerm.actions.includes('admin')) {
    return true
  }

  return false
}

/**
 * Check agent permissions from the AgentPermission table in the database.
 * This is used when agents need to perform actions on resources.
 */
export async function checkAgentPermission(
  agentType: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    const permission = await db.agentPermission.findUnique({
      where: {
        agentType_resource_action: {
          agentType,
          resource,
          action,
        },
      },
    })

    if (!permission) {
      return false
    }

    return permission.isAllowed
  } catch (error) {
    console.error('[RBAC] Error checking agent permission:', error)
    return false
  }
}

/**
 * Get all permission strings for a user based on their org role.
 */
export function getUserPermissions(orgRole: string): string[] {
  const orgPerms = ORG_ROLE_PERMISSIONS[orgRole] || []

  // If wildcard, return all permissions
  if (orgPerms.includes('*')) {
    return ['*']
  }

  const resourcePerms = ROLE_RESOURCE_PERMISSIONS[orgRole] || []
  const permissions: string[] = [...orgPerms]

  // Add resource-specific permissions in "resource:action" format
  for (const rp of resourcePerms) {
    for (const action of rp.actions) {
      permissions.push(`${rp.resource}:${action}`)
    }
  }

  // Deduplicate
  const seen = new Set<string>()
  return permissions.filter((p) => {
    if (seen.has(p)) return false
    seen.add(p)
    return true
  })
}

/**
 * Require permission — throws RbacError if the user doesn't have the required permission.
 */
export async function requirePermission(
  user: AuthUser,
  resource: string,
  action: string
): Promise<void> {
  const permitted = hasPermission(user.role, user.organizationRole, resource, action)

  if (!permitted) {
    throw new RbacError(
      `Permission denied: ${user.organizationRole} role cannot perform '${action}' on '${resource}'`,
      403
    )
  }
}

/**
 * Get the full resource-permission matrix for a given org role.
 * Useful for UI rendering (showing/hiding elements based on permissions).
 */
export function getResourcePermissions(orgRole: string): ResourcePermission[] {
  return ROLE_RESOURCE_PERMISSIONS[orgRole] || []
}
