// GangNiaga AI — Export Engine
// Generates real documents (PDF, DOCX, PPTX, XLSX, CSV, Markdown) from
// business plans, reports, forecasts, and KPI data stored in the database.

import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportRequest {
  type: 'plan' | 'report' | 'forecast' | 'kpi'
  format: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'markdown'
  contentId: string     // ID of the plan/report/forecast/kpi
  title: string
  organizationId: string
  userId: string
}

interface ExportData {
  title: string
  type: string
  createdAt: string
  content: string       // Markdown-formatted content
  rawData: any          // Original structured data
}

// ─── Main Export Functions ────────────────────────────────────────────────────

/**
 * Start an export job — creates an Export record in "processing" status and
 * immediately kicks off generation.
 */
export async function startExport(request: ExportRequest): Promise<{
  exportId: string
  status: string
}> {
  // Create the export record
  const exportRecord = await db.export.create({
    data: {
      organizationId: request.organizationId,
      userId: request.userId,
      type: request.type,
      format: request.format,
      title: request.title,
      status: 'processing',
      metadata: JSON.stringify({
        contentId: request.contentId,
        startedAt: new Date().toISOString(),
      }),
    },
  })

  // Fire off generation (do not await — the job runs in the background)
  generateExport(exportRecord.id).catch((err) => {
    console.error('[ExportEngine] Background generation failed for', exportRecord.id, err)
  })

  return { exportId: exportRecord.id, status: 'processing' }
}

/**
 * Generate the actual export content. This function:
 *  1. Retrieves data from the database
 *  2. Converts it to the requested format
 *  3. Updates the Export record with the file URL and size
 *
 * Returns a result object (also updates the DB record).
 */
export async function generateExport(exportId: string): Promise<{
  success: boolean
  fileUrl: string
  fileSize: number
  error?: string
}> {
  const exportRecord = await db.export.findUnique({
    where: { id: exportId },
  })

  if (!exportRecord) {
    return { success: false, fileUrl: '', fileSize: 0, error: 'Export not found' }
  }

  try {
    const meta = JSON.parse(exportRecord.metadata || '{}')
    const contentId = meta.contentId || exportRecord.id

    // Step 1: Retrieve data from the database
    const data = await retrieveData(exportRecord.type, contentId, exportRecord.organizationId)

    if (!data) {
      await db.export.update({
        where: { id: exportId },
        data: { status: 'failed', metadata: JSON.stringify({ ...meta, error: 'Content not found', failedAt: new Date().toISOString() }) },
      })
      return { success: false, fileUrl: '', fileSize: 0, error: 'Content not found' }
    }

    // Step 2: Generate the file content in the requested format
    const format = exportRecord.format as ExportRequest['format']
    let fileBuffer: Buffer
    let mimeType: string
    let extension: string

    switch (format) {
      case 'markdown':
        fileBuffer = Buffer.from(data.content, 'utf-8')
        mimeType = 'text/markdown'
        extension = 'md'
        break

      case 'csv':
        fileBuffer = Buffer.from(await generateCSV(data.rawData, data.type), 'utf-8')
        mimeType = 'text/csv'
        extension = 'csv'
        break

      case 'pdf':
        fileBuffer = await generatePDF(data.content, data.title)
        mimeType = 'application/pdf'
        extension = 'pdf'
        break

      case 'docx':
        fileBuffer = await generateDOCX(data.content, data.title)
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        extension = 'docx'
        break

      case 'pptx':
        fileBuffer = await generatePPTX(data.content, data.title)
        mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        extension = 'pptx'
        break

      case 'xlsx':
        fileBuffer = await generateXLSXData(data.rawData, data.title)
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        extension = 'xlsx'
        break

      default:
        await db.export.update({
          where: { id: exportId },
          data: { status: 'failed', metadata: JSON.stringify({ ...meta, error: `Unsupported format: ${format}`, failedAt: new Date().toISOString() }) },
        })
        return { success: false, fileUrl: '', fileSize: 0, error: `Unsupported format: ${format}` }
    }

    // Step 3: Store the file content in metadata (for small files)
    // In production, this would upload to S3/cloud storage
    const fileUrl = `/api/exports/${exportId}?download=true`
    const fileSize = fileBuffer.length

    // For the DB, store the file content as base64 in metadata so we can serve it later
    const base64Content = fileBuffer.toString('base64')

    await db.export.update({
      where: { id: exportId },
      data: {
        status: 'completed',
        fileUrl,
        fileSize,
        metadata: JSON.stringify({
          ...meta,
          mimeType,
          extension,
          completedAt: new Date().toISOString(),
          fileContentBase64: base64Content,
        }),
      },
    })

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          userId: exportRecord.userId,
          organizationId: exportRecord.organizationId,
          action: 'export.generate',
          resource: 'exports',
          resourceId: exportId,
          status: 'success',
          details: JSON.stringify({
            type: exportRecord.type,
            format: exportRecord.format,
            title: exportRecord.title,
            fileSize,
          }),
          metadata: '{}',
        },
      })
    } catch (err) {
      console.error('[ExportEngine] Failed to write audit log:', err)
    }

    return { success: true, fileUrl, fileSize }
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    await db.export.update({
      where: { id: exportId },
      data: {
        status: 'failed',
        metadata: JSON.stringify({
          error: errorMessage,
          failedAt: new Date().toISOString(),
        }),
      },
    })

    return { success: false, fileUrl: '', fileSize: 0, error: errorMessage }
  }
}

