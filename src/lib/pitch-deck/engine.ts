// ============================================
// DYNAMIC PITCH DECK ORCHESTRATOR ENGINE (v4.0)
// Auto-synced investor presentations with dynamic variables
// ============================================

import { db } from '@/lib/db'
import { trackEvent, trackTokenUsage } from '@/lib/observability'

// ==========================================
// TYPES
// ==========================================

export interface SlideDefinition {
  type: string
  title: string
  layout: string
  content: Record<string, unknown>
  dynamicFields: string[]
  speakerNotes?: string
}

export interface TemplateDefinition {
  id: string
  name: string
  description: string
  category: string
  slideCount: number
  slides: SlideDefinition[]
}

export interface DynamicVariableValue {
  value: string | number
  source: string // 'plan' | 'forecast' | 'kpi' | 'manual'
  lastUpdated: string
}

export interface DeckAnalysis {
  overallScore: number
  clarity: number
  financialRigor: number
  marketProof: number
  teamStrength: number
  askClarity: number
  recommendations: string[]
  strengths: string[]
  weaknesses: string[]
}

export interface FunderQuestion {
  question: string
  category: string
  suggestedAnswer: string
  likelihood: string
  difficulty: string
  slideReference?: string
}

// ==========================================
// BUILT-IN TEMPLATES
// ==========================================

