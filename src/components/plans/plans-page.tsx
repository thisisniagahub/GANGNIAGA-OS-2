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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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

// Icons
import {
  Plus,
  FileText,
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
  Archive,
  ArrowLeft,
  Loader2,
  Wand2,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react'

// Types
interface PlanSection {
  id: string
  planId: string
  type: string
  title: string
  content: string
  order: number
  aiGenerated: boolean
  createdAt: string
  updatedAt: string
}

interface BusinessPlan {
  id: string
  title: string
  description: string | null
  status: string
  organizationId: string
  version: number
  createdAt: string
  updatedAt: string
  sections: PlanSection[]
}

interface CreateFormState {
  title: string
  description: string
  businessType: string
  industry: string
  targetMarket: string
  generateWithAI: boolean
}

const SECTION_TYPES: { type: string; title: string; icon: string }[] = [
  { type: 'executive_summary', title: 'Executive Summary', icon: '📋' },
  { type: 'market_analysis', title: 'Market Analysis', icon: '📊' },
  { type: 'swot', title: 'SWOT Analysis', icon: '🎯' },
  { type: 'competitor', title: 'Competitor Analysis', icon: '⚔️' },
  { type: 'financial', title: 'Financial Planning', icon: '💰' },
  { type: 'marketing', title: 'Marketing Strategy', icon: '📣' },
  { type: 'operations', title: 'Operations Plan', icon: '⚙️' },
  { type: 'team', title: 'Team & Organization', icon: '👥' },
]

const BUSINESS_TYPES = [
  'SaaS / Software',
  'E-Commerce',
  'Marketplace',
  'Fintech',
  'Healthtech',
  'Edtech',
  'Consulting',
  'Agency',
  'Manufacturing',
  'Retail',
  'Food & Beverage',
  'Other',
]

const INDUSTRIES = [
  'Technology',
  'Finance & Banking',
  'Healthcare',
  'Education',
  'Retail & Commerce',
  'Manufacturing',
  'Real Estate',
  'Logistics & Transportation',
  'Food & Agriculture',
  'Energy & Sustainability',
  'Media & Entertainment',
  'Other',
]

const TARGET_MARKETS = [
  'Southeast Asia',
  'North America',
  'Europe',
  'East Asia',
  'South Asia',
  'Middle East',
  'Latin America',
  'Africa',
  'Global',
]

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Edit, color: 'text-slate-500' },
  review: { label: 'In Review', variant: 'outline', icon: Eye, color: 'text-amber-500' },
  approved: { label: 'Approved', variant: 'default', icon: CheckCircle, color: 'text-emerald-500' },
  archived: { label: 'Archived', variant: 'secondary', icon: Archive, color: 'text-muted-foreground' },
}

