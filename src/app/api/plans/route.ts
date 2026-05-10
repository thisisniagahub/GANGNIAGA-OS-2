import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { organizationId, title, description, businessType, industry, targetMarket, generateWithAI } = await req.json()

    if (!organizationId || !title) {
      return NextResponse.json({ error: 'Organization ID and title are required' }, { status: 400 })
    }

    // Create the business plan
    const plan = await db.businessPlan.create({
      data: {
        title,
        description: description || '',
        organizationId,
        status: 'draft',
      },
    })

    // Create default sections
    const sectionTypes = [
      { type: 'executive_summary', title: 'Executive Summary', order: 0 },
      { type: 'market_analysis', title: 'Market Analysis', order: 1 },
      { type: 'swot', title: 'SWOT Analysis', order: 2 },
      { type: 'competitor', title: 'Competitor Analysis', order: 3 },
      { type: 'financial', title: 'Financial Planning', order: 4 },
      { type: 'marketing', title: 'Marketing Strategy', order: 5 },
      { type: 'operations', title: 'Operations Plan', order: 6 },
      { type: 'team', title: 'Team & Organization', order: 7 },
    ]

    await db.planSection.createMany({
      data: sectionTypes.map((s) => ({
        planId: plan.id,
        type: s.type,
        title: s.title,
        order: s.order,
        content: '',
        aiGenerated: false,
      })),
    })

    // If AI generation is requested, generate content for each section
    if (generateWithAI) {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const sectionPrompts: Record<string, string> = {
        executive_summary: `Write a comprehensive executive summary for a business plan. Business: "${title}". Industry: ${industry || 'Technology'}. Target Market: ${targetMarket || 'Southeast Asia'}. Include company overview, mission, key objectives, and financial highlights. Write in professional business language.`,
        market_analysis: `Write a detailed market analysis section for: "${title}". Industry: ${industry || 'Technology'}. Target Market: ${targetMarket || 'Southeast Asia'}. Include market size, growth trends, target segments, and market opportunities.`,
        swot: `Write a SWOT analysis for: "${title}". Industry: ${industry || 'Technology'}. Include Strengths, Weaknesses, Opportunities, and Threats with detailed bullet points for each.`,
        competitor: `Write a competitor analysis for: "${title}". Industry: ${industry || 'Technology'}. Include key competitors, competitive landscape, differentiation strategy, and competitive advantages.`,
        financial: `Write a financial planning section for: "${title}". Include revenue model, cost structure, key financial assumptions, and 3-year financial projections overview.`,
        marketing: `Write a marketing strategy section for: "${title}". Target Market: ${targetMarket || 'Southeast Asia'}. Include marketing channels, customer acquisition strategy, pricing strategy, and brand positioning.`,
        operations: `Write an operations plan section for: "${title}". Include operational structure, key processes, technology stack, and scalability plan.`,
        team: `Write a team & organization section for: "${title}". Include organizational structure, key roles, hiring plan, and advisory board recommendations.`,
      }

      for (const [type, prompt] of Object.entries(sectionPrompts)) {
        try {
          const completion = await zai.chat.completions.create({
            messages: [
              { role: 'assistant', content: 'You are a professional business plan writer. Write detailed, investor-ready content. Use markdown formatting with headers, bullet points, and bold text for emphasis.' },
              { role: 'user', content: prompt },
            ],
            thinking: { type: 'disabled' },
          })

          const content = completion.choices[0]?.message?.content || ''

          await db.planSection.updateMany({
            where: { planId: plan.id, type },
            data: { content, aiGenerated: true },
          })
        } catch (error) {
          console.error(`Failed to generate ${type}:`, error)
        }
      }

      // Update plan status
      await db.businessPlan.update({
        where: { id: plan.id },
        data: { status: 'review' },
      })
    }

    // Return the plan with sections
    const fullPlan = await db.businessPlan.findUnique({
      where: { id: plan.id },
      include: { sections: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({ plan: fullPlan })
  } catch (error) {
    console.error('Plan creation error:', error)
    return NextResponse.json({ error: 'Failed to create business plan' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const plans = await db.businessPlan.findMany({
      where: { organizationId },
      include: { sections: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Plans fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}