const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'seed_round',
    name: 'Seed Round',
    description: 'Ideal for early-stage startups seeking seed funding. Covers vision, market opportunity, and initial traction.',
    category: 'seed',
    slideCount: 12,
    slides: [
      { type: 'title', title: 'Cover', layout: 'centered', content: { subtitle: '{{company_name}}', tagline: '{{tagline}}' }, dynamicFields: ['company_name', 'tagline'] },
      { type: 'problem', title: 'The Problem', layout: 'default', content: { description: '{{problem_statement}}', painPoints: [] }, dynamicFields: ['problem_statement'] },
      { type: 'solution', title: 'Our Solution', layout: 'default', content: { description: '{{solution_description}}', keyFeatures: [] }, dynamicFields: ['solution_description'] },
      { type: 'market', title: 'Market Opportunity', layout: 'data_heavy', content: { tam: '{{market_size}}', sam: '{{serviceable_market}}', som: '{{obtainable_market}}', growthRate: '{{market_growth_rate}}' }, dynamicFields: ['market_size', 'serviceable_market', 'obtainable_market', 'market_growth_rate'] },
      { type: 'product', title: 'Product', layout: 'visual', content: { description: '{{product_description}}', demo: '', roadmap: '' }, dynamicFields: ['product_description'] },
      { type: 'business_model', title: 'Business Model', layout: 'default', content: { model: '{{business_model}}', pricing: '{{pricing_strategy}}', channels: '{{channels}}' }, dynamicFields: ['business_model', 'pricing_strategy', 'channels'] },
      { type: 'traction', title: 'Traction', layout: 'data_heavy', content: { metrics: '{{traction_metrics}}', milestones: [], customers: '{{customer_count}}' }, dynamicFields: ['traction_metrics', 'customer_count'] },
      { type: 'financials', title: 'Financial Projections', layout: 'data_heavy', content: { revenue_year1: '{{revenue_year1}}', revenue_year3: '{{revenue_year3}}', burn_rate: '{{burn_rate}}', runway: '{{runway_months}} months' }, dynamicFields: ['revenue_year1', 'revenue_year3', 'burn_rate', 'runway_months'] },
      { type: 'team', title: 'Team', layout: 'default', content: { founders: [], advisors: [], hiring_needs: '' }, dynamicFields: [] },
      { type: 'competition', title: 'Competitive Landscape', layout: 'split', content: { competitors: [], advantages: '{{competitive_advantages}}' }, dynamicFields: ['competitive_advantages'] },
      { type: 'ask', title: 'The Ask', layout: 'centered', content: { amount: '{{funding_ask}}', useOfFunds: '{{use_of_funds}}', milestones: [] }, dynamicFields: ['funding_ask', 'use_of_funds'] },
      { type: 'appendix', title: 'Appendix', layout: 'default', content: { additionalData: [] }, dynamicFields: [] },
    ],
  },
  {
    id: 'series_a',
    name: 'Series A',
    description: 'For startups with proven traction seeking growth capital. Emphasizes metrics, unit economics, and scale.',
    category: 'series_a',
    slideCount: 14,
    slides: [
      { type: 'title', title: 'Cover', layout: 'centered', content: { subtitle: '{{company_name}}', tagline: '{{tagline}}' }, dynamicFields: ['company_name', 'tagline'] },
      { type: 'problem', title: 'The Problem', layout: 'default', content: { description: '{{problem_statement}}', painPoints: [] }, dynamicFields: ['problem_statement'] },
      { type: 'solution', title: 'Our Solution', layout: 'default', content: { description: '{{solution_description}}', keyFeatures: [] }, dynamicFields: ['solution_description'] },
      { type: 'market', title: 'Market Opportunity', layout: 'data_heavy', content: { tam: '{{market_size}}', sam: '{{serviceable_market}}', som: '{{obtainable_market}}', growthRate: '{{market_growth_rate}}' }, dynamicFields: ['market_size', 'serviceable_market', 'obtainable_market', 'market_growth_rate'] },
      { type: 'product', title: 'Product Deep Dive', layout: 'visual', content: { description: '{{product_description}}', technology: '{{tech_stack}}', ip: '' }, dynamicFields: ['product_description', 'tech_stack'] },
      { type: 'business_model', title: 'Business Model & Unit Economics', layout: 'data_heavy', content: { model: '{{business_model}}', ltv: '{{ltv}}', cac: '{{cac}}', ltvCacRatio: '{{ltv_cac_ratio}}', paybackMonths: '{{payback_months}}' }, dynamicFields: ['business_model', 'ltv', 'cac', 'ltv_cac_ratio', 'payback_months'] },
      { type: 'traction', title: 'Traction & Growth', layout: 'data_heavy', content: { mrr: '{{mrr}}', arr: '{{arr}}', growthRate: '{{mrr_growth_rate}}', customers: '{{customer_count}}' }, dynamicFields: ['mrr', 'arr', 'mrr_growth_rate', 'customer_count'] },
      { type: 'financials', title: 'Financial Performance', layout: 'data_heavy', content: { revenue_year1: '{{revenue_year1}}', revenue_year2: '{{revenue_year2}}', revenue_year3: '{{revenue_year3}}', gross_margin: '{{gross_margin}}', burn_rate: '{{burn_rate}}', runway: '{{runway_months}} months' }, dynamicFields: ['revenue_year1', 'revenue_year2', 'revenue_year3', 'gross_margin', 'burn_rate', 'runway_months'] },
      { type: 'team', title: 'Team', layout: 'default', content: { founders: [], keyHires: [], advisors: [] }, dynamicFields: [] },
      { type: 'competition', title: 'Competitive Landscape', layout: 'split', content: { competitors: [], advantages: '{{competitive_advantages}}', moat: '{{competitive_moat}}' }, dynamicFields: ['competitive_advantages', 'competitive_moat'] },
      { type: 'go_to_market', title: 'Go-to-Market Strategy', layout: 'default', content: { strategy: '{{gtm_strategy}}', channels: '{{channels}}', targets: '' }, dynamicFields: ['gtm_strategy', 'channels'] },
      { type: 'ask', title: 'The Ask', layout: 'centered', content: { amount: '{{funding_ask}}', useOfFunds: '{{use_of_funds}}', milestones: [], valuation: '{{pre_money_valuation}}' }, dynamicFields: ['funding_ask', 'use_of_funds', 'pre_money_valuation'] },
      { type: 'vision', title: 'Vision & Roadmap', layout: 'visual', content: { vision: '{{long_term_vision}}', milestones: [] }, dynamicFields: ['long_term_vision'] },
      { type: 'appendix', title: 'Appendix', layout: 'default', content: { additionalData: [] }, dynamicFields: [] },
    ],
  },
  {
    id: 'debt_financing',
    name: 'Debt Financing',
    description: 'Tailored for loan applications and debt financing. Focuses on cash flow, collateral, and repayment capacity.',
    category: 'debt',
    slideCount: 10,
    slides: [
      { type: 'title', title: 'Cover', layout: 'centered', content: { subtitle: '{{company_name}}', tagline: '{{tagline}}' }, dynamicFields: ['company_name', 'tagline'] },
      { type: 'problem', title: 'Business Overview', layout: 'default', content: { description: '{{business_overview}}', history: '', legalStructure: '' }, dynamicFields: ['business_overview'] },
      { type: 'market', title: 'Market Position', layout: 'default', content: { marketShare: '{{market_share}}', customers: '{{customer_count}}', contracts: '' }, dynamicFields: ['market_share', 'customer_count'] },
      { type: 'financials', title: 'Financial Statements', layout: 'data_heavy', content: { revenue_year1: '{{revenue_year1}}', revenue_year2: '{{revenue_year2}}', ebitda: '{{ebitda}}', netIncome: '{{net_income}}' }, dynamicFields: ['revenue_year1', 'revenue_year2', 'ebitda', 'net_income'] },
      { type: 'financials', title: 'Cash Flow Analysis', layout: 'data_heavy', content: { operatingCashFlow: '{{operating_cash_flow}}', freeCashFlow: '{{free_cash_flow}}', cashReserves: '{{cash_reserves}}' }, dynamicFields: ['operating_cash_flow', 'free_cash_flow', 'cash_reserves'] },
      { type: 'financials', title: 'Assets & Collateral', layout: 'data_heavy', content: { totalAssets: '{{total_assets}}', collateral: '{{collateral_value}}', debtToEquity: '{{debt_to_equity}}' }, dynamicFields: ['total_assets', 'collateral_value', 'debt_to_equity'] },
      { type: 'product', title: 'Products/Services', layout: 'default', content: { description: '{{product_description}}', revenue_concentration: '' }, dynamicFields: ['product_description'] },
      { type: 'team', title: 'Management Team', layout: 'default', content: { founders: [], keyPersonnel: [] }, dynamicFields: [] },
      { type: 'ask', title: 'Loan Request', layout: 'centered', content: { amount: '{{funding_ask}}', purpose: '{{loan_purpose}}', repaymentPlan: '{{repayment_plan}}', term: '{{loan_term}}' }, dynamicFields: ['funding_ask', 'loan_purpose', 'repayment_plan', 'loan_term'] },
      { type: 'appendix', title: 'Appendix', layout: 'default', content: { additionalData: [], guarantees: '', personalGuarantees: '' }, dynamicFields: [] },
    ],
  },
  {
    id: 'partner_pitch',
    name: 'Partner Pitch',
    description: 'For strategic partnership proposals. Emphasizes mutual value, synergies, and collaboration model.',
    category: 'partner',
    slideCount: 8,
    slides: [
      { type: 'title', title: 'Cover', layout: 'centered', content: { subtitle: '{{company_name}}', tagline: '{{tagline}}' }, dynamicFields: ['company_name', 'tagline'] },
      { type: 'problem', title: 'The Opportunity', layout: 'default', content: { description: '{{opportunity_description}}', mutualBenefit: '' }, dynamicFields: ['opportunity_description'] },
      { type: 'solution', title: 'Partnership Model', layout: 'default', content: { description: '{{partnership_model}}', valueProposition: '{{value_proposition}}' }, dynamicFields: ['partnership_model', 'value_proposition'] },
      { type: 'market', title: 'Combined Market Reach', layout: 'data_heavy', content: { ourMarket: '{{market_size}}', theirMarket: '{{partner_market}}', combinedReach: '' }, dynamicFields: ['market_size', 'partner_market'] },
      { type: 'product', title: 'Integration & Synergies', layout: 'split', content: { integration: '{{integration_description}}', synergies: [] }, dynamicFields: ['integration_description'] },
      { type: 'financials', title: 'Financial Projections', layout: 'data_heavy', content: { revenue_share: '{{revenue_share_model}}', projectedRevenue: '{{projected_partnership_revenue}}' }, dynamicFields: ['revenue_share_model', 'projected_partnership_revenue'] },
      { type: 'team', title: 'Team & Resources', layout: 'default', content: { founders: [], dedicatedResources: [] }, dynamicFields: [] },
      { type: 'ask', title: 'Next Steps', layout: 'centered', content: { proposal: '{{partnership_ask}}', timeline: '', contactInfo: '' }, dynamicFields: ['partnership_ask'] },
    ],
  },
  {
    id: 'internal_review',
    name: 'Internal Review',
    description: 'Compact deck for internal board/management reviews. Data-focused with key metrics and strategic updates.',
    category: 'internal',
    slideCount: 6,
    slides: [
      { type: 'title', title: 'Executive Summary', layout: 'centered', content: { subtitle: '{{company_name}}', period: '{{review_period}}' }, dynamicFields: ['company_name', 'review_period'] },
      { type: 'financials', title: 'Financial Overview', layout: 'data_heavy', content: { revenue: '{{revenue_current}}', burn_rate: '{{burn_rate}}', runway: '{{runway_months}} months', mrr: '{{mrr}}' }, dynamicFields: ['revenue_current', 'burn_rate', 'runway_months', 'mrr'] },
      { type: 'traction', title: 'Key Metrics & KPIs', layout: 'data_heavy', content: { metrics: '{{key_metrics}}', vsPlan: '{{vs_plan_variance}}' }, dynamicFields: ['key_metrics', 'vs_plan_variance'] },
      { type: 'product', title: 'Product & Operations Update', layout: 'default', content: { milestones: [], blockers: [], nextQuarter: '' }, dynamicFields: [] },
      { type: 'team', title: 'Team & Hiring', layout: 'default', content: { headcount: '{{headcount}}', openRoles: [], keyHires: '' }, dynamicFields: ['headcount'] },
      { type: 'ask', title: 'Strategic Decisions', layout: 'centered', content: { decisions: [], risks: [], asks: [] }, dynamicFields: [] },
    ],
  },
]

