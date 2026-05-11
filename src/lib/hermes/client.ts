/**
 * Hermes Agent API Client
 * Communicates with Hermes Agent API Server (OpenAI-compatible)
 * @see https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server
 */

import {
  HermesConfig,
  HERMES_DEFAULT_CONFIG,
  HermesChatRequest,
  HermesChatResponse,
  HermesResponsesRequest,
  HermesResponsesResponse,
  HermesConnectionStatus,
  HermesSkill,
  HermesCronJob,
  HermesCronRequest,
  HermesDelegationRequest,
  HermesBatchDelegationRequest,
  HermesDelegationResult,
  HermesKanbanTask,
  HermesGoal,
  GoalStatus,
  HermesTool,
  HermesToolset,
  HermesMemoryRequest,
  HermesMemoryStats,
  MemoryTarget,
} from "./types";

export class HermesClient {
  private config: HermesConfig;
  private baseUrl: string;

  constructor(config: Partial<HermesConfig> = {}) {
    this.config = { ...HERMES_DEFAULT_CONFIG, ...config };
    this.baseUrl = this.config.apiServerUrl.replace(/\/$/, "");
  }

  // ─── Connection & Health ───────────────────────────────────────────────

  async checkConnection(): Promise<HermesConnectionStatus> {
    const startTime = Date.now();
    try {
      const res = await this.fetch("/v1/models", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        return {
          connected: true,
          version: data.version || "unknown",
          activeSessions: data.active_sessions || 0,
          toolsAvailable: data.tools_available || 0,
          memoryProvider: this.config.memoryProvider,
          terminalBackend: this.config.terminalBackend,
          lastChecked: new Date().toISOString(),
        };
      }
      return {
        connected: false,
        lastChecked: new Date().toISOString(),
      };
    } catch {
      return {
        connected: false,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  // ─── Chat Completions API ──────────────────────────────────────────────

  async chatCompletion(request: HermesChatRequest): Promise<HermesChatResponse> {
    const res = await this.fetch("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        stream: false,
        ...request,
      }),
    });
    return this.handleResponse(res);
  }