/**
 * Get the status of an export job.
 */
export async function getExportStatus(exportId: string): Promise<any> {
  const exportRecord = await db.export.findUnique({
    where: { id: exportId },
  })

  if (!exportRecord) return null

  return {
    ...exportRecord,
    metadata: JSON.parse(exportRecord.metadata || '{}'),
  }
}

/**
 * List exports for an organization.
 */
export async function listExports(organizationId: string): Promise<any[]> {
  const exports = await db.export.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return exports.map((e) => ({
    ...e,
    metadata: JSON.parse(e.metadata || '{}'),
  }))
}

/**
 * Get the export file content for download.
 */
export async function getExportFile(exportId: string): Promise<{
  data: Buffer
  filename: string
  mimeType: string
} | null> {
  const exportRecord = await db.export.findUnique({
    where: { id: exportId },
  })

  if (!exportRecord || exportRecord.status !== 'completed') return null

  const meta = JSON.parse(exportRecord.metadata || '{}')

  if (!meta.fileContentBase64) return null

  const data = Buffer.from(meta.fileContentBase64, 'base64')
  const extension = meta.extension || exportRecord.format
  const filename = `${exportRecord.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${extension}`
  const mimeType = meta.mimeType || 'application/octet-stream'

  return { data, filename, mimeType }
}

// ─── Data Retrieval ───────────────────────────────────────────────────────────

/**
 * Retrieve structured data from the database based on content type and ID.
 * Returns both a markdown-formatted string and raw structured data.
 */
async function retrieveData(
  type: string,
  contentId: string,
  organizationId: string,
): Promise<ExportData | null> {
  switch (type) {
    case 'plan':
      return retrievePlanData(contentId, organizationId)
    case 'report':
      return retrieveReportData(contentId, organizationId)
    case 'forecast':
      return retrieveForecastData(contentId, organizationId)
    case 'kpi':
      return retrieveKpiData(contentId, organizationId)
    default:
      return null
  }
}

/**
 * Retrieve Business Plan + PlanSections from DB and format as markdown.
 */
