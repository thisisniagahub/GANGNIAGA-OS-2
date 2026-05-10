'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'
import { format } from 'date-fns'

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Icons
import {
  Plus,
  Presentation,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Download,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wand2,
  Search,
  ArrowLeft,
  RefreshCw,
  Layers,
  HelpCircle,
  Variable,
  LayoutTemplate,
  Users,
  DollarSign,
  BarChart3,
  Target,
  Shield,
  Zap,
  GripVertical,
  FileText,
  ChevronUp,
  PlayCircle,
  CircleDot,
  StickyNote,
  ArrowRight,
  TrendingUp,
  Lightbulb,
} from 'lucide-react'

// ==========================================
// TYPES
// ==========================================

interface PitchDeckSlide {
  id: string
  deckId: string
  order: number
  type: string
  title: string
  content: Record<string, unknown>
  layout: string
  dataSource?: string | null
  dynamicFields: string[]
  speakerNotes?: string | null
  imageUrl?: string | null
  metadata: Record<string, unknown>
}

interface PitchDeckQuestion {
  id: string
  deckId: string
  question: string
  category: string
  suggestedAnswer?: string | null
  likelihood: string
  difficulty: string
  slideReference?: string | null
  metadata: Record<string, unknown>
}

interface PitchDeck {
  id: string
  organizationId: string
  planId?: string | null
  title: string
  templateId?: string | null
  status: string
  slides: string[]
  dynamicVariables: Record<string, string | number>
  totalSlides: number
  fundingAsk?: number | null
  useOfFunds?: unknown
  targetAudience: string
  metadata: Record<string, unknown>
  slideData: Array<{
    id: string
    type: string
    title: string
    order: number
    layout: string
  }>
  questions: Array<{
    id: string
    category: string
    likelihood: string
  }>
  createdAt: string
  updatedAt: string
}

interface PitchDeckDetail extends PitchDeck {
  slideData: PitchDeckSlide[]
  questions: PitchDeckQuestion[]
}

interface TemplateInfo {
  id: string
  name: string
  description: string
  category: string
  slideCount: number
}

interface BusinessPlan {
  id: string
  title: string
  status: string
}

// ==========================================
// CONSTANTS
// ==========================================

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Edit, color: 'text-slate-500' },
  generating: { label: 'Generating', variant: 'outline', icon: Loader2, color: 'text-amber-500' },
  ready: { label: 'Ready', variant: 'default', icon: CheckCircle, color: 'text-emerald-500' },
  presented: { label: 'Presented', variant: 'default', icon: PlayCircle, color: 'text-primary' },
  archived: { label: 'Archived', variant: 'secondary', icon: AlertCircle, color: 'text-muted-foreground' },
}

const SLIDE_TYPE_ICONS: Record<string, React.ElementType> = {
  title: Presentation,
  problem: AlertCircle,
  solution: Lightbulb,
  market: Target,
  product: Zap,
  business_model: DollarSign,
  traction: TrendingUp,
  team: Users,
  financials: BarChart3,
  competition: Shield,
  ask: DollarSign,
  appendix: FileText,
  go_to_market: Target,
  vision: Sparkles,
}

const SLIDE_LAYOUTS = [
  { id: 'default', label: 'Default', icon: LayoutTemplate },
  { id: 'centered', label: 'Centered', icon: CircleDot },
  { id: 'split', label: 'Split', icon: Layers },
  { id: 'data_heavy', label: 'Data Heavy', icon: BarChart3 },
  { id: 'visual', label: 'Visual', icon: Eye },
]

const SLIDE_TYPES = [
  'title', 'problem', 'solution', 'market', 'product', 'business_model',
  'traction', 'team', 'financials', 'competition', 'ask', 'appendix',
  'go_to_market', 'vision',
]

const AUDIENCE_OPTIONS = [
  { id: 'investor', label: 'Investor', icon: DollarSign },
  { id: 'lender', label: 'Lender', icon: BarChart3 },
  { id: 'partner', label: 'Partner', icon: Users },
  { id: 'internal', label: 'Internal', icon: FileText },
]

const QUESTION_CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  financial: { label: 'Financial', icon: DollarSign, color: 'text-emerald-500' },
  market: { label: 'Market', icon: Target, color: 'text-blue-500' },
  team: { label: 'Team', icon: Users, color: 'text-violet-500' },
  product: { label: 'Product', icon: Zap, color: 'text-amber-500' },
  competition: { label: 'Competition', icon: Shield, color: 'text-rose-500' },
  risk: { label: 'Risk', icon: AlertCircle, color: 'text-red-500' },
  terms: { label: 'Terms', icon: FileText, color: 'text-slate-500' },
}

