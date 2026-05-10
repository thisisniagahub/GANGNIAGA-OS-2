import { db } from '@/lib/db'

// ============================================
// TYPES & INTERFACES
// ============================================

export interface CanvasData {
  title: string
  problem: string
  solution: string
  targetMarket: string
  competitiveLandscape: string
  businessModel: string
  uniqueValue: string
  channels: string
  costStructure: string
  revenueStreams: string
  industry?: string
  organizationId?: string
}

export interface ValidationCategory {
  category: string
  questions: ValidationQuestion[]
  score: number // 0-100
}

export interface ValidationQuestion {
  question: string
  answer: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  score: number // 0-100
  suggestion: string
}

export interface RiskAssessment {
  market_risk: { level: 'low' | 'medium' | 'high' | 'critical'; score: number; factors: string[] }
  tech_risk: { level: 'low' | 'medium' | 'high' | 'critical'; score: number; factors: string[] }
  financial_risk: { level: 'low' | 'medium' | 'high' | 'critical'; score: number; factors: string[] }
  team_risk: { level: 'low' | 'medium' | 'high' | 'critical'; score: number; factors: string[] }
}

export interface ValidationReport {
  overallScore: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  categories: ValidationCategory[]
  riskAssessment: RiskAssessment
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  summary: string
  validatedAt: string
}

// ============================================
// VALIDATION CATEGORIES CONFIG
// ============================================

const VALIDATION_CATEGORIES = [
  'market',
  'financial',
  'technical',
  'competitive',
  'team',
  'regulatory',
] as const

const CATEGORY_WEIGHTS: Record<string, number> = {
  market: 0.25,
  financial: 0.20,
  technical: 0.18,
  competitive: 0.15,
  team: 0.12,
  regulatory: 0.10,
}