async function retrievePlanData(
  planId: string,
  organizationId: string,
): Promise<ExportData | null> {
  const plan = await db.businessPlan.findFirst({
    where: { id: planId, organizationId },
    include: { sections: { orderBy: { order: 'asc' } } },
  })

  if (!plan) return null

  const org = await db.organization.findUnique({ where: { id: organizationId } })

  let markdown = `# ${plan.title}\n\n`
  markdown += `**Organization:** ${org?.name || 'Unknown'}\n`
  markdown += `**Status:** ${plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}\n`
  markdown += `**Version:** ${plan.version}\n`
  markdown += `**Created:** ${plan.createdAt.toISOString().split('T')[0]}\n`
  markdown += `**Last Updated:** ${plan.updatedAt.toISOString().split('T')[0]}\n\n`

  if (plan.description) {
    markdown += `## Overview\n\n${plan.description}\n\n`
  }

  for (const section of plan.sections) {
    markdown += `## ${section.title}\n\n`
    if (section.content) {
      markdown += `${section.content}\n\n`
    } else {
      markdown += `*No content yet.*\n\n`
    }
    if (section.aiGenerated) {
      markdown += `*This section was generated with AI assistance.*\n\n`
    }
  }

  return {
    title: plan.title,
    type: 'plan',
    createdAt: plan.createdAt.toISOString(),
    content: markdown,
    rawData: {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      status: plan.status,
      version: plan.version,
      sections: plan.sections.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        content: s.content,
        order: s.order,
        aiGenerated: s.aiGenerated,
      })),
    },
  }
}

/**
 * Retrieve Report from DB and format as markdown.
 */
async function retrieveReportData(
  reportId: string,
  organizationId: string,
): Promise<ExportData | null> {
  const report = await db.report.findFirst({
    where: { id: reportId, organizationId },
  })

  if (!report) return null

  const org = await db.organization.findUnique({ where: { id: organizationId } })

  let markdown = `# ${report.title}\n\n`
  markdown += `**Organization:** ${org?.name || 'Unknown'}\n`
  markdown += `**Type:** ${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report\n`
  markdown += `**Status:** ${report.status.charAt(0).toUpperCase() + report.status.slice(1)}\n`
  markdown += `**Format:** ${report.format.toUpperCase()}\n`
  markdown += `**Created:** ${report.createdAt.toISOString().split('T')[0]}\n\n`

  // Parse the content JSON
  let reportContent: any = {}
  try {
    reportContent = JSON.parse(report.content || '{}')
  } catch {
    reportContent = { rawContent: report.content }
  }

  // If the content has a markdown field, use it directly
  if (reportContent.markdown) {
    markdown += reportContent.markdown
  } else if (reportContent.sections && Array.isArray(reportContent.sections)) {
    for (const section of reportContent.sections) {
      markdown += `## ${section.title || 'Section'}\n\n`
      markdown += `${section.content || ''}\n\n`
    }
  } else if (reportContent.executiveSummary) {
    markdown += `## Executive Summary\n\n${reportContent.executiveSummary}\n\n`
    if (reportContent.keyFindings) {
      markdown += `## Key Findings\n\n`
      for (const finding of reportContent.keyFindings) {
        markdown += `- ${finding}\n`
      }
      markdown += '\n'
    }
    if (reportContent.recommendations) {
      markdown += `## Recommendations\n\n`
      for (const rec of reportContent.recommendations) {
        markdown += `- ${rec}\n`
      }
      markdown += '\n'
    }
  } else {
    // Fallback: dump the content as formatted JSON
    markdown += `## Report Content\n\n\`\`\`json\n${JSON.stringify(reportContent, null, 2)}\n\`\`\`\n\n`
  }

  return {
    title: report.title,
    type: 'report',
    createdAt: report.createdAt.toISOString(),
    content: markdown,
    rawData: {
      id: report.id,
      title: report.title,
      type: report.type,
      format: report.format,
      status: report.status,
      content: reportContent,
    },
  }
}

/**
 * Retrieve Forecast + Revenue/Expense/Statement data from DB and format as markdown.
 */
