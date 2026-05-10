import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const exports = await db.export.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ exports })
  } catch (error) {
    console.error('Exports fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch exports' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { organizationId, userId, type, format, title } = body

    if (!organizationId || !userId || !type || !format || !title) {
      return NextResponse.json(
        { error: 'Organization ID, user ID, type, format, and title are required' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['plan', 'report', 'forecast', 'kpi']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate format
    const validFormats = ['pdf', 'docx', 'pptx', 'csv', 'xlsx', 'markdown']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    // Create export record with "processing" status
    // In production, this would trigger a background job for actual file generation
    const exportRecord = await db.export.create({
      data: {
        organizationId,
        userId,
        type,
        format,
        title,
        status: 'processing',
      },
    })

    return NextResponse.json({ export: exportRecord }, { status: 201 })
  } catch (error) {
    console.error('Export create error:', error)
    return NextResponse.json({ error: 'Failed to create export' }, { status: 500 })
  }
}
