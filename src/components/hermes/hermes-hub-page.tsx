"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Brain, Clock, Layers, Target, Zap, Cpu, RefreshCw,
  Play, Pause, Plus, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, Activity, MemoryStick, Sparkles, Send,
  Settings2, BarChart3, Search, FileText, Presentation,
  TrendingUp, MessageSquare, Users, ArrowRight, Circle,
  Loader2, ExternalLink, Trash2, Edit3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HermesSkill {
  name: string;
  description: string;
  version: string;
  category: string;
  tags?: string[];
  icon?: string;
}

interface HermesCronJob {
  id: string;
  name: string;
  schedule: string;
  prompt: string;
  skill?: string;
  enabled: boolean;
  nextRun?: string;
  createdAt: string;
}

interface HermesKanbanTask {
  id: string;
  title: string;
  body?: string;
  assignee?: string;
  status: string;
  comments: Array<{ author: string; content: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  skill?: string;
}

interface HermesGoal {
  id: string;
  text: string;
  status: string;
  turnsUsed: number;
  maxTurns: number;
  createdAt: string;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function HermesHubPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [skills, setSkills] = useState<HermesSkill[]>([]);
  const [cronJobs, setCronJobs] = useState<HermesCronJob[]>([]);
  const [kanbanTasks, setKanbanTasks] = useState<HermesKanbanTask[]>([]);
  const [goals, setGoals] = useState<HermesGoal[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    fallbackMode?: boolean;
    serviceUrl?: string;
  }>({ connected: false });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeSkill, setActiveSkill] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [memoryEntries, setMemoryEntries] = useState<Array<{ id: string; key: string; content: string; type: string }>>([]);

  // ─── Data Fetching ────────────────────────────────────────────────────

