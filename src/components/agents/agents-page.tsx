'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Bot,
  Brain,
  TrendingUp,
  Search,
  Zap,
  Globe,
  BarChart3,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Send,
  Loader2,
  Sparkles,
  ArrowRight,
  MessageSquare,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'

// ─── Types ──────────────────────────────────────────────────────────────────

type AgentStatus = 'active' | 'idle' | 'running'

interface AgentInfo {
  id: string
  name: string
  description: string
  fullDescription: string
  icon: React.ElementType
  color: string
  bgColor: string
  status: AgentStatus
  lastTask: string
  taskHistory: AgentTask[]
  memories: AgentMemory[]
}

interface AgentTask {
  id: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  output?: string
}

interface AgentMemory {
  id: string
  key: string
  value: string
  type: string
}

// API response types
interface ApiAgentSession {
  id: string
  userId: string
  agentType: string
  title: string | null
  status: string
  metadata: string
  createdAt: string
  updatedAt: string
  tasks: ApiAgentTask[]
}

interface ApiAgentTask {
  id: string
  sessionId: string
  type: string
  input: string
  output: string | null
  status: string
  metadata: string
  createdAt: string
  updatedAt: string
}

// ─── Agent Definitions (static metadata) ────────────────────────────────────

const AGENT_DEFINITIONS: Omit<AgentInfo, 'status' | 'lastTask' | 'taskHistory' | 'memories'>[] = [
  {
    id: 'cfo',
    name: 'CFO Agent',
    description: 'Financial strategy & cash flow analysis',
    fullDescription:
      'The CFO Agent specializes in financial strategy, cash flow management, budgeting, and financial risk assessment. It continuously monitors your financial health, forecasts revenue and expenses, and provides actionable insights to optimize your financial position. It can generate financial reports, analyze unit economics, and alert you to potential cash flow issues before they become critical.',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'ceo',
    name: 'CEO Agent',
    description: 'Executive summaries & strategic planning',
    fullDescription:
      'The CEO Agent provides high-level strategic insights, executive summaries, and business vision alignment. It synthesizes data from all other agents to give you a comprehensive view of your business health. It helps with strategic decision-making, market positioning analysis, and organizational priorities. The CEO Agent can generate board-ready summaries and identify cross-functional opportunities.',
    icon: Brain,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10',
  },
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Market intelligence & competitor analysis',
    fullDescription:
      'The Research Agent continuously monitors market trends, competitor activities, and industry developments. It provides real-time market intelligence, competitive analysis, and identifies emerging opportunities and threats. The agent can deep-dive into specific market segments, analyze competitor pricing strategies, and track industry benchmarks to keep you informed and ahead of the curve.',
    icon: Search,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    description: 'Growth strategies & acquisition optimization',
    fullDescription:
      'The Growth Agent focuses on customer acquisition, retention optimization, and scaling strategies. It analyzes your growth funnels, identifies bottlenecks, and recommends specific tactics to improve conversion rates. The agent monitors A/B test results, suggests channel optimizations, and helps prioritize growth initiatives based on ROI potential.',
    icon: Zap,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
  },
  {
    id: 'operations',
    name: 'Operations Agent',
    description: 'Workflow execution & process automation',
    fullDescription:
      'The Operations Agent manages and executes business workflows, automates repetitive processes, and ensures operational efficiency. It can trigger workflows, monitor their progress, and handle exceptions. The agent coordinates between different tools and systems, manages data pipelines, and ensures that your business operations run smoothly without manual intervention.',
    icon: Play,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10',
  },
  {
    id: 'fundraising',
    name: 'Fundraising Agent',
    description: 'Investor preparation & pitch materials',
    fullDescription:
      'The Fundraising Agent prepares your business for fundraising by generating pitch decks, financial models, and investor-ready materials. It tracks your fundraising pipeline, prepares data rooms, and creates customized presentations for different investor profiles. The agent ensures your financial narrative is consistent and compelling across all touchpoints.',
    icon: DollarSign,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-500/10',
  },
  {
    id: 'browser',
    name: 'Browser Agent',
    description: 'Web research & automated browsing',
    fullDescription:
      'The Browser Agent can autonomously browse the web, extract information from websites, fill out forms, and perform web-based research tasks. It can monitor competitor websites, gather market data from public sources, and automate web-based workflows. The agent operates with full context awareness and can handle complex multi-step web interactions.',
    icon: Globe,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'reporting',
    name: 'Reporting Agent',
    description: 'Automated reports & analytics',
    fullDescription:
      'The Reporting Agent automatically generates business reports, dashboards, and analytics summaries. It creates investor reports, board decks, KPI summaries, and custom analytics on schedule or on-demand. The agent can pull data from multiple sources, format it into professional documents, and distribute it to the right stakeholders at the right time.',
    icon: BarChart3,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-500/10',
  },
]

