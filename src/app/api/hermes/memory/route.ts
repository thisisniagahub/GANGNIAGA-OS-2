/**
 * Hermes Agent Memory API
 * GET /api/hermes/memory - Get memory state
 * POST /api/hermes/memory - Update memory (add/replace/remove)
 */

import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/middleware/with-api-handler";
import { db } from "@/lib/db";

export const GET = withApiHandler(
  { skipAuth: true, skipRbac: true },
  async (_req, _user) => {
    const hermesUrl = process.env.HERMES_API_URL;
    const hermesKey = process.env.HERMES_API_KEY;

    if (hermesUrl) {
      try {
        const res = await fetch(`${hermesUrl}/v1/memory`, {
          headers: { Authorization: `Bearer ${hermesKey || "change-me-local-dev"}` },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ source: "hermes-agent", ...data });
        }
      } catch { /* fall through */ }
    }

    try {
      const memories = await db.memoryEntry.findMany({ orderBy: { updatedAt: "desc" }, take: 50 });
      return NextResponse.json({
        source: "local-db",
        entries: memories,
        stats: {
          totalEntries: memories.length,
          byType: memories.reduce((acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc; }, {} as Record<string, number>),
        },
      });
    } catch {
      return NextResponse.json({ source: "demo", entries: [], stats: { totalEntries: 0, byType: {} } });
    }
  }
);

export const POST = withApiHandler(
  { resource: "hermes", action: "execute", skipAuth: true, skipRbac: true },
  async (req, _user) => {
    const body = await req.json();
    const { action, target, content, oldText } = body as {
      action: "add" | "replace" | "remove";
      target: "memory" | "user";
      content?: string;
      oldText?: string;
    };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const hermesUrl = process.env.HERMES_API_URL;
    const hermesKey = process.env.HERMES_API_KEY;

    if (hermesUrl) {
      try {
        const res = await fetch(`${hermesUrl}/v1/memory`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${hermesKey || "change-me-local-dev"}` },
          body: JSON.stringify({ action, target, content, old_text: oldText }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ source: "hermes-agent", ...data });
        }
      } catch { /* fall through */ }
    }

    // Fallback: Use local DB
    try {
      if (action === "add" && content) {
        const entry = await db.memoryEntry.create({
          data: { userId: "default", key: `${target}-${Date.now()}`, content, type: target, priority: 0.5, ttl: 0 },
        });
        return NextResponse.json({ source: "local-db", action: "add", entry });
      }

      if (action === "remove" && oldText) {
        const entries = await db.memoryEntry.findMany({ where: { type: target, content: { contains: oldText } }, take: 1 });
        if (entries.length > 0) {
          await db.memoryEntry.delete({ where: { id: entries[0].id } });
          return NextResponse.json({ source: "local-db", action: "remove", removed: entries[0] });
        }
        return NextResponse.json({ source: "local-db", action: "remove", removed: null });
      }

      if (action === "replace" && oldText && content) {
        const entries = await db.memoryEntry.findMany({ where: { type: target, content: { contains: oldText } }, take: 1 });
        if (entries.length > 0) {
          const updated = await db.memoryEntry.update({ where: { id: entries[0].id }, data: { content } });
          return NextResponse.json({ source: "local-db", action: "replace", entry: updated });
        }
        return NextResponse.json({ source: "local-db", action: "replace", entry: null });
      }
    } catch {
      // DB error, return demo response
    }

    return NextResponse.json({ source: "demo", action, success: true });
  }
);