  const fetchConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/hermes/connection");
      const data = await res.json();
      setConnectionStatus(data);
    } catch {
      setConnectionStatus({ connected: false, fallbackMode: true });
    }
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/hermes/skills");
      const data = await res.json();
      setSkills(data.skills || []);
    } catch {
      setSkills([]);
    }
  }, []);

  const fetchCron = useCallback(async () => {
    try {
      const res = await fetch("/api/hermes/cron");
      const data = await res.json();
      setCronJobs(data.jobs || []);
    } catch {
      setCronJobs([]);
    }
  }, []);

  const fetchKanban = useCallback(async () => {
    try {
      const res = await fetch("/api/hermes/kanban");
      const data = await res.json();
      setKanbanTasks(data.tasks || []);
    } catch {
      setKanbanTasks([]);
    }
  }, []);

  const fetchMemory = useCallback(async () => {
    try {
      const res = await fetch("/api/hermes/memory");
      const data = await res.json();
      setMemoryEntries(data.entries || []);
    } catch {
      setMemoryEntries([]);
    }
  }, []);

  useEffect(() => {
    fetchConnection();
    fetchSkills();
    fetchCron();
    fetchKanban();
    fetchMemory();
  }, [fetchConnection, fetchSkills, fetchCron, fetchKanban, fetchMemory]);

  // ─── Chat Handler ─────────────────────────────────────────────────────

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: chatInput,
      timestamp: new Date().toISOString(),
      skill: activeSkill || undefined,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/hermes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          skill: activeSkill || undefined,
        }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.response || data.error || "No response",
        timestamp: new Date().toISOString(),
        skill: activeSkill || undefined,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Failed to get response from Hermes Agent.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Skill Execution Handler ──────────────────────────────────────────

  const executeSkill = async (skillName: string, prompt: string) => {
    setIsLoading(true);
    setActiveSkill(skillName);

    const userMsg: ChatMessage = {
      role: "user",
      content: prompt,
      timestamp: new Date().toISOString(),
      skill: skillName,
    };

    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/hermes/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName, prompt }),
      });

      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response || data.error || "No response",
          timestamp: new Date().toISOString(),
          skill: skillName,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error executing skill.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
      setActiveSkill("");
    }
  };

  // ─── Goal Handler ─────────────────────────────────────────────────────

  const createGoal = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/hermes/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, maxTurns: 20 }),
      });
      const data = await res.json();
      if (data.goal) {
        setGoals((prev) => [...prev, data.goal]);
        if (data.goal.result) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🎯 Goal "${text}"\n\n${data.goal.result}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }
    } catch {
      // Silent error
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Category Colors ──────────────────────────────────────────────────

  const categoryColors: Record<string, string> = {
    financial: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    validation: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    review: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    research: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    automation: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    presentation: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    integration: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };

  const statusColors: Record<string, string> = {
    triage: "bg-gray-500/10 text-gray-500",
    todo: "bg-blue-500/10 text-blue-500",
    ready: "bg-amber-500/10 text-amber-500",
    running: "bg-emerald-500/10 text-emerald-500",
    blocked: "bg-red-500/10 text-red-500",
    done: "bg-green-500/10 text-green-500",
    archived: "bg-gray-500/10 text-gray-400",
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="h-8 w-8 text-primary" />
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">Hermes Agent Hub</h1>
            <p className="text-sm text-muted-foreground">
              Self-improving AI agent by Nous Research — integrated with GangNiaga AI OS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={connectionStatus.connected ? "default" : "secondary"}
            className={connectionStatus.connected ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}
          >
            <Circle className="h-2 w-2 mr-1 fill-current" />
            {connectionStatus.connected ? "Connected" : "SDK Fallback"}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchConnection}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <div className="px-6 pt-2">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview" className="text-xs">
              <Activity className="h-3 w-3 mr-1" /> Overview
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" /> Chat
            </TabsTrigger>
            <TabsTrigger value="skills" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" /> Skills
            </TabsTrigger>
            <TabsTrigger value="memory" className="text-xs">
              <Brain className="h-3 w-3 mr-1" /> Memory
            </TabsTrigger>
            <TabsTrigger value="cron" className="text-xs">
              <Clock className="h-3 w-3 mr-1" /> Cron
            </TabsTrigger>
            <TabsTrigger value="kanban" className="text-xs">
              <Layers className="h-3 w-3 mr-1" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs">
              <Target className="h-3 w-3 mr-1" /> Goals
            </TabsTrigger>
            <TabsTrigger value="delegation" className="text-xs">
              <Users className="h-3 w-3 mr-1" /> Delegate
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* ─── Overview Tab ─────────────────────────────────────────── */}
          <TabsContent value="overview" className="h-full m-0 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    icon: Sparkles,
                    label: "Skills",
                    value: skills.length,
                    desc: "On-demand knowledge",
                    color: "text-amber-500",
                    bg: "bg-amber-500/10",
                  },
                  {
                    icon: Clock,
                    label: "Cron Jobs",
                    value: cronJobs.filter((j) => j.enabled).length,
                    desc: "Scheduled tasks",
                    color: "text-emerald-500",
                    bg: "bg-emerald-500/10",
                  },
                  {
                    icon: Layers,
                    label: "Kanban Tasks",
                    value: kanbanTasks.length,
                    desc: "Multi-agent coordination",
                    color: "text-blue-500",
                    bg: "bg-blue-500/10",
                  },
                  {
                    icon: Brain,
                    label: "Memory Entries",
                    value: memoryEntries.length,
                    desc: "Persistent context",
                    color: "text-purple-500",
                    bg: "bg-purple-500/10",
                  },
                ].map((stat) => (
                  <Card key={stat.label} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${stat.bg}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.desc}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-medium">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Hermes Features Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hermes Agent — All Features Integrated</CardTitle>
                  <CardDescription>
                    15 key capabilities from the Hermes Agent ecosystem available in GangNiaga AI OS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { icon: Bot, name: "API Server", desc: "OpenAI-compatible endpoint for any frontend" },
                      { icon: Sparkles, name: "Skills System", desc: "On-demand knowledge, agentskills.io compatible" },
                      { icon: Brain, name: "Persistent Memory", desc: "MEMORY.md + USER.md cross-session recall" },
                      { icon: Users, name: "Subagent Delegation", desc: "Parallel subagents with isolated context" },
                      { icon: Layers, name: "Kanban Board", desc: "Durable multi-agent task coordination" },
                      { icon: Clock, name: "Cron Jobs", desc: "Natural language scheduled automation" },
                      { icon: Target, name: "Persistent Goals", desc: "Standing objectives that survive turns" },
                      { icon: Cpu, name: "70+ Tools", desc: "Web, terminal, file, browser, vision, more" },
                      { icon: Settings2, name: "MCP Integration", desc: "Connect any MCP server for tools" },
                      { icon: Search, name: "Browser Automation", desc: "Full web browsing and extraction" },
                      { icon: BarChart3, name: "Provider Routing", desc: "Cost/speed/quality optimization" },
                      { icon: Zap, name: "Honcho Memory", desc: "Dialectic user modeling & personalization" },
                      { icon: MessageSquare, name: "Messaging Gateway", desc: "21+ platforms: Telegram, Discord, Slack..." },
                      { icon: FileText, name: "Context Files", desc: ".hermes.md, AGENTS.md, SOUL.md auto-load" },
                      { icon: TrendingUp, name: "Batch Processing", desc: "Scale research across many prompts" },
                    ].map((feature) => (
                      <div
                        key={feature.name}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <feature.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{feature.name}</p>
                          <p className="text-xs text-muted-foreground">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      {
                        label: "Validate Business Idea",
                        skill: "idea-validation-engine",
                        prompt: "I want to validate a business idea. Help me assess market viability, competition, and feasibility.",
                        icon: Zap,
                        color: "text-amber-500",
                      },
                      {
                        label: "Analyze Financial Plan",
                        skill: "financial-forecaster",
                        prompt: "Help me create interconnected financial projections with scenario analysis for my business.",
                        icon: TrendingUp,
                        color: "text-emerald-500",
                      },
                      {
                        label: "Research with Citations",
                        skill: "market-researcher",
                        prompt: "Conduct bank-grade market research with verified sources and citations for my industry.",
                        icon: Search,
                        color: "text-purple-500",
                      },
                      {
                        label: "Review for Lender",
                        skill: "lender-persona-review",
                        prompt: "Review my business plan from a commercial bank lender's perspective.",
                        icon: FileText,
                        color: "text-blue-500",
                      },
                      {
                        label: "Create Pitch Deck",
                        skill: "pitch-deck-orchestrator",
                        prompt: "Help me create a dynamic pitch deck that auto-syncs with my financial data.",
                        icon: Presentation,
                        color: "text-cyan-500",
                      },
                      {
                        label: "Schedule Daily Briefing",
                        skill: "daily-business-briefing",
                        prompt: "Set up an automated daily business intelligence briefing with KPIs and alerts.",
                        icon: Clock,
                        color: "text-rose-500",
                      },
                    ].map((action) => (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="h-auto py-3 justify-start text-left"
                        onClick={() => executeSkill(action.skill, action.prompt)}
                        disabled={isLoading}
                      >
                        <action.icon className={`h-4 w-4 mr-2 shrink-0 ${action.color}`} />
                        <span className="text-sm">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Kanban Preview */}
              {kanbanTasks.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Active Kanban Tasks</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("kanban")}>
                      View All <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {kanbanTasks.slice(0, 4).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <Badge variant="outline" className={`text-[10px] ${statusColors[task.status] || ""}`}>
                            {task.status}
                          </Badge>
                          <span className="text-sm flex-1 truncate">{task.title}</span>
                          {task.assignee && (
                            <span className="text-xs text-muted-foreground">{task.assignee}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ─── Chat Tab ──────────────────────────────────────────────── */}
          <TabsContent value="chat" className="h-full m-0 flex flex-col">
            <div className="flex-1 min-h-0 p-4 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <Bot className="h-16 w-16 text-primary/30" />
                  <div>
                    <h3 className="text-lg font-semibold">Hermes Agent Chat</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-1">
                      Talk to Hermes Agent with full access to 70+ tools, skills, memory, and delegation.
                      Select a skill to enhance the conversation with specialized knowledge.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.slice(0, 4).map((s) => (
                      <Button
                        key={s.name}
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveSkill(s.name === activeSkill ? "" : s.name)}
                        className={s.name === activeSkill ? "border-primary bg-primary/5" : ""}
                      >
                        {s.icon} <span className="ml-1">{s.name.split("-").slice(0, 2).join(" ")}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.skill && (
                          <Badge variant="outline" className="mb-2 text-[10px]">
                            {msg.skill}
                          </Badge>
                        )}
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        <p className="text-[10px] opacity-50 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="border-t p-4">
              {activeSkill && (
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {activeSkill}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={() => setActiveSkill("")}>
                    Clear
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Message Hermes Agent..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChat()}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={handleChat} disabled={isLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ─── Skills Tab ────────────────────────────────────────────── */}
          <TabsContent value="skills" className="h-full m-0 overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">GangNiaga Skills</h2>
                  <p className="text-sm text-muted-foreground">
                    On-demand knowledge documents compatible with agentskills.io open standard
                  </p>
                </div>
                <Badge variant="outline">{skills.length} Skills</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skills.map((skill) => (
                  <Card key={skill.name} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{skill.icon}</span>
                          <CardTitle className="text-sm">{skill.name}</CardTitle>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${categoryColors[skill.category] || ""}`}>
                          {skill.category}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">{skill.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          v{skill.version}
                        </Badge>
                        {skill.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-3">
                        <SkillExecuteDialog
                          skill={skill}
                          onExecute={(prompt) => executeSkill(skill.name, prompt)}
                          isLoading={isLoading}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ─── Memory Tab ────────────────────────────────────────────── */}
          <TabsContent value="memory" className="h-full m-0 overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Hermes Memory System</h2>
                  <p className="text-sm text-muted-foreground">
                    Persistent memory that grows across sessions — MEMORY.md (agent) + USER.md (preferences)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      Agent Memory (MEMORY.md)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Environment facts, conventions, lessons learned
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {memoryEntries
                        .filter((e) => e.type === "memory")
                        .map((entry) => (
                          <div key={entry.id} className="p-2 rounded bg-muted/50 text-xs">
                            {entry.content}
                          </div>
                        ))}
                      {memoryEntries.filter((e) => e.type === "memory").length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No agent memories yet. Memories are created as you interact with Hermes.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MemoryStick className="h-4 w-4 text-emerald-500" />
                      User Profile (USER.md)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Preferences, communication style, expectations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {memoryEntries
                        .filter((e) => e.type === "user")
                        .map((entry) => (
                          <div key={entry.id} className="p-2 rounded bg-muted/50 text-xs">
                            {entry.content}
                          </div>
                        ))}
                      {memoryEntries.filter((e) => e.type === "user").length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No user profile entries yet. Hermes learns about you over time.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <MemoryAddForm onAdd={fetchMemory} />
            </div>
          </TabsContent>

          {/* ─── Cron Tab ──────────────────────────────────────────────── */}
          <TabsContent value="cron" className="h-full m-0 overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Scheduled Tasks (Cron)</h2>
                  <p className="text-sm text-muted-foreground">
                    Natural language scheduling with skill attachment and multi-platform delivery
                  </p>
                </div>
                <CronCreateDialog onCreate={fetchCron} />
              </div>

              <div className="space-y-3">
                {cronJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className={`h-4 w-4 ${job.enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
                          <div>
                            <p className="text-sm font-medium">{job.name}</p>
                            <p className="text-xs text-muted-foreground">{job.schedule}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {job.skill && (
                            <Badge variant="outline" className="text-[10px]">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {job.skill}
                            </Badge>
                          )}
                          <Badge variant={job.enabled ? "default" : "secondary"} className="text-[10px]">
                            {job.enabled ? "Active" : "Paused"}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{job.prompt}</p>
                    </CardContent>
                  </Card>
                ))}
                {cronJobs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No cron jobs yet</p>
                    <p className="text-xs">Create one to automate recurring business tasks</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─── Kanban Tab ────────────────────────────────────────────── */}
          <TabsContent value="kanban" className="h-full m-0 overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Kanban — Multi-Agent Board</h2>
                  <p className="text-sm text-muted-foreground">
                    Durable task coordination across named Hermes profiles with persistent memory
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {["triage", "todo", "ready", "running", "done"].map((status) => {
                  const tasksInStatus = kanbanTasks.filter((t) => t.status === status);
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[status]}`}>
                          {status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{tasksInStatus.length}</span>
                      </div>
                      {tasksInStatus.map((task) => (
                        <Card key={task.id} className="hover:shadow-sm transition-shadow cursor-pointer">
                          <CardContent className="p-3">
                            <p className="text-sm font-medium leading-tight">{task.title}</p>
                            {task.body && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.body}</p>
                            )}
                            {task.assignee && (
                              <div className="flex items-center gap-1 mt-2">
                                <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                                  <span className="text-[8px] font-bold text-primary">
                                    {task.assignee.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                              </div>
                            )}
                            {task.comments.length > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                                <MessageSquare className="h-3 w-3" />
                                {task.comments.length}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ─── Goals Tab ─────────────────────────────────────────────── */}
          <TabsContent value="goals" className="h-full m-0 overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Persistent Goals</h2>
                  <p className="text-sm text-muted-foreground">
                    Standing objectives that survive across turns — Hermes keeps working until achieved
                  </p>
                </div>
              </div>

              <GoalCreateForm onCreate={createGoal} isLoading={isLoading} />

              <div className="space-y-3">
                {goals.map((goal) => (
                  <Card key={goal.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target
                            className={`h-4 w-4 ${
                              goal.status === "completed"
                                ? "text-emerald-500"
                                : goal.status === "active"
                                  ? "text-blue-500"
                                  : "text-amber-500"
                            }`}
                          />
                          <p className="text-sm font-medium">{goal.text}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            goal.status === "completed"
                              ? "text-emerald-500"
                              : goal.status === "active"
                                ? "text-blue-500"
                                : "text-amber-500"
                          }`}
                        >
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <Progress value={(goal.turnsUsed / goal.maxTurns) * 100} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {goal.turnsUsed}/{goal.maxTurns} turns used
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {goals.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No active goals</p>
                    <p className="text-xs">Set a persistent goal and Hermes will work until it&apos;s done</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─── Delegation Tab ────────────────────────────────────────── */}
          <TabsContent value="delegation" className="h-full m-0 overflow-y-auto">
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Subagent Delegation</h2>
                <p className="text-sm text-muted-foreground">
                  Spawn isolated child agents for parallel workstreams — up to 3 concurrent by default
                </p>
              </div>

              <DelegationPanel onDelegate={(results) => {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `Delegation Results:\n\n${results
                      .map(
                        (r: { goal: string; summary: string; success: boolean }, i: number) =>
                          `${i + 1}. **${r.goal}**\n   Status: ${r.success ? "✅ Success" : "❌ Failed"}\n   ${r.summary}`
                      )
                      .join("\n\n")}`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
                setActiveTab("chat");
              }} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function SkillExecuteDialog({
  skill,
  onExecute,
  isLoading,
}: {
  skill: HermesSkill;
  onExecute: (prompt: string) => void;
  isLoading: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Play className="h-3 w-3 mr-1" />
          Execute Skill
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {skill.icon} {skill.name}
          </DialogTitle>
          <DialogDescription>{skill.description}</DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Enter your prompt for this skill..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onExecute(prompt);
              setOpen(false);
            }}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CronCreateDialog({ onCreate }: { onCreate: () => void }) {
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("");
  const [prompt, setPrompt] = useState("");
  const [skill, setSkill] = useState("");
  const [open, setOpen] = useState(false);

  const handleCreate = async () => {
    try {
      await fetch("/api/hermes/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, schedule, prompt, skill }),
      });
      setOpen(false);
      setName("");
      setSchedule("");
      setPrompt("");
      setSkill("");
      onCreate();
    } catch {
      // Silent error
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3 w-3 mr-1" />
          New Cron Job
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Scheduled Task</DialogTitle>
          <DialogDescription>
            Schedule automated business tasks with natural language or cron expressions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Job name (e.g., Daily Briefing)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder='Schedule (e.g., "every 2h" or "0 9 * * *")'
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          />
          <Textarea placeholder="Prompt for the scheduled task..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
          <Select value={skill} onValueChange={setSkill}>
            <SelectTrigger>
              <SelectValue placeholder="Attach skill (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily-business-briefing">Daily Business Briefing</SelectItem>
              <SelectItem value="financial-forecaster">Financial Forecaster</SelectItem>
              <SelectItem value="market-researcher">Market Researcher</SelectItem>
              <SelectItem value="quickbooks-xero-sync">QuickBooks/Xero Sync</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name || !schedule || !prompt}>
            <Clock className="h-4 w-4 mr-1" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemoryAddForm({ onAdd }: { onAdd: () => void }) {
  const [content, setContent] = useState("");
  const [target, setTarget] = useState<"memory" | "user">("memory");

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await fetch("/api/hermes/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", target, content }),
      });
      setContent("");
      onAdd();
    } catch {
      // Silent error
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Add Memory Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Select value={target} onValueChange={(v) => setTarget(v as "memory" | "user")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="memory">Memory</SelectItem>
              <SelectItem value="user">User Profile</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Enter memory content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={!content.trim()} size="sm">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalCreateForm({
  onCreate,
  isLoading,
}: {
  onCreate: (text: string) => void;
  isLoading: boolean;
}) {
  const [text, setText] = useState("");

  const handleCreate = () => {
    if (!text.trim()) return;
    onCreate(text);
    setText("");
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-2">
          <Input
            placeholder='Set a persistent goal (e.g., "Fix every failing test in the financial model")'
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={isLoading || !text.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Target className="h-4 w-4 mr-1" />}
            Set Goal
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Hermes will keep working across turns until the goal is achieved or the turn budget (20) runs out.
        </p>
      </CardContent>
    </Card>
  );
}

function DelegationPanel({
  onDelegate,
}: {
  onDelegate: (results: Array<{ goal: string; summary: string; success: boolean }>) => void;
}) {
  const [tasks, setTasks] = useState<Array<{ goal: string; context: string }>>([
    { goal: "", context: "" },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addTask = () => setTasks([...tasks, { goal: "", context: "" }]);

  const removeTask = (index: number) => {
    if (tasks.length <= 1) return;
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: "goal" | "context", value: string) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const handleDelegate = async () => {
    const validTasks = tasks.filter((t) => t.goal.trim());
    if (validTasks.length === 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/hermes/delegation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: validTasks }),
      });
      const data = await res.json();
      onDelegate(data.results || []);
    } catch {
      onDelegate(validTasks.map((t) => ({ goal: t.goal, summary: "Delegation failed", success: false })));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px]">
                Subagent {i + 1}
              </Badge>
              {tasks.length > 1 && (
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeTask(i)}>
                  <XCircle className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
            <Input
              placeholder="Goal for this subagent..."
              value={task.goal}
              onChange={(e) => updateTask(i, "goal", e.target.value)}
              className="mb-2"
            />
            <Input
              placeholder="Context (optional — subagents start with zero knowledge)"
              value={task.context}
              onChange={(e) => updateTask(i, "context", e.target.value)}
            />
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" onClick={addTask} disabled={tasks.length >= 5}>
          <Plus className="h-3 w-3 mr-1" />
          Add Subagent
        </Button>
        <Button onClick={handleDelegate} disabled={isLoading || !tasks.some((t) => t.goal.trim())}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Users className="h-4 w-4 mr-1" />
          )}
          Delegate Tasks
        </Button>
      </div>

      <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <p className="font-medium mb-1">⚡ Delegation Notes:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Subagents start with completely fresh context — pass everything they need</li>
          <li>Up to 3 concurrent subagents by default (configurable)</li>
          <li>Each subagent has isolated tools and terminal session</li>
          <li>Only the final summary enters the parent&apos;s context</li>
        </ul>
      </div>
    </div>
  );
}
