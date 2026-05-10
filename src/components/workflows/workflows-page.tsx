'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Workflow,
  Play,
  Pause,
  Trash2,
  Plus,
  Clock,
  CheckCircle,
  Zap,
  RefreshCw,
  ChevronRight,
  ArrowUpDown,
  Bot,
  Wrench,
  GitBranch,
  Timer,
  Bell,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'

// --- Types ---
type TriggerType = 'manual' | 'scheduled' | 'event'
type StepType = 'agent' | 'tool' | 'condition' | 'delay' | 'notification'
type WorkflowStatus = 'active' | 'inactive' | 'error'
type RunStatus = 'success' | 'failed' | 'running' | 'pending'

interface WorkflowStep {
  id: string
  type: StepType
  name: string
  config: string
}

interface WorkflowItem {
  id: string
  name: string
  description: string
  triggerType: TriggerType
  status: WorkflowStatus
  schedule: string
  steps: WorkflowStep[]
  lastRun: string
  nextRun: string
  runCount: number
}

interface WorkflowRun {
  id: string
  workflowName: string
  status: RunStatus
  triggeredBy: string
  startedAt: string
  duration: string
  result: string
}

// API response types
interface ApiWorkflow {
  id: string
  name: string
  description: string | null
  trigger: string
  schedule: string | null
  isActive: boolean
  organizationId: string
  metadata: string
  createdAt: string
  updatedAt: string
  steps: ApiWorkflowStep[]
  runs: ApiWorkflowRun[]
}

interface ApiWorkflowStep {
  id: string
  workflowId: string
  type: string
  name: string
  config: string
  order: number
  isActive: boolean
}

interface ApiWorkflowRun {
  id: string
  workflowId: string
  status: string
  triggeredBy: string | null
  result: string | null
  startedAt: string | null
  completedAt: string | null
  metadata: string
  createdAt: string
}

// --- Quick Templates ---
const templateWorkflows = [
  { id: 'tw1', name: 'Weekly KPI Report', description: 'Generate and distribute weekly KPI reports', triggerType: 'scheduled' as TriggerType, schedule: '0 9 * * MON' },
  { id: 'tw2', name: 'Competitor Monitor', description: 'Monitor competitor activities and pricing', triggerType: 'scheduled' as TriggerType, schedule: '0 */6 * * *' },
  { id: 'tw3', name: 'Revenue Alert', description: 'Alert on revenue anomalies and thresholds', triggerType: 'event' as TriggerType, schedule: 'revenue.anomaly' },
  { id: 'tw4', name: 'Investor Update', description: 'Compile monthly investor updates', triggerType: 'manual' as TriggerType, schedule: '-' },
  { id: 'tw5', name: 'Slack Summary', description: 'Daily business summary to Slack', triggerType: 'scheduled' as TriggerType, schedule: '0 8 * * 1-5' },
]

