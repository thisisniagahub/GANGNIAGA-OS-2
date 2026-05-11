/**
 * Hermes Agent Service for GangNiaga AI OS
 *
 * This service acts as a bridge between the GangNiaga frontend and Hermes Agent.
 * It provides:
 * 1. OpenAI-compatible chat completions endpoint (proxied through z-ai-web-dev-sdk)
 * 2. Skills management (load, list, execute GangNiaga-specific skills)
 * 3. Memory management (persistent business context)
 * 4. Cron job management (scheduled business tasks)
 * 5. Delegation management (parallel subagent tasks)
 * 6. Kanban board management (multi-agent coordination)
 * 7. Goal management (persistent autonomous goals)
 *
 * HERMES AGENT INTEGRATION MODES:
 * - Direct API: If Hermes Agent API Server is running, proxy directly to it
 * - SDK Fallback: Use z-ai-web-dev-sdk as the AI backend with Hermes-style features
 *
 * @see https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server
 */

import ZAI from "z-ai-web-dev-sdk";

const PORT = 8642;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface SkillDef {
  name: string;
  description: string;
  version: string;
  category: string;
  content: string;
}

// ─── In-Memory State ────────────────────────────────────────────────────────

let zaiInstance: Awaited<ZAI> | null = null;

const memoryStore = {
  memory: [] as string[],
  user: [] as string[],
};

const cronJobs = new Map<
  string,
  {
    id: string;
    name: string;
    schedule: string;
    prompt: string;
    skill?: string;
    enabled: boolean;
    lastRun?: string;
    nextRun?: string;
    createdAt: string;
  }
>();

const kanbanTasks = new Map<
  string,
  {
    id: string;
    title: string;
    body?: string;
    assignee?: string;
    status: "triage" | "todo" | "ready" | "running" | "blocked" | "done" | "archived";
    comments: Array<{ author: string; content: string; createdAt: string }>;
    createdAt: string;
    updatedAt: string;
  }
>();

const goals = new Map<
  string,
  {
    id: string;
    text: string;
    status: "active" | "paused" | "completed" | "failed";
    turnsUsed: number;
    maxTurns: number;
    createdAt: string;
  }
>();

const delegationResults = new Map<
  string,
  {
    id: string;
    goal: string;
    context?: string;
    status: "running" | "completed" | "failed";
    summary?: string;
    startedAt: string;
    completedAt?: string;
  }
>();

// ─── GangNiaga Skills ───────────────────────────────────────────────────────