// ==========================================
// TEMPLATE FUNCTIONS
// ==========================================

/** Return all available built-in templates */
export function getTemplates(): TemplateDefinition[] {
  return BUILT_IN_TEMPLATES
}

/** Get a single template by ID */
export function getTemplateById(templateId: string): TemplateDefinition | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.id === templateId)
}

// ==========================================
// DECK CREATION
// ==========================================

/** Create a new deck from a template */
export async function createDeck(
  organizationId: string,
  planId: string | null,
  templateId: string,
  title: string
) {
  const template = getTemplateById(templateId)
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  // Create the deck
  const deck = await db.pitchDeck.create({
    data: {
      organizationId,
      planId: planId || null,
      title,
      templateId,
      status: 'draft',
      totalSlides: template.slideCount,
      targetAudience: mapTemplateToAudience(template.category),
      dynamicVariables: '{}',
      slides: '[]',
      metadata: JSON.stringify({ templateName: template.name, templateCategory: template.category }),
    },
  })

  // Create slides from template definitions
  const slideRecords = []
  for (let i = 0; i < template.slides.length; i++) {
    const slideDef = template.slides[i]
    const slide = await db.pitchDeckSlide.create({
      data: {
        deckId: deck.id,
        order: i,
        type: slideDef.type,
        title: slideDef.title,
        content: JSON.stringify(slideDef.content),
        layout: slideDef.layout,
        dynamicFields: JSON.stringify(slideDef.dynamicFields),
        speakerNotes: slideDef.speakerNotes || null,
        metadata: '{}',
      },
    })
    slideRecords.push(slide)
  }

  // Update deck with slide IDs
  const slideIds = slideRecords.map((s) => s.id)
  await db.pitchDeck.update({
    where: { id: deck.id },
    data: {
      slides: JSON.stringify(slideIds),
    },
  })

  // If there's a linked plan, auto-sync variables
  if (planId) {
    try {
      await syncDynamicVariables(deck.id)
    } catch (error) {
      console.error('Failed to auto-sync variables for new deck:', error)
    }
  }

  // Return full deck with slides
  return getDeckWithSlides(deck.id)
}