async function retrieveForecastData(
  forecastId: string,
  organizationId: string,
): Promise<ExportData | null> {
  const forecast = await db.forecast.findFirst({
    where: { id: forecastId, organizationId },
    include: {
      revenueItems: { orderBy: { order: 'asc' } },
      expenseItems: { orderBy: { order: 'asc' } },
      statements: { orderBy: { month: 'asc' } },
    },
  })

  if (!forecast) return null

  const org = await db.organization.findUnique({ where: { id: organizationId } })

  let markdown = `# ${forecast.name}\n\n`
  markdown += `**Organization:** ${org?.name || 'Unknown'}\n`
  markdown += `**Scenario:** ${forecast.type.charAt(0).toUpperCase() + forecast.type.slice(1)}\n`
  markdown += `**Period:** ${forecast.startMonth} — ${forecast.endMonth}\n`
  markdown += `**Currency:** ${forecast.currency}\n`
  markdown += `**Created:** ${forecast.createdAt.toISOString().split('T')[0]}\n\n`

  // Revenue items
  markdown += `## Revenue Streams\n\n`
  markdown += `| Name | Category | Monthly Amount | Growth Rate | Recurring |\n`
  markdown += `|------|----------|---------------|-------------|----------|\n`
  for (const rev of forecast.revenueItems) {
    markdown += `| ${rev.name} | ${rev.category} | ${rev.amount.toLocaleString()} ${forecast.currency} | ${rev.growthRate}% | ${rev.recurring ? 'Yes' : 'No'} |\n`
  }
  markdown += '\n'

  // Expense items
  markdown += `## Expense Items\n\n`
  markdown += `| Name | Category | Monthly Amount | Growth Rate | Recurring |\n`
  markdown += `|------|----------|---------------|-------------|----------|\n`
  for (const exp of forecast.expenseItems) {
    markdown += `| ${exp.name} | ${exp.category} | ${exp.amount.toLocaleString()} ${forecast.currency} | ${exp.growthRate}% | ${exp.recurring ? 'Yes' : 'No'} |\n`
  }
  markdown += '\n'

  // Financial statements
  const pnlStatements = forecast.statements.filter((s) => s.type === 'pnl')
  const cashFlowStatements = forecast.statements.filter((s) => s.type === 'cash_flow')

  if (pnlStatements.length > 0) {
    markdown += `## Profit & Loss Statement\n\n`
    markdown += `| Month | Revenue | Expenses | Net Income | Burn Rate |\n`
    markdown += `|-------|---------|----------|------------|----------|\n`
    for (const s of pnlStatements) {
      markdown += `| ${s.month} | ${s.revenue.toLocaleString()} | ${s.expenses.toLocaleString()} | ${s.netIncome.toLocaleString()} | ${s.burnRate.toLocaleString()} |\n`
    }
    markdown += '\n'
  }

  if (cashFlowStatements.length > 0) {
    markdown += `## Cash Flow Statement\n\n`
    markdown += `| Month | Cash Flow | Cash Balance | Runway (months) |\n`
    markdown += `|-------|-----------|-------------|----------------|\n`
    for (const s of cashFlowStatements) {
      markdown += `| ${s.month} | ${s.cashFlow.toLocaleString()} | ${s.cashBalance.toLocaleString()} | ${s.runway} |\n`
    }
    markdown += '\n'
  }

  // Summary
  const totalMonthlyRevenue = forecast.revenueItems.reduce((sum, r) => sum + r.amount, 0)
  const totalMonthlyExpenses = forecast.expenseItems.reduce((sum, e) => sum + e.amount, 0)
  const netMonthly = totalMonthlyRevenue - totalMonthlyExpenses

  markdown += `## Summary\n\n`
  markdown += `- **Total Monthly Revenue:** ${totalMonthlyRevenue.toLocaleString()} ${forecast.currency}\n`
  markdown += `- **Total Monthly Expenses:** ${totalMonthlyExpenses.toLocaleString()} ${forecast.currency}\n`
  markdown += `- **Net Monthly Income:** ${netMonthly.toLocaleString()} ${forecast.currency}\n`
  markdown += `- **Revenue Streams:** ${forecast.revenueItems.length}\n`
  markdown += `- **Expense Categories:** ${forecast.expenseItems.length}\n`

  return {
    title: forecast.name,
    type: 'forecast',
    createdAt: forecast.createdAt.toISOString(),
    content: markdown,
    rawData: {
      id: forecast.id,
      name: forecast.name,
      type: forecast.type,
      startMonth: forecast.startMonth,
      endMonth: forecast.endMonth,
      currency: forecast.currency,
      revenueItems: forecast.revenueItems.map((r) => ({
        name: r.name,
        category: r.category,
        amount: r.amount,
        growthRate: r.growthRate,
        recurring: r.recurring,
      })),
      expenseItems: forecast.expenseItems.map((e) => ({
        name: e.name,
        category: e.category,
        amount: e.amount,
        growthRate: e.growthRate,
        recurring: e.recurring,
      })),
      statements: forecast.statements.map((s) => ({
        month: s.month,
        type: s.type,
        revenue: s.revenue,
        expenses: s.expenses,
        netIncome: s.netIncome,
        cashFlow: s.cashFlow,
        cashBalance: s.cashBalance,
        burnRate: s.burnRate,
        runway: s.runway,
      })),
    },
  }
}

