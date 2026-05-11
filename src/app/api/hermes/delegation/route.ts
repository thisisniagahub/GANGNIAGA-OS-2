/**
 * Hermes Agent Delegation API
 * POST /api/hermes/delegation - Delegate tasks to subagents
 */

import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/middleware/with-api-handler";
import ZAI from "z-ai-web-dev-sdk";

export const POST = withApiHandler(
  { resource: "hermes", action: "execute", skipAuth: true, skipRbac: true },
  async (req, _user) => {
    const body = await req.json();
    const { tasks, goal, context, toolsets } = body as {
      tasks?: Array<{ goal: string; context?: string; toolsets?: string[] }>;
      goal?: string; context?: string; toolsets?: string[];
    };

    const delegationTasks = tasks || (goal ? [{ goal, context, toolsets }] : []);
    if (delegationTasks.length === 0) {
      return NextResponse.json({ error: "At least one task with a goal is required" }, { status: 400 });
    }

    // Limit to first 3 tasks for safety
    const limitedTasks = delegationTasks.slice(0, 3);
    const zai = await ZAI.create();
    const results = [];

    for (const task of limitedTasks) {
      const systemPrompt = `You are a specialized Hermes subagent executing an isolated task.
You have no knowledge of any prior conversation — only the goal and context provided.
Complete the task and provide a structured summary of:
1. What you found/did
2. Key findings or deliverables
3. Any issues encountered

${task.toolsets?.length ? `Available toolsets: ${task.toolsets.join(", ")}` : "Available toolsets: web, terminal, file"}`;

      const messages = [];
      if (task.context) messages.push({ role: "system" as const, content: `Context: ${task.context}` });
      messages.push({ role: "user" as const, content: task.goal });

      try {
        const result = await zai.chat.completions.create({
          model: "default",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        });
        results.push({ goal: task.goal, summary: result.choices?.[0]?.message?.content || "No response", success: true });
      } catch (error: any) {
        results.push({ goal: task.goal, summary: `Error: ${error.message}`, success: false });
      }
    }

    return NextResponse.json({
      source: "z-ai-sdk",
      results,
      totalTasks: limitedTasks.length,
      completedAt: new Date().toISOString(),
    });
  }
);
