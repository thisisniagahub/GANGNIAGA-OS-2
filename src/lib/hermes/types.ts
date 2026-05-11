/**
 * Hermes Agent Integration Types
 * Based on Hermes Agent API Server (OpenAI-compatible) + Tool Gateway
 * @see https://hermes-agent.nousresearch.com/docs
 */

// ─── Core Types ─────────────────────────────────────────────────────────────

export interface HermesConfig {
  /** Hermes Agent API Server URL (default: http://127.0.0.1:8642) */
  apiServerUrl: string;
  /** API key for Hermes Agent API Server */
  apiKey: string;
  /** Default model to use (default: "hermes-agent") */
  defaultModel: string;
  /** Connection timeout in ms (default: 30000) */
  timeout: number;
  /** Enable streaming responses */
  streaming: boolean;
  /** Memory provider: "builtin" | "honcho" | "mem0" | "openviking" */
  memoryProvider: string;
  /** Terminal backend: "local" | "docker" | "ssh" | "modal" | "daytona" */
  terminalBackend: string;
}

export const HERMES_DEFAULT_CONFIG: HermesConfig = {
  apiServerUrl: process.env.HERMES_API_URL || "http://127.0.0.1:8642",
  apiKey: process.env.HERMES_API_KEY || "change-me-local-dev",
  defaultModel: "hermes-agent",
  timeout: 30000,
  streaming: true,
  memoryProvider: "builtin",
  terminalBackend: "local",
};

// ─── Chat / Completions API ─────────────────────────────────────────────────

export interface HermesMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: HermesToolCall[];
}