const TEMPLATES: TemplateInfo[] = [
  { id: 'seed_round', name: 'Seed Round', description: 'For early-stage startups seeking seed funding', category: 'seed', slideCount: 12 },
  { id: 'series_a', name: 'Series A', description: 'For startups with proven traction seeking growth capital', category: 'series_a', slideCount: 14 },
  { id: 'debt_financing', name: 'Debt Financing', description: 'For loan applications and debt financing', category: 'debt', slideCount: 10 },
  { id: 'partner_pitch', name: 'Partner Pitch', description: 'For strategic partnership proposals', category: 'partner', slideCount: 8 },
  { id: 'internal_review', name: 'Internal Review', description: 'Compact deck for board/management reviews', category: 'internal', slideCount: 6 },
]

// ==========================================
// MAIN COMPONENT
// ==========================================

export function PitchDeckPage() {
  const { user, organization } = useAuthStore()
  const userId = user?.id

  // Core state
  const [decks, setDecks] = useState<PitchDeck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<PitchDeckDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('decks')
  const [searchQuery, setSearchQuery] = useState('')

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    templateId: '',
    planId: '',
    targetAudience: 'investor',
    aiGenerate: false,
  })

  // Plans for linking
  const [plans, setPlans] = useState<BusinessPlan[]>([])

  // Editor state
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editingSlide, setEditingSlide] = useState<PitchDeckSlide | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Questions state
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({})

  // Variables state
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deckToDelete, setDeckToDelete] = useState<PitchDeck | null>(null)

  // ---- Fetch decks ----
  const fetchDecks = useCallback(async () => {
    if (!organization?.id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/pitch-decks?organizationId=${organization.id}&userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setDecks(data.decks || [])
      } else {
        toast.error('Failed to fetch pitch decks')
      }
    } catch {
      toast.error('Failed to fetch pitch decks')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  // ---- Fetch plans ----
  const fetchPlans = useCallback(async () => {
    if (!organization?.id) return
    try {
      const res = await fetch(`/api/plans?organizationId=${organization.id}&userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setPlans((data.plans || []).map((p: { id: string; title: string; status: string }) => ({
          id: p.id,
          title: p.title,
          status: p.status,
        })))
      }
    } catch {
      // Silently fail — plans are optional
    }
  }, [organization?.id])

  useEffect(() => {
    fetchDecks()
    fetchPlans()
  }, [fetchDecks, fetchPlans])

  // ---- Fetch full deck detail ----
  const fetchDeckDetail = useCallback(async (deckId: string) => {
    try {
      const res = await fetch(`/api/pitch-decks/${deckId}`)
      if (res.ok) {
        const data = await res.json()
        const deck = data.deck as PitchDeckDetail
        setSelectedDeck(deck)
        if (deck.slideData.length > 0 && !selectedSlideId) {
          setSelectedSlideId(deck.slideData[0].id)
          setEditingSlide(deck.slideData[0])
        }
      } else {
        toast.error('Failed to fetch deck details')
      }
    } catch {
      toast.error('Failed to fetch deck details')
    }
  }, [selectedSlideId])

  // ---- Create deck ----
  const handleCreateDeck = async () => {
    if (!organization?.id) return
    if (!createForm.title.trim()) {
      toast.error('Please enter a deck title')
      return
    }

    setIsCreating(true)
    try {
      const body: Record<string, unknown> = {
        organizationId: organization.id,
        title: createForm.title,
        targetAudience: createForm.targetAudience,
        planId: createForm.planId || null,
      }

      if (createForm.aiGenerate) {
        body.action = 'generate'
      } else {
        body.action = 'create'
        body.templateId = createForm.templateId || 'seed_round'
      }

      const res = await fetch('/api/pitch-decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(createForm.aiGenerate ? 'Pitch deck generated with AI!' : 'Pitch deck created successfully!')
        setCreateDialogOpen(false)
        setCreateForm({ title: '', templateId: '', planId: '', targetAudience: 'investor', aiGenerate: false })
        fetchDecks()
        if (data.deck) {
          fetchDeckDetail(data.deck.id)
          setActiveTab('editor')
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create deck')
      }
    } catch {
      toast.error('Failed to create deck')
    } finally {
      setIsCreating(false)
    }
  }

  // ---- Delete deck ----
  const handleDeleteDeck = async (deckId: string) => {
    try {
      const res = await fetch(`/api/pitch-decks/${deckId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Pitch deck deleted')
        setDecks((prev) => prev.filter((d) => d.id !== deckId))
        if (selectedDeck?.id === deckId) {
          setSelectedDeck(null)
          setActiveTab('decks')
        }
      } else {
        toast.error('Failed to delete deck')
      }
    } catch {
      toast.error('Failed to delete deck')
    }
    setDeleteDialogOpen(false)
    setDeckToDelete(null)
  }

  // ---- Sync variables ----
  const handleSyncVariables = async (deckId: string) => {
    setIsSyncing(true)
    try {
      const res = await fetch(`/api/pitch-decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Synced ${data.syncResult?.syncedVariables || 0} variables`)
        if (selectedDeck?.id === deckId) {
          setSelectedDeck(data.deck)
        }
        fetchDecks()
      } else {
        toast.error('Failed to sync variables')
      }
    } catch {
      toast.error('Failed to sync variables')
    } finally {
      setIsSyncing(false)
    }
  }

  // ---- Generate questions ----
  const handleGenerateQuestions = async (deckId: string) => {
    setIsGeneratingQuestions(true)
    try {
      const res = await fetch(`/api/pitch-decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_questions' }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Generated ${data.questions?.length || 0} funder questions`)
        if (selectedDeck?.id === deckId) {
          setSelectedDeck(data.deck)
        }
        fetchDecks()
      } else {
        toast.error('Failed to generate questions')
      }
    } catch {
      toast.error('Failed to generate questions')
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  // ---- AI Analyze ----
  const handleAnalyzeDeck = async (deckId: string) => {
    setIsAnalyzing(true)
    try {
      const res = await fetch(`/api/pitch-decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' }),
      })
      if (res.ok) {
        const data = await res.json()
        const analysis = data.analysis
        toast.success(`Deck analysis complete: ${analysis?.overallScore || 'N/A'}/100`)
        if (selectedDeck?.id === deckId) {
          setSelectedDeck(data.deck)
        }
      } else {
        toast.error('Failed to analyze deck')
      }
    } catch {
      toast.error('Failed to analyze deck')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ---- Update slide ----
  const handleUpdateSlide = async (slideId: string, data: Record<string, unknown>) => {
    if (!selectedDeck) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/pitch-decks/${selectedDeck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_slide', slideId, data }),
      })
      if (res.ok) {
        const resData = await res.json()
        toast.success('Slide updated')
        setSelectedDeck(resData.deck)
        // Update editing slide
        const updatedSlide = resData.deck?.slideData?.find((s: PitchDeckSlide) => s.id === slideId)
        if (updatedSlide) setEditingSlide(updatedSlide)
      } else {
        toast.error('Failed to update slide')
      }
    } catch {
      toast.error('Failed to update slide')
    } finally {
      setIsSaving(false)
    }
  }

  // ---- Update deck ----
  const handleUpdateDeck = async (deckId: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/pitch-decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const resData = await res.json()
        setSelectedDeck(resData.deck)
        fetchDecks()
      } else {
        toast.error('Failed to update deck')
      }
    } catch {
      toast.error('Failed to update deck')
    }
  }

  // ---- Select deck for editing ----
  const openDeckEditor = (deck: PitchDeck) => {
    fetchDeckDetail(deck.id)
    setActiveTab('editor')
  }

  // ---- Helpers ----
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1 text-xs">
        <Icon className={`w-3 h-3 ${status === 'generating' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    )
  }

  const getTemplateName = (templateId: string | null | undefined) => {
    const t = TEMPLATES.find((tpl) => tpl.id === templateId)
    return t?.name || 'Custom'
  }

  const currentSlide = selectedDeck?.slideData?.find((s) => s.id === selectedSlideId)

  // ---- Filtered decks ----
  const filteredDecks = decks.filter((deck) =>
    deck.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ---- Get all variables across decks ----
  const allVariables: Array<{ variable: string; value: string | number; source: string; deckId: string; deckTitle: string; lastUpdated: string }> = []
  for (const deck of decks) {
    const vars = deck.dynamicVariables || {}
    for (const [key, val] of Object.entries(vars)) {
      allVariables.push({
        variable: key,
        value: val,
        source: typeof val === 'number' ? 'forecast/kpi' : 'plan/manual',
        deckId: deck.id,
        deckTitle: deck.title,
        lastUpdated: deck.updatedAt,
      })
    }
  }

  // Group questions by category
  const groupedQuestions: Record<string, PitchDeckQuestion[]> = {}
  if (selectedDeck?.questions) {
    for (const q of selectedDeck.questions) {
      if (!groupedQuestions[q.category]) groupedQuestions[q.category] = []
      groupedQuestions[q.category].push(q)
    }
  }

  // Get analysis from metadata
  const lastAnalysis = (selectedDeck?.metadata as Record<string, unknown>)?.lastAnalysis as Record<string, unknown> | undefined

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pitch Deck Orchestrator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create auto-synced investor presentations with dynamic variables
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="w-4 h-4" />
              Create New Deck
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Pitch Deck</DialogTitle>
              <DialogDescription>
                Choose a template and configure your new pitch deck. Enable AI to generate full content from scratch.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-2">
                <Label>Deck Title *</Label>
                <Input
                  placeholder="e.g., Series A Pitch Deck 2025"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* AI Generate toggle */}
              {!createForm.aiGenerate && (
                <div className="space-y-2">
                  <Label>Template</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setCreateForm((prev) => ({ ...prev, templateId: tpl.id }))}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                          createForm.templateId === tpl.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <LayoutTemplate className={`w-5 h-5 mt-0.5 shrink-0 ${createForm.templateId === tpl.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{tpl.name}</p>
                          <p className="text-xs text-muted-foreground">{tpl.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tpl.slideCount} slides</p>
                        </div>
                        {createForm.templateId === tpl.id && (
                          <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan linking */}
              <div className="space-y-2">
                <Label>Link to Business Plan (optional)</Label>
                <Select
                  value={createForm.planId}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, planId: value === '__none__' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan to auto-sync data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No linked plan</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.title} ({plan.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setCreateForm((prev) => ({ ...prev, targetAudience: opt.id }))}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all ${
                        createForm.targetAudience === opt.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Generate */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium cursor-pointer">AI Generate Full Deck</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create a complete deck from scratch using AI
                    </p>
                  </div>
                </div>
                <Switch
                  checked={createForm.aiGenerate}
                  onCheckedChange={(checked) => setCreateForm((prev) => ({ ...prev, aiGenerate: checked }))}
                />
              </div>

              {createForm.aiGenerate && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-primary">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    AI will generate a complete pitch deck with professional content for every slide. The appropriate template will be selected based on your target audience.
                  </span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleCreateDeck} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {createForm.aiGenerate ? 'Generating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {createForm.aiGenerate && <Sparkles className="w-4 h-4 mr-1" />}
                    {createForm.aiGenerate ? 'Generate Deck' : 'Create Deck'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="decks" className="gap-1.5 text-xs sm:text-sm">
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Decks</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-1.5 text-xs sm:text-sm" disabled={!selectedDeck}>
            <Edit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editor</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5 text-xs sm:text-sm" disabled={!selectedDeck}>
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Questions</span>
          </TabsTrigger>
          <TabsTrigger value="variables" className="gap-1.5 text-xs sm:text-sm">
            <Variable className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Variables</span>
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: DECKS ===================== */}
        <TabsContent value="decks" className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Stats */}
          {!isLoading && decks.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                <Presentation className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Decks</p>
                  <p className="text-sm font-bold">{decks.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Ready</p>
                  <p className="text-sm font-bold">{decks.filter((d) => d.status === 'ready').length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                <Edit className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                  <p className="text-sm font-bold">{decks.filter((d) => d.status === 'draft').length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                <DollarSign className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Funding Ask</p>
                  <p className="text-sm font-bold">
                    {decks.reduce((sum, d) => sum + (d.fundingAsk || 0), 0) > 0
                      ? `$${(decks.reduce((sum, d) => sum + (d.fundingAsk || 0), 0) / 1000).toFixed(0)}k`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Deck Grid */}
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
          ) : filteredDecks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                  <Presentation className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {searchQuery ? 'No decks found' : 'No pitch decks yet'}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                  {searchQuery
                    ? 'Try adjusting your search criteria.'
                    : 'Create your first pitch deck and let AI help you build an investor-ready presentation.'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    Create Your First Deck
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  getStatusBadge={getStatusBadge}
                  getTemplateName={getTemplateName}
                  onEdit={openDeckEditor}
                  onPreview={(d) => { fetchDeckDetail(d.id); setActiveTab('editor') }}
                  onDelete={(d) => { setDeckToDelete(d); setDeleteDialogOpen(true) }}
                  onSync={handleSyncVariables}
                  onGenerateQuestions={handleGenerateQuestions}
                  isSyncing={isSyncing}
                  isGeneratingQuestions={isGeneratingQuestions}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===================== TAB 2: EDITOR ===================== */}
        <TabsContent value="editor" className="mt-4">
          {!selectedDeck ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Presentation className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Select a deck from the Decks tab to start editing</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab('decks')}>
                  Go to Decks
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Editor Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedDeck(null); setActiveTab('decks') }} className="w-fit">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Decks
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold truncate">{selectedDeck.title}</h2>
                    {getStatusBadge(selectedDeck.status)}
                    <Badge variant="outline" className="text-xs">{getTemplateName(selectedDeck.templateId)}</Badge>
                  </div>
                </div>
                {/* Toolbar */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleSyncVariables(selectedDeck.id)}
                    disabled={isSyncing}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleAnalyzeDeck(selectedDeck.id)}
                    disabled={isAnalyzing}
                    className="gap-1.5"
                  >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    AI Analyze
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info('Export coming soon!')}>
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </Button>
                </div>
              </div>

              {/* AI Analysis Banner */}
              {lastAnalysis && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-primary" />
                        AI Deck Analysis
                      </h4>
                      <span className="text-lg font-bold text-primary">{String(lastAnalysis.overallScore)}/100</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {['clarity', 'financialRigor', 'marketProof', 'teamStrength', 'askClarity'].map((dim) => (
                        <div key={dim} className="text-center">
                          <p className="text-[10px] text-muted-foreground capitalize">{dim.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-xs font-bold">{String(lastAnalysis[dim])}</p>
                        </div>
                      ))}
                    </div>
                    {Array.isArray(lastAnalysis.recommendations) && lastAnalysis.recommendations.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Top Recommendations:</p>
                        {(lastAnalysis.recommendations as string[]).slice(0, 3).map((rec, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                            <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                            {rec}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Main Editor Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Slide Navigation Sidebar */}
                <div className="lg:col-span-3">
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Slides ({selectedDeck.slideData.length})</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      <ScrollArea className="max-h-[500px]">
                        <div className="space-y-1">
                          {selectedDeck.slideData
                            .sort((a, b) => a.order - b.order)
                            .map((slide) => {
                              const SlideIcon = SLIDE_TYPE_ICONS[slide.type] || FileText
                              const isSelected = slide.id === selectedSlideId
                              return (
                                <button
                                  key={slide.id}
                                  onClick={() => { setSelectedSlideId(slide.id); setEditingSlide(slide); setEditMode(false) }}
                                  className={`flex items-center gap-2 w-full p-2.5 rounded-lg text-left transition-all text-sm ${
                                    isSelected
                                      ? 'bg-primary/10 text-primary border border-primary/20'
                                      : 'hover:bg-muted/50 border border-transparent'
                                  }`}
                                >
                                  <GripVertical className="w-3 h-3 text-muted-foreground shrink-0 cursor-grab" />
                                  <SlideIcon className="w-4 h-4 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{slide.title}</p>
                                    <p className="text-[10px] text-muted-foreground">{slide.type} • {slide.layout}</p>
                                  </div>
                                  {slide.dynamicFields.length > 0 && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                                      {slide.dynamicFields.length} vars
                                    </Badge>
                                  )}
                                </button>
                              )
                            })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Slide Preview */}
                <div className="lg:col-span-5">
                  <Card className="min-h-[400px]">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          {editMode ? 'Edit Slide' : 'Slide Preview'}
                        </CardTitle>
                        <Button
                          variant={editMode ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditMode(!editMode)}
                          className="gap-1.5 text-xs h-7"
                        >
                          {editMode ? <Eye className="w-3 h-3" /> : <Edit className="w-3 h-3" />}
                          {editMode ? 'Preview' : 'Edit'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {currentSlide ? (
                        <div className="space-y-4">
                          {/* Slide Visual */}
                          <div className={`rounded-lg border bg-card p-6 ${
                            currentSlide.layout === 'centered' ? 'text-center' :
                            currentSlide.layout === 'data_heavy' ? 'bg-muted/30' :
                            ''
                          }`}>
                            <h3 className="text-lg font-bold mb-3">{currentSlide.title}</h3>
                            {editMode ? (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Title</Label>
                                  <Input
                                    value={currentSlide.title}
                                    onChange={(e) => {
                                      const updated = { ...currentSlide, title: e.target.value }
                                      setEditingSlide(updated)
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Content (JSON)</Label>
                                  <Textarea
                                    value={typeof currentSlide.content === 'string'
                                      ? currentSlide.content
                                      : JSON.stringify(currentSlide.content, null, 2)}
                                    onChange={(e) => {
                                      try {
                                        const parsed = JSON.parse(e.target.value)
                                        setEditingSlide({ ...currentSlide, content: parsed })
                                      } catch {
                                        // allow editing even if invalid
                                      }
                                    }}
                                    className="min-h-[150px] font-mono text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Speaker Notes</Label>
                                  <Textarea
                                    value={currentSlide.speakerNotes || ''}
                                    onChange={(e) => setEditingSlide({ ...currentSlide, speakerNotes: e.target.value })}
                                    placeholder="Add speaker notes..."
                                    className="min-h-[80px] text-xs"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (editingSlide) {
                                      handleUpdateSlide(currentSlide.id, {
                                        title: editingSlide.title,
                                        content: editingSlide.content,
                                        speakerNotes: editingSlide.speakerNotes,
                                      })
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="gap-1.5"
                                >
                                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  Save Changes
                                </Button>
                              </div>
                            ) : (
                              /* Preview mode */
                              <div className="space-y-2">
                                {currentSlide.content && typeof currentSlide.content === 'object' && Object.entries(currentSlide.content).map(([key, value]) => {
                                  const strValue = String(value)
                                  const isDynamicField = currentSlide.dynamicFields.some(
                                    (f) => strValue.includes(f) || strValue.includes(`{{${f}}}`)
                                  )
                                  return (
                                    <div key={key} className="flex items-start gap-2 text-sm">
                                      <span className="text-xs text-muted-foreground min-w-[100px] capitalize shrink-0">
                                        {key.replace(/_/g, ' ')}:
                                      </span>
                                      <span className={
                                        isDynamicField
                                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-1 rounded text-xs font-mono'
                                          : ''
                                      }>
                                        {strValue}
                                      </span>
                                    </div>
                                  )
                                })}
                                {currentSlide.layout === 'data_heavy' && (
                                  <div className="mt-4 p-3 bg-card rounded border">
                                    <p className="text-xs text-muted-foreground mb-2">Data Preview</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {Object.entries(currentSlide.content).slice(0, 4).map(([key, value]) => (
                                        <div key={key} className="text-center p-2 bg-muted/50 rounded">
                                          <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                                          <p className="text-sm font-bold">{String(value)}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {currentSlide.speakerNotes && (
                                  <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                      <StickyNote className="w-3 h-3" /> Speaker Notes
                                    </p>
                                    <p className="text-xs">{currentSlide.speakerNotes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <Layers className="w-8 h-8 mb-2" />
                          <p className="text-sm">Select a slide from the sidebar</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Slide Properties */}
                <div className="lg:col-span-4">
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm">Slide Properties</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {currentSlide ? (
                        <ScrollArea className="max-h-[500px]">
                          <div className="space-y-4">
                            {/* Type Selector */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Slide Type</Label>
                              <Select
                                value={currentSlide.type}
                                onValueChange={(value) => {
                                  const updated = { ...currentSlide, type: value }
                                  setEditingSlide(updated)
                                  handleUpdateSlide(currentSlide.id, { type: value })
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SLIDE_TYPES.map((type) => (
                                    <SelectItem key={type} value={type} className="text-xs">
                                      {type.replace(/_/g, ' ')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Layout Selector */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Layout</Label>
                              <div className="grid grid-cols-5 gap-1">
                                {SLIDE_LAYOUTS.map((layout) => (
                                  <button
                                    key={layout.id}
                                    onClick={() => {
                                      const updated = { ...currentSlide, layout: layout.id }
                                      setEditingSlide(updated)
                                      handleUpdateSlide(currentSlide.id, { layout: layout.id })
                                    }}
                                    className={`flex flex-col items-center gap-1 p-1.5 rounded border text-[10px] transition-all ${
                                      currentSlide.layout === layout.id
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-border hover:border-primary/30'
                                    }`}
                                  >
                                    <layout.icon className="w-3.5 h-3.5" />
                                    {layout.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <Separator />

                            {/* Dynamic Fields */}
                            <div className="space-y-2">
                              <Label className="text-xs flex items-center gap-1">
                                <Variable className="w-3 h-3" />
                                Dynamic Fields ({currentSlide.dynamicFields.length})
                              </Label>
                              {currentSlide.dynamicFields.length > 0 ? (
                                <div className="space-y-1.5">
                                  {currentSlide.dynamicFields.map((field) => {
                                    const varValue = selectedDeck.dynamicVariables?.[field]
                                    return (
                                      <div key={field} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                                        <code className="text-[10px] font-mono text-primary bg-primary/10 px-1 rounded">
                                          {`{{${field}}}`}
                                        </code>
                                        <div className="flex-1 min-w-0">
                                          {varValue !== undefined ? (
                                            <p className="text-xs font-medium truncate">{String(varValue)}</p>
                                          ) : (
                                            <p className="text-[10px] text-amber-500">Not synced</p>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No dynamic fields on this slide</p>
                              )}
                            </div>

                            <Separator />

                            {/* Data Source Reference */}
                            {currentSlide.dataSource && (
                              <div className="space-y-1.5">
                                <Label className="text-xs">Data Source</Label>
                                <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                                  {currentSlide.dataSource}
                                </p>
                              </div>
                            )}

                            {/* Speaker Notes */}
                            <div className="space-y-1.5">
                              <Label className="text-xs flex items-center gap-1">
                                <StickyNote className="w-3 h-3" />
                                Speaker Notes
                              </Label>
                              <Textarea
                                value={editingSlide?.speakerNotes || currentSlide.speakerNotes || ''}
                                onChange={(e) => {
                                  if (editingSlide) {
                                    setEditingSlide({ ...editingSlide, speakerNotes: e.target.value })
                                  }
                                }}
                                onBlur={() => {
                                  if (editingSlide && editingSlide.speakerNotes !== currentSlide.speakerNotes) {
                                    handleUpdateSlide(currentSlide.id, { speakerNotes: editingSlide.speakerNotes })
                                  }
                                }}
                                placeholder="Add speaker notes for this slide..."
                                className="min-h-[80px] text-xs"
                              />
                            </div>

                            <Separator />

                            {/* Deck-level settings */}
                            <div className="space-y-3">
                              <Label className="text-xs font-semibold">Deck Settings</Label>

                              {/* Status */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] text-muted-foreground">Status</Label>
                                <Select
                                  value={selectedDeck.status}
                                  onValueChange={(value) => handleUpdateDeck(selectedDeck.id, { status: value })}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="generating">Generating</SelectItem>
                                    <SelectItem value="ready">Ready</SelectItem>
                                    <SelectItem value="presented">Presented</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Funding Ask */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] text-muted-foreground">Funding Ask ($)</Label>
                                <Input
                                  type="number"
                                  value={selectedDeck.fundingAsk || ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseFloat(e.target.value) : null
                                    handleUpdateDeck(selectedDeck.id, { fundingAsk: val })
                                  }}
                                  placeholder="e.g., 500000"
                                  className="h-7 text-xs"
                                />
                              </div>

                              {/* Target Audience */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] text-muted-foreground">Target Audience</Label>
                                <Select
                                  value={selectedDeck.targetAudience}
                                  onValueChange={(value) => handleUpdateDeck(selectedDeck.id, { targetAudience: value })}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {AUDIENCE_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          Select a slide to view properties
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===================== TAB 3: FUNDER QUESTIONS ===================== */}
        <TabsContent value="questions" className="mt-4">
          {!selectedDeck ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <HelpCircle className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Select a deck to view funder questions</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab('decks')}>
                  Go to Decks
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Funder Questions
                    {selectedDeck.questions.length > 0 && (
                      <Badge variant="secondary">{selectedDeck.questions.length}</Badge>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI-generated questions that funders are likely to ask for &ldquo;{selectedDeck.title}&rdquo;
                  </p>
                </div>
                <Button
                  onClick={() => handleGenerateQuestions(selectedDeck.id)}
                  disabled={isGeneratingQuestions}
                  className="gap-1.5"
                >
                  {isGeneratingQuestions ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isGeneratingQuestions ? 'Generating...' : 'Generate Questions'}
                </Button>
              </div>

              {/* Questions by Category */}
              {selectedDeck.questions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <HelpCircle className="w-10 h-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold mb-1">No questions generated yet</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                      Click &ldquo;Generate Questions&rdquo; to let AI analyze your deck and predict what funders will ask.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedQuestions).map(([category, questions]) => {
                    const catConfig = QUESTION_CATEGORY_CONFIG[category] || {
                      label: category,
                      icon: FileText,
                      color: 'text-muted-foreground',
                    }
                    const CatIcon = catConfig.icon
                    return (
                      <Card key={category}>
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <CatIcon className={`w-4 h-4 ${catConfig.color}`} />
                            {catConfig.label}
                            <Badge variant="outline" className="text-[10px]">{questions.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                          {questions.map((q) => {
                            const isExpanded = expandedQuestions[q.id] ?? false
                            return (
                              <Collapsible
                                key={q.id}
                                open={isExpanded}
                                onOpenChange={() => setExpandedQuestions((prev) => ({ ...prev, [q.id]: !isExpanded }))}
                              >
                                <div className={`rounded-lg border p-3 transition-all ${isExpanded ? 'bg-muted/30' : 'hover:bg-muted/10'}`}>
                                  <CollapsibleTrigger className="w-full">
                                    <div className="flex items-start gap-3">
                                      <ChevronRight className={`w-4 h-4 mt-0.5 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                      <div className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-medium">{q.question}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          <LikelihoodBadge likelihood={q.likelihood} />
                                          <DifficultyBadge difficulty={q.difficulty} />
                                          {q.slideReference && (
                                            <Badge variant="outline" className="text-[10px] gap-0.5">
                                              <FileText className="w-2.5 h-2.5" />
                                              Slide: {q.slideReference}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    {q.suggestedAnswer && (
                                      <div className="mt-3 ml-7 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                          <Lightbulb className="w-3 h-3" /> Suggested Answer:
                                        </p>
                                        <p className="text-sm">{q.suggestedAnswer}</p>
                                      </div>
                                    )}
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )
                          })}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===================== TAB 4: DYNAMIC VARIABLES ===================== */}
        <TabsContent value="variables" className="mt-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Variable className="w-5 h-5" />
                  Dynamic Variables
                  {allVariables.length > 0 && (
                    <Badge variant="secondary">{allVariables.length}</Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All dynamic variables across your pitch decks, auto-synced from linked plans and forecasts
                </p>
              </div>
              <Button
                onClick={() => {
                  // Sync all decks
                  decks.forEach((deck) => handleSyncVariables(deck.id))
                }}
                disabled={isSyncing}
                className="gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync All
              </Button>
            </div>

            {/* Variable Examples */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {['{{revenue_year1}}', '{{burn_rate}}', '{{runway_months}}', '{{funding_ask}}', '{{market_size}}'].map((v) => {
                const key = v.replace(/[{}]/g, '')
                const found = allVariables.find((av) => av.variable === key)
                return (
                  <div key={v} className="p-2.5 rounded-lg border bg-card text-center">
                    <code className="text-[10px] font-mono text-primary">{v}</code>
                    <p className="text-xs font-bold mt-1">{found ? String(found.value) : '—'}</p>
                    <p className="text-[10px] text-muted-foreground">{found ? found.source : 'Not synced'}</p>
                  </div>
                )
              })}
            </div>

            {/* Variable Table */}
            {allVariables.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Variable className="w-10 h-10 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold mb-1">No variables yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Create a pitch deck and link it to a business plan to auto-sync dynamic variables.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Variable</TableHead>
                        <TableHead className="text-xs">Current Value</TableHead>
                        <TableHead className="text-xs">Source</TableHead>
                        <TableHead className="text-xs">Deck</TableHead>
                        <TableHead className="text-xs">Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allVariables.map((v, i) => (
                        <TableRow key={`${v.variable}-${v.deckId}-${i}`}>
                          <TableCell>
                            <code className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {`{{${v.variable}}}`}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{String(v.value)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{v.source}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{v.deckTitle}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(v.lastUpdated), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pitch Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deckToDelete?.title}&rdquo;? This action cannot be undone. All slides and questions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deckToDelete && handleDeleteDeck(deckToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function DeckCard({
  deck,
  getStatusBadge,
  getTemplateName,
  onEdit,
  onPreview,
  onDelete,
  onSync,
  onGenerateQuestions,
  isSyncing,
  isGeneratingQuestions,
}: {
  deck: PitchDeck
  getStatusBadge: (status: string) => React.ReactNode
  getTemplateName: (templateId: string | null | undefined) => string
  onEdit: (deck: PitchDeck) => void
  onPreview: (deck: PitchDeck) => void
  onDelete: (deck: PitchDeck) => void
  onSync: (deckId: string) => void
  onGenerateQuestions: (deckId: string) => void
  isSyncing: boolean
  isGeneratingQuestions: boolean
}) {
  const varCount = Object.keys(deck.dynamicVariables || {}).length

  return (
    <Card className="hover:shadow-md transition-all group overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
              <Presentation className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
              {deck.title}
            </CardTitle>
          </div>
          {getStatusBadge(deck.status)}
        </div>
        <CardDescription className="text-xs mt-1 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1">
            <LayoutTemplate className="w-3 h-3" />
            {getTemplateName(deck.templateId)}
          </span>
          <span>•</span>
          <span>{deck.totalSlides} slides</span>
          {deck.fundingAsk && (
            <>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <DollarSign className="w-3 h-3" />
                {(deck.fundingAsk / 1000).toFixed(0)}k
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(deck.updatedAt), 'MMM d, yyyy')}
          </span>
          {varCount > 0 && (
            <span className="flex items-center gap-1 text-primary">
              <Variable className="w-3 h-3" />
              {varCount} vars
            </span>
          )}
        </div>

        {/* Audience badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] capitalize">
            {deck.targetAudience}
          </Badge>
          {deck.questions.length > 0 && (
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <HelpCircle className="w-2.5 h-2.5" />
              {deck.questions.length} Q
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          <Button variant="default" size="sm" onClick={() => onEdit(deck)} className="gap-1 text-xs h-7 flex-1">
            <Edit className="w-3 h-3" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPreview(deck)} className="gap-1 text-xs h-7">
            <Eye className="w-3 h-3" />
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => onSync(deck.id)}
            disabled={isSyncing}
            className="gap-1 text-xs h-7"
            title="Sync Variables"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => onGenerateQuestions(deck.id)}
            disabled={isGeneratingQuestions}
            className="gap-1 text-xs h-7"
            title="Generate Questions"
          >
            {isGeneratingQuestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <HelpCircle className="w-3 h-3" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(deck)} className="gap-1 text-xs h-7 text-destructive hover:text-destructive" title="Delete">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function LikelihoodBadge({ likelihood }: { likelihood: string }) {
  const config: Record<string, { label: string; className: string }> = {
    high: { label: 'High', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    low: { label: 'Low', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  }
  const c = config[likelihood] || config.medium
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.className}`}>
      {c.label} likelihood
    </span>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config: Record<string, { label: string; className: string }> = {
    hard: { label: 'Hard', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    easy: { label: 'Easy', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  }
  const c = config[difficulty] || config.medium
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.className}`}>
      {c.label}
    </span>
  )
}
