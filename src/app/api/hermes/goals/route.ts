/**
 * Hermes Agent Goals API
 * GET /api/hermes/goals - List persistent goals
 * POST /api/hermes/goals - Create/manage persistent goals
 */

import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/middleware/with-api-handler";
import ZAI from "z-ai-web-dev-sdk";

export const GET = withApiHandler(
  { skipAuth: true, skipRbac: true },
  async (_req, _user) => {
    return NextResponse.json({ source: "demo", goals: [] });
  }
);

export const POST = withApiHandler(
  { resource: "hermes", action: "execute", skipAuth: true, skipRbac: true },
  async (req, _user) => {
    const body = await req.json();
    const { text, maxTurns } = body as { text?: string; maxTurns?: number };

    if (!text) {
      return NextResponse.json({ error: "Goal text is required" }, { status: 400 });
    }

    const zai = await ZAI.create();
    const effectiveMaxTurns = Math.min(maxTurns || 3, 3); // Limit for safety

    const systemPrompt = `You are Hermes Agent working on a persistent goal. You must iterate until the goal is achieved.
After each step, assess whether the goal is complete. If not, explain what remains.
Provide a final "GOAL_STATUS: COMPLETE" or "GOAL_STATUS: IN_PROGRESS" marker at the end.`;

    let finalResponse = "";
    for (let turn = 0; turn < effectiveMaxTurns; turn++) {
      const turnPrompt = turn === 0
        ? `Goal: ${text}\n\nBegin working on this goal.`
        : `Goal: ${text}\n\nPrevious progress:\n${finalResponse}\n\nContinue working toward the goal. If done, mark GOAL_STATUS: COMPLETE.`;

      const result = await zai.chat.completions.create({
        model: "default",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: turnPrompt }],
      });

      finalResponse = result.choices?.[0]?.message?.content || "";
      if (finalResponse.includes("GOAL_STATUS: COMPLETE")) break;
    }

    return NextResponse.json({
      source: "z-ai-sdk",
      goal: {
        id: `goal-${Date.now()}`,
        text,
        status: finalResponse.includes("GOAL_STATUS: COMPLETE") ? "completed" : "paused",
        turnsUsed: effectiveMaxTurns,
        maxTurns: maxTurns || 20,
        result: finalResponse,
        createdAt: new Date().toISOString(),
      },
    });
  }
);