const CATEGORY_QUESTION_TEMPLATES: Record<string, (industry: string, targetMarket: string) => string[]> = {
  market: (industry, targetMarket) => [
    `Is there a clearly identifiable market need for this solution in the ${targetMarket} ${industry} space?`,
    `What is the estimated Total Addressable Market (TAM) size for "${targetMarket}" in ${industry}?`,
    `Is the target market growing, stable, or declining?`,
    `Are there early adopters who would pay for this solution immediately?`,
    `How well-defined is the customer persona for this product/service?`,
  ],
  financial: (_industry, _targetMarket) => [
    'Is the revenue model clearly defined and sustainable?',
    'What are the projected customer acquisition costs (CAC) versus lifetime value (LTV)?',
    'How long until break-even is achieved?',
    'Are the cost structures realistic and well-understood?',
    'What are the key financial assumptions and are they justified?',
  ],
  technical: (industry, _targetMarket) => [
    `Is the technical solution feasible with current ${industry} technology?`,
    'What are the major technical risks or dependencies?',
    'Is there a clear technology roadmap from MVP to scale?',
    'Are there existing technical solutions that could be leveraged?',
    'What is the estimated development timeline and is it realistic?',
  ],
  competitive: (industry, targetMarket) => [
    `Who are the main competitors in the ${industry} space targeting ${targetMarket}?`,
    'What sustainable competitive advantage does this idea have?',
    'How easy is it for competitors to replicate this solution?',
    'What is the proposed differentiation strategy?',
    'Are there barriers to entry that protect the business?',
  ],
  team: (_industry, _targetMarket) => [
    'Does the founding team have relevant domain expertise?',
    'Are the key roles filled or is there a clear hiring plan?',
    'Is the team size appropriate for the stage of the business?',
    'Are there gaps in the team that could be critical blockers?',
    'Does the team have prior startup or execution experience?',
  ],
  regulatory: (industry, targetMarket) => [
    `Are there regulatory requirements specific to ${industry} in ${targetMarket}?`,
    'What licenses, permits, or certifications are needed?',
    'Are there data privacy or security compliance requirements?',
    'What is the risk of regulatory changes impacting the business?',
    'Are there intellectual property considerations (patents, trademarks)?',
  ],
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validates an idea canvas using AI analysis.
 * Generates category scores, risk assessment, and a structured report.
 */
export async function validateIdea(canvasData: CanvasData): Promise<ValidationReport> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  const industry = canvasData.industry || 'Technology'
  const targetMarket = canvasData.targetMarket || 'Global'

  // Step 1: Generate validation questions for each category
  const categories: ValidationCategory[] = []

  for (const category of VALIDATION_CATEGORIES) {
    const templateQuestions = CATEGORY_QUESTION_TEMPLATES[category](industry, targetMarket)

    // Use AI to analyze the canvas data against the questions
    const analysisPrompt = `You are an expert business idea validator and startup advisor. Analyze the following business idea canvas and answer each validation question.

BUSINESS IDEA CANVAS:
- Title: ${canvasData.title}
- Problem: ${canvasData.problem}
- Solution: ${canvasData.solution}
- Target Market: ${canvasData.targetMarket}
- Competitive Landscape: ${canvasData.competitiveLandscape}
- Business Model: ${canvasData.businessModel}
- Unique Value Proposition: ${canvasData.uniqueValue}
- Channels: ${canvasData.channels}
- Cost Structure: ${canvasData.costStructure}
- Revenue Streams: ${canvasData.revenueStreams}

CATEGORY: ${category.toUpperCase()}

QUESTIONS TO ANSWER:
${templateQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

For each question, provide a JSON response in this exact format:
{
  "answers": [
    {
      "question": "the question text",
      "answer": "your detailed analysis",
      "riskLevel": "low|medium|high|critical",
      "score": 0-100,
      "suggestion": "specific actionable suggestion"
    }
  ]
}

Score each question objectively:
- 80-100: Strong, well-addressed
- 60-79: Adequate but could be stronger
- 40-59: Weak, needs significant improvement
- 20-39: Poor, major concerns
- 0-19: Critical gap, not addressed at all

Be thorough, specific, and constructive. Base your analysis on the actual content provided in the canvas.`

    let questions: ValidationQuestion[] = []

    try {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an expert startup validator. Always respond with valid JSON only. No markdown, no code blocks, just pure JSON.',
          },
          { role: 'user', content: analysisPrompt },
        ],
        thinking: { type: 'disabled' },
      })

      const content = completion.choices[0]?.message?.content || ''
      const parsed = parseAIJsonResponse<{ answers: ValidationQuestion[] }>(content)

      if (parsed?.answers && Array.isArray(parsed.answers)) {
        questions = parsed.answers.map((a: ValidationQuestion, i: number) => ({
          question: a.question || templateQuestions[i] || `Question ${i + 1}`,
          answer: a.answer || '',
          riskLevel: validateRiskLevel(a.riskLevel),
          score: clampScore(a.score),
          suggestion: a.suggestion || '',
        }))
      }
    } catch (error) {
      console.error(`AI validation failed for category ${category}:`, error)
      // Fallback: create basic questions with default scores
      questions = templateQuestions.map((q) => ({
        question: q,
        answer: 'Analysis unavailable — AI validation failed for this category',
        riskLevel: 'medium' as const,
        score: 50,
        suggestion: 'Re-run validation to get AI analysis for this category',
      }))
    }

    // Calculate category score as weighted average of question scores
    const categoryScore = questions.length > 0
      ? Math.round(questions.reduce((sum, q) => sum + q.score, 0) / questions.length)
      : 0

    categories.push({
      category,
      questions,
      score: categoryScore,
    })
  }

  // Step 2: Compute aggregate validation score
  const overallScore = Math.round(
    categories.reduce((sum, cat) => sum + cat.score * (CATEGORY_WEIGHTS[cat.category] || 1 / categories.length), 0)
  )

  const grade = scoreToGrade(overallScore)

  // Step 3: Perform risk assessment
  const riskAssessment = await analyzeRisk(canvasData, categories, zai)

  // Step 4: Generate strengths, weaknesses, and recommendations
  const strengths: string[] = []
  const weaknesses: string[] = []
  const recommendations: string[] = []

  for (const cat of categories) {
    const highScoreQuestions = cat.questions.filter((q) => q.score >= 70)
    const lowScoreQuestions = cat.questions.filter((q) => q.score < 40)

    for (const q of highScoreQuestions.slice(0, 2)) {
      strengths.push(`[${cat.category}] ${q.question}: Scored ${q.score}/100 — ${q.answer.slice(0, 80)}`)
    }

    for (const q of lowScoreQuestions.slice(0, 2)) {
      weaknesses.push(`[${cat.category}] ${q.question}: Scored ${q.score}/100 — ${q.answer.slice(0, 80)}`)
      if (q.suggestion) {
        recommendations.push(`[${cat.category}] ${q.suggestion}`)
      }
    }
  }

  // Step 5: Generate AI summary
  let summary = ''
  try {
    const summaryPrompt = `Write a concise executive summary (3-4 sentences) of this business idea validation result.

Idea: ${canvasData.title}
Overall Score: ${overallScore}/100 (Grade: ${grade})

Category Scores:
${categories.map((c) => `- ${c.category}: ${c.score}/100`).join('\n')}

Risk Levels:
- Market Risk: ${riskAssessment.market_risk.level} (${riskAssessment.market_risk.score}/100)
- Tech Risk: ${riskAssessment.tech_risk.level} (${riskAssessment.tech_risk.score}/100)
- Financial Risk: ${riskAssessment.financial_risk.level} (${riskAssessment.financial_risk.score}/100)
- Team Risk: ${riskAssessment.team_risk.level} (${riskAssessment.team_risk.score}/100)

Key Strengths: ${strengths.slice(0, 3).join('; ')}
Key Weaknesses: ${weaknesses.slice(0, 3).join('; ')}

Provide an objective, actionable summary.`

    const summaryCompletion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are a concise business analyst. Write clear, direct summaries.' },
        { role: 'user', content: summaryPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    summary = summaryCompletion.choices[0]?.message?.content || generateFallbackSummary(overallScore, grade, categories)
  } catch {
    summary = generateFallbackSummary(overallScore, grade, categories)
  }

  return {
    overallScore,
    grade,
    categories,
    riskAssessment,
    strengths: strengths.slice(0, 8),
    weaknesses: weaknesses.slice(0, 8),
    recommendations: recommendations.slice(0, 6),
    summary,
    validatedAt: new Date().toISOString(),
  }
}

