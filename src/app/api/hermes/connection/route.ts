/**
 * Hermes Agent Connection Status API
 * GET /api/hermes/connection - Check if Hermes Agent is reachable
 */

import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/middleware/with-api-handler";

export const GET = withApiHandler(
  { skipAuth: true, skipRbac: true },
  async (_req, _user) => {
    const hermesUrl = process.env.HERMES_API_URL || "http://127.0.0.1:8642";
    const hermesKey = process.env.HERMES_API_KEY || "change-me-local-dev";

    try {
      const res = await fetch(`${hermesUrl}/`, {
        headers: { Authorization: `Bearer ${hermesKey}` },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          connected: true,
          version: data.version,
          features: data.features,
          skillsCount: data.skillsCount,
          uptime: data.uptime,
          serviceUrl: hermesUrl,
          lastChecked: new Date().toISOString(),
        });
      }
      return NextResponse.json({
        connected: false,
        error: `Hermes returned ${res.status}`,
        serviceUrl: hermesUrl,
        lastChecked: new Date().toISOString(),
      });
    } catch (error: any) {
      return NextResponse.json({
        connected: false,
        error: error.message,
        serviceUrl: hermesUrl,
        fallbackMode: true,
        lastChecked: new Date().toISOString(),
      });
    }
  }
);