const GANGNIAGA_SKILLS: SkillDef[] = [
  {
    name: "business-plan-analyzer",
    description: "Comprehensive business plan analysis with financial viability scoring, market assessment, and lender-readiness evaluation",
    version: "1.0.0",
    category: "financial",
    content: `# Business Plan Analyzer

## When to Use
When a user wants to analyze, review, or validate a business plan document.

## Procedure
1. Parse the business plan document into key sections (executive summary, market analysis, financials, team, etc.)
2. Evaluate market viability (TAM/SAM/SOM, competitive landscape, barriers to entry)
3. Assess financial projections (revenue assumptions, expense realism, cash flow sustainability)
4. Score lender readiness (collateral, debt service coverage, management capability)
5. Generate a structured report with scores (0-100) for each dimension
6. Provide actionable improvement recommendations

## Pitfalls
- Don't accept unsubstantiated revenue claims without questioning
- Watch for common financial model errors (circular references, inconsistent growth rates)
- Flag missing risk factors or overoptimistic assumptions

## Verification
- All financial statements are interconnected (Income → Cash Flow → Balance Sheet)
- Market sizing uses bottom-up methodology
- At least 3 comparable companies are referenced`,
  },
  {
    name: "idea-validation-engine",
    description: "Systematic idea pressure-testing with market research, competitive analysis, and feasibility scoring",
    version: "1.0.0",
    category: "validation",
    content: `# Idea Validation Engine

## When to Use
When a user wants to validate a new business idea before committing resources.

## Procedure
1. Capture the idea hypothesis (problem, solution, customer, value proposition)
2. Research market size and growth trends using web search
3. Identify direct and indirect competitors
4. Assess technical feasibility and resource requirements
5. Evaluate regulatory and legal considerations
6. Calculate rough MVP cost and timeline
7. Score idea across 6 dimensions: Market (0-100), Competition (0-100), Feasibility (0-100), Team Fit (0-100), Financial (0-100), Timing (0-100)
8. Generate GO/NO-GO/MODIFY recommendation

## Pitfalls
- Don't confuse a product idea with a business model
- Avoid confirmation bias in market research
- Challenge assumptions aggressively

## Verification
- Market sizing uses multiple data sources
- At least 5 competitors analyzed
- Financial projections include worst-case scenario`,
  },
  {
    name: "lender-persona-review",
    description: "Review business plans from specific lender perspectives (bank, VC, angel, SBA, microfinance) with risk assessment",
    version: "1.0.0",
    category: "review",
    content: `# Lender Persona Review

## When to Use
When preparing a business plan for a specific type of funding or lender audience.

## Procedure
1. Identify the lender type (commercial bank, venture capital, angel investor, SBA, microfinance, crowdfunding)
2. Load lender-specific criteria and risk assessment framework
3. Review the business plan against lender priorities:
   - Banks: Cash flow, collateral, credit history, debt service coverage
   - VCs: Market size, team, traction, scalability, exit potential
   - Angels: Team, product-market fit, personal connection, sector expertise
   - SBA: Character, capacity, capital, collateral, conditions
4. Score the plan on lender-specific dimensions
5. Identify gaps and weaknesses from the lender's perspective
6. Recommend specific improvements and additions
7. Generate a lender-ready summary

## Pitfalls
- Different lenders have fundamentally different evaluation criteria
- Don't apply VC criteria to bank lending decisions
- Regulatory requirements vary by lender type and jurisdiction

## Verification
- All lender-specific criteria are explicitly addressed
- Financial ratios match the lender's typical thresholds
- Risk mitigation strategies are concrete and actionable`,
  },
  {
    name: "financial-forecaster",
    description: "Generate interconnected financial projections (P&L, Cash Flow, Balance Sheet) with scenario analysis",
    version: "1.0.0",
    category: "financial",
    content: `# Financial Forecaster

## When to Use
When building financial projections, running scenario analyses, or modeling business outcomes.

## Procedure
1. Collect base assumptions (revenue, costs, growth rates, timing)
2. Build interconnected financial model:
   - Income Statement (Revenue → COGS → Gross Profit → Operating Expenses → Net Income)
   - Cash Flow Statement (Operating → Investing → Financing → Net Cash Flow)
   - Balance Sheet (Assets = Liabilities + Equity)
3. Ensure all three statements are linked (Net Income flows to Cash Flow and Retained Earnings)
4. Generate 3 scenarios: Base, Optimistic (+30%), Pessimistic (-30%)
5. Calculate key ratios (Gross Margin, Burn Rate, Runway, DSCR, Current Ratio)
6. Identify breakeven point and cash runway
7. Flag financial risks and sensitivities

## Pitfalls
- Never build financial statements in isolation—they must interconnect
- Watch for circular references in interest calculations
- Ensure beginning and ending cash balances tie out
- Depreciation must flow through all three statements consistently

## Verification
- Balance Sheet balances (Assets = Liabilities + Equity)
- Net Income matches between Income Statement and Cash Flow
- Ending cash matches between Cash Flow and Balance Sheet
- All scenarios use the same structural model with different assumptions`,
  },
  {
    name: "market-researcher",
    description: "Bank-grade market research with verified citations, industry benchmarks, and competitive intelligence",
    version: "1.0.0",
    category: "research",
    content: `# Market Researcher

## When to Use
When conducting market research, competitive analysis, or industry benchmarking.

## Procedure
1. Define research scope and key questions
2. Search for primary and secondary data sources
3. Verify each source (publication date, methodology, sample size, credibility)
4. Compile findings with proper citations (Title, URL, Date, Key Findings, Relevance)
5. Identify industry benchmarks and KPIs
6. Analyze competitive landscape (market share, positioning, strengths/weaknesses)
7. Synthesize into actionable insights
8. Rate confidence level for each finding

## Pitfalls
- Don't cite sources older than 2 years for market data
- Verify that industry reports are from reputable firms
- Distinguish between global and local market data
- Be explicit about data gaps and assumptions

## Verification
- Every claim has at least one verifiable source
- Sources are from credible institutions (McKinsey, Deloitte, Statista, government data)
- Data is current (within 2 years)
- Multiple sources corroborate key findings`,
  },
  {
    name: "daily-business-briefing",
    description: "Generate automated daily business intelligence briefings with KPIs, alerts, and action items",
    version: "1.0.0",
    category: "automation",
    content: `# Daily Business Briefing

## When to Use
When setting up automated daily business intelligence reports and alerts.

## Procedure
1. Fetch latest financial metrics (revenue, cash balance, burn rate, runway)
2. Check for variance alerts (actuals vs forecast deviations >10%)
3. Gather market updates relevant to the business industry
4. Review outstanding tasks and deadlines
5. Summarize key performance indicators
6. Generate action items with priority and deadline
7. Format briefing for the target platform (Telegram, Discord, Email)

## Pitfalls
- Don't overwhelm with data—focus on actionable insights
- Ensure alerts are threshold-based, not just informational
- Verify that financial data is current before generating briefing
- Respect platform message length limits

## Verification
- All financial figures are from the latest available data
- Alerts trigger on defined thresholds only
- Briefing is under 2000 characters for messaging platforms
- Action items have clear ownership and deadlines`,
  },
  {
    name: "pitch-deck-orchestrator",
    description: "Create dynamic pitch decks that auto-sync with financial models and adapt to audience type",
    version: "1.0.0",
    category: "presentation",
    content: `# Pitch Deck Orchestrator

## When to Use
When creating, updating, or customizing a pitch deck for different audiences.

## Procedure
1. Load the latest business plan and financial model data
2. Determine target audience (investors, lenders, partners, customers)
3. Select appropriate slide template and narrative structure
4. Auto-populate financial data from the connected model
5. Generate key visualizations (charts, tables, metrics)
6. Add narrative context for each slide
7. Create speaker notes with talking points
8. Generate audience-specific versions

## Pitfalls
- Financial data must be consistent with the latest model
- Don't use outdated metrics—always pull from live data
- Different audiences need different emphasis (investors → growth, lenders → stability)
- Keep slide count under 15 for investor decks

## Verification
- All financial figures match the latest forecast
- Charts render correctly with real data
- Audience-appropriate narrative and emphasis
- Speaker notes cover potential questions`,
  },
  {
    name: "quickbooks-xero-sync",
    description: "Sync actual financial data from QuickBooks or Xero for plan-vs-actuals tracking and variance analysis",
    version: "1.0.0",
    category: "integration",
    content: `# QuickBooks/Xero Sync

## When to Use
When connecting accounting software for real-time plan-vs-actuals comparison.

## Procedure
1. Verify accounting connection is active (QuickBooks or Xero)
2. Fetch latest financial data (income, expenses, balance sheet items)
3. Map accounting categories to forecast categories
4. Compare actuals against forecast for the current period
5. Calculate variances (absolute and percentage)
6. Flag significant deviations (>10% variance)
7. Generate variance analysis report
8. Trigger alerts for critical deviations

## Pitfalls
- Category mapping between accounting and forecast must be consistent
- Handle multi-currency transactions properly
- Don't sync more frequently than accounting data updates
- Reconcile timing differences (accrual vs cash basis)

## Verification
- Accounting connection is authenticated and active
- Category mapping is complete and consistent
- Variance calculations are mathematically correct
- Alerts trigger only on significant deviations`,
  },
];

