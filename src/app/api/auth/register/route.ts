import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    // Create user
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: password, // In production, hash with bcrypt
      },
    })

    // Create default organization
    const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-org'
    const organization = await db.organization.create({
      data: {
        name: `${name}'s Organization`,
        slug,
        currency: 'USD',
      },
    })

    // Create membership
    await db.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'owner',
        acceptedAt: new Date(),
      },
    })

    // Create sample KPIs
    const kpis = [
      { name: 'Monthly Revenue', category: 'revenue', value: 102000, previousValue: 91000, target: 120000, unit: 'USD', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
      { name: 'Net Profit', category: 'revenue', value: 46000, previousValue: 39000, target: 50000, unit: 'USD', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
      { name: 'Active Customers', category: 'customer', value: 1159, previousValue: 1066, target: 1500, unit: 'count', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
      { name: 'MRR', category: 'saas', value: 102000, previousValue: 91000, target: 130000, unit: 'USD', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
      { name: 'ARR', category: 'saas', value: 1224000, previousValue: 1092000, target: 1560000, unit: 'USD', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
      { name: 'CAC', category: 'saas', value: 380, previousValue: 420, target: 300, unit: 'USD', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
      { name: 'LTV', category: 'saas', value: 4200, previousValue: 3800, target: 5000, unit: 'USD', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
      { name: 'Churn Rate', category: 'saas', value: 3.2, previousValue: 3.8, target: 2.5, unit: 'percent', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
      { name: 'Burn Rate', category: 'cash', value: 56000, previousValue: 54000, target: 45000, unit: 'USD', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
      { name: 'Gross Margin', category: 'revenue', value: 72.5, previousValue: 70.1, target: 75, unit: 'percent', period: new Date().toISOString().slice(0, 7), organizationId: organization.id },
    ]

    await db.kpi.createMany({ data: kpis })

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session_user', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: 'owner' },
      organization: { id: organization.id, name: organization.name, slug: organization.slug, currency: organization.currency },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