// ─── Status Badge Helper ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentStatus }) {
  const config = {
    active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    idle: { label: 'Idle', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    running: { label: 'Running', className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  }
  const c = config[status]
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${c.className}`}>
      {status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {status === 'active' && <CheckCircle className="w-2.5 h-2.5" />}
      {status === 'idle' && <Clock className="w-2.5 h-2.5" />}
      {c.label}
    </Badge>
  )
}

// ─── Task Status Icon ────────────────────────────────────────────────────

function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
    case 'running':
      return <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin" />
    case 'failed':
      return <AlertCircle className="w-3.5 h-3.5 text-destructive" />
    default:
      return <Clock className="w-3.5 h-3.5 text-amber-500" />
  }
}

// ─── Format time ago ────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

// ─── Main Component ────────────────────────────────────────────────────────

export function AgentsPage() {
  const { user } = useAuthStore()
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
  const [newTaskInput, setNewTaskInput] = useState('')
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real agent sessions from API
  const fetchAgentSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const url = user?.id ? `/api/agents?userId=${user.id}` : '/api/agents'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch agent sessions')
      const data = await res.json()

      // Map API sessions + static agent definitions into AgentInfo objects
      const sessionsByType: Record<string, ApiAgentSession> = {}
      for (const session of (data.sessions || []) as ApiAgentSession[]) {
        sessionsByType[session.agentType] = session
      }

      const mergedAgents: AgentInfo[] = AGENT_DEFINITIONS.map((def) => {
        const session = sessionsByType[def.id]
        let status: AgentStatus = 'idle'
        let lastTask = 'No tasks yet'
        const taskHistory: AgentTask[] = []
        const memories: AgentMemory[] = []

        if (session) {
          // Determine status from tasks
          const hasRunning = session.tasks.some((t) => t.status === 'running')
          const hasCompleted = session.tasks.some((t) => t.status === 'completed')
          if (hasRunning) status = 'running'
          else if (hasCompleted) status = 'active'

          // Map task history
          for (const task of session.tasks.slice(0, 10)) {
            taskHistory.push({
              id: task.id,
              title: task.input.length > 80 ? task.input.slice(0, 80) + '...' : task.input,
              status: task.status as AgentTask['status'],
              createdAt: timeAgo(task.createdAt),
              completedAt: task.status === 'completed' ? timeAgo(task.updatedAt) : undefined,
              output: task.output || undefined,
            })
          }

          if (taskHistory.length > 0) {
            lastTask = taskHistory[0].title
          }

          // Parse memories from metadata
          try {
            const memMeta = JSON.parse(session.metadata || '{}')
            if (memMeta.memories) {
              for (const mem of memMeta.memories) {
                memories.push(mem)
              }
            }
          } catch {
            // ignore
          }
        }

        return { ...def, status, lastTask, taskHistory, memories }
      })

      setAgents(mergedAgents)
    } catch {
      // Fallback to static definitions with idle status
      setAgents(
        AGENT_DEFINITIONS.map((def) => ({
          ...def,
          status: 'idle' as AgentStatus,
          lastTask: 'No tasks yet',
          taskHistory: [],
          memories: [],
        }))
      )
      toast.error('Failed to load agent data')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAgentSessions()
  }, [fetchAgentSessions])

  // ─── Assign Task via real API ──────────────────────────────────────────

  const assignTask = async () => {
    if (!newTaskInput.trim() || !selectedAgent || isSubmittingTask) return

    setIsSubmittingTask(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: selectedAgent.id,
          task: newTaskInput,
          userId: user?.id,
        }),
      })

      if (!res.ok) throw new Error('Failed to assign task')

      const data = await res.json()

      // Update the selected agent's task history with real data
      setSelectedAgent((prev) =>
        prev
          ? {
              ...prev,
              taskHistory: [
                {
                  id: data.task?.id || crypto.randomUUID(),
                  title: newTaskInput.length > 80 ? newTaskInput.slice(0, 80) + '...' : newTaskInput,
                  status: 'completed' as const,
                  createdAt: 'Just now',
                  completedAt: 'Just now',
                  output: data.response,
                },
                ...prev.taskHistory,
              ],
              lastTask: newTaskInput,
              status: 'active' as const,
            }
          : null
      )

      // Also update the agents array
      setAgents((prev) =>
        prev.map((a) =>
          a.id === selectedAgent.id
            ? {
                ...a,
                taskHistory: [
                  {
                    id: data.task?.id || crypto.randomUUID(),
                    title: newTaskInput.length > 80 ? newTaskInput.slice(0, 80) + '...' : newTaskInput,
                    status: 'completed' as const,
                    createdAt: 'Just now',
                    completedAt: 'Just now',
                    output: data.response,
                  },
                  ...a.taskHistory,
                ],
                lastTask: newTaskInput,
                status: 'active' as const,
              }
            : a
        )
      )

      setNewTaskInput('')
      toast.success(`Task assigned to ${selectedAgent.name}`)
    } catch {
      toast.error('Failed to assign task. Please try again.')
    } finally {
      setIsSubmittingTask(false)
    }
  }

  // ─── Agent Chat via POST /api/chat ─────────────────────────────────────

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading || !selectedAgent) return

    const userMsg = { role: 'user' as const, content: chatInput }
    setChatMessages((prev) => [...prev, userMsg])
    setChatInput('')
    setIsChatLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          sessionId: chatSessionId,
          agentType: selectedAgent.id,
        }),
      })

      if (!res.ok) throw new Error('Failed to send message')

      const data = await res.json()
      if (!chatSessionId && data.sessionId) {
        setChatSessionId(data.sessionId)
      }

      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      toast.error('Failed to send message')
    } finally {
      setIsChatLoading(false)
    }
  }

  // ─── Open Chat ─────────────────────────────────────────────────────────

  const openChat = (agent: AgentInfo) => {
    setSelectedAgent(agent)
    setChatMessages([])
    setChatSessionId(null)
    setChatInput('')
    setIsChatOpen(true)
  }

  // ─── Orchestration Flow Data ───────────────────────────────────────────

  const orchestrationSteps = [
    { label: 'User Request', icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'AI Gateway', icon: Sparkles, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Task Classifier', icon: Brain, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Agent Orchestrator', icon: Bot, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Specialized Agents', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Tool Execution', icon: Play, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { label: 'Memory', icon: BarChart3, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { label: 'Response', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI Agent System
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and monitor your autonomous AI agents
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
          {agents.filter((a) => a.status !== 'idle').length} agents active
        </Badge>
      </div>

      {/* Agent Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading agents...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent) => {
            const AgentIcon = agent.icon
            return (
              <Card
                key={agent.id}
                className="group hover:shadow-md transition-all cursor-pointer hover:border-primary/20"
                onClick={() => setSelectedAgent(agent)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${agent.bgColor} flex items-center justify-center`}>
                        <AgentIcon className={`w-5 h-5 ${agent.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{agent.name}</CardTitle>
                        <StatusBadge status={agent.status} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-xs leading-relaxed">
                    {agent.description}
                  </CardDescription>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">{agent.lastTask}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-[11px] gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        openChat(agent)
                      }}
                    >
                      <MessageSquare className="w-3 h-3" />
                      Chat
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 h-7 text-[11px] gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAgent(agent)
                      }}
                    >
                      <Plus className="w-3 h-3" />
                      Assign Task
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Agent Orchestration Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Agent Orchestration Flow</CardTitle>
          </div>
          <CardDescription className="text-xs">
            How your requests are processed through the AI agent system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Flow */}
          <div className="hidden md:flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {orchestrationSteps.map((step, i) => {
              const StepIcon = step.icon
              return (
                <div key={step.label} className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-center gap-2 min-w-[80px]">
                    <div className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                      <StepIcon className={`w-5 h-5 ${step.color}`} />
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight">{step.label}</span>
                  </div>
                  {i < orchestrationSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Mobile Flow - 2 rows of 4 */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between gap-1">
              {orchestrationSteps.slice(0, 4).map((step, i) => {
                const StepIcon = step.icon
                return (
                  <div key={step.label} className="flex items-center gap-1">
                    <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                      <div className={`w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center`}>
                        <StepIcon className={`w-4 h-4 ${step.color}`} />
                      </div>
                      <span className="text-[9px] font-medium text-center leading-tight">{step.label}</span>
                    </div>
                    {i < 3 && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-muted-foreground/40 rotate-90" />
            </div>
            <div className="flex items-center justify-between gap-1">
              {orchestrationSteps.slice(4).map((step, i) => {
                const StepIcon = step.icon
                return (
                  <div key={step.label} className="flex items-center gap-1">
                    <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                      <div className={`w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center`}>
                        <StepIcon className={`w-4 h-4 ${step.color}`} />
                      </div>
                      <span className="text-[9px] font-medium text-center leading-tight">{step.label}</span>
                    </div>
                    {i < orchestrationSteps.slice(4).length - 1 && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Detail Dialog */}
      <Dialog
        open={selectedAgent !== null && !isChatOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedAgent(null)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {selectedAgent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${selectedAgent.bgColor} flex items-center justify-center`}>
                    {(() => {
                      const AgentIcon = selectedAgent.icon
                      return <AgentIcon className={`w-6 h-6 ${selectedAgent.color}`} />
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{selectedAgent.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={selectedAgent.status} />
                      <span className="text-xs text-muted-foreground">Last: {selectedAgent.lastTask}</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-5 pb-4">
                  {/* Description */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      About
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedAgent.fullDescription}
                    </p>
                  </div>

                  <Separator />

                  {/* Task History */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Task History
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {selectedAgent.taskHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No tasks yet. Assign a task below!
                        </p>
                      ) : (
                        selectedAgent.taskHistory.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <TaskStatusIcon status={task.status} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium truncate">{task.title}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                  {task.createdAt}
                                </span>
                              </div>
                              {task.output && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                  {task.output.length > 200 ? task.output.slice(0, 200) + '...' : task.output}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Memory / Context */}
                  {selectedAgent.memories.length > 0 && (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Memory & Context
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedAgent.memories.map((memory) => (
                            <div
                              key={memory.id}
                              className="p-2.5 rounded-lg border bg-card"
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                                  {memory.type}
                                </Badge>
                              </div>
                              <p className="text-[11px] font-medium">{memory.key}</p>
                              <p className="text-[11px] text-muted-foreground">{memory.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* New Task Form */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Assign New Task
                    </h4>
                    <div className="flex gap-2">
                      <Textarea
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        placeholder={`Describe a task for ${selectedAgent.name}...`}
                        className="min-h-[60px] text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            assignTask()
                          }
                        }}
                      />
                      <Button
                        onClick={assignTask}
                        disabled={!newTaskInput.trim() || isSubmittingTask}
                        className="shrink-0 self-end"
                      >
                        {isSubmittingTask ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Agent Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          {selectedAgent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${selectedAgent.bgColor} flex items-center justify-center`}>
                    {(() => {
                      const AgentIcon = selectedAgent.icon
                      return <AgentIcon className={`w-5 h-5 ${selectedAgent.color}`} />
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-base">{selectedAgent.name}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{selectedAgent.description}</p>
                  </div>
                </div>
              </DialogHeader>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 -mx-6 px-6 min-h-[300px] max-h-[400px]">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Start a conversation with {selectedAgent.name}</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-2">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-card border rounded-bl-md'
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-[bounce_1.4s_ease-in-out_infinite]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Chat Input */}
              <div className="flex gap-2 pt-2 border-t">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      sendChatMessage()
                    }
                  }}
                  placeholder={`Message ${selectedAgent.name}...`}
                  className="text-sm h-9"
                  disabled={isChatLoading}
                />
                <Button
                  size="icon"
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="h-9 w-9 shrink-0"
                >
                  {isChatLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
