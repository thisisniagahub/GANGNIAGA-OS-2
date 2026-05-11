/**
 * Hermes Agent Kanban API
 * GET /api/hermes/kanban - List kanban tasks
 * POST /api/hermes/kanban - Create/update kanban tasks
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
        const res = await fetch(`${hermesUrl}/v1/kanban`, {
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
      tasks: [
        { id: "kb-1", title: "Analyze Q1 Financial Performance", body: "Compare Q1 actuals against forecast, identify variances >10%", assignee: "gangniaga-cfo", status: "running", comments: [{ author: "gangniaga-cfo", content: "Revenue variance analysis complete, checking expense categories next", createdAt: new Date().toISOString() }], createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date().toISOString() },
        { id: "kb-2", title: "Research Competitor Pricing Strategy", body: "Analyze top 5 competitors' pricing models and positioning", assignee: "gangniaga-researcher", status: "ready", comments: [] as Array<{ author: string; content: string; createdAt: string }>, createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date(Date.now() - 7200000).toISOString() },
        { id: "kb-3", title: "Update Pitch Deck for Investor Meeting", body: "Sync latest financial projections and add market validation data", assignee: "gangniaga-ceo", status: "todo", comments: [], createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
        { id: "kb-4", title: "Validate Expansion Idea: European Market", body: "Test market entry hypothesis for DACH region", assignee: "gangniaga-growth", status: "done", comments: [{ author: "gangniaga-growth", content: "Market validation complete. TAM: $2.4B, SAM: $340M, SOM: $17M. Recommendation: PROCEED with pilot.", createdAt: new Date().toISOString() }], createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
      ],
    });
  }
);

export const POST = withApiHandler(
  { resource: "hermes", action: "execute", skipAuth: true, skipRbac: true },
  async (req, _user) => {
    const body = await req.json();
    const { title, body: taskBody, assignee, status } = body as {
      title?: string; body?: string; assignee?: string; status?: string; id?: string;
    };

    return NextResponse.json({
      source: "demo",
      task: {
        id: `kb-${Date.now()}`,
        title: title || "New Task",
        body: taskBody || "",
        assignee: assignee || "unassigned",
        status: status || "triage",
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }
);