export function PlansPage() {
  const { organization } = useAuthStore()

  // State
  const [plans, setPlans] = useState<BusinessPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<BusinessPlan | null>(null)
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Create form state
  const [createForm, setCreateForm] = useState<CreateFormState>({
    title: '',
    description: '',
    businessType: '',
    industry: '',
    targetMarket: '',
    generateWithAI: false,
  })

  // Editor state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [editingSections, setEditingSections] = useState<Record<string, string>>({})
  const [aiRewriting, setAiRewriting] = useState<Record<string, boolean>>({})
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({})

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    if (!organization?.id) return
    setIsLoadingPlans(true)
    try {
      const res = await fetch(`/api/plans?organizationId=${organization.id}`)
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans || [])
      } else {
        toast.error('Failed to fetch plans')
      }
    } catch {
      toast.error('Failed to fetch plans')
    } finally {
      setIsLoadingPlans(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  // When selecting a plan, initialize editing state
  useEffect(() => {
    if (selectedPlan?.sections) {
      const editing: Record<string, string> = {}
      const expanded: Record<string, boolean> = {}
      selectedPlan.sections.forEach((section) => {
        editing[section.id] = section.content
        // Expand sections that have content
        expanded[section.id] = section.content.length > 0
      })
      setEditingSections(editing)
      setExpandedSections(expanded)
    }
  }, [selectedPlan])

  // Create plan
  const handleCreatePlan = async () => {
    if (!organization?.id) return
    if (!createForm.title.trim()) {
      toast.error('Please enter a plan title')
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          title: createForm.title,
          description: createForm.description,
          businessType: createForm.businessType,
          industry: createForm.industry,
          targetMarket: createForm.targetMarket,
          generateWithAI: createForm.generateWithAI,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(
          createForm.generateWithAI
            ? 'Business plan created with AI-generated content!'
            : 'Business plan created successfully!'
        )
        setCreateDialogOpen(false)
        setCreateForm({
          title: '',
          description: '',
          businessType: '',
          industry: '',
          targetMarket: '',
          generateWithAI: false,
        })
        fetchPlans()
        // Auto-select the new plan
        if (data.plan) {
          setSelectedPlan(data.plan)
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create plan')
      }
    } catch {
      toast.error('Failed to create plan')
    } finally {
      setIsCreating(false)
    }
  }

  // AI Rewrite section
  const handleAIRewrite = async (section: PlanSection) => {
    if (!selectedPlan) return

    setAiRewriting((prev) => ({ ...prev, [section.id]: true }))
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Rewrite the ${section.type.replace('_', ' ')} section for "${selectedPlan.title}". Current content: ${section.content || 'No content yet.'}. Make it professional, detailed, and investor-ready.`,
          agentType: 'ceo',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const newContent = data.response || ''
        setEditingSections((prev) => ({ ...prev, [section.id]: newContent }))
        toast.success(`${section.title} section rewritten with AI!`)
      } else {
        toast.error('Failed to rewrite section')
      }
    } catch {
      toast.error('Failed to rewrite section with AI')
    } finally {
      setAiRewriting((prev) => ({ ...prev, [section.id]: false }))
    }
  }

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1 text-xs">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  // Filter plans
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // ==========================================
  // PLAN EDITOR VIEW
  // ==========================================
  if (selectedPlan) {
    return (
      <div className="space-y-6">
        {/* Editor Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPlan(null)}
            className="w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Plans
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold truncate">{selectedPlan.title}</h1>
              {getStatusBadge(selectedPlan.status)}
              {selectedPlan.version > 1 && (
                <Badge variant="outline" className="text-xs">
                  v{selectedPlan.version}
                </Badge>
              )}
            </div>
            {selectedPlan.description && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {selectedPlan.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => toast.info('PDF export coming soon!')}>
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info('DOCX export coming soon!')}>
              <Download className="w-4 h-4 mr-1" />
              DOCX
            </Button>
          </div>
        </div>

        <Separator />

        {/* Plan Sections */}
        <div className="space-y-3">
          {selectedPlan.sections
            .sort((a, b) => a.order - b.order)
            .map((section) => {
              const sectionType = SECTION_TYPES.find((s) => s.type === section.type)
              const isExpanded = expandedSections[section.id] ?? false
              const isRewriting = aiRewriting[section.id] ?? false
              const editContent = editingSections[section.id] ?? section.content
              const isSaving = savingSections[section.id] ?? false

              return (
                <Collapsible
                  key={section.id}
                  open={isExpanded}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <Card className="overflow-hidden transition-all hover:shadow-md">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{sectionType?.icon || '📄'}</span>
                            <div>
                              <CardTitle className="text-sm font-semibold">
                                {section.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-0.5">
                                {section.aiGenerated && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                                    <Sparkles className="w-3 h-3" />
                                    AI Generated
                                  </span>
                                )}
                                {!section.content && !editContent && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Empty section
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {section.aiGenerated && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-1 border-primary/30 text-primary"
                              >
                                <Sparkles className="w-3 h-3" />
                                AI
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 space-y-3">
                        <Separator />
                        {/* AI Rewrite Button */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {editContent
                              ? `${editContent.length} characters`
                              : 'No content yet'}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAIRewrite(section)}
                            disabled={isRewriting}
                            className="gap-1.5 text-xs h-7"
                          >
                            {isRewriting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Wand2 className="w-3 h-3" />
                            )}
                            {isRewriting ? 'Rewriting...' : 'AI Rewrite'}
                          </Button>
                        </div>
                        {/* Editable Text Area */}
                        <Textarea
                          value={editContent}
                          onChange={(e) =>
                            setEditingSections((prev) => ({
                              ...prev,
                              [section.id]: e.target.value,
                            }))
                          }
                          placeholder={`Write your ${section.title.toLowerCase()} here, or use AI Rewrite to generate content...`}
                          className="min-h-[200px] font-mono text-sm leading-relaxed resize-y"
                          disabled={isRewriting}
                        />
                        {isRewriting && (
                          <div className="flex items-center gap-2 text-xs text-primary">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>AI is rewriting this section...</span>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
        </div>

        {/* Bottom Actions */}
        <Separator />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4">
          <p className="text-xs text-muted-foreground">
            Last updated:{' '}
            {format(new Date(selectedPlan.updatedAt), 'MMM d, yyyy h:mm a')}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('PDF export coming soon!')}
            >
              <Download className="w-4 h-4 mr-1" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('DOCX export coming soon!')}
            >
              <Download className="w-4 h-4 mr-1" />
              Export DOCX
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // PLAN LIST VIEW
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage AI-powered business plans for your organization
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="w-4 h-4" />
              New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Business Plan</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new business plan. Enable AI generation to auto-fill all sections.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="plan-title">Plan Title *</Label>
                <Input
                  id="plan-title"
                  placeholder="e.g., Series A Pitch Deck, Annual Business Plan"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="plan-desc">Description</Label>
                <Textarea
                  id="plan-desc"
                  placeholder="Brief description of this business plan's purpose..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="min-h-[80px]"
                />
              </div>

              {/* Business Type & Industry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select
                    value={createForm.businessType}
                    onValueChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, businessType: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select
                    value={createForm.industry}
                    onValueChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, industry: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target Market */}
              <div className="space-y-2">
                <Label>Target Market</Label>
                <Select
                  value={createForm.targetMarket}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({ ...prev, targetMarket: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select target market" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_MARKETS.map((market) => (
                      <SelectItem key={market} value={market}>
                        {market}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Generate Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium cursor-pointer">
                      AI Auto-Generate
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Let AI fill all 8 sections with professional content
                    </p>
                  </div>
                </div>
                <Switch
                  checked={createForm.generateWithAI}
                  onCheckedChange={(checked) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      generateWithAI: checked,
                    }))
                  }
                />
              </div>

              {createForm.generateWithAI && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-primary">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    AI will generate content for all 8 sections based on your
                    business details. This may take a moment. The plan status will
                    be set to &ldquo;In Review&rdquo; after generation.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreatePlan} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {createForm.generateWithAI
                      ? 'Generating with AI...'
                      : 'Creating...'}
                  </>
                ) : (
                  <>
                    {createForm.generateWithAI && (
                      <Sparkles className="w-4 h-4 mr-1" />
                    )}
                    {createForm.generateWithAI
                      ? 'Create & Generate'
                      : 'Create Plan'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-lg p-0.5">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('list')}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {!isLoadingPlans && plans.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Plans</p>
              <p className="text-sm font-bold">{plans.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <Edit className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-xs text-muted-foreground">Drafts</p>
              <p className="text-sm font-bold">
                {plans.filter((p) => p.status === 'draft').length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <Eye className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">In Review</p>
              <p className="text-sm font-bold">
                {plans.filter((p) => p.status === 'review').length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-sm font-bold">
                {plans.filter((p) => p.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      {isLoadingPlans ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
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
      ) : filteredPlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {searchQuery || statusFilter !== 'all'
                ? 'No plans found'
                : 'No business plans yet'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first business plan and let AI help you build a comprehensive strategy.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create Your First Plan
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={setSelectedPlan}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlans.map((plan) => (
            <PlanListItem
              key={plan.id}
              plan={plan}
              onSelect={setSelectedPlan}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function PlanCard({
  plan,
  onSelect,
  getStatusBadge,
}: {
  plan: BusinessPlan
  onSelect: (plan: BusinessPlan) => void
  getStatusBadge: (status: string) => React.ReactNode
}) {
  const aiSections = plan.sections.filter((s) => s.aiGenerated).length
  const totalSections = plan.sections.length
  const filledSections = plan.sections.filter((s) => s.content && s.content.length > 0).length

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all group overflow-hidden"
      onClick={() => onSelect(plan)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
              {plan.title}
            </CardTitle>
          </div>
          {getStatusBadge(plan.status)}
        </div>
        {plan.description && (
          <CardDescription className="text-xs line-clamp-2 mt-1">
            {plan.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(plan.updatedAt), 'MMM d, yyyy')}
            </span>
            {aiSections > 0 && (
              <span className="flex items-center gap-1 text-primary">
                <Sparkles className="w-3 h-3" />
                {aiSections}/{totalSections} AI
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {filledSections}/{totalSections} sections
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${totalSections > 0 ? (filledSections / totalSections) * 100 : 0}%`,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function PlanListItem({
  plan,
  onSelect,
  getStatusBadge,
}: {
  plan: BusinessPlan
  onSelect: (plan: BusinessPlan) => void
  getStatusBadge: (status: string) => React.ReactNode
}) {
  const aiSections = plan.sections.filter((s) => s.aiGenerated).length
  const totalSections = plan.sections.length
  const filledSections = plan.sections.filter((s) => s.content && s.content.length > 0).length

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all group overflow-hidden"
      onClick={() => onSelect(plan)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {plan.title}
                </CardTitle>
                {getStatusBadge(plan.status)}
              </div>
              {plan.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {plan.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
            {aiSections > 0 && (
              <span className="flex items-center gap-1 text-primary">
                <Sparkles className="w-3 h-3" />
                {aiSections}/{totalSections} AI
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(plan.updatedAt), 'MMM d')}
            </span>
            <span>{filledSections}/{totalSections} sections</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