// --- Helpers ---
const triggerConfig: Record<TriggerType, { label: string; color: string; icon: React.ElementType }> = {
  manual: { label: 'Manual', color: 'bg-gray-100 text-gray-800 dark:bg-gray-950/30 dark:text-gray-400', icon: Play },
  scheduled: { label: 'Scheduled', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400', icon: Clock },
  event: { label: 'Event', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400', icon: Zap },
}

const stepTypeConfig: Record<StepType, { label: string; color: string; icon: React.ElementType }> = {
  agent: { label: 'Agent', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400', icon: Bot },
  tool: { label: 'Tool', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400', icon: Wrench },
  condition: { label: 'Condition', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400', icon: GitBranch },
  delay: { label: 'Delay', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400', icon: Timer },
  notification: { label: 'Notification', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400', icon: Bell },
}

const statusColors: Record<WorkflowStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-950/30 dark:text-gray-400' },
  error: { label: 'Error', color: 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400' },
}

const runStatusConfig: Record<RunStatus, { label: string; color: string; icon: React.ElementType }> = {
  success: { label: 'Success', color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-600 dark:text-red-400', icon: AlertTriangle },
  running: { label: 'Running', color: 'text-amber-600 dark:text-amber-400', icon: Loader2 },
  pending: { label: 'Pending', color: 'text-gray-600 dark:text-gray-400', icon: Clock },
}

// Map API trigger to UI trigger type
function mapApiTrigger(trigger: string): TriggerType {
  if (trigger === 'scheduled') return 'scheduled'
  if (trigger === 'event') return 'event'
  return 'manual'
}

// Map API run status to UI run status
function mapApiRunStatus(status: string): RunStatus {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'failed'
  if (status === 'running') return 'running'
  return 'pending'
}

// Map API workflow to UI workflow
function mapApiWorkflow(api: ApiWorkflow): WorkflowItem {
  const triggerType = mapApiTrigger(api.trigger)
  const lastRun = api.runs.length > 0
    ? api.runs[0].startedAt
      ? new Date(api.runs[0].startedAt).toLocaleString()
      : new Date(api.runs[0].createdAt).toLocaleString()
    : '-'

  return {
    id: api.id,
    name: api.name,
    description: api.description || '',
    triggerType,
    status: api.isActive ? 'active' : 'inactive',
    schedule: api.schedule || (triggerType === 'manual' ? '-' : 'On trigger'),
    steps: api.steps.map((s) => ({
      id: s.id,
      type: s.type as StepType,
      name: s.name,
      config: s.config,
    })),
    lastRun,
    nextRun: triggerType === 'scheduled' && api.schedule ? 'Per schedule' : '-',
    runCount: api.runs.length,
  }
}

// Map API runs to UI runs
function mapApiRuns(apiWorkflows: ApiWorkflow[]): WorkflowRun[] {
  const allRuns: WorkflowRun[] = []
  for (const wf of apiWorkflows) {
    for (const run of wf.runs) {
      const startedAt = run.startedAt ? new Date(run.startedAt) : new Date(run.createdAt)
      const completedAt = run.completedAt ? new Date(run.completedAt) : null
      let duration = '-'
      if (completedAt && startedAt) {
        const diffMs = completedAt.getTime() - startedAt.getTime()
        const diffSec = Math.floor(diffMs / 1000)
        if (diffSec < 60) duration = `${diffSec}s`
        else {
          const diffMin = Math.floor(diffSec / 60)
          const remSec = diffSec % 60
          duration = `${diffMin}m ${remSec}s`
        }
      }

      allRuns.push({
        id: run.id,
        workflowName: wf.name,
        status: mapApiRunStatus(run.status),
        triggeredBy: run.triggeredBy || (mapApiTrigger(wf.trigger) === 'scheduled' ? 'Schedule' : mapApiTrigger(wf.trigger) === 'event' ? 'Event' : 'Manual'),
        startedAt: startedAt.toLocaleString(),
        duration,
        result: run.result || '-',
      })
    }
  }
  return allRuns.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

// --- Sub-Components ---
function WorkflowCard({
  workflow,
  onToggle,
  onDelete,
  onClick,
}: {
  workflow: WorkflowItem
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onClick: () => void
}) {
  const triggerInfo = triggerConfig[workflow.triggerType]
  const TriggerIcon = triggerInfo.icon
  const statusInfo = statusColors[workflow.status]

  return (
    <Card className="hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer" onClick={onClick}>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
              <Workflow className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">{workflow.name}</h3>
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{workflow.description}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${triggerInfo.color}`}>
                  <TriggerIcon className="w-2.5 h-2.5 mr-0.5" />
                  {triggerInfo.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {workflow.schedule}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {workflow.steps.length} steps
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {workflow.runCount} runs
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch
              checked={workflow.status === 'active'}
              onCheckedChange={() => onToggle(workflow.id)}
              className="scale-90"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(workflow.id)
              }}
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Steps preview */}
        <div className="mt-3 flex items-center gap-1 flex-wrap">
          {workflow.steps.map((step, i) => {
            const stepInfo = stepTypeConfig[step.type]
            const StepIcon = stepInfo.icon
            return (
              <div key={step.id} className="flex items-center gap-1">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 text-[10px]">
                  <StepIcon className="w-2.5 h-2.5" />
                  <span className="text-muted-foreground">{step.name}</span>
                </div>
                {i < workflow.steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function StepBuilder({
  steps,
  setSteps,
}: {
  steps: WorkflowStep[]
  setSteps: React.Dispatch<React.SetStateAction<WorkflowStep[]>>
}) {
  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: 'agent',
      name: '',
      config: '',
    }
    setSteps((prev) => [...prev, newStep])
  }

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  const updateStep = (id: string, field: keyof WorkflowStep, value: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  const moveStep = (id: string, direction: 'up' | 'down') => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const newSteps = [...prev]
      const temp = newSteps[idx]
      newSteps[idx] = newSteps[newIdx]
      newSteps[newIdx] = temp
      return newSteps
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Workflow Steps</Label>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addStep}>
          <Plus className="w-3 h-3 mr-1" />
          Add Step
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-6 border rounded-lg border-dashed">
          <Workflow className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No steps yet. Click &quot;Add Step&quot; to begin.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((step, index) => {
            const stepInfo = stepTypeConfig[step.type]
            const StepIcon = stepInfo.icon
            return (
              <div
                key={step.id}
                className="flex items-center gap-2 p-3 rounded-lg border bg-card group"
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-30"
                    onClick={() => moveStep(step.id, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 shrink-0">
                  <StepIcon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 min-w-0">
                  <Select
                    value={step.type}
                    onValueChange={(v) => updateStep(step.id, 'type', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="tool">Tool</SelectItem>
                      <SelectItem value="condition">Condition</SelectItem>
                      <SelectItem value="delay">Delay</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Step name"
                    value={step.name}
                    onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Configuration"
                    value={step.config}
                    onChange={(e) => updateStep(step.id, 'config', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeStep(step.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CreateWorkflowDialog({ onCreate, isCreating }: { onCreate: (workflow: Partial<WorkflowItem>) => void; isCreating: boolean }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('manual')
  const [schedule, setSchedule] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([])

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Please enter a workflow name')
      return
    }
    onCreate({
      name,
      description,
      triggerType,
      schedule: triggerType === 'scheduled' ? schedule : triggerType === 'event' ? `On: ${schedule}` : '-',
      steps,
      status: 'inactive',
    })
    setName('')
    setDescription('')
    setSchedule('')
    setSteps([])
  }

  return (
    <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Workflow className="w-5 h-5 text-primary" />
          Create Workflow
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label htmlFor="wf-name">Workflow Name</Label>
          <Input
            id="wf-name"
            placeholder="Enter workflow name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wf-desc">Description</Label>
          <Input
            id="wf-desc"
            placeholder="Brief description of the workflow..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {triggerType !== 'manual' && (
            <div className="space-y-2">
              <Label>{triggerType === 'scheduled' ? 'Cron Schedule' : 'Event Name'}</Label>
              <Input
                placeholder={triggerType === 'scheduled' ? '0 9 * * MON' : 'revenue.anomaly'}
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              />
            </div>
          )}
        </div>

        <Separator />

        <StepBuilder steps={steps} setSteps={setSteps} />

        <Button className="w-full" onClick={handleCreate} disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </>
          )}
        </Button>
      </div>
    </DialogContent>
  )
}

// --- Main Component ---
export function WorkflowsPage() {
  const { organization } = useAuthStore()
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'workflows' | 'history' | 'templates'>('workflows')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch workflows from API
  const fetchWorkflows = useCallback(async () => {
    if (!organization?.id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/workflows?organizationId=${organization.id}`)
      if (!res.ok) throw new Error('Failed to fetch workflows')
      const data = await res.json()

      const apiWorkflows = (data.workflows || []) as ApiWorkflow[]
      const mapped = apiWorkflows.map(mapApiWorkflow)
      setWorkflows(mapped)
      setRuns(mapApiRuns(apiWorkflows))
    } catch {
      toast.error('Failed to load workflows')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  // Toggle workflow active/inactive via API
  const handleToggle = async (id: string) => {
    const wf = workflows.find((w) => w.id === id)
    if (!wf) return
    const newState = wf.status === 'active' ? false : true
    setTogglingId(id)

    // Optimistic update
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, status: newState ? 'active' : 'inactive' }
          : w
      )
    )

    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newState }),
      })
      if (!res.ok) throw new Error('Failed to toggle workflow')
      toast.success(`Workflow "${wf.name}" ${newState ? 'activated' : 'paused'}`)
    } catch {
      // Revert on error
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, status: wf.status } : w
        )
      )
      toast.error('Failed to toggle workflow')
    } finally {
      setTogglingId(null)
    }
  }

  // Delete workflow via API
  const handleDelete = async (id: string) => {
    const wf = workflows.find((w) => w.id === id)
    if (!wf) return
    setDeletingId(id)

    try {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete workflow')

      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      setRuns((prev) => prev.filter((r) => r.workflowName !== wf.name))
      toast.success(`Workflow "${wf.name}" deleted`)
    } catch {
      toast.error('Failed to delete workflow')
    } finally {
      setDeletingId(null)
    }
  }

  // Create workflow via API
  const handleCreate = async (partial: Partial<WorkflowItem>) => {
    if (!organization?.id) return
    setIsCreating(true)

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          name: partial.name,
          description: partial.description,
          triggerType: partial.triggerType,
          schedule: partial.schedule !== '-' ? partial.schedule : null,
          steps: (partial.steps || []).map((s) => ({
            type: s.type,
            name: s.name,
            config: s.config,
          })),
        }),
      })

      if (!res.ok) throw new Error('Failed to create workflow')

      const data = await res.json()
      const newWorkflow = mapApiWorkflow(data.workflow)

      setWorkflows((prev) => [newWorkflow, ...prev])
      setDialogOpen(false)
      toast.success('Workflow created successfully!')
    } catch {
      toast.error('Failed to create workflow. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleTemplateCreate = (template: typeof templateWorkflows[number]) => {
    handleCreate({
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      schedule: template.schedule,
      steps: [
        { id: `s-${Date.now()}-1`, type: 'agent', name: 'Primary Agent', config: '' },
        { id: `s-${Date.now()}-2`, type: 'notification', name: 'Notify', config: '' },
      ],
    })
  }

  const handleRefresh = () => {
    fetchWorkflows()
    toast.success('Workflows refreshed')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" />
            Workflows
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automate repetitive business tasks with AI-powered workflows
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={isCreating}>
              <Plus className="w-4 h-4 mr-1" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <CreateWorkflowDialog onCreate={handleCreate} isCreating={isCreating} />
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {(['workflows', 'history', 'templates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'workflows' ? 'Workflows' : tab === 'history' ? 'Execution History' : 'Templates'}
          </button>
        ))}
      </div>

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading workflows...</span>
            </div>
          ) : workflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Workflow className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No workflows yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first workflow or use a template</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onClick={() => {
                    toast.info(`Viewing workflow: ${workflow.name}`)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Execution History</CardTitle>
                <CardDescription>Recent workflow runs and their results</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8" onClick={handleRefresh}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No execution history yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Workflow</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Triggered By</TableHead>
                      <TableHead className="text-xs">Started</TableHead>
                      <TableHead className="text-xs">Duration</TableHead>
                      <TableHead className="text-xs">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => {
                      const runStatus = runStatusConfig[run.status]
                      const RunIcon = runStatus.icon
                      return (
                        <TableRow key={run.id}>
                          <TableCell className="text-xs font-medium">{run.workflowName}</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1 text-xs ${runStatus.color}`}>
                              <RunIcon className={`w-3.5 h-3.5 ${run.status === 'running' ? 'animate-spin' : ''}`} />
                              {runStatus.label}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{run.triggeredBy}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{run.startedAt}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{run.duration}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{run.result}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Pre-built Templates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templateWorkflows.map((template) => {
              const triggerInfo = triggerConfig[template.triggerType]
              const TriggerIcon = triggerInfo.icon
              return (
                <Card
                  key={template.id}
                  className="hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => handleTemplateCreate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Workflow className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{template.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${triggerInfo.color}`}>
                            <TriggerIcon className="w-2.5 h-2.5 mr-0.5" />
                            {triggerInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{template.description}</p>
                    <Button variant="outline" size="sm" className="w-full mt-3 h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
