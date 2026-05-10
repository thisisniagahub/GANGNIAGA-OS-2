import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Report type prompts for AI generation
const reportTypePrompts: Record<string, string> = {
  investor: `Generate a comprehensive investor report. Structure it with the following sections:
1. **Executive Summary** - High-level overview of the business performance and key highlights
2. **Key Metrics** - MRR, ARR, growth rate, churn rate, CAC, LTV, and other SaaS metrics
3. **Financial Performance** - Revenue, expenses, net income, burn rate, and runway analysis
4. **Growth Highlights** - Key achievements, milestones reached, and growth indicators
5. **The Ask** - Current fundraising status, use of funds, and investment opportunity
Use professional investor-facing language with data-driven insights. Format with markdown headers and bullet points.`,
  board: `Generate a comprehensive board report. Structure it with the following sections:
1. **Performance Summary** - Key KPIs, financial results vs targets, and overall business health
2. **Strategic Update** - Progress on strategic initiatives, competitive positioning, and market developments
3. **Risks & Challenges** - Current risks, mitigation strategies, and potential obstacles
4. **Financial Overview** - P&L summary, cash position, and budget variance analysis
5. **Next Steps** - Priorities for next quarter, key decisions needed, and action items
Use clear, concise language suitable for board-level review. Format with markdown headers and bullet points.`,
  kpi: `Generate a comprehensive KPI report. Structure it with the following sections:
1. **Metrics Summary** - All key performance indicators with current values, targets, and status (on-track/at-risk/off-track)
2. **Revenue Metrics** - MRR, ARR, revenue growth, ARPU, and revenue by segment
3. **Customer Metrics** - Churn rate, retention rate, NPS, customer count, and activation rate
4. **Trends** - Month-over-month trends, quarter-over-quarter comparisons, and year-over-year growth
5. **Alerts & Action Items** - KPIs that are off-track with recommended corrective actions
Use data-driven language with specific numbers and percentages. Format with markdown tables and bullet points.`,
  financial: `Generate a comprehensive financial report. Structure it with the following sections:
1. **Profit & Loss Summary** - Revenue, COGS, gross margin, operating expenses, and net income
2. **Cash Flow Analysis** - Operating cash flow, investing activities, financing activities, and net cash flow
3. **Balance Sheet Summary** - Assets, liabilities, equity, and key financial ratios
4. **Budget vs Actual** - Variance analysis with explanations for significant deviations
5. **Financial Outlook** - Projected financials, key assumptions, and risk factors
Use professional financial reporting language. Format with markdown tables and clear numerical presentations.`,
  market: `Generate a comprehensive market intelligence report. Structure it with the following sections:
1. **Industry Trends** - Key trends shaping the industry, market size, and growth rate
2. **Competitive Landscape** - Major competitors, their positioning, strengths, and weaknesses
3. **Market Opportunities** - Underserved segments, emerging markets, and whitespace opportunities
4. **Threats & Risks** - Competitive threats, regulatory changes, and market risks
5. **Strategic Recommendations** - Actionable recommendations based on market analysis
Use well-researched, factual language with specific data points. Format with markdown headers and bullet points.`,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { organizationId, title, type, format } = body

    if (!organizationId || !title || !type) {
      return NextResponse.json(
        { error: 'Organization ID, title, and type are required' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['investor', 'board', 'kpi', 'financial', 'market']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid report type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate format if provided
    if (format) {
      const validFormats = ['pdf', 'docx', 'pptx', 'csv', 'xlsx']
      if (!validFormats.includes(format)) {
        return NextResponse.json(
          { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Fetch organization context for richer AI generation
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    })

    // Fetch any existing KPI data for the organization
    const kpis = await db.kpi.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    // Fetch recent forecasts for financial context
    const forecasts = await db.forecast.findMany({
      where: { organizationId },
      include: {
        statements: {
          orderBy: { month: 'desc' },
          take: 12,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    // Build context string from available data
    let dataContext = ''
    if (organization) {
      dataContext += `\nOrganization: ${organization.name}, Industry: ${organization.industry || 'N/A'}, Currency: ${organization.currency}`
    }
    if (kpis.length > 0) {
      dataContext += '\n\nCurrent KPIs:\n' + kpis.map(k => `- ${k.name}: ${k.value} ${k.unit} (target: ${k.target || 'N/A'})`).join('\n')
    }
    if (forecasts.length > 0 && forecasts[0].statements.length > 0) {
      const recentStatements = forecasts[0].statements.slice(0, 3)
      dataContext += '\n\nRecent Financial Data:\n' + recentStatements.map(s =>
        `- ${s.month} (${s.type}): Revenue: ${s.revenue}, Expenses: ${s.expenses}, Net Income: ${s.netIncome}, Cash Balance: ${s.cashBalance}`
      ).join('\n')
    }

    // Generate report content using AI
    let reportContent = '{}'
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const systemPrompt = reportTypePrompts[type]
      const prompt = `Generate a ${type} report titled "${title}".${dataContext}\n\nProduce a detailed, professional report with all sections fully written out. Use markdown formatting.`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })

      const aiContent = completion.choices[0]?.message?.content || ''

      // Structure the report content as JSON
      const structuredContent = {
        title,
        type,
        generatedAt: new Date().toISOString(),
        organizationName: organization?.name || '',
        sections: [],
        fullContent: aiContent,
      }

      reportContent = JSON.stringify(structuredContent)
    } catch (aiError) {
      console.error('AI report generation error:', aiError)
      // Fallback to a basic structure
      reportContent = JSON.stringify({
        title,
        type,
        generatedAt: new Date().toISOString(),
        organizationName: organization?.name || '',
        sections: [],
        fullContent: `Report generation encountered an issue. Please try regenerating the "${title}" report.`,
        error: true,
      })
    }

    // Create the report in the database
    const report = await db.report.create({
      data: {
        title,
        type,
        format: format || 'pdf',
        status: 'generated',
        content: reportContent,
        organizationId,
      },
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

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

    const reports = await db.report.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Reports fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