// ==========================================
// SLIDE GENERATION FROM PLAN
// ==========================================

/** Auto-generate slides from business plan + forecast data */
export async function generateSlidesFromPlan(
  deckId: string,
  planData: Record<string, unknown>,
  forecastData: Record<string, unknown>
) {
  const deck = await db.pitchDeck.findUnique({
    where: { id: deckId },
    include: { slideData: { orderBy: { order: 'asc' } } },
  })

  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`)
  }

  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  let totalTokensUsed = 0

  // Extract key data for context
  const planTitle = planData.title || deck.title
  const sections = (planData.sections as Array<{ type: string; title: string; content: string }>) || []
  const sectionSummary = sections.map((s: { type: string; title: string; content: string }) => `${s.title}: ${s.content?.substring(0, 200) || 'No content'}`).join('\n')

  const forecastSummary = forecastData
    ? `Revenue items: ${JSON.stringify(forecastData.revenueItems || [])}\nExpenses: ${JSON.stringify(forecastData.expenseItems || [])}\nStatements: ${JSON.stringify(forecastData.statements || [])}`
    : 'No forecast data available'

  // Generate content for each slide using AI
  for (const slide of deck.slideData) {
    try {
      const prompt = `You are creating content for a pitch deck slide.

Deck: "${planTitle}"
Slide Type: ${slide.type}
Slide Title: ${slide.title}
Slide Layout: ${slide.layout}

Business Plan Summary:
${sectionSummary}

Financial Forecast Summary:
${forecastSummary}

Generate professional, investor-ready content for this slide. Return a JSON object with appropriate fields for the slide type. Be specific and use real numbers where possible from the forecast data. Keep content concise and impactful.`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'You are a professional pitch deck writer. Generate concise, impactful slide content as JSON. Use specific numbers and data points.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })

      const content = completion.choices[0]?.message?.content || '{}'
      totalTokensUsed += Math.ceil(content.length / 4)

      // Try to parse the AI output as JSON; fall back to wrapping it
      let parsedContent: Record<string, unknown>
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        parsedContent = JSON.parse(jsonMatch ? jsonMatch[1] : content)
      } catch {
        parsedContent = { text: content, generated: true }
      }

      // Generate speaker notes
      const notesPrompt = `For this pitch deck slide "${slide.title}" of type "${slide.type}", write 2-3 brief speaker notes bullets that a presenter could use. Be concise.`
      const notesCompletion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'You write concise speaker notes for pitch decks. Return plain text bullets only.' },
          { role: 'user', content: notesPrompt },
        ],
        thinking: { type: 'disabled' },
      })
      const speakerNotes = notesCompletion.choices[0]?.message?.content || null
      totalTokensUsed += Math.ceil((speakerNotes || '').length / 4)

      await db.pitchDeckSlide.update({
        where: { id: slide.id },
        data: {
          content: JSON.stringify(parsedContent),
          speakerNotes,
        },
      })
    } catch (error) {
      console.error(`Failed to generate content for slide ${slide.id}:`, error)
    }
  }

  // Update deck status
  await db.pitchDeck.update({
    where: { id: deckId },
    data: { status: 'ready' },
  })

  // Track token usage
  await trackTokenUsage({
    organizationId: deck.organizationId,
    agentType: 'fundraising',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: totalTokensUsed,
    requestType: 'pitch_deck_generate',
  }).catch(() => {})

  // Track event
  await trackEvent({
    organizationId: deck.organizationId,
    eventType: 'api_request',
    source: 'pitch_deck',
    status: 'info',
    message: `Generated slides for deck: ${deck.title}`,
    data: { deckId, slideCount: deck.slideData.length, totalTokensUsed },
  }).catch(() => {})

  return getDeckWithSlides(deckId)
}

// ==========================================
// DYNAMIC VARIABLE SYNC
// ==========================================

/** Update all dynamic variables from linked plan/forecast data */
export async function syncDynamicVariables(deckId: string) {
  const deck = await db.pitchDeck.findUnique({
    where: { id: deckId },
    include: { slideData: true },
  })

  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`)
  }

  const variables: Record<string, DynamicVariableValue> = {}

  // Collect all dynamic field names from slides
  const allDynamicFields = new Set<string>()
  for (const slide of deck.slideData) {
    try {
      const fields = JSON.parse(slide.dynamicFields || '[]') as string[]
      fields.forEach((f) => allDynamicFields.add(f))
    } catch {
      // ignore parse errors
    }
  }

  // If deck is linked to a plan, extract plan data
  if (deck.planId) {
    const plan = await db.businessPlan.findUnique({
      where: { id: deck.planId },
      include: { sections: true },
    })

    if (plan) {
      const execSummary = plan.sections.find((s) => s.type === 'executive_summary')
      const marketAnalysis = plan.sections.find((s) => s.type === 'market_analysis')
      const marketing = plan.sections.find((s) => s.type === 'marketing')
      const swot = plan.sections.find((s) => s.type === 'swot')
      const competitor = plan.sections.find((s) => s.type === 'competitor')

      // Map plan content to variables
      if (plan.title) {
        variables['company_name'] = { value: plan.title, source: 'plan', lastUpdated: new Date().toISOString() }
      }

      if (execSummary?.content) {
        variables['problem_statement'] = { value: extractFirstParagraph(execSummary.content), source: 'plan', lastUpdated: new Date().toISOString() }
        variables['tagline'] = { value: extractFirstSentence(execSummary.content), source: 'plan', lastUpdated: new Date().toISOString() }
      }

      if (marketAnalysis?.content) {
        variables['market_size'] = { value: extractNumber(marketAnalysis.content, 'market size') || 'TBD', source: 'plan', lastUpdated: new Date().toISOString() }
      }

      if (competitor?.content) {
        variables['competitive_advantages'] = { value: extractFirstParagraph(competitor.content), source: 'plan', lastUpdated: new Date().toISOString() }
      }

      if (marketing?.content) {
        variables['channels'] = { value: extractFirstParagraph(marketing.content), source: 'plan', lastUpdated: new Date().toISOString() }
      }
    }

    // Get latest forecast for financial variables
    const forecast = await db.forecast.findFirst({
      where: { organizationId: deck.organizationId },
      include: {
        revenueItems: true,
        expenseItems: true,
        statements: { orderBy: { month: 'desc' }, take: 24 },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (forecast) {
      // Revenue variables
      const totalMonthlyRevenue = forecast.revenueItems.reduce((sum, r) => sum + r.amount, 0)
      variables['revenue_year1'] = { value: formatCurrency(totalMonthlyRevenue * 12), source: 'forecast', lastUpdated: new Date().toISOString() }
      variables['mrr'] = { value: formatCurrency(totalMonthlyRevenue), source: 'forecast', lastUpdated: new Date().toISOString() }
      variables['arr'] = { value: formatCurrency(totalMonthlyRevenue * 12), source: 'forecast', lastUpdated: new Date().toISOString() }

      // Revenue year 2 & 3 with growth
      const avgGrowthRate = forecast.revenueItems.reduce((sum, r) => sum + r.growthRate, 0) / (forecast.revenueItems.length || 1)
      const year2Revenue = totalMonthlyRevenue * 12 * (1 + avgGrowthRate / 100)
      const year3Revenue = year2Revenue * (1 + avgGrowthRate / 100)
      variables['revenue_year2'] = { value: formatCurrency(year2Revenue), source: 'forecast', lastUpdated: new Date().toISOString() }
      variables['revenue_year3'] = { value: formatCurrency(year3Revenue), source: 'forecast', lastUpdated: new Date().toISOString() }

      // Burn rate and runway
      const totalMonthlyExpenses = forecast.expenseItems.reduce((sum, e) => sum + e.amount, 0)
      variables['burn_rate'] = { value: formatCurrency(totalMonthlyExpenses - totalMonthlyRevenue > 0 ? totalMonthlyExpenses - totalMonthlyRevenue : 0), source: 'forecast', lastUpdated: new Date().toISOString() }

      // From financial statements
      const pnlStatements = forecast.statements.filter((s) => s.type === 'pnl')
      if (pnlStatements.length > 0) {
        const latest = pnlStatements[0]
        variables['net_income'] = { value: formatCurrency(latest.netIncome), source: 'forecast', lastUpdated: new Date().toISOString() }
        variables['gross_margin'] = {
          value: latest.revenue > 0 ? `${Math.round(((latest.revenue - latest.expenses) / latest.revenue) * 100)}%` : 'N/A',
          source: 'forecast',
          lastUpdated: new Date().toISOString(),
        }
      }

      const cashFlowStatements = forecast.statements.filter((s) => s.type === 'cash_flow')
      if (cashFlowStatements.length > 0) {
        const latest = cashFlowStatements[0]
        variables['runway_months'] = { value: Math.round(latest.runway), source: 'forecast', lastUpdated: new Date().toISOString() }
        variables['cash_reserves'] = { value: formatCurrency(latest.cashBalance), source: 'forecast', lastUpdated: new Date().toISOString() }
        variables['operating_cash_flow'] = { value: formatCurrency(latest.cashFlow), source: 'forecast', lastUpdated: new Date().toISOString() }
      }
    }

    // Get KPIs for additional variables
    const kpis = await db.kpi.findMany({
      where: { organizationId: deck.organizationId },
      orderBy: { updatedAt: 'desc' },
    })

    for (const kpi of kpis) {
      if (kpi.category === 'saas') {
        if (kpi.name.toLowerCase().includes('churn')) {
          variables['churn_rate'] = { value: kpi.unit === 'percent' ? `${kpi.value}%` : kpi.value, source: 'kpi', lastUpdated: new Date().toISOString() }
        }
        if (kpi.name.toLowerCase().includes('ltv')) {
          variables['ltv'] = { value: formatCurrency(kpi.value), source: 'kpi', lastUpdated: new Date().toISOString() }
        }
        if (kpi.name.toLowerCase().includes('cac')) {
          variables['cac'] = { value: formatCurrency(kpi.value), source: 'kpi', lastUpdated: new Date().toISOString() }
        }
      }
      if (kpi.category === 'customer') {
        if (kpi.name.toLowerCase().includes('customer') || kpi.name.toLowerCase().includes('user')) {
          variables['customer_count'] = { value: kpi.value, source: 'kpi', lastUpdated: new Date().toISOString() }
        }
      }
    }

    // Derived variables
    const ltvVal = typeof variables['ltv']?.value === 'number' ? variables['ltv'].value : 0
    const cacVal = typeof variables['cac']?.value === 'number' ? variables['cac'].value : 0
    if (ltvVal && cacVal) {
      variables['ltv_cac_ratio'] = { value: (ltvVal as number / cacVal as number).toFixed(1), source: 'kpi', lastUpdated: new Date().toISOString() }
    }
  }

  // Set funding ask from deck if available
  if (deck.fundingAsk) {
    variables['funding_ask'] = { value: formatCurrency(deck.fundingAsk), source: 'manual', lastUpdated: new Date().toISOString() }
  }

  // Update deck dynamic variables
  const serializedVars: Record<string, string | number> = {}
  for (const [key, val] of Object.entries(variables)) {
    serializedVars[key] = val.value
  }

  await db.pitchDeck.update({
    where: { id: deckId },
    data: {
      dynamicVariables: JSON.stringify(serializedVars),
    },
  })

  // Update slide content with resolved variables
  for (const slide of deck.slideData) {
    try {
      const dynamicFields = JSON.parse(slide.dynamicFields || '[]') as string[]
      if (dynamicFields.length === 0) continue

      let contentStr = slide.content
      for (const field of dynamicFields) {
        const varVal = serializedVars[field]
        if (varVal !== undefined) {
          contentStr = contentStr.replaceAll(`{{${field}}}`, String(varVal))
        }
      }

      await db.pitchDeckSlide.update({
        where: { id: slide.id },
        data: { content: contentStr },
      })
    } catch (error) {
      console.error(`Failed to update slide ${slide.id} with variables:`, error)
    }
  }

  // Track event
  await trackEvent({
    organizationId: deck.organizationId,
    eventType: 'api_request',
    source: 'pitch_deck',
    status: 'info',
    message: `Synced dynamic variables for deck: ${deck.title}`,
    data: { deckId, variableCount: Object.keys(variables).length },
  }).catch(() => {})

  return {
    syncedVariables: Object.keys(variables).length,
    variables: serializedVars,
  }
}

// ==========================================
// FUNDER QUESTION GENERATION
// ==========================================

/** AI generates questions funders are likely to ask based on the deck */
export async function generateFunderQuestions(deckId: string): Promise<FunderQuestion[]> {
  const deck = await db.pitchDeck.findUnique({
    where: { id: deckId },
    include: { slideData: { orderBy: { order: 'asc' } } },
  })

  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`)
  }

  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  // Build context from slides
  const slideContext = deck.slideData.map((s) => {
    return `Slide ${s.order + 1} [${s.type}]: ${s.title}\nContent: ${s.content.substring(0, 500)}`
  }).join('\n\n')

  const audienceContext = deck.targetAudience === 'lender'
    ? 'a bank/lender reviewing this for a loan application'
    : deck.targetAudience === 'partner'
      ? 'a potential strategic partner evaluating this collaboration'
      : deck.targetAudience === 'internal'
        ? 'an internal board member or executive reviewing this'
        : 'an investor evaluating this for a potential investment'

  const prompt = `You are a ${audienceContext}. Based on the following pitch deck, generate 8-12 questions that this audience would likely ask the founders.

Pitch Deck: "${deck.title}"
Target Audience: ${deck.targetAudience}

Slides:
${slideContext}

For each question, provide:
1. The question itself
2. Category (financial, market, team, product, competition, risk, terms)
3. A suggested answer the founders could give
4. Likelihood (low, medium, high) — how likely they are to ask this
5. Difficulty (easy, medium, hard) — how hard it is to answer well
6. Slide reference — which slide number this question relates to most

Return a JSON array of objects with keys: question, category, suggestedAnswer, likelihood, difficulty, slideReference`

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: 'You are an experienced investor/lender who asks insightful, tough questions during pitch meetings. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content || '[]'
  const totalTokensUsed = Math.ceil(content.length / 4)

  // Parse questions
  let questions: FunderQuestion[]
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    questions = JSON.parse(jsonMatch ? jsonMatch[1] : content)
  } catch {
    questions = [
      {
        question: 'What is your current burn rate and runway?',
        category: 'financial',
        suggestedAnswer: 'Please sync your deck with forecast data for accurate numbers.',
        likelihood: 'high',
        difficulty: 'easy',
        slideReference: 'financials',
      },
    ]
  }

  // Store questions in database (delete existing ones first)
  await db.pitchDeckQuestion.deleteMany({
    where: { deckId },
  })

  for (const q of questions) {
    await db.pitchDeckQuestion.create({
      data: {
        deckId,
        question: q.question,
        category: q.category || 'financial',
        suggestedAnswer: q.suggestedAnswer || null,
        likelihood: q.likelihood || 'medium',
        difficulty: q.difficulty || 'medium',
        slideReference: q.slideReference || null,
        metadata: '{}',
      },
    })
  }

  // Track token usage
  await trackTokenUsage({
    organizationId: deck.organizationId,
    agentType: 'fundraising',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: totalTokensUsed,
    requestType: 'pitch_deck_generate',
  }).catch(() => {})

  // Track event
  await trackEvent({
    organizationId: deck.organizationId,
    eventType: 'api_request',
    source: 'pitch_deck',
    status: 'info',
    message: `Generated funder questions for deck: ${deck.title}`,
    data: { deckId, questionCount: questions.length },
  }).catch(() => {})

  return questions
}

// ==========================================
// DECK ANALYSIS
// ==========================================

/** AI analyzes the deck and provides feedback */
export async function analyzeDeck(deckId: string): Promise<DeckAnalysis> {
  const deck = await db.pitchDeck.findUnique({
    where: { id: deckId },
    include: { slideData: { orderBy: { order: 'asc' } }, questions: true },
  })

  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`)
  }

  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  // Build context from slides
  const slideContext = deck.slideData.map((s) => {
    const dynFields = JSON.parse(s.dynamicFields || '[]') as string[]
    const unresolvedVars = dynFields.filter((f) => s.content.includes(`{{${f}}}`))
    return `Slide ${s.order + 1} [${s.type}]: ${s.title}\nContent: ${s.content.substring(0, 400)}\nLayout: ${s.layout}\nUnresolved Variables: ${unresolvedVars.length > 0 ? unresolvedVars.join(', ') : 'none'}`
  }).join('\n\n')

  const prompt = `You are a pitch deck analyst and investor communication expert. Analyze the following pitch deck and provide scores and feedback.

Deck: "${deck.title}"
Template: ${deck.templateId || 'custom'}
Target Audience: ${deck.targetAudience}
Total Slides: ${deck.totalSlides}
Existing Funder Questions: ${deck.questions.length}

Slides:
${slideContext}

Score the deck on these dimensions (0-100):
1. Overall Score — overall quality and readiness
2. Clarity — how clear and compelling the narrative is
3. Financial Rigor — quality of financial data and projections
4. Market Proof — evidence of market opportunity and traction
5. Team Strength — how well the team is presented
6. Ask Clarity — how clear and justified the funding ask is

Also provide:
- 3-5 specific recommendations for improvement
- 2-4 strengths of the deck
- 2-4 weaknesses or gaps

Return a JSON object with keys: overallScore, clarity, financialRigor, marketProof, teamStrength, askClarity (all numbers 0-100), recommendations (string array), strengths (string array), weaknesses (string array).`

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: 'You are an expert pitch deck analyst. Provide honest, constructive feedback. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content || '{}'
  const totalTokensUsed = Math.ceil(content.length / 4)

  let analysis: DeckAnalysis
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : content)
    analysis = {
      overallScore: clampScore(parsed.overallScore),
      clarity: clampScore(parsed.clarity),
      financialRigor: clampScore(parsed.financialRigor),
      marketProof: clampScore(parsed.marketProof),
      teamStrength: clampScore(parsed.teamStrength),
      askClarity: clampScore(parsed.askClarity),
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 4) : [],
    }
  } catch {
    analysis = {
      overallScore: 50,
      clarity: 50,
      financialRigor: 50,
      marketProof: 50,
      teamStrength: 50,
      askClarity: 50,
      recommendations: ['Ensure all dynamic variables are synced with forecast data', 'Add specific financial projections', 'Include customer testimonials or case studies'],
      strengths: ['Deck structure follows best practices'],
      weaknesses: ['Some sections may lack specific data'],
    }
  }

  // Store analysis in deck metadata
  const currentMeta = JSON.parse(deck.metadata || '{}')
  await db.pitchDeck.update({
    where: { id: deckId },
    data: {
      metadata: JSON.stringify({
        ...currentMeta,
        lastAnalysis: analysis,
        analyzedAt: new Date().toISOString(),
      }),
    },
  })

  // Track token usage
  await trackTokenUsage({
    organizationId: deck.organizationId,
    agentType: 'fundraising',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: totalTokensUsed,
    requestType: 'pitch_deck_generate',
  }).catch(() => {})

  // Track event
  await trackEvent({
    organizationId: deck.organizationId,
    eventType: 'api_request',
    source: 'pitch_deck',
    status: 'info',
    message: `Analyzed deck: ${deck.title}`,
    data: { deckId, overallScore: analysis.overallScore },
  }).catch(() => {})

  return analysis
}

