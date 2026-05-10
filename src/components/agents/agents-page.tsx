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
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
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
  Wrench,
  Database,
  GitBranch,
  Trash2,
  RefreshCw,
  Filter,
  ArrowDown,
  ArrowDownUp,
  Layers,
  Shield,
  Timer,
  Eye,
  Package,
  FileText,
  HardDrive,
  Archive,
  X,
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
  allowedTools: string[]
  activeMemoriesCount: number
  pipelineParticipation: number
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

// Pipeline types
interface PipelineInfo {
  id: string
  name: string
  description?: string | null
  status: string
  triggerType: string
  schedule?: string | null
  stepCount: number
  agentTypes: string[]
  latestRun?: {
    id: string
    status: string
    completedAt?: string | null
  } | null
  createdAt: string
  updatedAt: string
}

interface PipelineStep {
  id: string
  agentType: string
  name: string
  description?: string | null
  order: number
  isActive: boolean
  dependsOn: string[]
  inputTemplate: Record<string, any>
  config: Record<string, any>
}

interface PipelineDetail {
  id: string
  name: string
  description?: string | null
  status: string
  triggerType: string
  schedule?: string | null
  steps: PipelineStep[]
  latestRun?: {
    id: string
    status: string
    triggeredBy?: string | null
    startedAt?: string | null
    completedAt?: string | null
    result: any
    stepRuns: any[]
  } | null
  runCount: number
  recentRuns: any[]
  createdAt: string
  updatedAt: string
}

// Tool types
interface ToolInfo {
  name: string
  description: string
  category: string
  requiredPermissions: string[]
  rateLimited: boolean
  maxExecutionsPerMinute?: number
  timeout: number
  sandboxed: boolean
  requiresApproval: boolean
}

// Memory types
interface MemoryEntry {
  id: string
  organizationId?: string | null
  userId?: string | null
  agentType?: string | null
  category: string
  key: string
  value: string
  summary?: string | null
  relevanceScore: number
  accessCount: number
  source?: string | null
  tags: any
  createdAt: string
  updatedAt: string
  rankedScore?: number
}

interface MemoryStats {
  totalMemories: number
  byCategory: Record<string, number>
  byAgent: Record<string, number>
  averageRelevance: number
  oldestMemory?: string | null
  newestMemory?: string | null
}

// ─── Agent Definitions (static metadata) ────────────────────────────────────

const AGENT_DEFINITIONS: Omit<AgentInfo, 'status' | 'lastTask' | 'taskHistory' | 'memories' | 'allowedTools' | 'activeMemoriesCount' | 'pipelineParticipation'>[] = [
  {
    id: 'cfo',
    name: 'CFO Agent',
    description: 'Financial strategy & cash flow analysis',
    fullDescription:
      'The CFO Agent specializes in financial strategy, cash flow management, budgeting, and financial risk assessment. It continuously monitors your financial health, forecasts revenue and expenses, and provides actionable insights to optimize your financial position.',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'ceo',
    name: 'CEO Agent',
    description: 'Executive summaries & strategic planning',
    fullDescription:
      'The CEO Agent provides high-level strategic insights, executive summaries, and business vision alignment. It synthesizes data from all other agents to give you a comprehensive view of your business health.',
    icon: Brain,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500/10',
  },
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Market intelligence & competitor analysis',
    fullDescription:
      'The Research Agent continuously monitors market trends, competitor activities, and industry developments. It provides real-time market intelligence, competitive analysis, and identifies emerging opportunities and threats.',
    icon: Search,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    description: 'Growth strategies & acquisition optimization',
    fullDescription:
      'The Growth Agent focuses on customer acquisition, retention optimization, and scaling strategies. It analyzes your growth funnels, identifies bottlenecks, and recommends specific tactics to improve conversion rates.',
    icon: Zap,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
  },
  {
    id: 'operations',
    name: 'Operations Agent',
    description: 'Workflow execution & process automation',
    fullDescription:
      'The Operations Agent manages and executes business workflows, automates repetitive processes, and ensures operational efficiency. It can trigger workflows, monitor their progress, and handle exceptions.',
    icon: Play,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10',
  },
  {
    id: 'fundraising',
    name: 'Fundraising Agent',
    description: 'Investor preparation & pitch materials',
    fullDescription:
      'The Fundraising Agent prepares your business for fundraising by generating pitch decks, financial models, and investor-ready materials. It tracks your fundraising pipeline and creates customized presentations.',
    icon: DollarSign,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-500/10',
  },
  {
    id: 'browser',
    name: 'Browser Agent',
    description: 'Web research & automated browsing',
    fullDescription:
      'The Browser Agent can autonomously browse the web, extract information from websites, fill out forms, and perform web-based research tasks. It can monitor competitor websites and gather market data.',
    icon: Globe,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'reporting',
    name: 'Reporting Agent',
    description: 'Automated reports & analytics',
    fullDescription:
      'The Reporting Agent automatically generates business reports, dashboards, and analytics summaries. It creates investor reports, board decks, KPI summaries, and custom analytics on schedule or on-demand.',
    icon: BarChart3,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-500/10',
  },
]

// Agent tool mapping from orchestrator
const AGENT_TOOLS_MAP: Record<string, string[]> = {
  cfo: ['forecast_calculate', 'kpi_update', 'analytics_query', 'export_generate'],
  ceo: ['web_search', 'analytics_query', 'crm_lookup'],
  research: ['web_search', 'browser_navigate', 'analytics_query'],
  growth: ['web_search', 'analytics_query', 'crm_lookup', 'notification_send'],
  operations: ['analytics_query', 'kpi_update', 'notification_send'],
  fundraising: ['web_search', 'analytics_query', 'export_generate', 'forecast_calculate'],
  browser: ['browser_navigate', 'web_search'],
  reporting: ['analytics_query', 'export_generate', 'kpi_update', 'forecast_calculate'],
}

