'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Icons
import {
  Plus,
  Lightbulb,
  Sparkles,
  Loader2,
  Save,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Target,
  TrendingUp,
  Shield,
  Brain,
  BarChart3,
  Globe,
  Info,
  ExternalLink,
  X,
  FileText,
} from 'lucide-react'

// Charts
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// ==========================================
// TYPES
// ==========================================

interface CanvasBlock {
  id: string
  type: string
  title: string
  content: string
  order: number
}

interface IdeaCanvas {
  id: string
  title: string
  status: 'draft' | 'validated' | 'needs_rework'
  organizationId: string
  blocks: CanvasBlock[]
  validationScore: number | null
  validationData: ValidationData | null
  benchmarks: BenchmarkData[]
  createdAt: string
  updatedAt: string
}

interface ValidationData {
  overallScore: number
  categoryScores: CategoryScore[]
  riskAssessment: RiskAssessment[]
  questions: ValidationQuestion[]
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

interface CategoryScore {
  category: string
  score: number
  maxScore: number
  description: string
}

interface RiskAssessment {
  dimension: string
  level: number
  description: string
}

interface ValidationQuestion {
  question: string
  answer: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

interface BenchmarkData {
  id: string
  metric: string
  industryAvg: number | string
  yourValue: number | string
  percentile: number | string
  geography: string
  source: string
  sourceUrl?: string
  category: string
}

// ==========================================
// CONSTANTS
// ==========================================

const CANVAS_BLOCKS: { type: string; title: string; icon: React.ElementType; color: string; description: string }[] = [
  { type: 'problem', title: 'Problem', icon: AlertTriangle, color: 'text-red-500', description: 'Top 3 problems your customers face' },
  { type: 'solution', title: 'Solution', icon: Lightbulb, color: 'text-amber-500', description: 'Top 3 features that solve the problems' },
  { type: 'unique_value_proposition', title: 'Unique Value Proposition', icon: Target, color: 'text-emerald-500', description: 'A clear statement of your unique value' },
  { type: 'target_market', title: 'Target Market', icon: TrendingUp, color: 'text-blue-500', description: 'Your target customers and early adopters' },
  { type: 'channels', title: 'Channels', icon: Globe, color: 'text-purple-500', description: 'Path to customers and distribution' },
  { type: 'revenue_streams', title: 'Revenue Streams', icon: BarChart3, color: 'text-pink-500', description: 'Revenue model and pricing' },
  { type: 'cost_structure', title: 'Cost Structure', icon: Shield, color: 'text-orange-500', description: 'Fixed and variable costs' },
  { type: 'competitive_landscape', title: 'Competitive Landscape', icon: Brain, color: 'text-cyan-500', description: 'Existing alternatives and your advantage' },
  { type: 'business_model', title: 'Business Model', icon: Sparkles, color: 'text-violet-500', description: 'How the business creates, delivers & captures value' },
]

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', variant: 'secondary', color: 'text-slate-500', icon: FileText },
  validated: { label: 'Validated', variant: 'default', color: 'text-emerald-500', icon: CheckCircle },
  needs_rework: { label: 'Needs Rework', variant: 'destructive', color: 'text-red-500', icon: AlertCircle },
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const GEOGRAPHIES = ['MY', 'SG', 'ASEAN', 'Global']

const RADAR_CHART_CONFIG: ChartConfig = {
  risk: { label: 'Risk Level', color: 'hsl(var(--chart-1))' },
}

const GAUGE_CHART_CONFIG: ChartConfig = {
  score: { label: 'Score', color: 'hsl(var(--chart-2))' },
  remaining: { label: 'Remaining', color: 'hsl(var(--muted))' },
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function IdeaCanvasPage() {
  const { user, organization } = useAuthStore()
  const userId = user?.id
  const [canvases, setCanvases] = useState<IdeaCanvas[]>([])
  const [selectedCanvas, setSelectedCanvas] = useState<IdeaCanvas | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('canvas')
  const [geographyFilter, setGeographyFilter] = useState('ASEAN')
  const [addBenchmarkOpen, setAddBenchmarkOpen] = useState(false)
  const [newBenchmark, setNewBenchmark] = useState({
    metric: '',
    industryAvg: '',
    yourValue: '',
    percentile: '',
    source: '',
    category: '',
  })

  // Editable block state
  const [editedBlocks, setEditedBlocks] = useState<Record<string, string>>({})
  const [editedTitle, setEditedTitle] = useState('')

  // Fetch canvases
  const fetchCanvases = useCallback(async () => {
    if (!organization?.id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/idea-canvases?organizationId=${organization.id}&userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setCanvases(data.canvases || [])
      } else {
        toast.error('Failed to fetch idea canvases')
      }
    } catch {
      toast.error('Failed to fetch idea canvases')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchCanvases()
  }, [fetchCanvases])

  // Initialize editable state when canvas is selected
  useEffect(() => {
    if (selectedCanvas) {
      const blocks: Record<string, string> = {}
      selectedCanvas.blocks.forEach((b) => {
        blocks[b.type] = b.content
      })
      setEditedBlocks(blocks)
      setEditedTitle(selectedCanvas.title)
    }
  }, [selectedCanvas])

  // Has unsaved changes?
  const hasChanges = selectedCanvas
    ? editedTitle !== selectedCanvas.title ||
      selectedCanvas.blocks.some((b) => (editedBlocks[b.type] ?? '') !== b.content)
    : false

  // Create canvas
  const handleCreate = async (title: string) => {
    if (!organization?.id) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/idea-canvases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          title,
          blocks: CANVAS_BLOCKS.map((b, i) => ({
            type: b.type,
            title: b.title,
            content: '',
            order: i,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success('Idea canvas created!')
        setCreateDialogOpen(false)
        fetchCanvases()
        if (data.canvas) {
          setSelectedCanvas(data.canvas)
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create canvas')
      }
    } catch {
      toast.error('Failed to create canvas')
    } finally {
      setIsCreating(false)
    }
  }

  // Save canvas
  const handleSave = async () => {
    if (!selectedCanvas) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/idea-canvases/${selectedCanvas.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedTitle,
          blocks: CANVAS_BLOCKS.map((b, i) => ({
            type: b.type,
            title: b.title,
            content: editedBlocks[b.type] ?? '',
            order: i,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success('Canvas saved successfully')
        if (data.canvas) {
          setSelectedCanvas(data.canvas)
          setCanvases((prev) => prev.map((c) => (c.id === data.canvas.id ? data.canvas : c)))
        }
      } else {
        toast.error('Failed to save canvas')
      }
    } catch {
      toast.error('Failed to save canvas')
    } finally {
      setIsSaving(false)
    }
  }

  // Validate with AI
  const handleValidate = async () => {
    if (!selectedCanvas) return
    setIsValidating(true)
    setActiveTab('validation')
    try {
      const res = await fetch(`/api/idea-canvases/${selectedCanvas.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: CANVAS_BLOCKS.map((b) => ({
            type: b.type,
            title: b.title,
            content: editedBlocks[b.type] ?? '',
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success('AI Validation complete!')
        if (data.canvas) {
          setSelectedCanvas(data.canvas)
          setCanvases((prev) => prev.map((c) => (c.id === data.canvas.id ? data.canvas : c)))
        }
      } else {
        toast.error('Validation failed. Try again.')
      }
    } catch {
      toast.error('Validation failed. Try again.')
    } finally {
      setIsValidating(false)
    }
  }

  // Add benchmark
  const handleAddBenchmark = async () => {
    if (!selectedCanvas) return
    try {
      const res = await fetch(`/api/idea-canvases/${selectedCanvas.id}/benchmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBenchmark,
          geography: geographyFilter,
        }),
      })
      if (res.ok) {
        toast.success('Benchmark added')
        setAddBenchmarkOpen(false)
        setNewBenchmark({ metric: '', industryAvg: '', yourValue: '', percentile: '', source: '', category: '' })
        fetchCanvases()
        // Re-select the updated canvas
        if (selectedCanvas) {
          const updated = canvases.find((c) => c.id === selectedCanvas.id)
          if (updated) setSelectedCanvas(updated)
        }
      } else {
        toast.error('Failed to add benchmark')
      }
    } catch {
      toast.error('Failed to add benchmark')
    }
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 60) return 'text-amber-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'stroke-emerald-500'
    if (score >= 60) return 'stroke-amber-500'
    if (score >= 40) return 'stroke-orange-500'
    return 'stroke-red-500'
  }

  // Parse validation data
  const validationData = selectedCanvas?.validationData as ValidationData | null

  // Parse benchmarks
  const benchmarks = (selectedCanvas?.benchmarks || []).filter(
    (b) => b.geography === geographyFilter || geographyFilter === 'all'
  )

  // ==========================================
  // CANVAS DETAIL VIEW
  // ==========================================
  if (selectedCanvas) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" onClick={() => setSelectedCanvas(null)} className="w-fit -ml-2">
                <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                Back
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-xl font-bold border-0 p-0 h-auto shadow-none focus-visible:ring-0 bg-transparent"
                placeholder="Untitled Canvas"
              />
              {getStatusBadge(selectedCanvas.status)}
              {hasChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving || !hasChanges} className="gap-1.5">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" onClick={handleValidate} disabled={isValidating} className="gap-1.5">
              {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isValidating ? 'Validating...' : 'Validate with AI'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="canvas" className="gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Canvas
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Benchmarks
            </TabsTrigger>
          </TabsList>

          {/* ==========================================
              TAB 1: IDEA CANVAS
          ========================================== */}
          <TabsContent value="canvas" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Row 1: Problem, Solution, UVP */}
              {renderCanvasBlock('problem', 0)}
              {renderCanvasBlock('solution', 1)}
              {renderCanvasBlock('unique_value_proposition', 2)}

              {/* Row 2: Target Market, Channels, Revenue Streams */}
              {renderCanvasBlock('target_market', 3)}
              {renderCanvasBlock('channels', 4)}
              {renderCanvasBlock('revenue_streams', 5)}

              {/* Row 3: Cost Structure, Competitive Landscape, Business Model */}
              {renderCanvasBlock('cost_structure', 6)}
              {renderCanvasBlock('competitive_landscape', 7)}
              {renderCanvasBlock('business_model', 8)}
            </div>
          </TabsContent>

          {/* ==========================================
              TAB 2: AI VALIDATION
          ========================================== */}
          <TabsContent value="validation" className="mt-6">
            {isValidating ? (
              <ValidationLoadingState />
            ) : validationData ? (
              <div className="space-y-6">
                {/* Top row: Score + Radar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Overall Score Gauge */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        Overall Validation Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className="relative w-48 h-48">
                          <PieChart width={192} height={192}>
                            <Pie
                              data={[
                                { name: 'score', value: validationData.overallScore },
                                { name: 'remaining', value: 100 - validationData.overallScore },
                              ]}
                              cx={96}
                              cy={96}
                              innerRadius={60}
                              outerRadius={85}
                              startAngle={90}
                              endAngle={-270}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={validationData.overallScore >= 70 ? '#10b981' : validationData.overallScore >= 50 ? '#f59e0b' : '#ef4444'} />
                              <Cell fill="hsl(var(--muted))" />
                            </Pie>
                          </PieChart>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-4xl font-bold ${getScoreColor(validationData.overallScore)}`}>
                              {validationData.overallScore}
                            </span>
                            <span className="text-xs text-muted-foreground">out of 100</span>
                          </div>
                        </div>
                        <div className="mt-4 text-center">
                          <Badge
                            variant={validationData.overallScore >= 70 ? 'default' : validationData.overallScore >= 50 ? 'secondary' : 'destructive'}
                            className="text-sm px-3 py-1"
                          >
                            {validationData.overallScore >= 80
                              ? 'Strong — Ready to Proceed'
                              : validationData.overallScore >= 60
                                ? 'Moderate — Needs Refinement'
                                : validationData.overallScore >= 40
                                  ? 'Weak — Significant Gaps'
                                  : 'Critical — Major Rework Needed'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Assessment Radar */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Risk Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={RADAR_CHART_CONFIG} className="mx-auto w-full max-w-[350px] aspect-square">
                        <RadarChart data={validationData.riskAssessment}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="dimension" className="text-xs" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-[10px]" />
                          <Radar
                            name="Risk Level"
                            dataKey="level"
                            stroke="hsl(var(--chart-1))"
                            fill="hsl(var(--chart-1))"
                            fillOpacity={0.3}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RadarChart>
                      </ChartContainer>
                      {/* Risk Legend */}
                      <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {validationData.riskAssessment.map((r) => (
                          <div key={r.dimension} className="flex items-center gap-1.5 text-xs">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  r.level >= 70
                                    ? '#ef4444'
                                    : r.level >= 40
                                      ? '#f59e0b'
                                      : '#10b981',
                              }}
                            />
                            <span className="text-muted-foreground">{r.dimension}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Category Scores */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Category Scores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {validationData.categoryScores.map((cat) => (
                        <div key={cat.category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{cat.category}</span>
                            <span className={`text-sm font-bold ${getScoreColor(cat.score)}`}>
                              {cat.score}/{cat.maxScore}
                            </span>
                          </div>
                          <Progress value={(cat.score / cat.maxScore) * 100} className="h-2" />
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Validation Questions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      Validation Questions & Answers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-96">
                      <div className="space-y-4">
                        {validationData.questions.map((q, i) => (
                          <div key={i} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium">{q.question}</p>
                              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[q.riskLevel]}`}>
                                {q.riskLevel}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{q.answer}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <Card className="border-emerald-200 dark:border-emerald-800/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <ThumbsUp className="w-4 h-4" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {validationData.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                        {validationData.strengths.length === 0 && (
                          <p className="text-sm text-muted-foreground">No strengths identified yet.</p>
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Weaknesses */}
                  <Card className="border-red-200 dark:border-red-800/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600 dark:text-red-400">
                        <ThumbsDown className="w-4 h-4" />
                        Weaknesses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {validationData.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </li>
                        ))}
                        {validationData.weaknesses.length === 0 && (
                          <p className="text-sm text-muted-foreground">No weaknesses identified. Great job!</p>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {validationData.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                            {i + 1}
                          </div>
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <EmptyValidationState onValidate={handleValidate} isValidating={isValidating} />
            )}
          </TabsContent>

          {/* ==========================================
              TAB 3: BENCHMARKS
          ========================================== */}
          <TabsContent value="benchmarks" className="mt-6">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Geography:</span>
                  <div className="flex items-center gap-1">
                    {GEOGRAPHIES.map((geo) => (
                      <Button
                        key={geo}
                        variant={geographyFilter === geo ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setGeographyFilter(geo)}
                      >
                        {geo}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button size="sm" onClick={() => setAddBenchmarkOpen(true)} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add Benchmark
                </Button>
              </div>

              {/* Benchmarks Table */}
              {benchmarks.length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead className="text-right">Industry Avg</TableHead>
                          <TableHead className="text-right">Your Value</TableHead>
                          <TableHead className="text-right">Percentile</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {benchmarks.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.metric}</TableCell>
                            <TableCell className="text-right">{b.industryAvg}</TableCell>
                            <TableCell className="text-right font-medium">{b.yourValue}</TableCell>
                            <TableCell className="text-right">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                typeof b.percentile === 'number' && b.percentile >= 75
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : typeof b.percentile === 'number' && b.percentile >= 50
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {typeof b.percentile === 'number' ? `P${b.percentile}` : b.percentile}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">{b.source}</span>
                                {b.sourceUrl && (
                                  <a
                                    href={b.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                      <BarChart3 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No benchmarks yet</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                      Add industry benchmarks to compare your idea against market standards and identify gaps.
                    </p>
                    <Button size="sm" onClick={() => setAddBenchmarkOpen(true)} className="gap-1.5">
                      <Plus className="w-4 h-4" />
                      Add Your First Benchmark
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Geography Info Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        <strong>{geographyFilter}</strong> benchmarks are sourced from industry reports, market research, and public databases.
                      </p>
                      <p>Percentile indicates where your value falls relative to the industry distribution (P75 = top 25%).</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Benchmark Dialog */}
        <Dialog open={addBenchmarkOpen} onOpenChange={setAddBenchmarkOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Benchmark</DialogTitle>
              <DialogDescription>
                Add an industry benchmark to compare against your idea. Data will be saved for the {geographyFilter} geography.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metric Name *</Label>
                  <Input
                    placeholder="e.g., CAC, LTV, MRR Growth"
                    value={newBenchmark.metric}
                    onChange={(e) => setNewBenchmark((p) => ({ ...p, metric: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    placeholder="e.g., Financial, Market"
                    value={newBenchmark.category}
                    onChange={(e) => setNewBenchmark((p) => ({ ...p, category: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Industry Average *</Label>
                  <Input
                    placeholder="e.g., $250"
                    value={newBenchmark.industryAvg}
                    onChange={(e) => setNewBenchmark((p) => ({ ...p, industryAvg: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Value *</Label>
                  <Input
                    placeholder="e.g., $180"
                    value={newBenchmark.yourValue}
                    onChange={(e) => setNewBenchmark((p) => ({ ...p, yourValue: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Percentile</Label>
                  <Input
                    placeholder="e.g., 65"
                    value={newBenchmark.percentile}
                    onChange={(e) => setNewBenchmark((p) => ({ ...p, percentile: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Source *</Label>
                <Input
                  placeholder="e.g., McKinsey SEA Report 2024"
                  value={newBenchmark.source}
                  onChange={(e) => setNewBenchmark((p) => ({ ...p, source: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddBenchmarkOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddBenchmark}
                disabled={!newBenchmark.metric || !newBenchmark.industryAvg || !newBenchmark.yourValue || !newBenchmark.source}
              >
                Add Benchmark
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ==========================================
  // CANVAS LIST VIEW
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Idea Canvas & Validation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pressure-test your ideas before any financial investment with AI-guided validation
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <Button className="gap-1.5" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            New Canvas
          </Button>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Idea Canvas</DialogTitle>
              <DialogDescription>
                Give your idea a name to get started. You can fill in the 9 canvas blocks and then validate with AI.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="canvas-title">Idea Title *</Label>
                <Input
                  id="canvas-title"
                  placeholder="e.g., AI-powered invoicing for SMEs in Malaysia"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editedTitle.trim()) {
                      handleCreate(editedTitle.trim())
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button
                onClick={() => handleCreate(editedTitle.trim())}
                disabled={isCreating || !editedTitle.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Canvas'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Bar */}
      {!isLoading && canvases.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <Lightbulb className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Canvases</p>
              <p className="text-sm font-bold">{canvases.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <FileText className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-xs text-muted-foreground">Drafts</p>
              <p className="text-sm font-bold">{canvases.filter((c) => c.status === 'draft').length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Validated</p>
              <p className="text-sm font-bold">{canvases.filter((c) => c.status === 'validated').length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Needs Rework</p>
              <p className="text-sm font-bold">{canvases.filter((c) => c.status === 'needs_rework').length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : canvases.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
              <Lightbulb className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No idea canvases yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Create your first idea canvas to start pressure-testing your business ideas with AI-guided validation before any financial investment.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Create Your First Canvas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {canvases.map((canvas) => (
            <CanvasCard
              key={canvas.id}
              canvas={canvas}
              onSelect={setSelectedCanvas}
            />
          ))}
        </div>
      )}
    </div>
  )

  // ==========================================
  // HELPER: Render Canvas Block
  // ==========================================
  function renderCanvasBlock(type: string, _index: number) {
    const blockDef = CANVAS_BLOCKS.find((b) => b.type === type)
    if (!blockDef) return null
    const Icon = blockDef.icon
    const content = editedBlocks[type] ?? ''
    const filledBlocks = CANVAS_BLOCKS.filter((b) => (editedBlocks[b.type] ?? '').trim().length > 0).length

    return (
      <Card className="group hover:shadow-md transition-all overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-muted ${blockDef.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs font-semibold">{blockDef.title}</CardTitle>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{blockDef.description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <Textarea
            value={content}
            onChange={(e) => setEditedBlocks((prev) => ({ ...prev, [type]: e.target.value }))}
            placeholder={`Describe your ${blockDef.title.toLowerCase()}...`}
            className="min-h-[100px] text-xs leading-relaxed resize-y bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">
              {content.length > 0 ? `${content.length} chars` : 'Empty'}
            </span>
            {content.trim().length > 0 && (
              <CheckCircle className="w-3 h-3 text-emerald-500" />
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function CanvasCard({
  canvas,
  onSelect,
}: {
  canvas: IdeaCanvas
  onSelect: (canvas: IdeaCanvas) => void
}) {
  const filledBlocks = canvas.blocks.filter((b) => b.content && b.content.trim().length > 0).length
  const totalBlocks = canvas.blocks.length || 9
  const statusConfig = STATUS_CONFIG[canvas.status] || STATUS_CONFIG.draft
  const StatusIcon = statusConfig.icon

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all group overflow-hidden"
      onClick={() => onSelect(canvas)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
              {canvas.title}
            </CardTitle>
          </div>
          <Badge variant={statusConfig.variant} className="gap-1 text-[10px] shrink-0">
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filledBlocks}/{totalBlocks} blocks filled</span>
          {canvas.validationScore !== null && (
            <span className={`font-bold ${canvas.validationScore >= 70 ? 'text-emerald-500' : canvas.validationScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              Score: {canvas.validationScore}
            </span>
          )}
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${totalBlocks > 0 ? (filledBlocks / totalBlocks) * 100 : 0}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ValidationLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">AI Validation in Progress</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Our AI is analyzing your canvas across market viability, technical feasibility, financial sustainability, and competitive positioning...
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Analyzing market risks
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Evaluating competitive landscape
        </div>
      </div>
    </div>
  )
}

function EmptyValidationState({ onValidate, isValidating }: { onValidate: () => void; isValidating: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
          <Shield className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No validation yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          Fill out your canvas blocks and then run AI validation to get a comprehensive assessment of your idea&apos;s viability across multiple dimensions.
        </p>
        <Button onClick={onValidate} disabled={isValidating} className="gap-1.5">
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Validate with AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function getStatusBadge(status: string) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="gap-1 text-xs">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}