/**
 * Retrieve KPI data from DB and format as markdown.
 * contentId can be a specific KPI ID or the organizationId for all KPIs.
 */
async function retrieveKpiData(
  contentId: string,
  organizationId: string,
): Promise<ExportData | null> {
  // Try to find a specific KPI first, then fall back to all KPIs for the org
  let kpis = await db.kpi.findMany({
    where: { id: contentId, organizationId },
  })

  if (kpis.length === 0) {
    kpis = await db.kpi.findMany({
      where: { organizationId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }

  if (kpis.length === 0) return null

  const org = await db.organization.findUnique({ where: { id: organizationId } })

  let markdown = `# KPI Report\n\n`
  markdown += `**Organization:** ${org?.name || 'Unknown'}\n`
  markdown += `**Generated:** ${new Date().toISOString().split('T')[0]}\n`
  markdown += `**Total KPIs:** ${kpis.length}\n\n`

  // Group by category
  const categories = [...new Set(kpis.map((k) => k.category))]

  for (const category of categories) {
    const categoryKpis = kpis.filter((k) => k.category === category)
    markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Metrics\n\n`
    markdown += `| KPI | Value | Previous | Change | Target | Period |\n`
    markdown += `|-----|-------|----------|--------|--------|--------|\n`

    for (const kpi of categoryKpis) {
      const change = kpi.previousValue !== 0
        ? (((kpi.value - kpi.previousValue) / Math.abs(kpi.previousValue)) * 100).toFixed(1)
        : 'N/A'
      const changeStr = change === 'N/A' ? 'N/A' : `${Number(change) >= 0 ? '+' : ''}${change}%`
      const targetStr = kpi.target !== null ? kpi.target.toLocaleString() : '—'

      let valueStr: string
      if (kpi.unit === 'percent') {
        valueStr = `${kpi.value.toFixed(1)}%`
      } else if (kpi.unit === 'count') {
        valueStr = kpi.value.toLocaleString()
      } else {
        valueStr = `${kpi.value.toLocaleString()} ${kpi.unit}`
      }

      markdown += `| ${kpi.name} | ${valueStr} | ${kpi.previousValue.toLocaleString()} | ${changeStr} | ${targetStr} | ${kpi.period} |\n`
    }
    markdown += '\n'
  }

  return {
    title: 'KPI Report',
    type: 'kpi',
    createdAt: new Date().toISOString(),
    content: markdown,
    rawData: kpis.map((k) => ({
      id: k.id,
      name: k.name,
      category: k.category,
      value: k.value,
      previousValue: k.previousValue,
      target: k.target,
      unit: k.unit,
      period: k.period,
    })),
  }
}

// ─── Format Generators ───────────────────────────────────────────────────────

/**
 * Generate Markdown content from structured data.
 * This is essentially a no-op since we already generate markdown during retrieval.
 */
async function generateMarkdownContent(type: string, data: any): Promise<string> {
  // This function is used when we need to re-generate markdown from raw data
  // In most cases, the data.content field already contains the markdown
  if (typeof data === 'string') return data
  if (data.content) return data.content

  // Fallback: convert raw data to a simple markdown representation
  let markdown = `# ${data.title || 'Export'}\n\n`
  markdown += '```json\n'
  markdown += JSON.stringify(data, null, 2)
  markdown += '\n```\n'
  return markdown
}

/**
 * Generate a PDF from markdown content.
 *
 * Since we don't have a native PDF library installed, we generate an HTML
 * document that can be rendered as PDF by the browser or a downstream service,
 * and return it as a buffer. For actual PDF binary generation, we would need
 * puppeteer or a similar library. For now, we return HTML wrapped in a
 * simple PDF-compatible structure.
 */
async function generatePDF(content: string, title: string): Promise<Buffer> {
  // Convert markdown to simple HTML
  const htmlContent = markdownToSimpleHTML(content, title)

  // Create a full HTML document that looks good when printed as PDF
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { font-size: 28px; margin-bottom: 8px; color: #111; }
    h2 { font-size: 22px; margin-top: 32px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
    h3 { font-size: 18px; margin-top: 24px; }
    p { margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    ul, ol { padding-left: 24px; }
    li { margin: 4px 0; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #333; }
    .header h1 { margin-bottom: 4px; }
    .header p { color: #666; margin: 2px 0; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <p style="color: #999; font-size: 12px;">Generated by GangNiaga AI</p>
  </div>
  ${htmlContent}
</body>
</html>`

  return Buffer.from(html, 'utf-8')
}

/**
 * Generate CSV from tabular data.
 * Handles arrays of objects by using the keys as headers.
 */
async function generateCSV(data: any[], type?: string): Promise<string> {
  if (!Array.isArray(data) || data.length === 0) {
    return 'No data available\n'
  }

  // Flatten nested objects to one level
  const flatData = data.map((item) => flattenObject(item))

  // Collect all unique keys as headers
  const keys = new Set<string>()
  for (const item of flatData) {
    for (const key of Object.keys(item)) {
      keys.add(key)
    }
  }

  const headers = Array.from(keys)

  // Build CSV
  const rows: string[] = []

  // Header row
  rows.push(headers.map(escapeCSVField).join(','))

  // Data rows
  for (const item of flatData) {
    const row = headers.map((key) => {
      const value = item[key]
      if (value === undefined || value === null) return ''
      return escapeCSVField(String(value))
    })
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

/**
 * Generate XLSX-compatible data.
 * Since we're using SQLite and don't have a full XLSX library, we generate
 * a CSV with BOM (Byte Order Mark) that Excel can open natively, plus
 * XML spreadsheet markup as a fallback.
 */
async function generateXLSXData(data: any[], title: string): Promise<Buffer> {
  // Generate CSV content with BOM for Excel compatibility
  const csvContent = await generateCSV(data)

  // Create a simple XML spreadsheet that Excel can open
  const xmlSpreadsheet = generateXMLSpreadsheet(data, title)

  return Buffer.from(xmlSpreadsheet, 'utf-8')
}

/**
 * Generate DOCX content.
 * Since we don't have the docx npm package, we create an HTML file with
 * Word-compatible markup that can be opened in Microsoft Word.
 */
async function generateDOCX(content: string, title: string): Promise<Buffer> {
  const htmlContent = markdownToSimpleHTML(content, title)

  // Create an HTML document with Word-compatible namespaces
  const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; }
    h1 { font-size: 24pt; color: #1a1a1a; margin-bottom: 12pt; }
    h2 { font-size: 16pt; color: #333; margin-top: 24pt; border-bottom: 1pt solid #ccc; padding-bottom: 6pt; }
    h3 { font-size: 13pt; color: #444; margin-top: 18pt; }
    p { margin: 6pt 0; }
    table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
    th, td { border: 1pt solid #ddd; padding: 6pt 10pt; text-align: left; }
    th { background: #f5f5f5; font-weight: bold; }
    ul, ol { padding-left: 24pt; }
    li { margin: 3pt 0; }
    .header { text-align: center; margin-bottom: 30pt; padding-bottom: 16pt; border-bottom: 2pt solid #333; }
  </style>
</head>
<body>
  <div class="header">
    <p style="color: #999; font-size: 9pt;">Generated by GangNiaga AI &mdash; ${new Date().toLocaleDateString()}</p>
  </div>
  ${htmlContent}
</body>
</html>`

  return Buffer.from(wordHtml, 'utf-8')
}

/**
 * Generate PPTX content.
 * Since we don't have the pptx npm package, we create an HTML presentation
 * format that can be converted or used as a basis for PowerPoint.
 */
async function generatePPTX(content: string, title: string): Promise<Buffer> {
  // Split content by H2 headings to create "slides"
  const sections = content.split(/^## /m).filter(Boolean)

  const slides: string[] = []

  // Title slide
  slides.push(`
<div class="slide">
  <div class="slide-content title-slide">
    <h1>${escapeHtml(title)}</h1>
    <p style="color: #666; font-size: 18px;">Generated by GangNiaga AI</p>
    <p style="color: #999; font-size: 14px;">${new Date().toLocaleDateString()}</p>
  </div>
</div>`)

  // Content slides from H2 sections
  for (const section of sections) {
    const lines = section.split('\n')
    const slideTitle = lines[0].trim()
    const slideBody = lines.slice(1).join('\n').trim()

    slides.push(`
<div class="slide">
  <div class="slide-content">
    <h2>${escapeHtml(slideTitle)}</h2>
    <div class="slide-body">${markdownToSimpleHTML(slideBody, '')}</div>
  </div>
</div>`)
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} - Presentation</title>
  <style>
    body { margin: 0; padding: 20px; background: #f0f0f0; font-family: 'Segoe UI', Calibri, sans-serif; }
    .slide {
      width: 960px; height: 540px; margin: 20px auto; background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15); page-break-after: always;
      display: flex; align-items: center; justify-content: center;
    }
    .slide-content { padding: 40px 60px; width: 100%; }
    .title-slide { text-align: center; }
    .title-slide h1 { font-size: 36px; color: #1a1a1a; margin-bottom: 16px; }
    h2 { font-size: 28px; color: #222; margin-bottom: 16px; border-bottom: 2px solid #e5e5e5; padding-bottom: 8px; }
    .slide-body { font-size: 16px; line-height: 1.5; color: #333; }
    .slide-body p { margin: 6px 0; }
    .slide-body ul { padding-left: 24px; }
    .slide-body li { margin: 4px 0; }
    .slide-body table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    .slide-body th, .slide-body td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
    .slide-body th { background: #f5f5f5; }
    @media print { .slide { box-shadow: none; margin: 0; } }
  </style>
</head>
<body>
  ${slides.join('\n')}
</body>
</html>`

  return Buffer.from(html, 'utf-8')
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Convert basic Markdown to HTML (without requiring a markdown library).
 * Handles: headers, bold, italic, lists, tables, code blocks, paragraphs.
 */
function markdownToSimpleHTML(markdown: string, title: string): string {
  if (!markdown) return ''

  let html = ''

  if (title) {
    html += `<h1>${escapeHtml(title)}</h1>\n`
  }

  const lines = markdown.split('\n')
  let inCodeBlock = false
  let inTable = false
  let tableRows: string[] = []
  let currentParagraph: string[] = []

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim()
      if (text) {
        html += `<p>${formatInlineMarkdown(text)}</p>\n`
      }
      currentParagraph = []
    }
  }

  const flushTable = () => {
    if (tableRows.length > 0) {
      html += '<table>\n'
      tableRows.forEach((row, i) => {
        const cells = row.split('|').filter((c) => c.trim() !== '')
        const tag = i === 0 ? 'th' : 'td'
        html += '  <tr>' + cells.map((c) => `<${tag}>${formatInlineMarkdown(c.trim())}</${tag}>`).join('') + '</tr>\n'
      })
      html += '</table>\n'
      tableRows = []
      inTable = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>\n'
        inCodeBlock = false
      } else {
        flushParagraph()
        flushTable()
        html += '<pre><code>'
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      html += escapeHtml(line) + '\n'
      continue
    }

    // Table rows
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // Skip separator rows
      if (line.match(/^\|[\s-|]+\|$/)) continue

      flushParagraph()
      inTable = true
      tableRows.push(line)
      continue
    } else if (inTable) {
      flushTable()
    }

    // Headers
    const h1Match = line.match(/^# (.+)$/)
    const h2Match = line.match(/^## (.+)$/)
    const h3Match = line.match(/^### (.+)$/)

    if (h1Match) {
      flushParagraph()
      html += `<h1>${formatInlineMarkdown(h1Match[1])}</h1>\n`
      continue
    }
    if (h2Match) {
      flushParagraph()
      html += `<h2>${formatInlineMarkdown(h2Match[1])}</h2>\n`
      continue
    }
    if (h3Match) {
      flushParagraph()
      html += `<h3>${formatInlineMarkdown(h3Match[1])}</h3>\n`
      continue
    }

    // List items
    const ulMatch = line.match(/^[-*] (.+)$/)
    const olMatch = line.match(/^\d+\. (.+)$/)

    if (ulMatch) {
      flushParagraph()
      html += `<ul><li>${formatInlineMarkdown(ulMatch[1])}</li></ul>\n`
      continue
    }
    if (olMatch) {
      flushParagraph()
      html += `<ol><li>${formatInlineMarkdown(olMatch[1])}</li></ol>\n`
      continue
    }

    // Empty lines flush paragraphs
    if (line.trim() === '') {
      flushParagraph()
      continue
    }

    // Regular text — accumulate into paragraph
    currentParagraph.push(line)
  }

  flushParagraph()
  flushTable()

  return html
}

/**
 * Format inline Markdown (bold, italic, code, links).
 */
function formatInlineMarkdown(text: string): string {
  let result = escapeHtml(text)
  // Bold: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic: *text*
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Inline code: `text`
  result = result.replace(/`(.+?)`/g, '<code>$1</code>')
  // Links: [text](url)
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
  return result
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Escape a CSV field (wrap in quotes if it contains commas, quotes, or newlines).
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

/**
 * Flatten a nested object to one level deep for CSV output.
 */
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value === null || value === undefined) {
      result[newKey] = ''
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey))
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value)
    } else {
      result[newKey] = value
    }
  }

  return result
}

/**
 * Generate a simple XML Spreadsheet (SpreadsheetML) that Excel can open.
 */
function generateXMLSpreadsheet(data: any[], title: string): string {
  if (!Array.isArray(data) || data.length === 0) {
    return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${escapeXml(title)}"><Table><Row><Cell><Data ss:Type="String">No data</Data></Cell></Row></Table></Worksheet></Workbook>`
  }

  const flatData = data.map((item) => flattenObject(item))
  const keys = new Set<string>()
  for (const item of flatData) {
    for (const key of Object.keys(item)) {
      keys.add(key)
    }
  }
  const headers = Array.from(keys)

  let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>`
  xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">`
  xml += `<Worksheet ss:Name="${escapeXml(title)}"><Table>`

  // Header row
  xml += '<Row>'
  for (const header of headers) {
    xml += `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`
  }
  xml += '</Row>'

  // Data rows
  for (const item of flatData) {
    xml += '<Row>'
    for (const header of headers) {
      const value = item[header] ?? ''
      const isNumber = typeof value === 'number' || (!isNaN(Number(value)) && value !== '')
      xml += `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(String(value))}</Data></Cell>`
    }
    xml += '</Row>'
  }

  xml += '</Table></Worksheet></Workbook>'
  return xml
}

/**
 * Escape XML special characters.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
