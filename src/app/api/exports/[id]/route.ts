// GangNiaga AI — Export Detail API
// GET /api/exports/[id] — Get export status or download the file

import { NextRequest, NextResponse } from 'next/server'
import { getExportStatus, getExportFile } from '@/lib/exports'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const download = searchParams.get('download') === 'true'

    // If download=true, return the file content
    if (download) {
      const file = await getExportFile(id)

      if (!file) {
        return NextResponse.json(
          { error: 'Export file not found or not yet completed' },
          { status: 404 },
        )
      }

      return new NextResponse(file.data, {
        status: 200,
        headers: {
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename="${file.filename}"`,
          'Content-Length': String(file.data.length),
        },
      })
    }

    // Otherwise, return the export status
    const exportStatus = await getExportStatus(id)

    if (!exportStatus) {
      return NextResponse.json(
        { error: 'Export not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ export: exportStatus })
  } catch (error) {
    console.error('Export detail error:', error)
    return NextResponse.json(
      { error: 'Failed to get export details' },
      { status: 500 },
    )
  }
}
