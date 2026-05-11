/**
 * Hermes Agent Cron API
 * GET /api/hermes/cron - List scheduled jobs
 * POST /api/hermes/cron - Create/manage cron jobs
 */

import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/middleware/with-api-handler";

export const GET = withApiHandler(
  { skipAuth: true, skipRbac: true },
  async (_req, _user) => {
    const hermesUrl = process.env.HERMES_API_URL;
    const hermesKey = process.env.HERMES_API_KEY;

    if (hermesUrl) {
      try {
        const res = await fetch(`${hermesUrl}/v1/cron`, {
          headers: { Authorization: `Bearer ${hermesKey || "change-me-local-dev"}` },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ source: "hermes-agent", ...data });
        }
      } catch { /* fall through */ }
    }

    return NextResponse.json({
      source: "demo",
      jobs: [
        { id: "demo-1", name: "Daily Business Briefing", schedule: "0 9 * * *", prompt: "Generate daily business briefing with KPIs, cash flow status, variance alerts, and action items", skill: "daily-business-briefing", enabled: true, nextRun: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date().toISOString() },
        { id: "demo-2", name: "Weekly Financial Review", schedule: "0 9 * * 1", prompt: "Review weekly financial performance, compare against forecast, and identify trends", skill: "financial-forecaster", enabled: true, nextRun: new Date(Date.now() + 604800000).toISOString(), createdAt: new Date().toISOString() },
        { id: "demo-3", name: "Market Watch", schedule: "0 */6 * * *", prompt: "Scan market for industry updates, competitor moves, and regulatory changes", skill: "market-researcher", enabled: false, nextRun: null, createdAt: new Date().toISOString() },
      ],
    });
  }
);

export const POST = withApiHandler(
  { resource: "hermes", action: "execute", skipAuth: true, skipRbac: true },
  async (req, _user) => {
    const body = await req.json();
    const { action, schedule, prompt, name, skill, jobId } = body as {
      action: "create" | "pause" | "resume" | "remove" | "run";
      schedule?: string; prompt?: string; name?: string; skill?: string; jobId?: string;
    };

    return NextResponse.json({
      source: "demo",
      action,
      job: {
        id: jobId || `cron-${Date.now()}`,
        name: name || "New Cron Job",
        schedule: schedule || "0 9 * * *",
        prompt: prompt || "",
        skill,
        enabled: action !== "pause",
        createdAt: new Date().toISOString(),
      },
    });
  }
);
