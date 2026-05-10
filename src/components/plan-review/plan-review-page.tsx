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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import {
  ShieldCheck,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  ArrowRight,
  ArrowDown,
  ChevronRight,
  Eye,
  Landmark,
  Brain,
  BarChart3,
  GitBranch,
  AlertCircle,
  XCircle,
  Info,
  Lightbulb,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Search,
  Building2,
  Scale,
  UserCheck,
  GitMerge,
  Sparkles,
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'

// ─── Types ──────────────────────────────────────────────────────────────────

type ReviewStatus = 'pending' | 'reviewing' | 'completed' | 'needs_revision'
type ReviewerType = 'lender' | 'investor' | 'auditor' | 'internal'
type FindingType = 'discrepancy' | 'red_flag' | 'strength' | 'recommendation' | 'data_gap'
type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

interface PlanReviewFinding {
  id: string
  reviewId: string
  type: string
  severity: string
  section: string
  description: string
  evidence: string | null
  suggestion: string | null
  narrativeRef: string | null
  financialRef: string | null
  resolved: boolean
  metadata: string
  createdAt: string
}

interface PlanReview {
  id: string
  planId: string
  organizationId: string
  reviewerType: string
  overallScore: number
  narrativeScore: number
  financialScore: number
  consistencyScore: number
  riskScore: number
  fundabilityScore: number
  summary: string
  discrepancies: string
  recommendations: string
  redFlags: string
  strengths: string
  status: string
  metadata: string
  createdAt: string
  updatedAt: string
  findings: PlanReviewFinding[]
}

interface PlanOption {
  id: string
  title: string
  status: string
  createdAt: string
}

interface ReviewDetail {
  review: PlanReview & {
    lenderQuestions: string[]
  }
  findingsByType: Record<string, PlanReviewFinding[]>
  findingsBySeverity: Record<string, PlanReviewFinding[]>
  stats: {
    totalFindings: number
    resolvedFindings: number
    unresolvedFindings: number
    criticalFindings: number
    highFindings: number
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const REVIEWER_CONFIG: Record<ReviewerType, { label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
  lender: {
    label: 'Lender',
    icon: Landmark,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    description: 'Reviews as a bank/lender — focuses on fundability, cash flow, collateral, and risk mitigation',
  },
  investor: {
    label: 'Investor',
    icon: TrendingUp,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
    description: 'Reviews as a VC/angel — focuses on growth potential, market size, team, and scalability',
  },
  auditor: {
    label: 'Auditor',
    icon: Scale,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    description: 'Reviews as an auditor — focuses on compliance, accuracy, completeness, and internal controls',
  },
  internal: {
    label: 'Internal',
    icon: UserCheck,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
    description: 'Internal review — comprehensive check for team alignment and operational readiness',
  },
}

const FINDING_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  discrepancy: { label: 'Discrepancies', icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  red_flag: { label: 'Red Flags', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  strength: { label: 'Strengths', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  recommendation: { label: 'Recommendations', icon: Lightbulb, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  data_gap: { label: 'Data Gaps', icon: HelpCircle, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  high: { label: 'High', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  medium: { label: 'Medium', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  low: { label: 'Low', color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  info: { label: 'Info', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
}

const PIPELINE_STEPS = [
  {
    id: 'narrative',
    label: 'Narrative Agent',
    icon: FileText,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    description: 'Analyzes written narrative for clarity, completeness, persuasiveness, and consistency',
  },
  {
    id: 'financial',
    label: 'Financial Agent',
    icon: BarChart3,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    description: 'Evaluates financial projections, assumptions, revenue model, and cash management',
  },
  {
    id: 'crosscheck',
    label: 'Cross-Check Agent',
    icon: GitMerge,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    description: 'Compares narrative claims vs financial data to find discrepancies and misalignments',
  },
]

// ─── Helper Functions ───────────────────────────────────────────────────────

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

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-amber-500'
  if (score >= 40) return 'text-orange-500'
  return 'text-red-500'
}

function getScoreStroke(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Exceptional'
  if (score >= 80) return 'Strong'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Adequate'
  if (score >= 50) return 'Fair'
  if (score >= 40) return 'Weak'
  if (score >= 30) return 'Poor'
  return 'Critical'
}

function safeParseJSON(str: string): unknown {
  try {
    return JSON.parse(str || '{}')
  } catch {
    return {}
  }
}

// ─── Circular Gauge Component ───────────────────────────────────────────────

function CircularGauge({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const strokeColor = getScoreStroke(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={6}
            className="text-muted/30"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight max-w-[80px]">{label}</span>
    </div>
  )
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function ReviewStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-muted text-muted-foreground border-border' },
    reviewing: { label: 'Reviewing', className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
    completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    needs_revision: { label: 'Needs Revision', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  }
  const c = config[status] || config.pending
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${c.className}`}>
      {status === 'reviewing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {status === 'completed' && <CheckCircle className="w-2.5 h-2.5" />}
      {status === 'pending' && <Clock className="w-2.5 h-2.5" />}
      {status === 'needs_revision' && <AlertCircle className="w-2.5 h-2.5" />}
      {c.label}
    </Badge>
  )
}

// ─── Severity Badge ─────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const c = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
  return (
    <Badge variant="outline" className={`text-[9px] h-5 px-1.5 ${c.color} ${c.bg} ${c.border}`}>
      {c.label}
    </Badge>
  )
}

// ─── Finding Card ───────────────────────────────────────────────────────────

function FindingCard({
  finding,
  onToggleResolve,
}: {
  finding: PlanReviewFinding
  onToggleResolve: (id: string, resolved: boolean) => void
}) {
  const typeConfig = FINDING_TYPE_CONFIG[finding.type] || FINDING_TYPE_CONFIG.recommendation
  const TypeIcon = typeConfig.icon

  return (
    <div className={`rounded-lg border p-3 transition-colors ${finding.resolved ? 'bg-muted/30 opacity-70' : 'bg-card'}`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-7 h-7 rounded-md ${typeConfig.bg} flex items-center justify-center mt-0.5`}>
          <TypeIcon className={`w-3.5 h-3.5 ${typeConfig.color}`} />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={finding.severity} />
            <Badge variant="secondary" className="text-[9px] h-5">{finding.section}</Badge>
            {finding.resolved && (
              <Badge className="text-[9px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Resolved
              </Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed">{finding.description}</p>
          {finding.evidence && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <span className="font-medium">Evidence:</span> {finding.evidence}
            </div>
          )}
          {finding.suggestion && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <span className="font-medium">Suggestion:</span> {finding.suggestion}
            </div>
          )}
          {(finding.narrativeRef || finding.financialRef) && (
            <div className="flex gap-2 flex-wrap">
              {finding.narrativeRef && (
                <div className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  Narrative: {finding.narrativeRef}
                </div>
              )}
              {finding.financialRef && (
                <div className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Financial: {finding.financialRef}
                </div>
              )}
            </div>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-7 w-7 p-0"
                onClick={() => onToggleResolve(finding.id, !finding.resolved)}
              >
                {finding.resolved ? (
                  <ToggleRight className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {finding.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

// ─── Cross-Check Visualization ──────────────────────────────────────────────

function CrossCheckVisualization({ findings }: { findings: PlanReviewFinding[] }) {
  const discrepancyFindings = findings.filter(
    (f) => f.type === 'discrepancy' && (f.narrativeRef || f.financialRef)
  )

  if (discrepancyFindings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
        <p className="text-sm font-medium">No discrepancies found</p>
        <p className="text-xs">Narrative and financials appear to be aligned</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {discrepancyFindings.map((finding) => (
        <div key={finding.id} className="flex items-stretch gap-0">
          {/* Narrative side */}
          <div className="flex-1 rounded-l-lg border border-r-0 border-violet-500/30 bg-violet-500/5 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3 h-3 text-violet-500" />
              <span className="text-[10px] font-semibold uppercase text-violet-600 dark:text-violet-400">Narrative</span>
            </div>
            <p className="text-xs leading-relaxed">
              {finding.narrativeRef || 'No narrative reference'}
            </p>
          </div>
          {/* Arrow */}
          <div className="flex items-center justify-center w-10 shrink-0 bg-muted/30 border-y border-orange-500/30">
            <div className="flex flex-col items-center">
              <ArrowRight className="w-4 h-4 text-orange-500" />
              <span className="text-[8px] text-orange-600 dark:text-orange-400 font-bold mt-0.5">MISMATCH</span>
            </div>
          </div>
          {/* Financial side */}
          <div className="flex-1 rounded-r-lg border border-l-0 border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Financial</span>
            </div>
            <p className="text-xs leading-relaxed">
              {finding.financialRef || 'No financial reference'}
            </p>
          </div>
        </div>
      ))}
      {discrepancyFindings.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {discrepancyFindings.length} discrepancy{discrepancyFindings.length !== 1 ? 's' : ''} between narrative and financials
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Pipeline Visualization ─────────────────────────────────────────────────

function PipelineVisualization({ review }: { review: PlanReview }) {
  const isReviewing = review.status === 'reviewing'
  const isCompleted = review.status === 'completed'
  const isFailed = review.status === 'needs_revision'

  // Determine which steps are done based on review state
  const stepStatuses = PIPELINE_STEPS.map((step, idx) => {
    if (isCompleted) return 'completed' as const
    if (isFailed) return idx === 2 ? 'failed' as const : 'completed' as const
    if (isReviewing) {
      // Simulate pipeline progress — first two done, third in progress
      if (idx < 2) return 'completed' as const
      return 'running' as const
    }
    return 'pending' as const
  })

  // Count findings by agent step
  const narrativeFindings = review.findings.filter((f) =>
    ['executive_summary', 'market_analysis', 'competitive', 'team', 'product', 'overview'].includes(f.section)
  )
  const financialFindings = review.findings.filter((f) => f.section === 'financial')
  const crossCheckFindings = review.findings.filter((f) =>
    f.type === 'discrepancy' || f.section === 'cross_check'
  )

  const findingCounts = [narrativeFindings.length, financialFindings.length, crossCheckFindings.length]

  return (
    <div className="space-y-3">
      {PIPELINE_STEPS.map((step, idx) => {
        const stepStatus = stepStatuses[idx]
        const StepIcon = step.icon
        const findingsCount = findingCounts[idx]

        return (
          <div key={step.id}>
            <div className={`rounded-lg border p-4 transition-all ${
              stepStatus === 'running'
                ? `border-sky-500/40 bg-sky-500/5 shadow-sm`
                : stepStatus === 'completed'
                ? `border-emerald-500/20 bg-emerald-500/5`
                : stepStatus === 'failed'
                ? `border-red-500/30 bg-red-500/5`
                : `border-border bg-card`
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center border ${step.border} shrink-0`}>
                  <StepIcon className={`w-5 h-5 ${step.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    {stepStatus === 'running' && (
                      <Badge className="text-[9px] bg-sky-500/10 text-sky-600 border-sky-500/20" variant="outline">
                        <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" /> Running
                      </Badge>
                    )}
                    {stepStatus === 'completed' && (
                      <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                        <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Done
                      </Badge>
                    )}
                    {stepStatus === 'failed' && (
                      <Badge className="text-[9px] bg-red-500/10 text-red-600 border-red-500/20" variant="outline">
                        <XCircle className="w-2.5 h-2.5 mr-0.5" /> Failed
                      </Badge>
                    )}
                    {stepStatus === 'pending' && (
                      <Badge className="text-[9px] bg-muted text-muted-foreground border-border" variant="outline">
                        <Clock className="w-2.5 h-2.5 mr-0.5" /> Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                {findingsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {findingsCount} finding{findingsCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {/* Progress bar for running step */}
              {stepStatus === 'running' && (
                <div className="mt-3">
                  <Progress value={66} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">Processing...</p>
                </div>
              )}
            </div>
            {idx < PIPELINE_STEPS.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PlanReviewPage() {
  const { user, organization } = useAuthStore()
  const organizationId = organization?.id || ''
  const userId = user?.id

  // ─── State ──────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<PlanReview[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(true)
  const [selectedReview, setSelectedReview] = useState<PlanReview | null>(null)
  const [reviewDetail, setReviewDetail] = useState<ReviewDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  // New Review Dialog
  const [isNewReviewOpen, setIsNewReviewOpen] = useState(false)
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [selectedReviewerType, setSelectedReviewerType] = useState<ReviewerType>('lender')
  const [isCreatingReview, setIsCreatingReview] = useState(false)

  // Findings filter
  const [findingsFilter, setFindingsFilter] = useState<string>('all')

  // ─── Fetch Reviews ──────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    if (!organizationId) return
    setIsLoadingReviews(true)
    try {
      const res = await fetch(`/api/plan-reviews?organizationId=${organizationId}&userId=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch reviews')
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch {
      setReviews([])
      toast.error('Failed to load plan reviews')
    } finally {
      setIsLoadingReviews(false)
    }
  }, [organizationId])

  // ─── Fetch Review Detail ────────────────────────────────────────────
  const fetchReviewDetail = useCallback(async (reviewId: string) => {
    setIsLoadingDetail(true)
    try {
      const res = await fetch(`/api/plan-reviews/${reviewId}`)
      if (!res.ok) throw new Error('Failed to fetch review detail')
      const data = await res.json()
      setReviewDetail(data)
      setSelectedReview(data.review)
    } catch {
      toast.error('Failed to load review details')
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  // ─── Fetch Plans (for selector) ─────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    if (!organizationId) return
    try {
      const res = await fetch(`/api/plans?organizationId=${organizationId}&userId=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch plans')
      const data = await res.json()
      setPlans((data.plans || []).map((p: { id: string; title: string; status: string; createdAt: string }) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        createdAt: p.createdAt,
      })))
    } catch {
      setPlans([])
    }
  }, [organizationId])

  // ─── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useEffect(() => {
    if (isNewReviewOpen) {
      fetchPlans()
    }
  }, [isNewReviewOpen, fetchPlans])

  // Poll for reviewing status
  useEffect(() => {
    if (!selectedReview || selectedReview.status !== 'reviewing') return
    const interval = setInterval(() => {
      fetchReviewDetail(selectedReview.id)
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedReview, fetchReviewDetail])

  // ─── Create Review ──────────────────────────────────────────────────
  const createReview = async () => {
    if (!selectedPlanId || !organizationId || isCreatingReview) return
    setIsCreatingReview(true)
    try {
      const res = await fetch('/api/plan-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          organizationId,
          reviewerType: selectedReviewerType,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create review')
      }
      const data = await res.json()
      toast.success('Review pipeline started! The AI agents are now analyzing the plan.')
      setIsNewReviewOpen(false)
      setSelectedPlanId('')
      setSelectedReviewerType('lender')
      fetchReviews()
      // Auto-select the new review
      if (data.review?.id) {
        setTimeout(() => {
          fetchReviewDetail(data.review.id)
          setActiveTab('detail')
        }, 500)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create review')
    } finally {
      setIsCreatingReview(false)
    }
  }

  // ─── Toggle Finding Resolution ──────────────────────────────────────
  const toggleFindingResolved = async (findingId: string, resolve: boolean) => {
    if (!selectedReview) return
    try {
      const res = await fetch(`/api/plan-reviews/${selectedReview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [resolve ? 'resolveFindings' : 'unresolveFindings']: [findingId],
        }),
      })
      if (!res.ok) throw new Error('Failed to update finding')
      // Update local state
      setReviewDetail((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          review: {
            ...prev.review,
            findings: prev.review.findings.map((f) =>
              f.id === findingId ? { ...f, resolved: resolve } : f
            ),
          },
          findingsByType: Object.fromEntries(
            Object.entries(prev.findingsByType).map(([type, findings]) => [
              type,
              findings.map((f) => f.id === findingId ? { ...f, resolved: resolve } : f),
            ])
          ),
          stats: {
            ...prev.stats,
            resolvedFindings: prev.review.findings.filter((f) =>
              f.id === findingId ? resolve : f.resolved
            ).length,
            unresolvedFindings: prev.review.findings.filter((f) =>
              f.id === findingId ? !resolve : !f.resolved
            ).length,
          },
        }
      })
      toast.success(resolve ? 'Finding marked as resolved' : 'Finding marked as unresolved')
    } catch {
      toast.error('Failed to update finding')
    }
  }

  // ─── Select Review ──────────────────────────────────────────────────
  const selectReview = (review: PlanReview) => {
    setSelectedReview(review)
    fetchReviewDetail(review.id)
    setActiveTab('detail')
  }

  // ─── Radar Chart Data ───────────────────────────────────────────────
  const radarData = selectedReview
    ? [
        { metric: 'Overall', score: selectedReview.overallScore },
        { metric: 'Narrative', score: selectedReview.narrativeScore },
        { metric: 'Financial', score: selectedReview.financialScore },
        { metric: 'Consistency', score: selectedReview.consistencyScore },
        { metric: 'Risk', score: 100 - selectedReview.riskScore },
        { metric: 'Fundability', score: selectedReview.fundabilityScore },
      ]
    : []

  // ─── Filtered Findings ──────────────────────────────────────────────
  const filteredFindings = reviewDetail
    ? findingsFilter === 'all'
      ? reviewDetail.review.findings
      : reviewDetail.findingsByType[findingsFilter] || []
    : []

  // ─── Loading Skeleton ───────────────────────────────────────────────
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-3" />
          <div className="h-3 bg-muted rounded w-2/3 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  )

  // ─── Empty State ────────────────────────────────────────────────────
  const EmptyState = ({ title, description }: { title: string; description: string }) => (
    <div className="text-center py-12">
      <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm mx-auto">{description}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Plan Review Agent
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-agent AI review — reads your plan like a lender would
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
            {reviews.filter((r) => r.status === 'reviewing').length} reviewing
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReviews()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsNewReviewOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Start New Review
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="detail" className="gap-1.5" disabled={!selectedReview}>
            <FileText className="w-3.5 h-3.5" />
            Detail
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5" disabled={!selectedReview}>
            <GitBranch className="w-3.5 h-3.5" />
            LangGraph Flow
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: DASHBOARD */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="dashboard" className="space-y-4">
          {isLoadingReviews ? (
            <LoadingSkeleton />
          ) : reviews.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description="Start a new review to have AI agents analyze your business plan from a lender's perspective"
            />
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{reviews.length}</p>
                      <p className="text-[10px] text-muted-foreground">Total Reviews</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{reviews.filter((r) => r.status === 'completed').length}</p>
                      <p className="text-[10px] text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{reviews.filter((r) => r.status === 'reviewing').length}</p>
                      <p className="text-[10px] text-muted-foreground">In Progress</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">
                        {reviews.filter((r) => r.status === 'needs_revision').length}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Needs Revision</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Review Cards */}
              <div className="space-y-3">
                {reviews.map((review) => {
                  const reviewerCfg = REVIEWER_CONFIG[review.reviewerType as ReviewerType] || REVIEWER_CONFIG.lender
                  const ReviewerIcon = reviewerCfg.icon
                  const criticalCount = review.findings.filter((f) => f.severity === 'critical').length
                  const highCount = review.findings.filter((f) => f.severity === 'high').length
                  const resolvedCount = review.findings.filter((f) => f.resolved).length

                  return (
                    <Card
                      key={review.id}
                      className="cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => selectReview(review)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Score Gauge */}
                          <CircularGauge score={review.overallScore} label="Overall" size={64} />

                          {/* Review Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <ReviewStatusBadge status={review.status} />
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                <ReviewerIcon className={`w-3 h-3 ${reviewerCfg.color}`} />
                                {reviewerCfg.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Plan: {review.planId.slice(0, 8)}... &bull; {timeAgo(review.createdAt)}
                            </p>

                            {/* Score Pills */}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="text-muted-foreground">Consistency:</span>
                                <span className={`font-medium ${getScoreColor(review.consistencyScore)}`}>{review.consistencyScore}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="text-muted-foreground">Fundability:</span>
                                <span className={`font-medium ${getScoreColor(review.fundabilityScore)}`}>{review.fundabilityScore}</span>
                              </div>
                            </div>

                            {/* Findings Summary */}
                            {review.findings.length > 0 && (
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {criticalCount > 0 && (
                                  <Badge className="text-[9px] bg-red-500/10 text-red-600 border-red-500/20" variant="outline">
                                    {criticalCount} critical
                                  </Badge>
                                )}
                                {highCount > 0 && (
                                  <Badge className="text-[9px] bg-orange-500/10 text-orange-600 border-orange-500/20" variant="outline">
                                    {highCount} high
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-[9px]">
                                  {review.findings.length} findings
                                </Badge>
                                {resolvedCount > 0 && (
                                  <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                                    {resolvedCount} resolved
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Chevron */}
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: DETAIL */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="detail" className="space-y-4">
          {isLoadingDetail ? (
            <LoadingSkeleton />
          ) : !reviewDetail || !selectedReview ? (
            <EmptyState
              title="No review selected"
              description="Select a review from the dashboard to view its detailed analysis"
            />
          ) : (
            <>
              {/* Review Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ReviewStatusBadge status={selectedReview.status} />
                  <Badge variant="secondary" className="text-xs gap-1">
                    {(() => {
                      const cfg = REVIEWER_CONFIG[selectedReview.reviewerType as ReviewerType] || REVIEWER_CONFIG.lender
                      const Icon = cfg.icon
                      return <><Icon className={`w-3 h-3 ${cfg.color}`} />{cfg.label}</>
                    })()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(selectedReview.createdAt)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('dashboard')}
                  className="gap-1.5 w-fit"
                >
                  Back to Dashboard
                </Button>
              </div>

              {/* Score Overview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Score Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row gap-6 items-center">
                    {/* Circular Gauges */}
                    <div className="flex flex-wrap justify-center gap-4">
                      <CircularGauge score={selectedReview.overallScore} label="Overall" size={90} />
                      <CircularGauge score={selectedReview.narrativeScore} label="Narrative" size={90} />
                      <CircularGauge score={selectedReview.financialScore} label="Financial" size={90} />
                      <CircularGauge score={selectedReview.consistencyScore} label="Consistency" size={90} />
                      <CircularGauge score={selectedReview.riskScore} label="Risk" size={90} />
                      <CircularGauge score={selectedReview.fundabilityScore} label="Fundability" size={90} />
                    </div>

                    {/* Radar Chart */}
                    <div className="w-full lg:w-64 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis
                            dataKey="metric"
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Radar
                            name="Scores"
                            dataKey="score"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Score Labels */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
                    {[
                      { label: 'Overall', score: selectedReview.overallScore },
                      { label: 'Narrative', score: selectedReview.narrativeScore },
                      { label: 'Financial', score: selectedReview.financialScore },
                      { label: 'Consistency', score: selectedReview.consistencyScore },
                      { label: 'Risk (inverted)', score: selectedReview.riskScore },
                      { label: 'Fundability', score: selectedReview.fundabilityScore },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-2 rounded-lg bg-muted/30">
                        <p className={`text-lg font-bold ${getScoreColor(s.score)}`}>{s.score}</p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                        <p className="text-[9px] text-muted-foreground">{getScoreLabel(s.score)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Executive Summary */}
              {selectedReview.summary && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{selectedReview.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Findings Panel */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      Findings
                      <Badge variant="secondary" className="text-[10px]">
                        {reviewDetail.stats.totalFindings} total
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        variant={findingsFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        className="text-[10px] h-6 px-2"
                        onClick={() => setFindingsFilter('all')}
                      >
                        All ({reviewDetail.stats.totalFindings})
                      </Button>
                      {Object.entries(FINDING_TYPE_CONFIG).map(([type, cfg]) => {
                        const count = (reviewDetail.findingsByType[type] || []).length
                        if (count === 0) return null
                        return (
                          <Button
                            key={type}
                            variant={findingsFilter === type ? 'default' : 'outline'}
                            size="sm"
                            className="text-[10px] h-6 px-2 gap-1"
                            onClick={() => setFindingsFilter(type)}
                          >
                            <cfg.icon className="w-3 h-3" />
                            {cfg.label} ({count})
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                  {/* Stats Bar */}
                  <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span>{reviewDetail.stats.resolvedFindings} resolved</span>
                    <span>{reviewDetail.stats.unresolvedFindings} unresolved</span>
                    <span className="text-red-500">{reviewDetail.stats.criticalFindings} critical</span>
                    <span className="text-orange-500">{reviewDetail.stats.highFindings} high</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2 pr-3">
                      {filteredFindings.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-xs">
                          No findings in this category
                        </div>
                      ) : (
                        filteredFindings.map((finding) => (
                          <FindingCard
                            key={finding.id}
                            finding={finding}
                            onToggleResolve={toggleFindingResolved}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Narrative vs Financial Cross-Check */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GitMerge className="w-4 h-4 text-primary" />
                    Narrative vs Financial Cross-Check
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Visual comparison showing where narrative claims and financial data don&apos;t align
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CrossCheckVisualization findings={selectedReview.findings} />
                </CardContent>
              </Card>

              {/* Lender Questions */}
              {reviewDetail.review.lenderQuestions && reviewDetail.review.lenderQuestions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      Lender Questions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Questions a lender would likely ask before approving funding
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reviewDetail.review.lenderQuestions.map((question, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{question}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Discrepancies / Red Flags / Strengths / Recommendations Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Red Flags */}
                {selectedReview.redFlags && (() => {
                  const items = safeParseJSON(selectedReview.redFlags)
                  if (!Array.isArray(items) || items.length === 0) return null
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          Red Flags
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5">
                          {(items as string[]).map((item, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Strengths */}
                {selectedReview.strengths && (() => {
                  const items = safeParseJSON(selectedReview.strengths)
                  if (!Array.isArray(items) || items.length === 0) return null
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5">
                          {(items as string[]).map((item, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Recommendations */}
                {selectedReview.recommendations && (() => {
                  const items = safeParseJSON(selectedReview.recommendations)
                  if (!Array.isArray(items) || items.length === 0) return null
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <Lightbulb className="w-4 h-4" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5">
                          {(items as string[]).map((item, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Discrepancies */}
                {selectedReview.discrepancies && (() => {
                  const items = safeParseJSON(selectedReview.discrepancies)
                  if (!Array.isArray(items) || items.length === 0) return null
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-600 dark:text-orange-400">
                          <AlertCircle className="w-4 h-4" />
                          Discrepancies
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5">
                          {(items as string[]).map((item, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                })()}
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: LANGGRAPH FLOW */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="pipeline" className="space-y-4">
          {!selectedReview ? (
            <EmptyState
              title="No review selected"
              description="Select a review from the dashboard to view the LangGraph pipeline"
            />
          ) : (
            <>
              {/* Pipeline Header */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    LangGraph Review Pipeline
                  </CardTitle>
                  <CardDescription className="text-xs">
                    3-agent sequential review: Narrative → Financial → Cross-Check
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Pipeline Visualization */}
                  <PipelineVisualization review={selectedReview} />
                </CardContent>
              </Card>

              {/* Agent Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PIPELINE_STEPS.map((step) => {
                  const StepIcon = step.icon
                  const stepFindings = step.id === 'narrative'
                    ? selectedReview.findings.filter((f) =>
                        ['executive_summary', 'market_analysis', 'competitive', 'team', 'product', 'overview'].includes(f.section)
                      )
                    : step.id === 'financial'
                    ? selectedReview.findings.filter((f) => f.section === 'financial')
                    : selectedReview.findings.filter((f) => f.type === 'discrepancy' || f.section === 'cross_check')

                  return (
                    <Card key={step.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md ${step.bg} flex items-center justify-center`}>
                            <StepIcon className={`w-3 h-3 ${step.color}`} />
                          </div>
                          {step.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[10px] text-muted-foreground mb-2">{step.description}</p>
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium">
                            Findings: {stepFindings.length}
                          </p>
                          {stepFindings.length > 0 && (
                            <ScrollArea className="max-h-32">
                              <div className="space-y-1 pr-2">
                                {stepFindings.slice(0, 5).map((f) => (
                                  <div key={f.id} className="text-[10px] flex items-start gap-1.5">
                                    <SeverityBadge severity={f.severity} />
                                    <span className="leading-tight">{f.description.length > 60 ? f.description.slice(0, 60) + '...' : f.description}</span>
                                  </div>
                                ))}
                                {stepFindings.length > 5 && (
                                  <p className="text-[10px] text-muted-foreground">
                                    +{stepFindings.length - 5} more
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Review Progress (when reviewing) */}
              {selectedReview.status === 'reviewing' && (
                <Card className="border-sky-500/30 bg-sky-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-sky-600 dark:text-sky-400">Review In Progress</p>
                        <p className="text-xs text-muted-foreground">
                          The AI agents are analyzing the business plan. This typically takes 30-60 seconds.
                          The page will refresh automatically when complete.
                        </p>
                      </div>
                    </div>
                    <Progress value={66} className="h-1.5 mt-3" />
                  </CardContent>
                </Card>
              )}

              {/* Review Complete Summary */}
              {selectedReview.status === 'completed' && (
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Review Complete</p>
                        <p className="text-xs text-muted-foreground">
                          All 3 agents have completed their analysis. Overall score: <span className={`font-bold ${getScoreColor(selectedReview.overallScore)}`}>{selectedReview.overallScore}/100</span> ({getScoreLabel(selectedReview.overallScore)}).
                          {selectedReview.findings.length > 0 && ` ${selectedReview.findings.length} findings generated.`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Needs Revision */}
              {selectedReview.status === 'needs_revision' && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Needs Revision</p>
                        <p className="text-xs text-muted-foreground">
                          The review pipeline encountered issues. The plan may need significant revisions before re-submission.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* NEW REVIEW DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isNewReviewOpen} onOpenChange={setIsNewReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Start New Review
            </DialogTitle>
            <DialogDescription>
              Select a business plan and reviewer type to begin the AI review pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Plan Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Business Plan</label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a business plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      No business plans found. Create one first.
                    </div>
                  ) : (
                    plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span>{plan.title}</span>
                          <Badge variant="secondary" className="text-[9px] ml-auto">{plan.status}</Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Reviewer Type */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Reviewer Persona</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(REVIEWER_CONFIG) as [ReviewerType, typeof REVIEWER_CONFIG[ReviewerType]][]).map(([type, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedReviewerType(type)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                        selectedReviewerType === type
                          ? `border-primary/40 ${cfg.bg}`
                          : 'border-border hover:border-primary/20'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                      <div>
                        <p className="text-xs font-medium">{cfg.label}</p>
                        <p className="text-[9px] text-muted-foreground leading-tight">{cfg.description.slice(0, 50)}...</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Pipeline Preview */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Review Pipeline</p>
              <div className="flex items-center gap-1">
                {PIPELINE_STEPS.map((step, idx) => {
                  const StepIcon = step.icon
                  return (
                    <div key={step.id} className="flex items-center gap-1">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-card border">
                        <StepIcon className={`w-3 h-3 ${step.color}`} />
                        <span className="text-[9px] font-medium">{step.label.replace(' Agent', '')}</span>
                      </div>
                      {idx < PIPELINE_STEPS.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsNewReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createReview}
              disabled={!selectedPlanId || isCreatingReview}
              className="gap-1.5"
            >
              {isCreatingReview ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Start Review
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
