// GangNiaga AI — Exports API
// POST /api/exports — Start a new export job using the export engine
// GET  /api/exports — List exports for an organization

import { NextRequest, NextResponse } from 'next/server'
import { startExport, listExports } from '@/lib/exports'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 },
      )
    }

    const exports = await listExports(organizationId)
    return NextResponse.json({ exports })
  } catch (error) {
    console.error('Exports fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exports' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, format, contentId, title, organizationId, userId } = body

    // Validate required fields
    if (!organizationId || !userId || !type || !format || !title || !contentId) {
      return NextResponse.json(
        { error: 'organizationId, userId, type, format, title, and contentId are required' },
        { status: 400 },
      )
    }

    // Validate type
    const validTypes = ['plan', 'report', 'forecast', 'kpi']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      )
    }

    // Validate format
    const validFormats = ['pdf', 'docx', 'pptx', 'csv', 'xlsx', 'markdown']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 },
      )
    }

    // Start the export job via the engine
    const result = await startExport({
      type,
      format,
      contentId,
      title,
      organizationId,
      userId,
    })

    return NextResponse.json(
      { export: { id: result.exportId, status: result.status } },
      { status: 201 },
    )
  } catch (error) {
    console.error('Export create error:', error)
    return NextResponse.json(
      { error: 'Failed to create export' },
      { status: 500 },
    )
  }
}
