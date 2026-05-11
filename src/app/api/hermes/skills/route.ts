/**
 * Hermes Agent Skills API
 * GET /api/hermes/skills - List available skills
 * POST /api/hermes/skills - Execute a skill with a prompt
 */

import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/middleware/with-api-handler";
import ZAI from "z-ai-web-dev-sdk";

const GANGNIAGA_SKILLS = [
  { name: "business-plan-analyzer", description: "Comprehensive business plan analysis with financial viability scoring, market assessment, and lender-readiness evaluation", version: "1.0.0", category: "financial", tags: ["business-plan", "analysis", "financial", "lender"], icon: "📊" },
  { name: "idea-validation-engine", description: "Systematic idea pressure-testing with market research, competitive analysis, and feasibility scoring", version: "1.0.0", category: "validation", tags: ["idea", "validation", "market-research", "startup"], icon: "💡" },
  { name: "lender-persona-review", description: "Review business plans from specific lender perspectives (bank, VC, angel, SBA, microfinance) with risk assessment", version: "1.0.0", category: "review", tags: ["lender", "review", "risk", "funding"], icon: "🏦" },
  { name: "financial-forecaster", description: "Generate interconnected financial projections (P&L, Cash Flow, Balance Sheet) with scenario analysis", version: "1.0.0", category: "financial", tags: ["forecast", "financial-model", "scenario", "cash-flow"], icon: "📈" },
  { name: "market-researcher", description: "Bank-grade market research with verified citations, industry benchmarks, and competitive intelligence", version: "1.0.0", category: "research", tags: ["research", "market", "citations", "competitive"], icon: "🔍" },
  { name: "daily-business-briefing", description: "Generate automated daily business intelligence briefings with KPIs, alerts, and action items", version: "1.0.0", category: "automation", tags: ["briefing", "daily", "KPI", "automation"], icon: "📋" },
  { name: "pitch-deck-orchestrator", description: "Create dynamic pitch decks that auto-sync with financial models and adapt to audience type", version: "1.0.0", category: "presentation", tags: ["pitch-deck", "presentation", "investor", "dynamic"], icon: "🎯" },
  { name: "quickbooks-xero-sync", description: "Sync actual financial data from QuickBooks or Xero for plan-vs-actuals tracking and variance analysis", version: "1.0.0", category: "integration", tags: ["quickbooks", "xero", "accounting", "sync"], icon: "🔄" },
];

export const GET = withApiHandler(
  { skipAuth: true, skipRbac: true },
  async (_req, _user) => {
    const hermesUrl = process.env.HERMES_API_URL;
    const hermesKey = process.env.HERMES_API_KEY;

    if (hermesUrl) {
      try {
        const res = await fetch(`${hermesUrl}/v1/skills`, {
          headers: { Authorization: `Bearer ${hermesKey || "change-me-local-dev"}` },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ source: "hermes-agent", ...data, gangniaga: GANGNIAGA_SKILLS });
        }
      } catch { /* fall through */ }
    }

    return NextResponse.json({ source: "builtin", skills: GANGNIAGA_SKILLS, total: GANGNIAGA_SKILLS.length });
  }
);

export const POST = withApiHandler(
  { resource: "hermes", action: "execute", skipAuth: true, skipRbac: true },
  async (req, _user) => {
    const body = await req.json();
    const { skillName, prompt, context } = body as { skillName: string; prompt: string; context?: string };

    if (!skillName || !prompt) {
      return NextResponse.json({ error: "skillName and prompt are required" }, { status: 400 });
    }

    const skill = GANGNIAGA_SKILLS.find((s) => s.name === skillName);
    if (!skill) {
      return NextResponse.json({ error: `Skill "${skillName}" not found` }, { status: 404 });
    }

    const zai = await ZAI.create();
    const systemPrompt = `You are executing the "${skill.name}" skill from GangNiaga AI OS powered by Hermes Agent.\n\nSkill Description: ${skill.description}\nCategory: ${skill.category}\n\nApply this skill's specialized knowledge and procedures to the user's request.\nBe thorough, data-driven, and actionable in your response.\n${context ? `\nAdditional Context: ${context}` : ""}`;

    try {
      const result = await zai.chat.completions.create({
        model: "default",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      });

      return NextResponse.json({
        skill: skillName,
        response: result.choices?.[0]?.message?.content || "No response generated.",
        category: skill.category,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
);
