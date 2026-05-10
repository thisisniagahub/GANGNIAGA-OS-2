import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { checkRateLimit, logAction, logError, logDenied } from '@/lib/middleware'

export async function POST(req: NextRequest) {
  try {
    // Rate limiting for login attempts
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'anonymous'

    const rateLimitResult = checkRateLimit(clientIp, 'auth')
    if (!rateLimitResult.allowed) {
      // Log rate limit hit
      await logDenied(clientIp, 'auth.login', 'users', 'Rate limit exceeded for login attempts').catch(() => {})
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
          take: 1,
        },
      },
    })

    if (!user) {
      // Audit log for failed login
      await logDenied('unknown', 'auth.login', 'users', `Invalid email: ${email}`).catch(() => {})
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // In production, compare hashed password
    if (user.passwordHash && user.passwordHash !== password) {
      // Audit log for failed login
      await logDenied(user.id, 'auth.login', 'users', 'Invalid password').catch(() => {})
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const membership = user.memberships[0]
    const organization = membership?.organization

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session_user', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })

    // Audit log for successful login
    await logAction(user.id, 'auth.login', 'users', {
      email: user.email,
      organizationId: organization?.id,
    }).catch(() => {})

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: membership?.role || 'user' },
      organization: organization ? { id: organization.id, name: organization.name, slug: organization.slug, currency: organization.currency } : null,
    })
  } catch (error) {
    console.error('Login error:', error)
    await logError('unknown', 'auth.login', 'users', error instanceof Error ? error.message : 'Unknown error').catch(() => {})
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
