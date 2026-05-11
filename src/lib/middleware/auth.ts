import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: string
  organizationId: string
  organizationRole: string
  organization?: {
    id: string
    name: string
    slug: string
    industry: string | null
    size: string | null
    currency: string
  }
}

/**
 * Resolve user ID from multiple sources:
 * 1. Request cookies (session_user)
 * 2. Server cookies() helper
 * 3. URL search params (?userId=...) as fallback
 * 4. Authorization header (Bearer token)
 */
async function resolveUserId(req?: NextRequest): Promise<string | undefined> {
  // Strategy 1: Request cookies (for API routes with req param)
  if (req) {
    const cookieValue = req.cookies.get('session_user')?.value
    if (cookieValue) return cookieValue
  }

  // Strategy 2: Server cookies() helper
  try {
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get('session_user')?.value
    if (cookieValue) return cookieValue
  } catch {
    // cookies() might not be available in all contexts
  }

  // Strategy 3: URL search params (?userId=...) as fallback
  if (req) {
    try {
      const url = new URL(req.url)
      const paramUserId = url.searchParams.get('userId')
      if (paramUserId) return paramUserId
    } catch {
      // URL parsing failed
    }
  }

  // Strategy 4: Authorization header (Bearer token)
  if (req) {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      if (token) return token
    }
  }

  return undefined
}

/**
 * Get the authenticated user from the session cookie or fallback sources.
 * Returns null if no valid session is found or database is unreachable.
 */
export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  try {
    const userId = await resolveUserId(req)

    if (!userId) {
      return null
    }

    // Query user with active membership and organization
    const user = await db.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
          take: 1,
          orderBy: { invitedAt: 'desc' },
        },
      },
    })

    if (!user) {
      return null
    }

    const membership = user.memberships[0]
    const organization = membership?.organization

    if (!membership || !organization) {
      // User exists but has no active organization membership
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: '',
        organizationRole: '',
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: organization.id,
      organizationRole: membership.role,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        industry: organization.industry,
        size: organization.size,
        currency: organization.currency,
      },
    }
  } catch (error) {
    console.error('[Auth] Error getting auth user:', error)
    return null
  }
}

/**
 * Require authentication — throws an error if the user is not authenticated.
 * If `allowNoOrg` is true, will return the user even without an organization.
 */
export async function requireAuth(req?: NextRequest, options?: { allowNoOrg?: boolean }): Promise<AuthUser> {
  const user = await getAuthUser(req)
  if (!user) {
    throw new AuthError('Authentication required')
  }
  if (!user.organizationId && !options?.allowNoOrg) {
    throw new AuthError('No active organization membership')
  }
  return user
}

/**
 * Custom authentication error with status code
 */
export class AuthError extends Error {
  public statusCode: number

  constructor(message: string, statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
  }
}
