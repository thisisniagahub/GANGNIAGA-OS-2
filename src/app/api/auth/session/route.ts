import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_user')?.value

    if (!userId) {
      return NextResponse.json({ user: null, organization: null })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ user: null, organization: null })
    }

    const membership = user.memberships[0]
    const organization = membership?.organization

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: membership?.role || 'user' },
      organization: organization ? { id: organization.id, name: organization.name, slug: organization.slug, currency: organization.currency } : null,
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null, organization: null })
  }
}