// ==========================================
// FULL AI DECK GENERATION
// ==========================================

/** Create a full deck using AI from scratch */
export async function generateDeckFromScratch(
  organizationId: string,
  planId: string | null,
  targetAudience: string
) {
  // Get organization info
  const org = await db.organization.findUnique({
    where: { id: organizationId },
  })

  // Get plan data if available
  let planData: { title?: string; sections?: Array<{ type: string; title: string; content: string }> } | null = null
  if (planId) {
    const plan = await db.businessPlan.findUnique({
      where: { id: planId },
      include: { sections: true },
    })
    if (plan) {
      planData = {
        title: plan.title,
        sections: plan.sections.map((s) => ({ type: s.type, title: s.title, content: s.content })),
      }
    }
  }

  // Get latest forecast
  const forecast = await db.forecast.findFirst({
    where: { organizationId },
    include: {
      revenueItems: true,
      expenseItems: true,
      statements: { take: 12, orderBy: { month: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  const planContext = planData
    ? `Business Plan: "${planData.title}"\nSections: ${planData.sections?.map((s) => `${s.title}: ${s.content?.substring(0, 150)}`).join('\n') || 'No sections'}`
    : 'No business plan available'

  const forecastContext = forecast
    ? `Forecast: Revenue streams: ${forecast.revenueItems.map((r) => `${r.name}: $${r.amount}/mo`).join(', ')}\nExpenses: ${forecast.expenseItems.map((e) => `${e.name}: $${e.amount}/mo`).join(', ')}`
    : 'No forecast data available'

  const audienceLabel = targetAudience === 'lender' ? 'debt financing/lender'
    : targetAudience === 'partner' ? 'strategic partnership'
    : targetAudience === 'internal' ? 'internal board review'
    : 'seed/early-stage investor'

  // Determine appropriate template based on audience
  const templateId = targetAudience === 'lender' ? 'debt_financing'
    : targetAudience === 'partner' ? 'partner_pitch'
    : targetAudience === 'internal' ? 'internal_review'
    : 'seed_round'

  const template = getTemplateById(templateId)!

  const prompt = `You are creating a pitch deck for ${audienceLabel} presentation.

Company: ${org?.name || 'Unknown Company'}
Industry: ${org?.industry || 'Technology'}

${planContext}

${forecastContext}

Target Audience: ${targetAudience}
Template: ${template.name} (${template.slideCount} slides)

For each of the ${template.slideCount} slides, generate professional content. Return a JSON array where each element has:
- title: the slide title
- type: the slide type (${template.slides.map((s) => s.type).join(', ')})
- content: a JSON object with relevant fields for the slide type (use real numbers from the forecast where possible)
- speakerNotes: 2-3 brief bullet points for the presenter

Make the content specific, data-driven, and compelling. Use actual numbers from the forecast data.`

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: 'You are a professional pitch deck creator. Generate specific, data-driven slide content. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content || '[]'
  let totalTokensUsed = Math.ceil(content.length / 4)

  // Parse AI-generated slides
  let generatedSlides: Array<{
    title: string
    type: string
    content: Record<string, unknown>
    speakerNotes?: string
  }>
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    generatedSlides = JSON.parse(jsonMatch ? jsonMatch[1] : content)
  } catch {
    // Fallback: create slides from template
    generatedSlides = template.slides.map((s) => ({
      title: s.title,
      type: s.type,
      content: s.content,
      speakerNotes: '',
    }))
  }

  // Create the deck
  const deckTitle = planData?.title ? `${planData.title} — ${template.name} Deck` : `${org?.name || 'New'} Pitch Deck`

  const deck = await db.pitchDeck.create({
    data: {
      organizationId,
      planId: planId || null,
      title: deckTitle,
      templateId,
      status: 'ready',
      totalSlides: generatedSlides.length,
      targetAudience,
      dynamicVariables: '{}',
      slides: '[]',
      metadata: JSON.stringify({
        templateName: template.name,
        templateCategory: template.category,
        generatedFromScratch: true,
        generatedAt: new Date().toISOString(),
      }),
    },
  })

  // Create slide records
  const slideIds: string[] = []
  for (let i = 0; i < generatedSlides.length; i++) {
    const slideData = generatedSlides[i]
    const templateSlide = template.slides[i]

    const slide = await db.pitchDeckSlide.create({
      data: {
        deckId: deck.id,
        order: i,
        type: slideData.type || templateSlide?.type || 'title',
        title: slideData.title || templateSlide?.title || `Slide ${i + 1}`,
        content: typeof slideData.content === 'string' ? slideData.content : JSON.stringify(slideData.content),
        layout: templateSlide?.layout || 'default',
        dynamicFields: JSON.stringify(templateSlide?.dynamicFields || []),
        speakerNotes: slideData.speakerNotes || null,
        metadata: '{}',
      },
    })
    slideIds.push(slide.id)
  }

  // Update deck with slide IDs
  await db.pitchDeck.update({
    where: { id: deck.id },
    data: { slides: JSON.stringify(slideIds) },
  })

  // Sync dynamic variables
  try {
    await syncDynamicVariables(deck.id)
  } catch (error) {
    console.error('Failed to sync variables for generated deck:', error)
  }

  // Track token usage
  await trackTokenUsage({
    organizationId,
    agentType: 'fundraising',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: totalTokensUsed,
    requestType: 'pitch_deck_generate',
  }).catch(() => {})

  // Track event
  await trackEvent({
    organizationId,
    eventType: 'api_request',
    source: 'pitch_deck',
    status: 'info',
    message: `AI-generated deck: ${deckTitle}`,
    data: { deckId: deck.id, slideCount: generatedSlides.length, totalTokensUsed },
  }).catch(() => {})

  return getDeckWithSlides(deck.id)
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/** Get a deck with all its slides and questions */
export async function getDeckWithSlides(deckId: string) {
  return db.pitchDeck.findUnique({
    where: { id: deckId },
    include: {
      slideData: { orderBy: { order: 'asc' } },
      questions: { orderBy: { createdAt: 'desc' } },
    },
  })
}

/** Map template category to target audience */
function mapTemplateToAudience(category: string): string {
  switch (category) {
    case 'seed':
    case 'series_a':
    case 'series_b':
      return 'investor'
    case 'debt':
      return 'lender'
    case 'partner':
      return 'partner'
    case 'internal':
      return 'internal'
    default:
      return 'investor'
  }
}

/** Extract the first paragraph from text */
function extractFirstParagraph(text: string): string {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)
  return paragraphs[0]?.trim().substring(0, 300) || text.substring(0, 300)
}

/** Extract the first sentence from text */
function extractFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/)
  return match ? match[0].trim().substring(0, 100) : text.substring(0, 100)
}

/** Try to extract a number associated with a keyword from text */
function extractNumber(text: string, _keyword: string): string | null {
  // Look for currency patterns near the keyword
  const currencyPattern = /\$[\d,.]+[KMB]?/g
  const matches = text.match(currencyPattern)
  return matches ? matches[0] : null
}

/** Format a number as currency */
function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return String(value)
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

/** Clamp a score to 0-100 range */
function clampScore(value: unknown): number {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (isNaN(num)) return 50
  return Math.max(0, Math.min(100, num))
}
