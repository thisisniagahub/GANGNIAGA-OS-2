import { db } from '@/lib/db'
import { trackEvent, trackTokenUsage } from '@/lib/observability'

// ============================================
// PLAN REVIEW AGENT — LENDER PERSONA
// LangGraph-style multi-agent orchestration
// v4.0 LivePlan x GangNiaga
// ============================================

// ---- Types ----

export interface PlanReviewInput {
  planId: string
  organizationId: string
  reviewerType?: 'lender' | 'investor' | 'auditor' | 'internal'
}

export interface Finding {
  type: 'discrepancy' | 'red_flag' | 'strength' | 'recommendation' | 'data_gap'
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  section: string
  description: string
  evidence?: string
  suggestion?: string
  narrativeRef?: string
  financialRef?: string
}

export interface ReviewScores {
  overallScore: number
  narrativeScore: number
  financialScore: number
  consistencyScore: number
  riskScore: number
  fundabilityScore: number
}

export interface ReviewReport {
  scores: ReviewScores
  findings: Finding[]
  summary: string
  discrepancies: string[]
  recommendations: string[]
  redFlags: string[]
  strengths: string[]
  lenderQuestions: string[]
}

interface SectionData {
  id: string
  type: string
  title: string
  content: string
  order: number
  aiGenerated: boolean
}

interface FinancialData {
  forecastId: string
  forecastName: string
  forecastType: string
  revenueItems: { name: string; category: string; amount: number; growthRate: number; recurring: boolean }[]
  expenseItems: { name: string; category: string; amount: number; growthRate: number; recurring: boolean }[]
  statements: {
    month: string
    type: string
    revenue: number
    expenses: number
    netIncome: number
    cashFlow: number
    cashBalance: number
    burnRate: number
    runway: number
  }[]
}

// ---- LLM Helper ----

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  })

  return completion.choices[0]?.message?.content || ''
}

// ---- Data Retrieval ----

async function getPlanData(planId: string, organizationId: string) {
  const plan = await db.businessPlan.findUnique({
    where: { id: planId },
    include: {
      sections: { orderBy: { order: 'asc' } },
    },
  })

  if (!plan) throw new Error('Plan not found')
  if (plan.organizationId !== organizationId) throw new Error('Plan does not belong to this organization')

  return plan
}