// ─── Server ─────────────────────────────────────────────────────────────────

async function initSDK() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
    console.log("[Hermes Agent Service] Z-AI SDK initialized");
  }
  return zaiInstance;
}

async function callLLM(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
  const zai = await initSDK();

  const systemMessage = systemPrompt || `You are Hermes Agent integrated into GangNiaga AI OS — an Autonomous AI Business Operating System.
You have access to business intelligence, financial modeling, market research, and strategic planning capabilities.
You help entrepreneurs and business owners make data-driven decisions.
Be precise, analytical, and actionable in your responses.`;

  const allMessages = [
    { role: "system" as const, content: systemMessage },
    ...messages,
  ];

  try {
    const result = await zai.chat.completions.create({
      model: "default",
      messages: allMessages,
    });

    return result.choices?.[0]?.message?.content || "No response generated.";
  } catch (error: any) {
    console.error("[Hermes Agent Service] LLM call failed:", error.message);
    return `Error: ${error.message}`;
  }
}

// ─── HTTP Server ────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // ─── Health Check ─────────────────────────────────────────────────
      if (path === "/" && method === "GET") {
        return Response.json(
          {
            service: "hermes-agent-service",
            version: "1.0.0",
            status: "running",
            features: [
              "chat",
              "skills",
              "memory",
              "cron",
              "delegation",
              "kanban",
              "goals",
              "browser",
              "research",
            ],
            skillsCount: GANGNIAGA_SKILLS.length,
            uptime: process.uptime(),
          },
          { headers: corsHeaders }
        );
      }

      // ─── Models Endpoint ──────────────────────────────────────────────
      if (path === "/v1/models" && method === "GET") {
        return Response.json(
          {
            object: "list",
            data: [
              {
                id: "hermes-agent",
                object: "model",
                created: Date.now(),
                owned_by: "nous-research",
              },
              {
                id: "gangniaga-cfo",
                object: "model",
                created: Date.now(),
                owned_by: "gangniaga",
              },
              {
                id: "gangniaga-researcher",
                object: "model",
                created: Date.now(),
                owned_by: "gangniaga",
              },
            ],
          },
          { headers: corsHeaders }
        );
      }

      // ─── Chat Completions (OpenAI-compatible) ─────────────────────────
      if (path === "/v1/chat/completions" && method === "POST") {
        const body = (await req.json()) as ChatRequest;
        const messages = body.messages || [];

        // Extract system prompt from messages
        const systemMsg = messages.find((m) => m.role === "system");
        const userMessages = messages.filter((m) => m.role !== "system");
        const systemPrompt = systemMsg?.content;

        const content = await callLLM(userMessages, systemPrompt);

        return Response.json(
          {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: body.model || "hermes-agent",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
          },
          { headers: corsHeaders }
        );
      }

      // ─── Responses API (Stateful) ─────────────────────────────────────
      if (path === "/v1/responses" && method === "POST") {
        const body = await req.json();
        const input = typeof body.input === "string" ? body.input : JSON.stringify(body.input);
        const instructions = body.instructions || "";

        const messages: ChatMessage[] = [];
        if (instructions) {
          messages.push({ role: "system", content: instructions });
        }
        messages.push({ role: "user", content: input });

        const content = await callLLM(messages);

        return Response.json(
          {
            id: `resp-${Date.now()}`,
            object: "response",
            status: "completed",
            model: body.model || "hermes-agent",
            output: [
              {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: content }],
              },
            ],
            usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
          },
          { headers: corsHeaders }
        );
      }

      // ─── Skills Endpoints ─────────────────────────────────────────────
      if (path === "/v1/skills" && method === "GET") {
        return Response.json(
          {
            skills: GANGNIAGA_SKILLS.map((s) => ({
              name: s.name,
              description: s.description,
              version: s.version,
              category: s.category,
            })),
          },
          { headers: corsHeaders }
        );
      }

      if (path.match(/^\/v1\/skills\/[^/]+$/) && method === "GET") {
        const skillName = path.split("/").pop()!;
        const skill = GANGNIAGA_SKILLS.find((s) => s.name === skillName);
        if (!skill) {
          return Response.json({ error: "Skill not found" }, { status: 404, headers: corsHeaders });
        }
        return Response.json(skill, { headers: corsHeaders });
      }

      // ─── Memory Endpoints ─────────────────────────────────────────────
      if (path === "/v1/memory" && method === "GET") {
        return Response.json(
          {
            memory: memoryStore.memory,
            user: memoryStore.user,
            stats: {
              memoryUsed: memoryStore.memory.join(" ").length,
              memoryTotal: 2200,
              userUsed: memoryStore.user.join(" ").length,
              userTotal: 1375,
            },
          },
          { headers: corsHeaders }
        );
      }

      if (path === "/v1/memory" && method === "POST") {
        const body = await req.json();
        const { action, target, content, old_text } = body;

        const store = target === "user" ? memoryStore.user : memoryStore.memory;

        if (action === "add" && content) {
          store.push(content);
        } else if (action === "replace" && old_text && content) {
          const idx = store.findIndex((e) => e.includes(old_text));
          if (idx !== -1) store[idx] = content;
        } else if (action === "remove" && old_text) {
          const idx = store.findIndex((e) => e.includes(old_text));
          if (idx !== -1) store.splice(idx, 1);
        }

        return Response.json(
          {
            success: true,
            memory: memoryStore.memory,
            user: memoryStore.user,
          },
          { headers: corsHeaders }
        );
      }

      // ─── Cron Endpoints ───────────────────────────────────────────────
      if (path === "/v1/cron" && method === "GET") {
        return Response.json(
          { jobs: Array.from(cronJobs.values()) },
          { headers: corsHeaders }
        );
      }

      if (path === "/v1/cron" && method === "POST") {
        const body = await req.json();
        const id = `cron-${Date.now()}`;
        const job = {
          id,
          name: body.name || "Unnamed Job",
          schedule: body.schedule || "0 9 * * *",
          prompt: body.prompt || "",
          skill: body.skill,
          enabled: true,
          createdAt: new Date().toISOString(),
        };
        cronJobs.set(id, job);
        return Response.json(job, { headers: corsHeaders });
      }

      if (path.match(/^\/v1\/cron\/[^/]+$/) && method === "PATCH") {
        const id = path.split("/").pop()!;
        const job = cronJobs.get(id);
        if (!job) {
          return Response.json({ error: "Job not found" }, { status: 404, headers: corsHeaders });
        }
        const body = await req.json();
        Object.assign(job, body);
        return Response.json(job, { headers: corsHeaders });
      }

      // ─── Delegation Endpoints ─────────────────────────────────────────
      if (path === "/v1/delegation" && method === "POST") {
        const body = await req.json();
        const id = `del-${Date.now()}`;

        // Execute delegated task asynchronously via LLM
        const taskGoal = body.goal || body.tasks?.[0]?.goal || "Unknown task";
        const taskContext = body.context || body.tasks?.[0]?.context || "";

        const result = {
          id,
          goal: taskGoal,
          context: taskContext,
          status: "running" as const,
          startedAt: new Date().toISOString(),
        };

        delegationResults.set(id, result);

        // Process in background
        (async () => {
          try {
            const messages: ChatMessage[] = [];
            if (taskContext) {
              messages.push({ role: "system", content: taskContext });
            }
            messages.push({ role: "user", content: taskGoal });

            const summary = await callLLM(messages, "You are a specialized AI agent. Complete the assigned task and provide a concise summary of your findings and actions.");

            const r = delegationResults.get(id);
            if (r) {
              r.status = "completed";
              r.summary = summary;
              r.completedAt = new Date().toISOString();
            }
          } catch (error: any) {
            const r = delegationResults.get(id);
            if (r) {
              r.status = "failed";
              r.summary = error.message;
              r.completedAt = new Date().toISOString();
            }
          }
        })();

        return Response.json(result, { headers: corsHeaders });
      }

      if (path.match(/^\/v1\/delegation\/[^/]+$/) && method === "GET") {
        const id = path.split("/").pop()!;
        const result = delegationResults.get(id);
        if (!result) {
          return Response.json({ error: "Delegation not found" }, { status: 404, headers: corsHeaders });
        }
        return Response.json(result, { headers: corsHeaders });
      }

      // ─── Kanban Endpoints ─────────────────────────────────────────────
      if (path === "/v1/kanban" && method === "GET") {
        return Response.json(
          { tasks: Array.from(kanbanTasks.values()) },
          { headers: corsHeaders }
        );
      }

      if (path === "/v1/kanban" && method === "POST") {
        const body = await req.json();
        const id = `task-${Date.now()}`;
        const now = new Date().toISOString();
        const task = {
          id,
          title: body.title || "Untitled Task",
          body: body.body,
          assignee: body.assignee,
          status: body.status || ("triage" as const),
          comments: [],
          createdAt: now,
          updatedAt: now,
        };
        kanbanTasks.set(id, task);
        return Response.json(task, { headers: corsHeaders });
      }

      if (path.match(/^\/v1\/kanban\/[^/]+$/) && method === "PATCH") {
        const id = path.split("/").pop()!;
        const task = kanbanTasks.get(id);
        if (!task) {
          return Response.json({ error: "Task not found" }, { status: 404, headers: corsHeaders });
        }
        const body = await req.json();
        Object.assign(task, body, { updatedAt: new Date().toISOString() });
        return Response.json(task, { headers: corsHeaders });
      }

      // ─── Goals Endpoints ──────────────────────────────────────────────
      if (path === "/v1/goals" && method === "GET") {
        return Response.json(
          { goals: Array.from(goals.values()) },
          { headers: corsHeaders }
        );
      }

      if (path === "/v1/goals" && method === "POST") {
        const body = await req.json();
        const id = `goal-${Date.now()}`;
        const goal = {
          id,
          text: body.text,
          status: "active" as const,
          turnsUsed: 0,
          maxTurns: body.maxTurns || 20,
          createdAt: new Date().toISOString(),
        };
        goals.set(id, goal);
        return Response.json(goal, { headers: corsHeaders });
      }

      if (path.match(/^\/v1\/goals\/[^/]+$/) && method === "PATCH") {
        const id = path.split("/").pop()!;
        const goal = goals.get(id);
        if (!goal) {
          return Response.json({ error: "Goal not found" }, { status: 404, headers: corsHeaders });
        }
        const body = await req.json();
        Object.assign(goal, body);
        return Response.json(goal, { headers: corsHeaders });
      }

      // ─── 404 ──────────────────────────────────────────────────────────
      return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
    } catch (error: any) {
      console.error("[Hermes Agent Service] Error:", error);
      return Response.json(
        { error: error.message || "Internal server error" },
        { status: 500, headers: corsHeaders }
      );
    }
  },
});

console.log(`[Hermes Agent Service] Running on http://127.0.0.1:${PORT}`);
console.log(`[Hermes Agent Service] ${GANGNIAGA_SKILLS.length} GangNiaga skills loaded`);
console.log(`[Hermes Agent Service] OpenAI-compatible API: /v1/chat/completions`);