// Tool category colors
const TOOL_CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  browser: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  finance: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  communication: { color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
  analytics: { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  export: { color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10' },
  crm: { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
  data: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
}

// Memory category display
const MEMORY_CATEGORY_LABELS: Record<string, string> = {
  user_preference: 'User Preference',
  workspace_context: 'Workspace Context',
  agent_knowledge: 'Agent Knowledge',
  forecast_insight: 'Forecast Insight',
  workflow_pattern: 'Workflow Pattern',
  market_intelligence: 'Market Intelligence',
  financial_summary: 'Financial Summary',
}

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

function PipelineStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
    active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    completed: { label: 'Completed', className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
    running: { label: 'Running', className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
    failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    paused: { label: 'Paused', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  }
  const c = config[status] || config.draft
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${c.className}`}>
      {status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
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
  const { user, organization } = useAuthStore()
  const organizationId = organization?.id || ''

  // ─── Agents Tab State ──────────────────────────────────────────────────
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
  const [newTaskInput, setNewTaskInput] = useState('')
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [isLoadingAgents, setIsLoadingAgents] = useState(true)

  // ─── Pipelines Tab State ───────────────────────────────────────────────
  const [pipelines, setPipelines] = useState<PipelineInfo[]>([])
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(true)
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineDetail | null>(null)
  const [isLoadingPipelineDetail, setIsLoadingPipelineDetail] = useState(false)
  const [isCreatePipelineOpen, setIsCreatePipelineOpen] = useState(false)
  const [pipelineSteps, setPipelineSteps] = useState<Array<{
    agentType: string
    name: string
    description: string
    dependsOn: string[]
  }>>([{ agentType: 'cfo', name: 'Step 1', description: '', dependsOn: [] }])
  const [newPipelineName, setNewPipelineName] = useState('')
  const [newPipelineDesc, setNewPipelineDesc] = useState('')
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false)
  const [isExecutingPipeline, setIsExecutingPipeline] = useState(false)

  // ─── Tools Tab State ───────────────────────────────────────────────────
  const [tools, setTools] = useState<ToolInfo[]>([])
  const [isLoadingTools, setIsLoadingTools] = useState(true)
  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null)
  const [toolFilter, setToolFilter] = useState<string>('all')
  const [isToolExecOpen, setIsToolExecOpen] = useState(false)
  const [toolExecInput, setToolExecInput] = useState<Record<string, any>>({})
  const [isExecutingTool, setIsExecutingTool] = useState(false)
  const [toolExecHistory, setToolExecHistory] = useState<Array<{
    id: string
    tool: string
    status: string
    duration?: number | null
    createdAt: string
  }>>([])

  // ─── Memory Tab State ──────────────────────────────────────────────────
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null)
  const [isLoadingMemories, setIsLoadingMemories] = useState(true)
  const [memoryCategory, setMemoryCategory] = useState<string>('all')
  const [memoryAgentFilter, setMemoryAgentFilter] = useState<string>('all')
  const [memorySearch, setMemorySearch] = useState('')
  const [isMemActionLoading, setIsMemActionLoading] = useState(false)

  // ─── Fetch Agent Sessions ──────────────────────────────────────────────
  const fetchAgentSessions = useCallback(async () => {
    setIsLoadingAgents(true)
    try {
      const url = user?.id ? `/api/agents?userId=${user.id}` : '/api/agents'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch agent sessions')
      const data = await res.json()

      const sessionsByType: Record<string, ApiAgentSession> = {}
      for (const session of (data.sessions || []) as ApiAgentSession[]) {
        sessionsByType[session.agentType] = session
      }

      // Count pipeline participation per agent type
      const pipelineAgentCounts: Record<string, number> = {}
      for (const p of pipelines) {
        for (const at of p.agentTypes) {
          pipelineAgentCounts[at] = (pipelineAgentCounts[at] || 0) + 1
        }
      }

      const mergedAgents: AgentInfo[] = AGENT_DEFINITIONS.map((def) => {
        const session = sessionsByType[def.id]
        let status: AgentStatus = 'idle'
        let lastTask = 'No tasks yet'
        const taskHistory: AgentTask[] = []
        const memList: AgentMemory[] = []
        let activeMemoriesCount = 0

        if (session) {
          const hasRunning = session.tasks.some((t) => t.status === 'running')
          const hasCompleted = session.tasks.some((t) => t.status === 'completed')
          if (hasRunning) status = 'running'
          else if (hasCompleted) status = 'active'

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

          try {
            const memMeta = JSON.parse(session.metadata || '{}')
            if (memMeta.memories) {
              for (const mem of memMeta.memories) {
                memList.push(mem)
              }
            }
          } catch {
            // ignore
          }
        }

        return {
          ...def,
          status,
          lastTask,
          taskHistory,
          memories: memList,
          allowedTools: AGENT_TOOLS_MAP[def.id] || [],
          activeMemoriesCount,
          pipelineParticipation: pipelineAgentCounts[def.id] || 0,
        }
      })

      setAgents(mergedAgents)
    } catch {
      setAgents(
        AGENT_DEFINITIONS.map((def) => ({
          ...def,
          status: 'idle' as AgentStatus,
          lastTask: 'No tasks yet',
          taskHistory: [],
          memories: [],
          allowedTools: AGENT_TOOLS_MAP[def.id] || [],
          activeMemoriesCount: 0,
          pipelineParticipation: 0,
        }))
      )
      toast.error('Failed to load agent data')
    } finally {
      setIsLoadingAgents(false)
    }
  }, [user?.id, pipelines])

  // ─── Fetch Pipelines ───────────────────────────────────────────────────
  const fetchPipelines = useCallback(async () => {
    if (!organizationId) return
    setIsLoadingPipelines(true)
    try {
      const res = await fetch(`/api/pipelines?organizationId=${organizationId}`)
      if (!res.ok) throw new Error('Failed to fetch pipelines')
      const data = await res.json()
      setPipelines(data.pipelines || [])
    } catch {
      setPipelines([])
    } finally {
      setIsLoadingPipelines(false)
    }
  }, [organizationId])

  // ─── Fetch Tools ───────────────────────────────────────────────────────
  const fetchTools = useCallback(async () => {
    setIsLoadingTools(true)
    try {
      const res = await fetch('/api/tools/execute')
      if (!res.ok) throw new Error('Failed to fetch tools')
      const data = await res.json()
      setTools(data.tools || [])
    } catch {
      setTools([])
    } finally {
      setIsLoadingTools(false)
    }
  }, [])

  // ─── Fetch Memories ────────────────────────────────────────────────────
  const fetchMemories = useCallback(async () => {
    if (!organizationId) return
    setIsLoadingMemories(true)
    try {
      const params = new URLSearchParams()
      params.set('organizationId', organizationId)
      params.set('limit', '50')
      params.set('minRelevance', '0')
      if (memoryCategory !== 'all') params.set('category', memoryCategory)
      if (memoryAgentFilter !== 'all') params.set('agentType', memoryAgentFilter)
      if (memorySearch.trim()) params.set('query', memorySearch.trim())

      const res = await fetch(`/api/memories?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch memories')
      const data = await res.json()
      setMemories(data.memories || [])

      // Also fetch stats
      const statsRes = await fetch(`/api/memories?action=stats&organizationId=${organizationId}`)
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setMemoryStats(statsData.stats || null)
      }
    } catch {
      setMemories([])
    } finally {
      setIsLoadingMemories(false)
    }
  }, [organizationId, memoryCategory, memoryAgentFilter, memorySearch])

  // ─── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPipelines()
    fetchTools()
  }, [fetchPipelines, fetchTools])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  useEffect(() => {
    if (!isLoadingPipelines) {
      fetchAgentSessions()
    }
  }, [fetchAgentSessions, isLoadingPipelines])

  // ─── Fetch Tool Execution History ──────────────────────────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/tools/approvals')
        if (res.ok) {
          const data = await res.json()
          setToolExecHistory(data.approvals || [])
        }
      } catch {
        // ignore
      }
    }
    fetchHistory()
  }, [])

  // ─── Assign Task ───────────────────────────────────────────────────────
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

      const newTask = {
        id: data.task?.id || crypto.randomUUID(),
        title: newTaskInput.length > 80 ? newTaskInput.slice(0, 80) + '...' : newTaskInput,
        status: 'completed' as const,
        createdAt: 'Just now',
        completedAt: 'Just now',
        output: data.response,
      }

      setSelectedAgent((prev) =>
        prev ? { ...prev, taskHistory: [newTask, ...prev.taskHistory], lastTask: newTaskInput, status: 'active' as const } : null
      )
      setAgents((prev) =>
        prev.map((a) =>
          a.id === selectedAgent.id
            ? { ...a, taskHistory: [newTask, ...a.taskHistory], lastTask: newTaskInput, status: 'active' as const }
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

  // ─── Agent Chat ────────────────────────────────────────────────────────
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
      if (!chatSessionId && data.sessionId) setChatSessionId(data.sessionId)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      toast.error('Failed to send message')
    } finally {
      setIsChatLoading(false)
    }
  }

  const openChat = (agent: AgentInfo) => {
    setSelectedAgent(agent)
    setChatMessages([])
    setChatSessionId(null)
    setChatInput('')
    setIsChatOpen(true)
  }

  // ─── Pipeline Actions ──────────────────────────────────────────────────
  const createPipeline = async () => {
    if (!newPipelineName.trim() || !organizationId || pipelineSteps.length === 0) return
    setIsCreatingPipeline(true)
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPipelineName,
          description: newPipelineDesc,
          organizationId,
          steps: pipelineSteps.map((s, i) => ({
            agentType: s.agentType,
            name: s.name,
            description: s.description,
            inputTemplate: { task: `Execute ${s.name}` },
            dependsOn: s.dependsOn.filter((d) => {
              const idx = parseInt(d, 10)
              return !isNaN(idx) && idx >= 0 && idx < i
            }),
          })),
          triggerType: 'manual',
        }),
      })
      if (!res.ok) throw new Error('Failed to create pipeline')
      toast.success('Pipeline created successfully')
      setIsCreatePipelineOpen(false)
      setNewPipelineName('')
      setNewPipelineDesc('')
      setPipelineSteps([{ agentType: 'cfo', name: 'Step 1', description: '', dependsOn: [] }])
      fetchPipelines()
    } catch {
      toast.error('Failed to create pipeline')
    } finally {
      setIsCreatingPipeline(false)
    }
  }

  const executePipeline = async (pipelineId: string) => {
    setIsExecutingPipeline(true)
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', triggeredBy: user?.id }),
      })
      if (!res.ok) throw new Error('Failed to execute pipeline')
      const data = await res.json()
      toast.success(`Pipeline execution started (Run: ${data.runId?.slice(0, 8)}...)`)
      // Refresh pipeline detail if viewing
      if (selectedPipeline?.id === pipelineId) {
        fetchPipelineDetail(pipelineId)
      }
      fetchPipelines()
    } catch {
      toast.error('Failed to execute pipeline')
    } finally {
      setIsExecutingPipeline(false)
    }
  }

  const deletePipeline = async (pipelineId: string) => {
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete pipeline')
      toast.success('Pipeline deleted')
      setPipelines((prev) => prev.filter((p) => p.id !== pipelineId))
      if (selectedPipeline?.id === pipelineId) setSelectedPipeline(null)
    } catch {
      toast.error('Failed to delete pipeline')
    }
  }

  const fetchPipelineDetail = async (pipelineId: string) => {
    setIsLoadingPipelineDetail(true)
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`)
      if (!res.ok) throw new Error('Failed to fetch pipeline')
      const data = await res.json()
      setSelectedPipeline(data.pipeline)
    } catch {
      toast.error('Failed to load pipeline details')
    } finally {
      setIsLoadingPipelineDetail(false)
    }
  }

  // ─── Tool Execution ────────────────────────────────────────────────────
  const executeToolAction = async () => {
    if (!selectedTool || !user?.id) return
    setIsExecutingTool(true)
    try {
      // Create a temporary agent task for the tool execution
      const taskRes = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'operations',
          task: `Execute tool: ${selectedTool.name}`,
          userId: user.id,
        }),
      })
      const taskData = await taskRes.ok ? await taskRes.json() : null
      const agentTaskId = taskData?.task?.id || 'tool-exec-' + Date.now()

      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: selectedTool.name,
          agentTaskId,
          input: toolExecInput,
          organizationId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.output?.status === 'pending_approval'
          ? 'Tool execution pending approval'
          : `Tool ${selectedTool.name} executed successfully`)
        setToolExecHistory((prev) => [
          {
            id: Date.now().toString(),
            tool: selectedTool.name,
            status: data.output?.status === 'pending_approval' ? 'pending' : data.success ? 'completed' : 'failed',
            duration: data.output?.duration,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])
      } else {
        toast.error(data.error || 'Tool execution failed')
      }
    } catch {
      toast.error('Failed to execute tool')
    } finally {
      setIsExecutingTool(false)
      setIsToolExecOpen(false)
      setToolExecInput({})
    }
  }

  // ─── Memory Actions ────────────────────────────────────────────────────
  const compressMemories = async () => {
    if (!organizationId) return
    setIsMemActionLoading(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compress', organizationId }),
      })
      if (!res.ok) throw new Error('Failed to compress')
      const data = await res.json()
      toast.success(`Compressed ${data.compressed} memories`)
      fetchMemories()
    } catch {
      toast.error('Failed to compress memories')
    } finally {
      setIsMemActionLoading(false)
    }
  }

  const cleanupMemories = async () => {
    setIsMemActionLoading(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      })
      if (!res.ok) throw new Error('Failed to cleanup')
      const data = await res.json()
      toast.success(`Cleaned up ${data.deleted} expired memories`)
      fetchMemories()
    } catch {
      toast.error('Failed to cleanup memories')
    } finally {
      setIsMemActionLoading(false)
    }
  }

  const ageMemories = async () => {
    if (!organizationId) return
    setIsMemActionLoading(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'age', organizationId }),
      })
      if (!res.ok) throw new Error('Failed to age')
      const data = await res.json()
      toast.success(`Aged ${data.aged} memory relevance scores`)
      fetchMemories()
    } catch {
      toast.error('Failed to age memories')
    } finally {
      setIsMemActionLoading(false)
    }
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

  // ─── Filtered tools ────────────────────────────────────────────────────
  const filteredTools = toolFilter === 'all' ? tools : tools.filter((t) => t.category === toolFilter)
  const toolCategories = [...new Set(tools.map((t) => t.category))]

  // ─── DAG Visualization Helper ──────────────────────────────────────────
  const renderPipelineDAG = (steps: PipelineStep[]) => {
    if (steps.length === 0) return null

    // Group steps by dependency level for top-down rendering
    const levels: PipelineStep[][] = []
    const processed = new Set<string>()

    const stepMap = new Map(steps.map((s) => [s.id, s]))

    // Simple level assignment
    const stepLevels = new Map<string, number>()
    const assignLevel = (step: PipelineStep): number => {
      if (stepLevels.has(step.id)) return stepLevels.get(step.id)!
      if (step.dependsOn.length === 0) {
        stepLevels.set(step.id, 0)
        return 0
      }
      const maxDepLevel = Math.max(
        ...step.dependsOn.map((depId) => {
          const dep = stepMap.get(depId)
          return dep ? assignLevel(dep) : 0
        })
      )
      const level = maxDepLevel + 1
      stepLevels.set(step.id, level)
      return level
    }

    for (const step of steps) {
      assignLevel(step)
    }

    const maxLevel = Math.max(...Array.from(stepLevels.values()), 0)
    for (let i = 0; i <= maxLevel; i++) {
      levels.push(steps.filter((s) => stepLevels.get(s.id) === i))
    }

    return (
      <div className="space-y-4">
        {levels.map((level, levelIdx) => (
          <div key={levelIdx}>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {level.map((step) => {
                const agentDef = AGENT_DEFINITIONS.find((a) => a.id === step.agentType)
                const StepIcon = agentDef?.icon || Bot
                return (
                  <div key={step.id} className="flex flex-col items-center gap-1.5">
                    <div className={`w-14 h-14 rounded-xl ${agentDef?.bgColor || 'bg-muted'} flex items-center justify-center border border-border shadow-sm`}>
                      <StepIcon className={`w-6 h-6 ${agentDef?.color || 'text-muted-foreground'}`} />
                    </div>
                    <span className="text-[10px] font-medium text-center max-w-[80px] leading-tight">{step.name}</span>
                    <Badge variant="secondary" className="text-[8px] h-4 px-1">
                      {step.agentType}
                    </Badge>
                  </div>
                )
              })}
            </div>
            {levelIdx < levels.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowDown className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

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
            Manage agents, pipelines, tools, and memory architecture
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
          {agents.filter((a) => a.status !== 'idle').length} agents active
        </Badge>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="agents" className="gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="memory" className="gap-1.5">
            <Database className="w-3.5 h-3.5" />
            Memory
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* AGENTS TAB                                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="agents" className="space-y-6">
          {/* Agent Cards Grid */}
          {isLoadingAgents ? (
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
                      {/* Enhanced: Tools, Memory, Pipeline info */}
                      <div className="flex flex-wrap gap-1">
                        {agent.allowedTools.slice(0, 3).map((tool) => (
                          <Badge key={tool} variant="secondary" className="text-[8px] h-4 px-1.5 gap-0.5">
                            <Wrench className="w-2 h-2" />
                            {tool.replace(/_/g, ' ').slice(0, 15)}
                          </Badge>
                        ))}
                        {agent.allowedTools.length > 3 && (
                          <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
                            +{agent.allowedTools.length - 3}
                          </Badge>
                        )}
                      </div>
                      {agent.pipelineParticipation > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <GitBranch className="w-2.5 h-2.5" />
                          {agent.pipelineParticipation} pipeline{agent.pipelineParticipation > 1 ? 's' : ''}
                        </div>
                      )}
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
                          Task
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
                        {i < 3 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PIPELINES TAB                                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pipelines" className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                Agent Pipelines
              </h2>
              <p className="text-xs text-muted-foreground">DAG-based multi-agent orchestration</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => fetchPipelines()}>
                <RefreshCw className="w-3 h-3" />
                Refresh
              </Button>
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setIsCreatePipelineOpen(true)}>
                <Plus className="w-3 h-3" />
                New Pipeline
              </Button>
            </div>
          </div>

          {isLoadingPipelines ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading pipelines...</span>
            </div>
          ) : pipelines.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GitBranch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-sm font-medium">No pipelines yet</h3>
                <p className="text-xs text-muted-foreground mt-1">Create a pipeline to orchestrate multiple agents in sequence</p>
                <Button size="sm" className="mt-4 gap-1.5" onClick={() => setIsCreatePipelineOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Create Pipeline
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pipeline List */}
              <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {pipelines.map((pipeline) => (
                  <Card
                    key={pipeline.id}
                    className={`cursor-pointer hover:shadow-md transition-all ${selectedPipeline?.id === pipeline.id ? 'border-primary ring-1 ring-primary/20' : ''}`}
                    onClick={() => fetchPipelineDetail(pipeline.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-medium">{pipeline.name}</h3>
                          {pipeline.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{pipeline.description}</p>
                          )}
                        </div>
                        <PipelineStatusBadge status={pipeline.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                          <Layers className="w-2.5 h-2.5 mr-0.5" />
                          {pipeline.stepCount} steps
                        </Badge>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                          {pipeline.triggerType}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pipeline.agentTypes.slice(0, 4).map((at) => (
                          <span key={at} className="text-[9px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                            {at}
                          </span>
                        ))}
                        {pipeline.agentTypes.length > 4 && (
                          <span className="text-[9px] text-muted-foreground">+{pipeline.agentTypes.length - 4}</span>
                        )}
                      </div>
                      {pipeline.latestRun && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />
                          Last run: {pipeline.latestRun.status}
                          {pipeline.latestRun.completedAt && ` • ${timeAgo(pipeline.latestRun.completedAt)}`}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pipeline Detail / DAG */}
              <div className="lg:col-span-2">
                {isLoadingPipelineDetail ? (
                  <Card>
                    <CardContent className="py-12 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading pipeline...</span>
                    </CardContent>
                  </Card>
                ) : selectedPipeline ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{selectedPipeline.name}</CardTitle>
                          {selectedPipeline.description && (
                            <CardDescription className="text-xs mt-0.5">{selectedPipeline.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <PipelineStatusBadge status={selectedPipeline.status} />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive"
                            onClick={() => deletePipeline(selectedPipeline.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Pipeline Info */}
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Layers className="w-3.5 h-3.5" />
                          {selectedPipeline.steps.length} steps
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Timer className="w-3.5 h-3.5" />
                          {selectedPipeline.triggerType}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Play className="w-3.5 h-3.5" />
                          {selectedPipeline.runCount} runs
                        </div>
                      </div>

                      <Separator />

                      {/* DAG Visualization */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Pipeline Flow (DAG)
                        </h4>
                        {renderPipelineDAG(selectedPipeline.steps)}
                      </div>

                      <Separator />

                      {/* Steps Table */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Steps
                        </h4>
                        <div className="space-y-2">
                          {selectedPipeline.steps.map((step, i) => {
                            const agentDef = AGENT_DEFINITIONS.find((a) => a.id === step.agentType)
                            const StepIcon = agentDef?.icon || Bot
                            return (
                              <div key={step.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className={`w-8 h-8 rounded-lg ${agentDef?.bgColor || 'bg-muted'} flex items-center justify-center shrink-0`}>
                                  <StepIcon className={`w-4 h-4 ${agentDef?.color || 'text-muted-foreground'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">{step.name}</span>
                                    <Badge variant="secondary" className="text-[8px] h-3.5 px-1">{step.agentType}</Badge>
                                  </div>
                                  {step.description && (
                                    <p className="text-[10px] text-muted-foreground line-clamp-1">{step.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {step.dependsOn.length > 0 && (
                                    <Badge variant="outline" className="text-[8px] h-4 px-1">
                                      <ArrowDownUp className="w-2 h-2 mr-0.5" />
                                      {step.dependsOn.length} dep
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <Separator />

                      {/* Latest Run Results */}
                      {selectedPipeline.latestRun && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Latest Run
                          </h4>
                          <div className="p-3 rounded-lg border space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <PipelineStatusBadge status={selectedPipeline.latestRun.status} />
                                <span className="text-[10px] text-muted-foreground">
                                  {selectedPipeline.latestRun.startedAt && `Started ${timeAgo(selectedPipeline.latestRun.startedAt)}`}
                                </span>
                              </div>
                            </div>
                            {selectedPipeline.latestRun.stepRuns && selectedPipeline.latestRun.stepRuns.length > 0 && (
                              <div className="space-y-1.5 mt-2">
                                {selectedPipeline.latestRun.stepRuns.map((sr: any, idx: number) => (
                                  <div key={sr.id || idx} className="flex items-center gap-2 text-xs">
                                    <TaskStatusIcon status={sr.status} />
                                    <span className="text-muted-foreground">{sr.agentType}</span>
                                    {sr.duration && (
                                      <span className="text-[10px] text-muted-foreground ml-auto">
                                        {(sr.duration / 1000).toFixed(1)}s
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {selectedPipeline.latestRun.result && typeof selectedPipeline.latestRun.result === 'object' && (
                              <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                                <span>Completed: {selectedPipeline.latestRun.result.completedSteps || 0}</span>
                                <span>Failed: {selectedPipeline.latestRun.result.failedSteps || 0}</span>
                                <span>Total: {selectedPipeline.latestRun.result.totalSteps || 0}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Execute Button */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          className="gap-1.5"
                          onClick={() => executePipeline(selectedPipeline.id)}
                          disabled={isExecutingPipeline}
                        >
                          {isExecutingPipeline ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          Execute Pipeline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Eye className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Select a pipeline to view details and DAG</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TOOLS TAB                                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="tools" className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Tool Registry
              </h2>
              <p className="text-xs text-muted-foreground">{tools.length} registered tools available for agent use</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={toolFilter} onValueChange={setToolFilter}>
                <SelectTrigger size="sm" className="w-[140px]">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {toolCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => fetchTools()}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {isLoadingTools ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading tools...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTools.map((tool) => {
                const catStyle = TOOL_CATEGORY_COLORS[tool.category] || { color: 'text-muted-foreground', bg: 'bg-muted' }
                return (
                  <Card
                    key={tool.name}
                    className="hover:shadow-md transition-all cursor-pointer hover:border-primary/20"
                    onClick={() => setSelectedTool(tool)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg ${catStyle.bg} flex items-center justify-center shrink-0`}>
                          <Wrench className={`w-4 h-4 ${catStyle.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium truncate">{tool.name.replace(/_/g, ' ')}</h3>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{tool.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge className={`text-[8px] h-4 px-1.5 ${catStyle.bg} ${catStyle.color} border-0`}>
                              {tool.category}
                            </Badge>
                            {tool.sandboxed && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1.5 gap-0.5">
                                <Shield className="w-2 h-2" />
                                sandboxed
                              </Badge>
                            )}
                            {tool.requiresApproval && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1.5 gap-0.5 text-amber-600 border-amber-500/20">
                                <Eye className="w-2 h-2" />
                                approval
                              </Badge>
                            )}
                            {tool.rateLimited && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1.5 gap-0.5">
                                <Timer className="w-2 h-2" />
                                {tool.maxExecutionsPerMinute}/min
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Tool Execution History */}
          {toolExecHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Recent Executions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {toolExecHistory.slice(0, 20).map((entry, i) => (
                    <div key={entry.id || i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 text-xs">
                      <TaskStatusIcon status={entry.status} />
                      <span className="font-medium">{entry.tool}</span>
                      <span className="text-muted-foreground ml-auto">{entry.duration ? `${(entry.duration / 1000).toFixed(1)}s` : '—'}</span>
                      <span className="text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MEMORY TAB                                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="memory" className="space-y-4">
          {/* Header with Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Memory Architecture
              </h2>
              <p className="text-xs text-muted-foreground">Semantic retrieval, relevance ranking, and lifecycle management</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={compressMemories}
                disabled={isMemActionLoading}
              >
                <Archive className="w-3 h-3" />
                Compress
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={cleanupMemories}
                disabled={isMemActionLoading}
              >
                <Trash2 className="w-3 h-3" />
                Cleanup
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={ageMemories}
                disabled={isMemActionLoading}
              >
                <Timer className="w-3 h-3" />
                Age
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {memoryStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{memoryStats.totalMemories}</div>
                  <div className="text-[10px] text-muted-foreground">Total Memories</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{Object.keys(memoryStats.byCategory).length}</div>
                  <div className="text-[10px] text-muted-foreground">Categories</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{Object.keys(memoryStats.byAgent).length}</div>
                  <div className="text-[10px] text-muted-foreground">Agent Types</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{(memoryStats.averageRelevance * 100).toFixed(0)}%</div>
                  <div className="text-[10px] text-muted-foreground">Avg Relevance</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Category Breakdown */}
          {memoryStats && Object.keys(memoryStats.byCategory).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(memoryStats.byCategory).map(([cat, count]) => {
                  const pct = memoryStats.totalMemories > 0 ? (count / memoryStats.totalMemories) * 100 : 0
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{MEMORY_CATEGORY_LABELS[cat] || cat}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Agent Memory Breakdown */}
          {memoryStats && Object.keys(memoryStats.byAgent).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Memory by Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(memoryStats.byAgent).map(([agent, count]) => (
                    <Badge key={agent} variant="secondary" className="gap-1.5 text-xs">
                      <Bot className="w-3 h-3" />
                      {agent}: {count as number}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-xs"
                placeholder="Search memories..."
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
              />
            </div>
            <Select value={memoryCategory} onValueChange={setMemoryCategory}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="user_preference">User Preference</SelectItem>
                <SelectItem value="workspace_context">Workspace Context</SelectItem>
                <SelectItem value="agent_knowledge">Agent Knowledge</SelectItem>
                <SelectItem value="forecast_insight">Forecast Insight</SelectItem>
                <SelectItem value="workflow_pattern">Workflow Pattern</SelectItem>
                <SelectItem value="market_intelligence">Market Intelligence</SelectItem>
                <SelectItem value="financial_summary">Financial Summary</SelectItem>
              </SelectContent>
            </Select>
            <Select value={memoryAgentFilter} onValueChange={setMemoryAgentFilter}>
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {AGENT_DEFINITIONS.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => fetchMemories()} disabled={isMemActionLoading}>
              <RefreshCw className={`w-3 h-3 ${isMemActionLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Memory Entries */}
          {isLoadingMemories ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading memories...</span>
            </div>
          ) : memories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Database className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-sm font-medium">No memories found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Memories are created as agents execute tasks and store insights
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {memories.map((memory) => {
                const tags = Array.isArray(memory.tags) ? memory.tags : []
                return (
                  <Card key={memory.id} className="hover:shadow-sm transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <HardDrive className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">{memory.key}</span>
                            <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                              {MEMORY_CATEGORY_LABELS[memory.category] || memory.category}
                            </Badge>
                            {memory.agentType && (
                              <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                                {memory.agentType}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                            {memory.summary || memory.value}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              {((memory.rankedScore || memory.relevanceScore) * 100).toFixed(0)}% relevance
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-2.5 h-2.5" />
                              {memory.accessCount} accesses
                            </span>
                            <span>{timeAgo(memory.createdAt)}</span>
                            {memory.source && (
                              <span className="flex items-center gap-1">
                                <Package className="w-2.5 h-2.5" />
                                {memory.source}
                              </span>
                            )}
                          </div>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tags.slice(0, 5).map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-[8px] h-3.5 px-1">
                                  {tag}
                                </Badge>
                              ))}
                              {tags.length > 5 && (
                                <span className="text-[8px] text-muted-foreground">+{tags.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

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

                  {/* Available Tools (Enhanced) */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Available Tools
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAgent.allowedTools.map((tool) => {
                        const toolDef = tools.find((t) => t.name === tool)
                        const catStyle = toolDef ? TOOL_CATEGORY_COLORS[toolDef.category] || { color: 'text-muted-foreground', bg: 'bg-muted' } : { color: 'text-muted-foreground', bg: 'bg-muted' }
                        return (
                          <Badge key={tool} variant="outline" className={`text-[10px] h-5 px-2 gap-1 ${catStyle.bg} ${catStyle.color} border-0`}>
                            <Wrench className="w-2.5 h-2.5" />
                            {tool.replace(/_/g, ' ')}
                          </Badge>
                        )
                      })}
                    </div>
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

                  {/* Pipeline Participation (Enhanced) */}
                  {selectedAgent.pipelineParticipation > 0 && (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Pipeline Participation
                        </h4>
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Participates in {selectedAgent.pipelineParticipation} pipeline{selectedAgent.pipelineParticipation > 1 ? 's' : ''}
                          </span>
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

      {/* Create Pipeline Dialog */}
      <Dialog open={isCreatePipelineOpen} onOpenChange={setIsCreatePipelineOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              Create Pipeline
            </DialogTitle>
            <DialogDescription className="text-xs">
              Build a multi-agent pipeline with DAG dependencies
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {/* Pipeline Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Pipeline Name</label>
                  <Input
                    value={newPipelineName}
                    onChange={(e) => setNewPipelineName(e.target.value)}
                    placeholder="e.g., Quarterly Financial Review"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (optional)</label>
                  <Input
                    value={newPipelineDesc}
                    onChange={(e) => setNewPipelineDesc(e.target.value)}
                    placeholder="Describe the pipeline purpose..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <Separator />

              {/* Step Builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pipeline Steps
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => setPipelineSteps((prev) => [
                      ...prev,
                      {
                        agentType: 'cfo',
                        name: `Step ${prev.length + 1}`,
                        description: '',
                        dependsOn: [],
                      },
                    ])}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    Add Step
                  </Button>
                </div>

                <div className="space-y-3">
                  {pipelineSteps.map((step, idx) => {
                    const agentDef = AGENT_DEFINITIONS.find((a) => a.id === step.agentType)
                    const StepIcon = agentDef?.icon || Bot
                    return (
                      <div key={idx} className="p-3 rounded-lg border space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg ${agentDef?.bgColor || 'bg-muted'} flex items-center justify-center`}>
                              <StepIcon className={`w-3.5 h-3.5 ${agentDef?.color || 'text-muted-foreground'}`} />
                            </div>
                            <span className="text-xs font-medium">Step {idx + 1}</span>
                          </div>
                          {pipelineSteps.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setPipelineSteps((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-0.5 block">Step Name</label>
                            <Input
                              value={step.name}
                              onChange={(e) => {
                                const newSteps = [...pipelineSteps]
                                newSteps[idx] = { ...newSteps[idx], name: e.target.value }
                                setPipelineSteps(newSteps)
                              }}
                              placeholder="Step name"
                              className="h-7 text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-0.5 block">Agent Type</label>
                            <Select
                              value={step.agentType}
                              onValueChange={(val) => {
                                const newSteps = [...pipelineSteps]
                                newSteps[idx] = { ...newSteps[idx], agentType: val }
                                setPipelineSteps(newSteps)
                              }}
                            >
                              <SelectTrigger size="sm" className="h-7 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AGENT_DEFINITIONS.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-0.5 block">Description</label>
                          <Input
                            value={step.description}
                            onChange={(e) => {
                              const newSteps = [...pipelineSteps]
                              newSteps[idx] = { ...newSteps[idx], description: e.target.value }
                              setPipelineSteps(newSteps)
                            }}
                            placeholder="What this step should do..."
                            className="h-7 text-[11px]"
                          />
                        </div>
                        {idx > 0 && (
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-0.5 block">Depends On (step numbers)</label>
                            <div className="flex flex-wrap gap-1">
                              {pipelineSteps.slice(0, idx).map((_, depIdx) => {
                                const isDep = step.dependsOn.includes(String(depIdx))
                                return (
                                  <Badge
                                    key={depIdx}
                                    variant={isDep ? 'default' : 'outline'}
                                    className="text-[9px] h-5 px-1.5 cursor-pointer"
                                    onClick={() => {
                                      const newSteps = [...pipelineSteps]
                                      const deps = [...newSteps[idx].dependsOn]
                                      const depStr = String(depIdx)
                                      if (deps.includes(depStr)) {
                                        newSteps[idx] = { ...newSteps[idx], dependsOn: deps.filter((d) => d !== depStr) }
                                      } else {
                                        newSteps[idx] = { ...newSteps[idx], dependsOn: [...deps, depStr] }
                                      }
                                      setPipelineSteps(newSteps)
                                    }}
                                  >
                                    Step {depIdx + 1}
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsCreatePipelineOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={createPipeline}
              disabled={!newPipelineName.trim() || pipelineSteps.length === 0 || isCreatingPipeline}
              className="gap-1.5"
            >
              {isCreatingPipeline ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GitBranch className="w-3.5 h-3.5" />
              )}
              Create Pipeline
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tool Detail / Execution Dialog */}
      <Dialog open={selectedTool !== null && !isToolExecOpen} onOpenChange={(open) => { if (!open) setSelectedTool(null) }}>
        <DialogContent className="max-w-lg">
          {selectedTool && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${TOOL_CATEGORY_COLORS[selectedTool.category]?.bg || 'bg-muted'} flex items-center justify-center`}>
                    <Wrench className={`w-5 h-5 ${TOOL_CATEGORY_COLORS[selectedTool.category]?.color || 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <DialogTitle className="text-base">{selectedTool.name.replace(/_/g, ' ')}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-[9px] h-4 px-1.5 ${TOOL_CATEGORY_COLORS[selectedTool.category]?.bg || ''} ${TOOL_CATEGORY_COLORS[selectedTool.category]?.color || ''} border-0`}>
                        {selectedTool.category}
                      </Badge>
                      {selectedTool.sandboxed && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
                          <Shield className="w-2 h-2" />
                          sandboxed
                        </Badge>
                      )}
                      {selectedTool.requiresApproval && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5 text-amber-600">
                          <Eye className="w-2 h-2" />
                          approval required
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedTool.description}</p>

                <Separator />

                {/* Permissions */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Required Permissions
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTool.requiredPermissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-[10px] h-5 px-2 gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Properties */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Timeout</div>
                    <div className="text-xs font-medium">{(selectedTool.timeout / 1000).toFixed(0)}s</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Rate Limit</div>
                    <div className="text-xs font-medium">{selectedTool.rateLimited ? `${selectedTool.maxExecutionsPerMinute}/min` : 'None'}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      setToolExecInput({})
                      setIsToolExecOpen(true)
                    }}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Execute Tool
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tool Execution Dialog */}
      <Dialog open={isToolExecOpen} onOpenChange={(open) => { if (!open) setIsToolExecOpen(false) }}>
        <DialogContent className="max-w-md">
          {selectedTool && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-primary" />
                  Execute {selectedTool.name.replace(/_/g, ' ')}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Provide input parameters for tool execution
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {/* Schema-based input fields */}
                {(() => {
                  // Get the tool schema from the registry data (we have it from the tools list)
                  // Since the API returns basic info, we'll create input fields for common tools
                  const schemaFields: Array<{ key: string; type: string; required: boolean; description?: string; enum?: string[] }> = []

                  // Map known tool schemas
                  const toolSchemas: Record<string, Array<{ key: string; type: string; required: boolean; description?: string; enum?: string[] }>> = {
                    web_search: [
                      { key: 'query', type: 'string', required: true, description: 'Search query' },
                      { key: 'maxResults', type: 'number', required: false, description: 'Max results (default: 5)' },
                    ],
                    forecast_calculate: [
                      { key: 'forecastId', type: 'string', required: true, description: 'Forecast ID' },
                      { key: 'scenario', type: 'string', required: true, enum: ['best', 'base', 'worst', 'custom'] },
                      { key: 'months', type: 'number', required: false, description: 'Months to project (default: 12)' },
                    ],
                    browser_navigate: [
                      { key: 'url', type: 'string', required: true, description: 'URL to navigate' },
                      { key: 'action', type: 'string', required: false, enum: ['screenshot', 'extract_text', 'extract_links'] },
                    ],
                    email_send: [
                      { key: 'to', type: 'string', required: true, description: 'Recipient email' },
                      { key: 'subject', type: 'string', required: true, description: 'Email subject' },
                      { key: 'body', type: 'string', required: true, description: 'Email body' },
                    ],
                    export_generate: [
                      { key: 'type', type: 'string', required: true, enum: ['plan', 'report', 'forecast', 'kpi'] },
                      { key: 'format', type: 'string', required: true, enum: ['pdf', 'docx', 'pptx', 'xlsx', 'csv'] },
                      { key: 'contentId', type: 'string', required: true, description: 'Content ID' },
                      { key: 'title', type: 'string', required: true, description: 'Document title' },
                    ],
                    crm_lookup: [
                      { key: 'query', type: 'string', required: true, description: 'Search query' },
                      { key: 'entity', type: 'string', required: false, enum: ['customer', 'deal', 'contact'] },
                    ],
                    analytics_query: [
                      { key: 'metric', type: 'string', required: true, description: 'Metric name' },
                      { key: 'period', type: 'string', required: false, description: 'Time period' },
                    ],
                    kpi_update: [
                      { key: 'kpiId', type: 'string', required: true, description: 'KPI ID' },
                      { key: 'value', type: 'number', required: true, description: 'New value' },
                    ],
                    notification_send: [
                      { key: 'userId', type: 'string', required: true, description: 'User ID' },
                      { key: 'title', type: 'string', required: true, description: 'Title' },
                      { key: 'message', type: 'string', required: true, description: 'Message' },
                    ],
                    code_execute: [
                      { key: 'language', type: 'string', required: true, enum: ['javascript', 'python', 'sql'] },
                      { key: 'code', type: 'string', required: true, description: 'Source code' },
                    ],
                  }

                  const fields = toolSchemas[selectedTool.name] || []
                  return fields.map((field) => (
                    <div key={field.key}>
                      <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                        {field.key}
                        {field.required && <span className="text-destructive ml-0.5">*</span>}
                      </label>
                      {field.enum ? (
                        <Select
                          value={toolExecInput[field.key] || ''}
                          onValueChange={(val) => setToolExecInput((prev) => ({ ...prev, [field.key]: val }))}
                        >
                          <SelectTrigger size="sm" className="h-7 text-[11px]">
                            <SelectValue placeholder={field.description || 'Select...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.enum.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'number' ? (
                        <Input
                          type="number"
                          value={toolExecInput[field.key] || ''}
                          onChange={(e) => setToolExecInput((prev) => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                          placeholder={field.description || field.key}
                          className="h-7 text-[11px]"
                        />
                      ) : field.key === 'code' || field.key === 'body' ? (
                        <Textarea
                          value={toolExecInput[field.key] || ''}
                          onChange={(e) => setToolExecInput((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.description || field.key}
                          className="min-h-[80px] text-[11px]"
                        />
                      ) : (
                        <Input
                          value={toolExecInput[field.key] || ''}
                          onChange={(e) => setToolExecInput((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.description || field.key}
                          className="h-7 text-[11px]"
                        />
                      )}
                    </div>
                  ))
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setIsToolExecOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={executeToolAction}
                  disabled={isExecutingTool}
                  className="gap-1.5"
                >
                  {isExecutingTool ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Execute
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