async function getFinancialData(organizationId: string): Promise<FinancialData[]> {
  const forecasts = await db.forecast.findMany({
    where: { organizationId },
    include: {
      revenueItems: { orderBy: { order: 'asc' } },
      expenseItems: { orderBy: { order: 'asc' } },
      statements: { orderBy: { month: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return forecasts.map((f) => ({
    forecastId: f.id,
    forecastName: f.name,
    forecastType: f.type,
    revenueItems: f.revenueItems.map((r) => ({
      name: r.name,
      category: r.category,
      amount: r.amount,
      growthRate: r.growthRate,
      recurring: r.recurring,
    })),
    expenseItems: f.expenseItems.map((e) => ({
      name: e.name,
      category: e.category,
      amount: e.amount,
      growthRate: e.growthRate,
      recurring: e.recurring,
    })),
    statements: f.statements.map((s) => ({
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
  }))
}

// ---- Agent 1: Narrative Analysis ----

async function narrativeAnalysisAgent(
  sections: SectionData[],
  planTitle: string,
  reviewerType: string
): Promise<{ findings: Finding[]; score: number }> {
  const sectionsSummary = sections
    .filter((s) => s.content.trim().length > 0)
    .map((s) => `## ${s.title} (${s.type})\n${s.content.substring(0, 2000)}`)
    .join('\n\n')

  const emptySections = sections
    .filter((s) => s.content.trim().length === 0)
    .map((s) => s.title)

  const systemPrompt = `You are a senior ${reviewerType} reviewing a business plan's written narrative. Your job is to evaluate the quality, clarity, completeness, and persuasiveness of the business plan's written sections from a ${reviewerType}'s perspective.

Evaluate each section on:
1. **Clarity** — Is the writing clear, professional, and easy to understand?
2. **Completeness** — Does it cover all necessary aspects? Are there gaps?
3. **Persuasiveness** — Would this convince a ${reviewerType} to approve funding?
4. **Consistency** — Do the narrative claims align logically across sections?
5. **Specificity** — Are claims backed by specific data, metrics, and examples?

You MUST respond with a valid JSON object (no markdown, no code fences):
{
  "findings": [
    {
      "type": "strength|recommendation|data_gap|red_flag",
      "severity": "info|low|medium|high|critical",
      "section": "section_type or 'overall'",
      "description": "What you found",
      "evidence": "Quote or reference from the text",
      "suggestion": "How to improve (if applicable)"
    }
  ],
  "score": <number 0-100>
}

Score guidelines:
- 90-100: Exceptional, investor-ready narrative
- 70-89: Strong with minor gaps
- 50-69: Adequate but needs improvement
- 30-49: Weak, significant gaps or issues
- 0-29: Critically insufficient`

  const userPrompt = `Review this business plan narrative for "${planTitle}":

${sectionsSummary}

${emptySections.length > 0 ? `Empty/missing sections: ${emptySections.join(', ')}` : 'All sections have content.'}

Provide your analysis as the JSON object specified.`

  try {
    const response = await callLLM(systemPrompt, userPrompt)
    const parsed = parseJSONResponse(response)
    return {
      findings: (parsed.findings || []).map(normalizeFinding),
      score: typeof parsed.score === 'number' ? clampScore(parsed.score) : 50,
    }
  } catch (error) {
    console.error('[NarrativeAgent] LLM call failed:', error)
    // Fallback: generate basic findings from section analysis
    const findings: Finding[] = []
    if (emptySections.length > 0) {
      findings.push({
        type: 'data_gap',
        severity: 'high',
        section: 'overall',
        description: `Missing content in sections: ${emptySections.join(', ')}`,
        suggestion: 'Complete all sections before submitting for review',
      })
    }
    sections.forEach((s) => {
      if (s.content.length > 0 && s.content.length < 100) {
        findings.push({
          type: 'recommendation',
          severity: 'medium',
          section: s.type,
          description: `"${s.title}" section is very brief (${s.content.length} chars)`,
          suggestion: 'Expand with more detail and supporting data',
        })
      }
    })
    return { findings, score: emptySections.length > 3 ? 25 : 45 }
  }
}

// ---- Agent 2: Financial Analysis ----

async function financialAnalysisAgent(
  financialData: FinancialData[],
  planTitle: string,
  reviewerType: string
): Promise<{ findings: Finding[]; score: number }> {
  const systemPrompt = `You are a senior ${reviewerType} reviewing the financial projections and assumptions of a business plan. Evaluate the financial rigor from a ${reviewerType}'s perspective.

Evaluate:
1. **Assumption Quality** — Are assumptions realistic and well-documented?
2. **Projection Soundness** — Do projections follow logically from assumptions?
3. **Revenue Model** — Is the revenue model credible with realistic growth rates?
4. **Expense Discipline** — Are expenses reasonable and well-categorized?
5. **Cash Flow Management** — Is there adequate runway and cash management?
6. **Break-even Analysis** — Is there a clear path to profitability?
7. **Risk Assessment** — Are financial risks identified and mitigated?

You MUST respond with a valid JSON object (no markdown, no code fences):
{
  "findings": [
    {
      "type": "strength|recommendation|data_gap|red_flag|discrepancy",
      "severity": "info|low|medium|high|critical",
      "section": "financial",
      "description": "What you found",
      "evidence": "Specific data point",
      "suggestion": "How to improve",
      "financialRef": "Reference to financial data"
    }
  ],
  "score": <number 0-100>
}

Score guidelines:
- 90-100: Bank-grade financial projections
- 70-89: Solid with minor concerns
- 50-69: Needs improvement in key areas
- 30-49: Significant financial gaps
- 0-29: Financially unsound`

  const financialsSummary = financialData.length > 0
    ? financialData.map((fd) => {
        const totalRevenue = fd.revenueItems.reduce((s, r) => s + r.amount, 0)
        const totalExpenses = fd.expenseItems.reduce((s, e) => s + e.amount, 0)
        const pnlStatements = fd.statements.filter((s) => s.type === 'pnl')
        const lastPnl = pnlStatements[pnlStatements.length - 1]

        return `
Forecast: ${fd.forecastName} (${fd.forecastType})
- Revenue streams: ${fd.revenueItems.length} (${totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}/mo total` : 'No revenue items'})
${fd.revenueItems.map((r) => `  • ${r.name}: $${r.amount.toLocaleString()}/mo (${r.recurring ? 'recurring' : 'one-time'}, ${r.growthRate}% growth, ${r.category})`).join('\n')}
- Expense items: ${fd.expenseItems.length} (${totalExpenses > 0 ? `$${totalExpenses.toLocaleString()}/mo total` : 'No expense items'})
${fd.expenseItems.map((e) => `  • ${e.name}: $${e.amount.toLocaleString()}/mo (${e.recurring ? 'recurring' : 'one-time'}, ${e.growthRate}% growth, ${e.category})`).join('\n')}
- Financial statements: ${fd.statements.length} periods
${lastPnl ? `  Latest P&L: Revenue $${lastPnl.revenue.toLocaleString()}, Expenses $${lastPnl.expenses.toLocaleString()}, Net Income $${lastPnl.netIncome.toLocaleString()}
  Cash Balance: $${lastPnl.cashBalance.toLocaleString()}, Burn Rate: $${lastPnl.burnRate.toLocaleString()}/mo, Runway: ${lastPnl.runway.toFixed(1)} months` : '  No P&L statements available'}
`
      }).join('\n')
    : 'No financial forecasts or data available for this plan.'

  const userPrompt = `Review the financial projections for "${planTitle}":

${financialsSummary}

Provide your analysis as the JSON object specified.`

  try {
    const response = await callLLM(systemPrompt, userPrompt)
    const parsed = parseJSONResponse(response)
    return {
      findings: (parsed.findings || []).map(normalizeFinding),
      score: typeof parsed.score === 'number' ? clampScore(parsed.score) : 40,
    }
  } catch (error) {
    console.error('[FinancialAgent] LLM call failed:', error)
    const findings: Finding[] = []
    if (financialData.length === 0) {
      findings.push({
        type: 'red_flag',
        severity: 'critical',
        section: 'financial',
        description: 'No financial forecasts or projections available',
        suggestion: 'Create financial forecasts before submitting for lender review',
      })
    } else {
      const fd = financialData[0]
      if (fd.revenueItems.length === 0) {
        findings.push({ type: 'red_flag', severity: 'critical', section: 'financial', description: 'No revenue items in forecast', suggestion: 'Add revenue streams to your financial forecast' })
      }
      if (fd.expenseItems.length === 0) {
        findings.push({ type: 'data_gap', severity: 'high', section: 'financial', description: 'No expense items in forecast', suggestion: 'Add expense items to your financial forecast' })
      }
      if (fd.statements.length === 0) {
        findings.push({ type: 'data_gap', severity: 'high', section: 'financial', description: 'No financial statements generated', suggestion: 'Generate P&L, balance sheet, and cash flow statements' })
      }
    }
    return { findings, score: financialData.length === 0 ? 10 : 35 }
  }
}

// ---- Agent 3: Cross-Check Agent ----

async function crossCheckAgent(
  sections: SectionData[],
  financialData: FinancialData[],
  planTitle: string,
  reviewerType: string,
  narrativeFindings: Finding[],
  financialFindings: Finding[]
): Promise<{ findings: Finding[]; consistencyScore: number }> {
  const systemPrompt = `You are a senior ${reviewerType} performing a cross-check between the narrative claims in a business plan and the actual financial projections. Your job is to find discrepancies, contradictions, and misalignments.

Specifically look for:
1. **Growth claims vs projections** — e.g., "growing 50%" but financials show 20%
2. **Revenue claims vs actuals** — e.g., narrative says "strong MRR" but revenue items are low
3. **Market size claims vs financial targets** — e.g., claims huge TAM but revenue projections are tiny
4. **Team/hiring claims vs expense projections** — e.g., "team of 50" but no payroll expenses
5. **Timeline claims vs financial runway** — e.g., "launching in 6 months" but only 3 months runway
6. **Missing financial backing** — narrative makes claims with no financial data to support

You MUST respond with a valid JSON object (no markdown, no code fences):
{
  "findings": [
    {
      "type": "discrepancy|red_flag|data_gap|strength",
      "severity": "info|low|medium|high|critical",
      "section": "section_type or 'cross_check'",
      "description": "What you found",
      "evidence": "Specific evidence",
      "suggestion": "How to resolve",
      "narrativeRef": "Quote from narrative",
      "financialRef": "Reference to financial data point"
    }
  ],
  "consistencyScore": <number 0-100>
}

Score guidelines:
- 90-100: Narrative and financials are perfectly aligned
- 70-89: Minor inconsistencies
- 50-69: Several discrepancies found
- 30-49: Major misalignments
- 0-29: Narrative contradicts financials`

  const narrativeExcerpt = sections
    .filter((s) => s.content.trim().length > 0)
    .map((s) => `## ${s.title}\n${s.content.substring(0, 1500)}`)
    .join('\n\n')

  const financialsExcerpt = financialData.length > 0
    ? financialData.slice(0, 2).map((fd) => {
        const totalRev = fd.revenueItems.reduce((s, r) => s + r.amount, 0)
        const totalExp = fd.expenseItems.reduce((s, e) => s + e.amount, 0)
        return `Forecast "${fd.forecastName}": Revenue $${totalRev.toLocaleString()}/mo, Expenses $${totalExp.toLocaleString()}/mo, ${fd.revenueItems.length} revenue streams, ${fd.expenseItems.length} expense items, ${fd.statements.length} statement periods`
      }).join('\n')
    : 'No financial data available.'

  const priorFindings = [...narrativeFindings, ...financialFindings]
    .filter((f) => f.type === 'red_flag' || f.type === 'discrepancy')
    .map((f) => `- [${f.type}] ${f.description}`)
    .join('\n')

  const userPrompt = `Cross-check the narrative vs financials for "${planTitle}":

=== NARRATIVE ===
${narrativeExcerpt}

=== FINANCIALS ===
${financialsExcerpt}

=== PRIOR RED FLAGS/DISCREPANCIES ===
${priorFindings || 'None identified yet.'}

Find all misalignments and provide your analysis as the JSON object specified.`

  try {
    const response = await callLLM(systemPrompt, userPrompt)
    const parsed = parseJSONResponse(response)
    return {
      findings: (parsed.findings || []).map(normalizeFinding),
      consistencyScore: typeof parsed.consistencyScore === 'number' ? clampScore(parsed.consistencyScore) : 50,
    }
  } catch (error) {
    console.error('[CrossCheckAgent] LLM call failed:', error)
    // Fallback cross-check using simple heuristics
    const findings: Finding[] = []

    if (financialData.length === 0) {
      findings.push({
        type: 'data_gap',
        severity: 'critical',
        section: 'cross_check',
        description: 'Cannot perform cross-check: no financial data available to compare against narrative',
        suggestion: 'Create financial forecasts to enable narrative vs financial cross-checking',
      })
    } else {
      // Check if financial section exists but has no content while financial data exists
      const financialSection = sections.find((s) => s.type === 'financial')
      if (financialSection && financialSection.content.trim().length === 0 && financialData[0].statements.length > 0) {
        findings.push({
          type: 'discrepancy',
          severity: 'high',
          section: 'financial',
          description: 'Financial narrative section is empty but financial projections exist',
          narrativeRef: 'Financial Planning section has no content',
          financialRef: `${financialData[0].statements.length} financial statements exist`,
          suggestion: 'Write a financial planning narrative that explains your projections',
        })
      }
    }

    return { findings, consistencyScore: findings.length > 0 ? 40 : 55 }
  }
}

// ---- Lender Questions Generator ----

export async function generateLenderQuestions(
  planData: {
    title: string
    sections: SectionData[]
    financialData: FinancialData[]
  }
): Promise<string[]> {
  const systemPrompt = `You are a senior lender reviewing a business plan. Generate the most critical questions a lender would ask before approving funding. Focus on:
1. Revenue sustainability and growth assumptions
2. Cash flow adequacy and runway
3. Debt service coverage and collateral
4. Management team capability
5. Market validation and competitive moat
6. Risk mitigation strategies

Respond with a JSON array of question strings. No markdown, no code fences.`

  const narrative = planData.sections
    .filter((s) => s.content.trim().length > 0)
    .map((s) => `${s.title}: ${s.content.substring(0, 500)}`)
    .join('\n')

  const financials = planData.financialData.length > 0
    ? planData.financialData[0]
    : null

  const userPrompt = `Generate lender questions for: "${planData.title}"

Narrative summary:
${narrative || 'No narrative content.'}

Financial summary:
${financials
    ? `Revenue: $${financials.revenueItems.reduce((s, r) => s + r.amount, 0).toLocaleString()}/mo, Expenses: $${financials.expenseItems.reduce((s, e) => s + e.amount, 0).toLocaleString()}/mo, ${financials.statements.length} statement periods`
    : 'No financial data available.'
}`

  try {
    const response = await callLLM(systemPrompt, userPrompt)
    const parsed = parseJSONResponse(response)
    if (Array.isArray(parsed)) return parsed.slice(0, 15).map(String)
    return parsed.questions?.slice(0, 15).map(String) || []
  } catch (error) {
    console.error('[LenderQuestions] LLM call failed:', error)
    return [
      'What is your monthly recurring revenue (MRR) and how has it grown over the past 6 months?',
      'How much runway do you have remaining, and what is your burn rate?',
      'What collateral or assets can secure this loan?',
      'Who is on the management team and what is their track record?',
      'What are your top 3 risks and how are you mitigating them?',
      'How will you use the funds and what milestones will they achieve?',
      'What is your path to profitability and when do you expect to break even?',
      'How do your financial projections compare to industry benchmarks?',
    ]
  }
}

// ---- Cross-Check Narrative vs Financial (Standalone) ----

export async function crossCheckNarrativeVsFinancial(
  sections: SectionData[],
  financials: FinancialData[]
): Promise<Finding[]> {
  const findings: Finding[] = []

  // Heuristic cross-checks that don't require LLM

  // 1. Check if narrative claims growth percentages that don't match financial projections
  const growthMentions = sections
    .filter((s) => s.content.trim().length > 0)
    .map((s) => {
      const growthMatch = s.content.match(/(\d+)%\s*(growth|increase|grow|rise|expand)/i)
      return growthMatch ? { section: s.type, percent: parseInt(growthMatch[1]) } : null
    })
    .filter(Boolean) as { section: string; percent: number }[]

  for (const gm of growthMentions) {
    if (financials.length > 0) {
      const avgGrowthRate = financials[0].revenueItems.reduce((s, r) => s + r.growthRate, 0) /
        (financials[0].revenueItems.length || 1)
      if (gm.percent > avgGrowthRate * 2 && avgGrowthRate > 0) {
        findings.push({
          type: 'discrepancy',
          severity: 'high',
          section: gm.section,
          description: `Narrative claims ${gm.percent}% growth, but financial projections average ${avgGrowthRate.toFixed(1)}% growth rate`,
          narrativeRef: `${gm.percent}% growth mentioned`,
          financialRef: `Average projected growth: ${avgGrowthRate.toFixed(1)}%`,
          suggestion: 'Align narrative growth claims with financial projections',
        })
      }
    }
  }

  // 2. Check if narrative mentions team size but payroll expenses are missing
  const teamSection = sections.find((s) => s.type === 'team')
  if (teamSection && teamSection.content.trim().length > 0) {
    const teamSizeMatch = teamSection.content.match(/(\d+)\s*(employees?|team members?|staff|people)/i)
    if (teamSizeMatch && financials.length > 0) {
      const claimedTeamSize = parseInt(teamSizeMatch[1])
      const hasPayroll = financials[0].expenseItems.some(
        (e) => e.category === 'payroll' || e.name.toLowerCase().includes('salary') || e.name.toLowerCase().includes('payroll')
      )
      if (claimedTeamSize > 0 && !hasPayroll) {
        findings.push({
          type: 'discrepancy',
          severity: 'high',
          section: 'team',
          description: `Narrative mentions ${claimedTeamSize} team members but no payroll expenses found in financial projections`,
          narrativeRef: `${claimedTeamSize} team members mentioned`,
          financialRef: 'No payroll/salary expense items in forecast',
          suggestion: 'Add payroll expenses to financial forecast to match team size claims',
        })
      }
    }
  }

  // 3. Check if executive summary mentions funding needs but financials show no shortfall
  const execSummary = sections.find((s) => s.type === 'executive_summary')
  if (execSummary && execSummary.content.trim().length > 0 && financials.length > 0) {
    const fundingNeedMatch = execSummary.content.match(/\$([\d,.]+)\s*(million|thousand|k|m|funding|investment|capital|loan)/i)
    const lastStatement = financials[0].statements
      .filter((s) => s.type === 'pnl')
      .pop()
    if (fundingNeedMatch && lastStatement && lastStatement.runway > 12 && lastStatement.netIncome > 0) {
      findings.push({
        type: 'data_gap',
        severity: 'medium',
        section: 'executive_summary',
        description: 'Narrative mentions funding needs but financials show positive net income and 12+ months runway',
        narrativeRef: `Funding need mentioned: ${fundingNeedMatch[0]}`,
        financialRef: `Net income: $${lastStatement.netIncome.toLocaleString()}, Runway: ${lastStatement.runway.toFixed(1)} months`,
        suggestion: 'Clarify why funding is needed given positive financial projections',
      })
    }
  }

  // 4. Missing financial section content
  const finSection = sections.find((s) => s.type === 'financial')
  if (finSection && finSection.content.trim().length === 0 && financials.length > 0) {
    findings.push({
      type: 'data_gap',
      severity: 'high',
      section: 'financial',
      description: 'Financial narrative section is empty despite having financial projections',
      suggestion: 'Write a financial planning narrative that explains and contextualizes the projections',
    })
  }

  // 5. Very low runway
  if (financials.length > 0) {
    const lastStatement = financials[0].statements.filter((s) => s.type === 'pnl').pop()
    if (lastStatement && lastStatement.runway > 0 && lastStatement.runway < 6) {
      findings.push({
        type: 'red_flag',
        severity: 'critical',
        section: 'financial',
        description: `Runway is only ${lastStatement.runway.toFixed(1)} months — critically low for a lender`,
        financialRef: `Runway: ${lastStatement.runway.toFixed(1)} months, Cash balance: $${lastStatement.cashBalance.toLocaleString()}`,
        suggestion: 'Extend runway through cost reduction, revenue acceleration, or additional funding before approaching lenders',
      })
    }
  }

  return findings
}

// ---- Score Calculation ----

function calculateScores(
  narrativeScore: number,
  financialScore: number,
  consistencyScore: number,
  findings: Finding[]
): ReviewScores {
  // Count findings by severity and type
  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const highCount = findings.filter((f) => f.severity === 'high').length
  const redFlagCount = findings.filter((f) => f.type === 'red_flag').length
  const discrepancyCount = findings.filter((f) => f.type === 'discrepancy').length
  const strengthCount = findings.filter((f) => f.type === 'strength').length

  // Risk score: higher = more risky (inverted from quality scores)
  let riskScore = 20 // baseline
  riskScore += criticalCount * 15
  riskScore += highCount * 8
  riskScore += redFlagCount * 10
  riskScore += discrepancyCount * 5
  riskScore -= strengthCount * 3
  riskScore = clampScore(riskScore)

  // Fundability score: composite of all quality scores minus risk
  let fundabilityScore = (narrativeScore * 0.25) + (financialScore * 0.35) + (consistencyScore * 0.25) + ((100 - riskScore) * 0.15)
  fundabilityScore = clampScore(Math.round(fundabilityScore))

  // Overall score: weighted composite
  let overallScore = (narrativeScore * 0.25) + (financialScore * 0.35) + (consistencyScore * 0.25) + ((100 - riskScore) * 0.15)
  overallScore = clampScore(Math.round(overallScore))

  return {
    overallScore,
    narrativeScore,
    financialScore,
    consistencyScore,
    riskScore,
    fundabilityScore,
  }
}

// ---- Summary Generator ----

async function generateSummary(
  planTitle: string,
  scores: ReviewScores,
  findings: Finding[],
  reviewerType: string
): Promise<string> {
  const systemPrompt = `You are a senior ${reviewerType}. Write a concise executive summary (3-5 paragraphs) of your review of a business plan. Be direct, professional, and specific. Include key scores, critical findings, and your overall assessment of fundability.`

  const criticalFindings = findings.filter((f) => f.severity === 'critical' || f.type === 'red_flag')
  const strengths = findings.filter((f) => f.type === 'strength')

  const userPrompt = `Write a review summary for "${planTitle}":

Scores:
- Overall: ${scores.overallScore}/100
- Narrative: ${scores.narrativeScore}/100
- Financial: ${scores.financialScore}/100
- Consistency: ${scores.consistencyScore}/100
- Risk: ${scores.riskScore}/100
- Fundability: ${scores.fundabilityScore}/100

Critical Issues (${criticalFindings.length}):
${criticalFindings.map((f) => `- [${f.severity}] ${f.description}`).join('\n')}

Strengths (${strengths.length}):
${strengths.map((f) => `- ${f.description}`).join('\n')}

Total Findings: ${findings.length}

Write the summary in plain text (no markdown).`

  try {
    const response = await callLLM(systemPrompt, userPrompt)
    return response.trim()
  } catch (error) {
    console.error('[SummaryGenerator] LLM call failed:', error)
    return `Business Plan Review Summary for "${planTitle}":

Overall Score: ${scores.overallScore}/100 | Fundability: ${scores.fundabilityScore}/100

This plan received a narrative quality score of ${scores.narrativeScore}/100, financial rigor score of ${scores.financialScore}/100, and consistency score of ${scores.consistencyScore}/100. The risk assessment scores ${scores.riskScore}/100.

${criticalFindings.length > 0 ? `Critical issues were identified that require attention: ${criticalFindings.map((f) => f.description).join('; ')}` : 'No critical issues were identified.'}

${strengths.length > 0 ? `Key strengths include: ${strengths.map((f) => f.description).join('; ')}` : ''}

A total of ${findings.length} findings were generated across narrative analysis, financial review, and cross-checking.`
  }
}

// ---- Main Orchestration Function ----

export async function reviewPlan(
  input: PlanReviewInput
): Promise<ReviewReport> {
  const { planId, organizationId, reviewerType = 'lender' } = input
  const startTime = Date.now()

  // Track the review start
  await trackEvent({
    organizationId,
    eventType: 'api_request',
    source: 'plan_review',
    status: 'info',
    message: `Starting plan review for plan ${planId} as ${reviewerType}`,
    data: { planId, reviewerType },
  }).catch(() => {})

  // Step 1: Retrieve plan data
  const plan = await getPlanData(planId, organizationId)
  const sections: SectionData[] = plan.sections.map((s) => ({
    id: s.id,
    type: s.type,
    title: s.title,
    content: s.content,
    order: s.order,
    aiGenerated: s.aiGenerated,
  }))

  // Step 2: Retrieve financial data
  const financialData = await getFinancialData(organizationId)

  // Step 3: Run Narrative Analysis Agent
  const narrativeResult = await narrativeAnalysisAgent(sections, plan.title, reviewerType)

  // Step 4: Run Financial Analysis Agent
  const financialResult = await financialAnalysisAgent(financialData, plan.title, reviewerType)

  // Step 5: Run Cross-Check Agent (uses results from agents 1 & 2)
  const crossCheckResult = await crossCheckAgent(
    sections,
    financialData,
    plan.title,
    reviewerType,
    narrativeResult.findings,
    financialResult.findings
  )

  // Step 6: Run standalone heuristic cross-check
  const heuristicFindings = await crossCheckNarrativeVsFinancial(sections, financialData)

  // Step 7: Aggregate all findings
  const allFindings: Finding[] = [
    ...narrativeResult.findings,
    ...financialResult.findings,
    ...crossCheckResult.findings,
    ...heuristicFindings,
  ]

  // Deduplicate findings by description similarity
  const uniqueFindings = deduplicateFindings(allFindings)

  // Step 8: Calculate scores
  const scores = calculateScores(
    narrativeResult.score,
    financialResult.score,
    crossCheckResult.consistencyScore,
    uniqueFindings
  )

  // Step 9: Generate lender questions
  const lenderQuestions = await generateLenderQuestions({
    title: plan.title,
    sections,
    financialData,
  })

  // Step 10: Generate summary
  const summary = await generateSummary(plan.title, scores, uniqueFindings, reviewerType)

  // Categorize findings for the report
  const discrepancies = uniqueFindings
    .filter((f) => f.type === 'discrepancy')
    .map((f) => f.description)
  const recommendations = uniqueFindings
    .filter((f) => f.type === 'recommendation')
    .map((f) => f.description)
  const redFlags = uniqueFindings
    .filter((f) => f.type === 'red_flag')
    .map((f) => f.description)
  const strengths = uniqueFindings
    .filter((f) => f.type === 'strength')
    .map((f) => f.description)

  // Track token usage (estimate)
  const totalTokens = Math.ceil(summary.length / 4) + uniqueFindings.length * 50
  await trackTokenUsage({
    organizationId,
    agentType: 'plan_review',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens,
    requestType: 'plan_review',
  }).catch(() => {})

  // Track completion
  await trackEvent({
    organizationId,
    eventType: 'api_request',
    source: 'plan_review',
    status: 'info',
    message: `Plan review completed for plan ${planId}`,
    data: { planId, reviewerType, overallScore: scores.overallScore, findingCount: uniqueFindings.length, duration: Date.now() - startTime },
  }).catch(() => {})

  return {
    scores,
    findings: uniqueFindings,
    summary,
    discrepancies,
    recommendations,
    redFlags,
    strengths,
    lenderQuestions,
  }
}

// ---- Utility Functions ----

function parseJSONResponse(text: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from markdown code fences
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1])
      } catch {
        // fall through
      }
    }

    // Try to find the first { ... } or [ ... ] block
    const braceMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[1])
      } catch {
        // fall through
      }
    }

    return {}
  }
}

function normalizeFinding(f: Record<string, unknown>): Finding {
  const validTypes = ['discrepancy', 'red_flag', 'strength', 'recommendation', 'data_gap']
  const validSeverities = ['info', 'low', 'medium', 'high', 'critical']

  return {
    type: validTypes.includes(f.type as string) ? (f.type as Finding['type']) : 'recommendation',
    severity: validSeverities.includes(f.severity as string) ? (f.severity as Finding['severity']) : 'medium',
    section: typeof f.section === 'string' ? f.section : 'overall',
    description: typeof f.description === 'string' ? f.description : 'No description provided',
    evidence: typeof f.evidence === 'string' ? f.evidence : undefined,
    suggestion: typeof f.suggestion === 'string' ? f.suggestion : undefined,
    narrativeRef: typeof f.narrativeRef === 'string' ? f.narrativeRef : undefined,
    financialRef: typeof f.financialRef === 'string' ? f.financialRef : undefined,
  }
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>()
  return findings.filter((f) => {
    // Create a simple hash from description keywords
    const key = f.description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .sort()
      .join(' ')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
