import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ organization: null })
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ organization: null })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { organizationId, name, industry, size, country, currency } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Check if organization exists
    const existing = await db.organization.findUnique({
      where: { id: organizationId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Build update data — only include fields that are provided
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (industry !== undefined) updateData.industry = industry
    if (size !== undefined) updateData.size = size
    if (country !== undefined) updateData.country = country
    if (currency !== undefined) updateData.currency = currency

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields provided to update' },
        { status: 400 }
      )
    }

    const organization = await db.organization.update({
      where: { id: organizationId },
      data: updateData,
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