// ============================================
// QUESTION GENERATION
// ============================================

/**
 * Generates category-specific validation questions for a given industry and target market.
 */
export async function generateValidationQuestions(
  industry: string,
  targetMarket: string
): Promise<Record<string, ValidationQuestion[]>> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  const result: Record<string, ValidationQuestion[]> = {}

  for (const category of VALIDATION_CATEGORIES) {
    const templateQuestions = CATEGORY_QUESTION_TEMPLATES[category](industry, targetMarket)

    try {
      const prompt = `Generate 5 specific, actionable validation questions for a business idea in the "${industry}" industry targeting "${targetMarket}".

Category: ${category.toUpperCase()}

Base questions to customize and improve:
${templateQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Make the questions more specific to the ${industry} industry and ${targetMarket} market.
Return a JSON array of question strings only. No markdown, just pure JSON.

Example: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an expert at creating business validation frameworks. Return only valid JSON arrays of question strings.',
          },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })

      const content = completion.choices[0]?.message?.content || ''
      const parsed = parseAIJsonResponse<string[]>(content)

      if (Array.isArray(parsed) && parsed.length > 0) {
        result[category] = parsed.map((q: string) => ({
          question: q,
          answer: '',
          riskLevel: 'medium' as const,
          score: 0,
          suggestion: '',
        }))
      } else {
        result[category] = templateQuestions.map((q) => ({
          question: q,
          answer: '',
          riskLevel: 'medium' as const,
          score: 0,
          suggestion: '',
        }))
      }
    } catch (error) {
      console.error(`Question generation failed for ${category}:`, error)
      result[category] = templateQuestions.map((q) => ({
        question: q,
        answer: '',
        riskLevel: 'medium' as const,
        score: 0,
        suggestion: '',
      }))
    }
  }

  return result
}

// ============================================
// RISK ANALYSIS
// ============================================

/**
 * Performs risk analysis on an idea canvas.
 * Can be called standalone or as part of full validation.
 */
export async function analyzeRisk(
  canvasData: CanvasData,
  categories?: ValidationCategory[],
  zaiInstance?: unknown
): Promise<RiskAssessment> {
  // If we have category scores, use them as a base for risk computation
  const marketScore = categories?.find((c) => c.category === 'market')?.score
  const techScore = categories?.find((c) => c.category === 'technical')?.score
  const financialScore = categories?.find((c) => c.category === 'financial')?.score
  const teamScore = categories?.find((c) => c.category === 'team')?.score

  // Try AI-powered risk analysis
  let zai = zaiInstance as Record<string, unknown> | undefined
  if (!zai) {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      zai = await ZAI.create()
    } catch {
      // Fall back to heuristic risk assessment
    }
  }

  if (zai) {
    try {
      const riskPrompt = `Analyze the risks of this business idea and provide a structured risk assessment.

BUSINESS IDEA:
- Title: ${canvasData.title}
- Problem: ${canvasData.problem}
- Solution: ${canvasData.solution}
- Target Market: ${canvasData.targetMarket}
- Competitive Landscape: ${canvasData.competitiveLandscape}
- Business Model: ${canvasData.businessModel}
- Unique Value: ${canvasData.uniqueValue}
- Cost Structure: ${canvasData.costStructure}
- Revenue Streams: ${canvasData.revenueStreams}

${categories ? `CATEGORY SCORES: ${categories.map((c) => `${c.category}=${c.score}`).join(', ')}` : ''}

Return a JSON object with exactly this structure:
{
  "market_risk": { "level": "low|medium|high|critical", "score": 0-100, "factors": ["factor1", "factor2"] },
  "tech_risk": { "level": "low|medium|high|critical", "score": 0-100, "factors": ["factor1", "factor2"] },
  "financial_risk": { "level": "low|medium|high|critical", "score": 0-100, "factors": ["factor1", "factor2"] },
  "team_risk": { "level": "low|medium|high|critical", "score": 0-100, "factors": ["factor1", "factor2"] }
}

Scoring: Higher score = lower risk (better). Factors should list the key risk drivers.
Be objective and specific. No markdown, just pure JSON.`

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an expert risk analyst for startups. Always respond with valid JSON only.',
          },
          { role: 'user', content: riskPrompt },
        ],
        thinking: { type: 'disabled' },
      })

      const content = completion.choices[0]?.message?.content || ''
      const parsed = parseAIJsonResponse<RiskAssessment>(content)

      if (parsed?.market_risk && parsed?.tech_risk && parsed?.financial_risk && parsed?.team_risk) {
        return {
          market_risk: normalizeRisk(parsed.market_risk),
          tech_risk: normalizeRisk(parsed.tech_risk),
          financial_risk: normalizeRisk(parsed.financial_risk),
          team_risk: normalizeRisk(parsed.team_risk),
        }
      }
    } catch (error) {
      console.error('AI risk analysis failed:', error)
    }
  }

  // Heuristic fallback risk assessment based on canvas content and category scores
  return {
    market_risk: computeHeuristicRisk(
      'market',
      canvasData.targetMarket,
      canvasData.competitiveLandscape,
      marketScore
    ),
    tech_risk: computeHeuristicRisk(
      'technical',
      canvasData.solution,
      canvasData.uniqueValue,
      techScore
    ),
    financial_risk: computeHeuristicRisk(
      'financial',
      canvasData.businessModel,
      canvasData.revenueStreams,
      financialScore
    ),
    team_risk: computeHeuristicRisk(
      'team',
      canvasData.problem,
      canvasData.solution,
      teamScore
    ),
  }
}

// ============================================
// PERSIST VALIDATION TO DATABASE
// ============================================

/**
 * Saves validation results to the database (IdeaValidation records)
 * and updates the IdeaCanvas with scores and report.
 */
export async function persistValidation(
  canvasId: string,
  report: ValidationReport
): Promise<void> {
  // Delete existing validations for this canvas
  await db.ideaValidation.deleteMany({
    where: { canvasId },
  })

  // Create new validation records for each category's questions
  let order = 0
  for (const cat of report.categories) {
    for (const q of cat.questions) {
      await db.ideaValidation.create({
        data: {
          canvasId,
          category: cat.category,
          question: q.question,
          answer: q.answer,
          riskLevel: q.riskLevel,
          score: q.score,
          suggestion: q.suggestion,
          source: 'ai_validation',
          order: order++,
        },
      })
    }
  }

  // Update the canvas with validation results
  await db.ideaCanvas.update({
    where: { id: canvasId },
    data: {
      validationScore: report.overallScore,
      riskAssessment: JSON.stringify(report.riskAssessment),
      validationReport: JSON.stringify(report),
      status: 'validated',
    },
  })
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseAIJsonResponse<T>(content: string): T | null {
  // Try to extract JSON from the response
  let jsonStr = content.trim()

  // Remove markdown code blocks if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  // Try direct parse
  try {
    return JSON.parse(jsonStr) as T
  } catch {
    // Try to find JSON object/array in the content
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)

    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as T
      } catch {
        // Continue to array match
      }
    }

    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]) as T
      } catch {
        // Give up
      }
    }

    return null
  }
}

function clampScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 50
  return Math.min(100, Math.max(0, Math.round(score)))
}

function validateRiskLevel(level: string): 'low' | 'medium' | 'high' | 'critical' {
  const valid = ['low', 'medium', 'high', 'critical']
  if (valid.includes(level)) return level as 'low' | 'medium' | 'high' | 'critical'
  return 'medium'
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function scoreToRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 70) return 'low'
  if (score >= 50) return 'medium'
  if (score >= 30) return 'high'
  return 'critical'
}

function normalizeRisk(
  risk: { level: string; score: number; factors: string[] }
): { level: 'low' | 'medium' | 'high' | 'critical'; score: number; factors: string[] } {
  return {
    level: validateRiskLevel(risk.level),
    score: clampScore(risk.score),
    factors: Array.isArray(risk.factors) ? risk.factors.slice(0, 5) : [],
  }
}

function computeHeuristicRisk(
  _type: string,
  field1: string,
  field2: string,
  categoryScore?: number
): { level: 'low' | 'medium' | 'high' | 'critical'; score: number; factors: string[] } {
  const factors: string[] = []

  // Base score from category if available
  let score = categoryScore !== undefined ? categoryScore : 50

  // Analyze field completeness
  const field1Len = field1?.trim().length || 0
  const field2Len = field2?.trim().length || 0

  if (field1Len === 0) {
    score -= 15
    factors.push('Key field is empty — insufficient detail for assessment')
  } else if (field1Len < 20) {
    score -= 8
    factors.push('Key field is very brief — may indicate insufficient analysis')
  }

  if (field2Len === 0) {
    score -= 15
    factors.push('Supporting field is empty — needs more detail')
  } else if (field2Len < 20) {
    score -= 8
    factors.push('Supporting field is very brief')
  }

  // If no category score, use heuristic defaults
  if (categoryScore === undefined) {
    if (field1Len > 50 && field2Len > 50) {
      score = 65
      factors.push('Fields have reasonable detail')
    } else if (field1Len > 20 || field2Len > 20) {
      score = 45
      factors.push('Limited information provided')
    } else {
      score = 25
      factors.push('Very little information to assess')
    }
  }

  if (factors.length === 0) {
    factors.push('Based on available canvas data')
  }

  return {
    level: scoreToRiskLevel(score),
    score: clampScore(score),
    factors,
  }
}

function generateFallbackSummary(
  overallScore: number,
  grade: string,
  categories: ValidationCategory[]
): string {
  const topCategory = [...categories].sort((a, b) => b.score - a.score)[0]
  const bottomCategory = [...categories].sort((a, b) => a.score - b.score)[0]

  return `This idea scored ${overallScore}/100 (Grade ${grade}). The strongest area is ${topCategory?.category || 'N/A'} at ${topCategory?.score || 0}/100, while ${bottomCategory?.category || 'N/A'} needs the most improvement at ${bottomCategory?.score || 0}/100. Focus on addressing the weaknesses in ${bottomCategory?.category || 'key areas'} to improve overall viability.`
}