  async chatCompletionStream(
    request: HermesChatRequest,
    onChunk: (chunk: string) => void,
    onToolProgress?: (event: { tool: string; args: string }) => void
  ): Promise<string> {
    const res = await this.fetch("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        stream: true,
        ...request,
      }),
      headers: { Accept: "text/event-stream" },
    });

    if (!res.ok) {
      throw new Error(`Hermes API error: ${res.status} ${res.statusText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data);

          // Handle tool progress events
          if (parsed.event === "hermes.tool.progress" && onToolProgress) {
            onToolProgress(parsed.data || parsed);
            continue;
          }

          // Handle standard chat completion chunks
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            fullContent += delta.content;
            onChunk(delta.content);
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    return fullContent;
  }

  // ─── Responses API (Stateful) ──────────────────────────────────────────

  async createResponse(request: HermesResponsesRequest): Promise<HermesResponsesResponse> {
    const res = await this.fetch("/v1/responses", {
      method: "POST",
      body: JSON.stringify({
        model: request.model || this.config.defaultModel,
        store: true,
        ...request,
      }),
    });
    return this.handleResponse(res);
  }

  // ─── Skills Management ─────────────────────────────────────────────────

  async listSkills(): Promise<HermesSkill[]> {
    try {
      const res = await this.chatCompletion({
        messages: [
          {
            role: "user",
            content: "List all available skills with their names, descriptions, and categories.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "skills_list",
              description: "List all available skills",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "skills_list" } },
      });

      const toolCall = res.choices[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const result = JSON.parse(toolCall.function.arguments);
        return result.skills || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  // ─── Memory Management ─────────────────────────────────────────────────

  async getMemoryStats(): Promise<HermesMemoryStats> {
    try {
      const res = await this.chatCompletion({
        messages: [
          {
            role: "user",
            content: "Show me the current memory usage statistics.",
          },
        ],
      });

      // Parse memory stats from response
      const content = res.choices[0]?.message?.content || "";
      const memoryMatch = content.match(/memory[:\s]+(\d+)\/(\d+)/i);
      const userMatch = content.match(/user[:\s]+(\d+)\/(\d+)/i);

      return {
        memoryUsed: memoryMatch ? parseInt(memoryMatch[1]) : 0,
        memoryTotal: memoryMatch ? parseInt(memoryMatch[2]) : 2200,
        userUsed: userMatch ? parseInt(userMatch[1]) : 0,
        userTotal: userMatch ? parseInt(userMatch[2]) : 1375,
      };
    } catch {
      return { memoryUsed: 0, memoryTotal: 2200, userUsed: 0, userTotal: 1375 };
    }
  }

  async updateMemory(request: HermesMemoryRequest): Promise<void> {
    await this.chatCompletion({
      messages: [
        {
          role: "user",
          content: `Use the memory tool to ${request.action} a ${request.target} entry${
            request.content ? `: ${request.content}` : ""
          }${request.old_text ? ` (replacing: ${request.old_text})` : ""}`,
        },
      ],
    });
  }

  // ─── Cron / Scheduled Tasks ────────────────────────────────────────────

  async manageCron(request: HermesCronRequest): Promise<HermesCronJob | HermesCronJob[]> {
    const res = await this.chatCompletion({
      messages: [
        {
          role: "user",
          content: `Use the cronjob tool with action "${request.action}"${
            request.schedule ? `, schedule "${request.schedule}"` : ""
          }${request.prompt ? `, prompt "${request.prompt}"` : ""}${
            request.name ? `, name "${request.name}"` : ""
          }${request.job_id ? `, job_id "${request.job_id}"` : ""}${
            request.skill ? `, skill "${request.skill}"` : ""
          }.`,
        },
      ],
    });

    try {
      const content = res.choices[0]?.message?.content || "";
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  // ─── Delegation / Subagents ────────────────────────────────────────────

  async delegateTask(request: HermesDelegationRequest): Promise<HermesDelegationResult> {
    const res = await this.chatCompletion({
      messages: [
        {
          role: "user",
          content: `Delegate the following task: ${request.goal}${
            request.context ? `\n\nContext: ${request.context}` : ""
          }`,
        },
      ],
    });

    const content = res.choices[0]?.message?.content || "";
    return {
      goal: request.goal,
      summary: content,
      filesModified: [],
      issues: [],
      success: true,
      duration: 0,
    };
  }

  async delegateBatch(request: HermesBatchDelegationRequest): Promise<HermesDelegationResult[]> {
    const tasksDesc = request.tasks
      .map((t, i) => `${i + 1}. ${t.goal}${t.context ? ` (Context: ${t.context})` : ""}`)
      .join("\n");

    const res = await this.chatCompletion({
      messages: [
        {
          role: "user",
          content: `Delegate these tasks in parallel:\n${tasksDesc}`,
        },
      ],
    });

    const content = res.choices[0]?.message?.content || "";
    return request.tasks.map((t) => ({
      goal: t.goal,
      summary: content,
      filesModified: [],
      issues: [],
      success: true,
      duration: 0,
    }));
  }

  // ─── Kanban Multi-Agent Board ──────────────────────────────────────────

  async listKanbanTasks(): Promise<HermesKanbanTask[]> {
    try {
      const res = await this.chatCompletion({
        messages: [
          {
            role: "user",
            content: "Show all kanban tasks.",
          },
        ],
      });

      const content = res.choices[0]?.message?.content || "";
      try {
        return JSON.parse(content);
      } catch {
        return [];
      }
    } catch {
      return [];
    }
  }

  // ─── Persistent Goals ──────────────────────────────────────────────────

  async setGoal(text: string, maxTurns: number = 20): Promise<HermesGoal> {
    return {
      id: `goal-${Date.now()}`,
      text,
      status: "active" as GoalStatus,
      turnsUsed: 0,
      maxTurns,
      createdAt: new Date().toISOString(),
    };
  }

  // ─── Tools & Toolsets ──────────────────────────────────────────────────

  async listTools(): Promise<HermesTool[]> {
    try {
      const res = await this.chatCompletion({
        messages: [
          { role: "user", content: "List all available tools with their names, descriptions, and toolsets." },
        ],
      });

      const content = res.choices[0]?.message?.content || "";
      try {
        return JSON.parse(content);
      } catch {
        return [];
      }
    } catch {
      return [];
    }
  }

  async listToolsets(): Promise<HermesToolset[]> {
    try {
      const res = await this.chatCompletion({
        messages: [
          { role: "user", content: "List all available toolsets with their tools and descriptions." },
        ],
      });

      const content = res.choices[0]?.message?.content || "";
      try {
        return JSON.parse(content);
      } catch {
        return [];
      }
    } catch {
      return [];
    }
  }

  // ─── Simple Chat (Convenience) ─────────────────────────────────────────

  async chat(message: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: message });

    const res = await this.chatCompletion({ messages });
    return res.choices[0]?.message?.content || "";
  }

  // ─── GangNiaga-Specific Methods ────────────────────────────────────────

  /** Analyze a business plan using Hermes Agent */
  async analyzeBusinessPlan(planContent: string): Promise<string> {
    return this.chat(
      `Analyze this business plan and provide: 1) Executive summary assessment 2) Market viability score 3) Financial projection risks 4) Competitive positioning 5) Recommended improvements\n\n${planContent}`,
      "You are a CFO-grade business plan analyst. Be thorough, data-driven, and constructive."
    );
  }

  /** Validate a business idea using Hermes with research tools */
  async validateIdea(idea: string, industry: string, market: string): Promise<string> {
    return this.chat(
      `Validate this business idea:\n- Idea: ${idea}\n- Industry: ${industry}\n- Target Market: ${market}\n\nProvide: 1) Market size estimation 2) Competitor landscape 3) Risk assessment 4) MVP recommendation 5) Go-to-market strategy`,
      "You are a startup validation expert with access to web research tools. Use real data when possible."
    );
  }

  /** Run financial forecasting with scenario analysis */
  async runFinancialForecast(params: {
    revenue: number;
    growthRate: number;
    expenses: number;
    months: number;
    scenarios: string[];
  }): Promise<string> {
    return this.chat(
      `Run a financial forecast with these parameters:\n- Monthly Revenue: $${params.revenue}\n- Growth Rate: ${params.growthRate}%\n- Monthly Expenses: $${params.expenses}\n- Forecast Period: ${params.months} months\n- Scenarios: ${params.scenarios.join(", ")}\n\nProvide detailed P&L, Cash Flow, and Balance Sheet projections for each scenario.`,
      "You are a CFO AI agent specializing in financial modeling. Provide accurate, interconnected financial statements."
    );
  }

  /** Review plan with lender persona */
  async reviewPlanWithLenderPersona(planContent: string, lenderType: string): Promise<string> {
    return this.chat(
      `Review this business plan from the perspective of a ${lenderType} lender:\n\n${planContent}\n\nProvide: 1) Credit risk assessment 2) Collateral adequacy 3) Cash flow sufficiency 4) Management capability assessment 5) Deal structure recommendations 6) Conditions and covenants`,
      `You are a senior ${lenderType} loan officer with 20+ years of experience. Be rigorous and specific about lending criteria.`
    );
  }

  /** Research with citations */
  async researchWithCitations(query: string, depth: "quick" | "standard" | "deep" = "standard"): Promise<string> {
    const depthInstructions = {
      quick: "Provide a brief overview with 3-5 key sources.",
      standard: "Provide a comprehensive analysis with 8-12 verified sources and citations.",
      deep: "Provide an exhaustive research report with 15+ verified sources, counter-arguments, and data tables.",
    };

    return this.chat(
      `Research: ${query}\n\n${depthInstructions[depth]}\n\nFor each source, provide: Title, URL, publication date, key findings, and relevance score.`,
      "You are a bank-grade research analyst. Every claim must be backed by a verifiable source. Use web search tools to find current data."
    );
  }

  /** Schedule a daily business briefing via Hermes cron */
  async scheduleDailyBriefing(schedule: string, platform: string = "telegram"): Promise<string> {
    return this.chat(
      `Create a cron job that runs "${schedule}" to generate a daily business briefing including:\n1. Key financial metrics\n2. Cash flow status\n3. Variance alerts\n4. Market updates\n5. Action items\n\nDeliver to ${platform}.`,
      "You are setting up an automated business intelligence briefing system."
    );
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────

  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
      ...(options.headers as Record<string, string> || {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      return await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async handleResponse(res: Response): Promise<any> {
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "Unknown error");
      throw new Error(`Hermes API error (${res.status}): ${errorBody}`);
    }
    return res.json();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let hermesClientInstance: HermesClient | null = null;

export function getHermesClient(config?: Partial<HermesConfig>): HermesClient {
  if (!hermesClientInstance || config) {
    hermesClientInstance = new HermesClient(config);
  }
  return hermesClientInstance;
}

export function resetHermesClient(): void {
  hermesClientInstance = null;
}
