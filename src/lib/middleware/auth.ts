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
 * Get the authenticated user from the session cookie.
 * Returns null if no valid session is found.
 */
export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  try {
    let userId: string | undefined

    // Try to get user ID from the request cookies first (for API routes with req param)
    if (req) {
      userId = req.cookies.get('session_user')?.value
    }

    // Fall back to the cookies() helper (for server components / route handlers without req)
    if (!userId) {
      const cookieStore = await cookies()
      userId = cookieStore.get('session_user')?.value
    }

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
 */
export async function requireAuth(req?: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(req)
  if (!user) {
    throw new AuthError('Authentication required')
  }
  if (!user.organizationId) {
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
