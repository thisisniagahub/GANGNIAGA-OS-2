/**
 * Hermes Agent Chat API
 * POST /api/hermes/chat - Send messages to Hermes Agent
 */

import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/middleware/with-api-handler";
import ZAI from "z-ai-web-dev-sdk";

export const POST = withApiHandler(
  { resource: "hermes", action: "execute", skipAuth: true, skipRbac: true },
  async (req, _user) => {
    const body = await req.json();
    const { messages, model, systemPrompt, skill, toolsets } = body as {
      messages: Array<{ role: string; content: string }>;
      model?: string;
      stream?: boolean;
      systemPrompt?: string;
      skill?: string;
      toolsets?: string[];
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    // Try Hermes Agent API Server first
    const hermesUrl = process.env.HERMES_API_URL;
    const hermesKey = process.env.HERMES_API_KEY;

    if (hermesUrl) {
      try {
        const res = await fetch(`${hermesUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${hermesKey || "change-me-local-dev"}`,
          },
          body: JSON.stringify({ model: model || "hermes-agent", messages, stream: false }),
          signal: AbortSignal.timeout(60000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            source: "hermes-agent",
            response: data.choices?.[0]?.message?.content || "",
            usage: data.usage,
            model: data.model,
          });
        }
      } catch {
        // Fall through to SDK
      }
    }

    // Fallback: Use z-ai-web-dev-sdk directly
    const zai = await ZAI.create();

    const baseSystemPrompt = systemPrompt || `You are Hermes Agent integrated into GangNiaga AI OS — an Autonomous AI Business Operating System built by Nous Research integration.

You are a self-improving AI agent with:
- Persistent memory that grows across sessions
- 70+ tools for business operations, research, and automation
- Skills system for on-demand knowledge
- Ability to delegate tasks to subagents
- Cron scheduling for automated tasks
- Kanban board for multi-agent coordination
- Persistent goals that survive across turns

You help entrepreneurs and business owners make data-driven decisions. Be precise, analytical, and actionable.`;

    const skillEnhancement = skill
      ? `\n\n[Active Skill: ${skill}]\nYou are currently using the "${skill}" skill. Apply its specialized knowledge and procedures.`
      : "";

    const toolsetEnhancement = toolsets?.length
      ? `\n\n[Active Toolsets: ${toolsets.join(", ")}]\nYou have access to these toolsets. Use them as needed.`
      : "";

    const allMessages = [
      { role: "system" as const, content: baseSystemPrompt + skillEnhancement + toolsetEnhancement },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    try {
      const result = await zai.chat.completions.create({
        model: "default",
        messages: allMessages,
      });

      return NextResponse.json({
        source: "z-ai-sdk",
        response: result.choices?.[0]?.message?.content || "No response generated.",
        model: model || "gangniaga-hermes",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
);