export interface HermesToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface HermesChatRequest {
  model?: string;
  messages: HermesMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: HermesToolDefinition[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

export interface HermesToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface HermesChatResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: HermesMessage;
    finish_reason: "stop" | "tool_calls" | "length";
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ─── Responses API (Stateful) ───────────────────────────────────────────────

export interface HermesResponsesRequest {
  model?: string;
  input: string | HermesResponseInputItem[];
  instructions?: string;
  store?: boolean;
  previous_response_id?: string;
  stream?: boolean;
}

export interface HermesResponseInputItem {
  role: "user" | "assistant";
  content: string | HermesContentPart[];
}

export interface HermesContentPart {
  type: "input_text" | "input_image";
  text?: string;
  image_url?: { url: string; detail?: "low" | "high" | "auto" };
}

export interface HermesResponsesResponse {
  id: string;
  object: "response";
  status: "completed" | "in_progress" | "failed";
  model: string;
  output: HermesResponseOutputItem[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export type HermesResponseOutputItem =
  | { type: "function_call"; name: string; arguments: string; call_id: string }
  | { type: "function_call_output"; call_id: string; output: string }
  | { type: "message"; role: "assistant"; content: Array<{ type: "output_text"; text: string }> };

// ─── Skills System ──────────────────────────────────────────────────────────

export interface HermesSkill {
  name: string;
  description: string;
  version: string;
  platforms?: string[];
  category?: string;
  tags?: string[];
  fallback_for_toolsets?: string[];
  requires_toolsets?: string[];
  /** Full SKILL.md content */
  content?: string;
  /** Skill metadata */
  metadata?: Record<string, unknown>;
}

export interface HermesSkillListResponse {
  skills: Array<{ name: string; description: string; category: string }>;
}

// ─── Memory System ──────────────────────────────────────────────────────────

export type MemoryTarget = "memory" | "user";
export type MemoryAction = "add" | "replace" | "remove";

export interface HermesMemoryEntry {
  id: string;
  target: MemoryTarget;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface HermesMemoryRequest {
  action: MemoryAction;
  target: MemoryTarget;
  content?: string;
  old_text?: string;
}

export interface HermesMemoryStats {
  memoryUsed: number;
  memoryTotal: number;
  userUsed: number;
  userTotal: number;
}

// ─── Cron / Scheduled Tasks ─────────────────────────────────────────────────

export type CronAction = "create" | "list" | "update" | "pause" | "resume" | "run" | "remove";

export interface HermesCronJob {
  id: string;
  name: string;
  schedule: string;
  prompt: string;
  skill?: string;
  skills?: string[];
  workdir?: string;
  platform?: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

export interface HermesCronRequest {
  action: CronAction;
  schedule?: string;
  prompt?: string;
  name?: string;
  skill?: string;
  skills?: string[];
  workdir?: string;
  job_id?: string;
}

// ─── Delegation / Subagents ─────────────────────────────────────────────────

export interface HermesDelegationRequest {
  goal: string;
  context?: string;
  toolsets?: string[];
}

export interface HermesBatchDelegationRequest {
  tasks: Array<{
    goal: string;
    context?: string;
    toolsets?: string[];
  }>;
}

export interface HermesDelegationResult {
  goal: string;
  summary: string;
  filesModified: string[];
  issues: string[];
  success: boolean;
  duration: number;
}

// ─── Kanban Multi-Agent Board ───────────────────────────────────────────────

export type KanbanTaskStatus = "triage" | "todo" | "ready" | "running" | "blocked" | "done" | "archived";

export interface HermesKanbanTask {
  id: string;
  title: string;
  body?: string;
  assignee?: string;
  status: KanbanTaskStatus;
  tenant?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
  comments: HermesKanbanComment[];
  links: HermesKanbanLink[];
}

export interface HermesKanbanComment {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface HermesKanbanLink {
  parent_id: string;
  child_id: string;
}

// ─── Persistent Goals ───────────────────────────────────────────────────────

export type GoalStatus = "active" | "paused" | "completed" | "failed";

export interface HermesGoal {
  id: string;
  text: string;
  status: GoalStatus;
  turnsUsed: number;
  maxTurns: number;
  createdAt: string;
  judgeReason?: string;
}

// ─── Tools / Toolsets ───────────────────────────────────────────────────────

export interface HermesTool {
  name: string;
  description: string;
  toolset: string;
  parameters: Record<string, unknown>;
  enabled: boolean;
}

export interface HermesToolset {
  name: string;
  tools: string[];
  description: string;
  enabled: boolean;
}

// ─── Provider Configuration ─────────────────────────────────────────────────

export interface HermesProvider {
  name: string;
  api_base: string;
  api_key_env: string;
  models: string[];
  priority: number;
  enabled: boolean;
}

// ─── MCP Server Configuration ───────────────────────────────────────────────

export interface HermesMCPServer {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  tools?: {
    include?: string[];
    exclude?: string[];
  };
}

// ─── Honcho Memory ──────────────────────────────────────────────────────────

export interface HonchoConfig {
  contextTokens?: number;
  contextCadence: number;
  dialecticCadence: number;
  dialecticDepth: 1 | 2 | 3;
  dialecticReasoningLevel: "minimal" | "low" | "medium" | "high" | "max";
  dialecticDynamic: boolean;
  recallMode: "hybrid" | "context" | "tools";
  writeFrequency: "async" | "turn" | "session" | number;
  sessionStrategy: "per-directory" | "per-repo" | "per-session" | "global";
}

// ─── Browser Automation ─────────────────────────────────────────────────────

export interface HermesBrowserSession {
  id: string;
  url: string;
  title: string;
  screenshot?: string;
  created_at: string;
}

// ─── Voice Mode ─────────────────────────────────────────────────────────────

export interface HermesVoiceConfig {
  enabled: boolean;
  tts_provider: "edge" | "elevenlabs" | "openai" | "minimax" | "gemini" | "custom";
  stt_provider: "openai" | "deepgram" | "custom";
  language: string;
  voice: string;
}

// ─── Context Files ──────────────────────────────────────────────────────────

export interface HermesContextFile {
  name: string;
  path: string;
  content: string;
  type: "hermes" | "agents" | "claude" | "soul" | "cursorrules";
}

// ─── GangNiaga-Specific Integration Types ───────────────────────────────────

export interface GangNiagaHermesBridge {
  /** Business plan analysis via Hermes */
  analyzePlan: (planId: string) => Promise<HermesDelegationResult>;
  /** Financial forecasting via Hermes */
  runForecast: (params: Record<string, unknown>) => Promise<HermesChatResponse>;
  /** Idea validation via Hermes skills */
  validateIdea: (ideaId: string) => Promise<HermesDelegationResult>;
  /** Plan review with lender persona */
  reviewPlan: (planId: string, persona: string) => Promise<HermesDelegationResult>;
  /** Research with citations via Hermes */
  research: (query: string) => Promise<HermesDelegationResult>;
  /** Daily business briefing via Hermes cron */
  scheduleBriefing: (schedule: string, platform: string) => Promise<HermesCronJob>;
  /** Browser automation via Hermes */
  browseAndExtract: (url: string) => Promise<HermesDelegationResult>;
  /** Multi-agent coordination via Kanban */
  coordinateAgents: (tasks: Array<{ title: string; assignee: string }>) => Promise<HermesKanbanTask[]>;
}

export interface HermesConnectionStatus {
  connected: boolean;
  version?: string;
  uptime?: number;
  activeSessions?: number;
  toolsAvailable?: number;
  memoryProvider?: string;
  terminalBackend?: string;
  lastChecked: string;
}
