'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Shield,
  Star,
  Globe,
  Database,
  FileText,
  TrendingUp,
  Building2,
  GraduationCap,
  Newspaper,
  BarChart3,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Download,
  BookOpen,
  Target,
  ChevronDown,
  ExternalLink,
  Hash,
  Zap,
  Filter,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type SourceType = 'government' | 'industry_report' | 'academic' | 'financial_institution' | 'news' | 'database'
type Geography = 'MY' | 'SG' | 'ID' | 'US' | 'Global' | 'ASEAN'
type SourceCategory = 'economic' | 'industry' | 'demographic' | 'financial' | 'regulatory' | 'technology'

interface VerifiedSource {
  id: string
  name: string
  type: SourceType
  url: string | null
  geography: string
  category: string
  verified: boolean
  rating: number
  lastUpdated: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  citations?: { id: string }[]
}

interface IndustryBenchmark {
  id: string
  industry: string
  subIndustry: string | null
  geography: string
  metric: string
  value: number
  unit: string
  period: string | null
  percentile25: number | null
  percentile50: number | null
  percentile75: number | null
  source: string
  sourceUrl: string | null
  sampleSize: number | null
  confidence: number
  createdAt: string
  updatedAt: string
}

interface Citation {
  id: string
  sourceId: string
  organizationId: string | null
  claim: string
  citation: string
  dataPoint: string | null
  confidence: number
  verified: boolean
  createdAt: string
  source: VerifiedSource
}

interface ResearchReport {
  topic: string
  geography: string
  industry: string
  executiveSummary: string
  marketOverview: string
  competitiveLandscape: string
  industryBenchmarks: string
  riskFactors: string
  opportunities: string
  citations: Array<{ claim: string; source: string; citation: string; dataPoint?: string }>
  references: Array<{ name: string; type: string; url?: string }>
  confidence: number
  generatedAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_TYPE_CONFIG: Record<SourceType, { label: string; icon: React.ElementType; color: string }> = {
  government: { label: 'Government', icon: Building2, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  industry_report: { label: 'Industry Report', icon: FileText, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' },
  academic: { label: 'Academic', icon: GraduationCap, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  financial_institution: { label: 'Financial Inst.', icon: TrendingUp, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  news: { label: 'News', icon: Newspaper, color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
  database: { label: 'Database', icon: Database, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400' },
}

const GEOGRAPHY_OPTIONS: { value: Geography; label: string; flag: string }[] = [
  { value: 'MY', label: 'Malaysia', flag: '🇲🇾' },
  { value: 'SG', label: 'Singapore', flag: '🇸🇬' },
  { value: 'ID', label: 'Indonesia', flag: '🇮🇩' },
  { value: 'US', label: 'United States', flag: '🇺🇸' },
  { value: 'Global', label: 'Global', flag: '🌐' },
  { value: 'ASEAN', label: 'ASEAN', flag: '🌏' },
]

const CATEGORY_OPTIONS: { value: SourceCategory; label: string }[] = [
  { value: 'economic', label: 'Economic' },
  { value: 'industry', label: 'Industry' },
  { value: 'demographic', label: 'Demographic' },
  { value: 'financial', label: 'Financial' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'technology', label: 'Technology' },
]

const INDUSTRY_OPTIONS = [
  { value: 'saas', label: 'SaaS' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'healthcare', label: 'Healthcare' },
]

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

function getGeographyTag(geo: string) {
  const found = GEOGRAPHY_OPTIONS.find(g => g.value === geo)
  return found ? `${found.flag} ${found.label}` : geo
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getConfidenceLevel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.8) return { label: 'High', color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30' }
  if (confidence >= 0.5) return { label: 'Medium', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30' }
  return { label: 'Low', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30' }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ResearchPage() {
  const { organization } = useAuthStore()
  const [activeTab, setActiveTab] = useState('sources')

  // Sources state
  const [sources, setSources] = useState<VerifiedSource[]>([])
  const [isLoadingSources, setIsLoadingSources] = useState(true)
  const [sourceSearch, setSourceSearch] = useState('')
  const [sourceGeoFilter, setSourceGeoFilter] = useState<string>('all')
  const [sourceCatFilter, setSourceCatFilter] = useState<string>('all')
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('all')
  const [isSeedingSources, setIsSeedingSources] = useState(false)

  // Benchmarks state
  const [benchmarks, setBenchmarks] = useState<IndustryBenchmark[]>([])
  const [isLoadingBenchmarks, setIsLoadingBenchmarks] = useState(false)
  const [benchmarkIndustry, setBenchmarkIndustry] = useState('saas')
  const [benchmarkGeo, setBenchmarkGeo] = useState<string>('all')
  const [isSeedingBenchmarks, setIsSeedingBenchmarks] = useState(false)
  const [comparisonMetrics, setComparisonMetrics] = useState<string[]>([])
  const [yourValue, setYourValue] = useState<Record<string, number>>({})

  // Citations state
  const [citations, setCitations] = useState<Citation[]>([])
  const [isLoadingCitations, setIsLoadingCitations] = useState(false)
  const [citationConfidenceFilter, setCitationConfidenceFilter] = useState<string>('all')
  const [citationVerifiedFilter, setCitationVerifiedFilter] = useState<string>('all')
  const [addCitationOpen, setAddCitationOpen] = useState(false)
  const [newCitation, setNewCitation] = useState({ sourceId: '', claim: '', citation: '', dataPoint: '', confidence: 0.7 })
  const [validatingCitationId, setValidatingCitationId] = useState<string | null>(null)

  // AI Report state
  const [reportTopic, setReportTopic] = useState('')
  const [reportGeo, setReportGeo] = useState<string>('Global')
  const [reportIndustry, setReportIndustry] = useState<string>('saas')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<ResearchReport | null>(null)

  // ─── Fetch Sources ─────────────────────────────────────────────────────
  const fetchSources = useCallback(async () => {
    setIsLoadingSources(true)
    try {
      const params = new URLSearchParams({ action: 'sources' })
      if (sourceGeoFilter !== 'all') params.set('geography', sourceGeoFilter)
      if (sourceCatFilter !== 'all') params.set('category', sourceCatFilter)
      const res = await fetch(`/api/research?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSources(data.sources || [])
      }
    } catch {
      toast.error('Failed to load sources')
    } finally {
      setIsLoadingSources(false)
    }
  }, [sourceGeoFilter, sourceCatFilter])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  // ─── Fetch Benchmarks ──────────────────────────────────────────────────
  const fetchBenchmarks = useCallback(async () => {
    if (!benchmarkIndustry) return
    setIsLoadingBenchmarks(true)
    try {
      const params = new URLSearchParams({ action: 'benchmarks', industry: benchmarkIndustry })
      if (benchmarkGeo !== 'all') params.set('geography', benchmarkGeo)
      const res = await fetch(`/api/research?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setBenchmarks(data.benchmarks || [])
      }
    } catch {
      toast.error('Failed to load benchmarks')
    } finally {
      setIsLoadingBenchmarks(false)
    }
  }, [benchmarkIndustry, benchmarkGeo])

  useEffect(() => {
    fetchBenchmarks()
  }, [fetchBenchmarks])

  // ─── Fetch Citations ───────────────────────────────────────────────────
  const fetchCitations = useCallback(async () => {
    if (!organization?.id) return
    setIsLoadingCitations(true)
    try {
      const res = await fetch(`/api/research?action=citations&organizationId=${organization.id}`)
      if (res.ok) {
        const data = await res.json()
        setCitations(data.citations || [])
      }
    } catch {
      toast.error('Failed to load citations')
    } finally {
      setIsLoadingCitations(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchCitations()
  }, [fetchCitations])

  // ─── Computed: Filtered Sources ────────────────────────────────────────
  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (sourceSearch && !s.name.toLowerCase().includes(sourceSearch.toLowerCase())) return false
      if (sourceTypeFilter !== 'all' && s.type !== sourceTypeFilter) return false
      if (sourceGeoFilter !== 'all' && s.geography !== sourceGeoFilter) return false
      if (sourceCatFilter !== 'all' && s.category !== sourceCatFilter) return false
      return true
    })
  }, [sources, sourceSearch, sourceTypeFilter, sourceGeoFilter, sourceCatFilter])

  // ─── Computed: Filtered Citations ──────────────────────────────────────
  const filteredCitations = useMemo(() => {
    return citations.filter((c) => {
      if (citationConfidenceFilter === 'high' && c.confidence < 0.8) return false
      if (citationConfidenceFilter === 'medium' && (c.confidence < 0.5 || c.confidence >= 0.8)) return false
      if (citationConfidenceFilter === 'low' && c.confidence >= 0.5) return false
      if (citationVerifiedFilter === 'verified' && !c.verified) return false
      if (citationVerifiedFilter === 'unverified' && c.verified) return false
      return true
    })
  }, [citations, citationConfidenceFilter, citationVerifiedFilter])

  // ─── Computed: Comparison Chart Data ───────────────────────────────────
  const comparisonChartData = useMemo(() => {
    return benchmarks
      .filter(b => comparisonMetrics.length === 0 || comparisonMetrics.includes(b.metric))
      .map(b => ({
        metric: b.metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        industry: b.value,
        yours: yourValue[b.metric] ?? 0,
        p25: b.percentile25 ?? 0,
        p75: b.percentile75 ?? 0,
        unit: b.unit,
      }))
  }, [benchmarks, comparisonMetrics, yourValue])

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleSeedSources = useCallback(async () => {
    setIsSeedingSources(true)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_sources' }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Seeded ${data.seeded} new sources (${data.skipped} already exist)`)
        fetchSources()
      } else {
        toast.error('Failed to seed sources')
      }
    } catch {
      toast.error('Failed to seed sources')
    } finally {
      setIsSeedingSources(false)
    }
  }, [fetchSources])

  const handleSeedBenchmarks = useCallback(async () => {
    setIsSeedingBenchmarks(true)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_benchmarks' }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Seeded ${data.seeded} new benchmarks (${data.skipped} already exist)`)
        fetchBenchmarks()
      } else {
        toast.error('Failed to seed benchmarks')
      }
    } catch {
      toast.error('Failed to seed benchmarks')
    } finally {
      setIsSeedingBenchmarks(false)
    }
  }, [fetchBenchmarks])

  const handleCreateCitation = useCallback(async () => {
    if (!newCitation.sourceId || !newCitation.claim || !newCitation.citation) {
      toast.error('Source, claim, and citation text are required')
      return
    }
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_citation',
          sourceId: newCitation.sourceId,
          claim: newCitation.claim,
          citation: newCitation.citation,
          dataPoint: newCitation.dataPoint || undefined,
          confidence: newCitation.confidence,
        }),
      })
      if (res.ok) {
        toast.success('Citation created')
        setAddCitationOpen(false)
        setNewCitation({ sourceId: '', claim: '', citation: '', dataPoint: '', confidence: 0.7 })
        fetchCitations()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create citation')
      }
    } catch {
      toast.error('Failed to create citation')
    }
  }, [newCitation, fetchCitations])

  const handleValidateCitation = useCallback(async (citationId: string) => {
    setValidatingCitationId(citationId)
    try {
      const res = await fetch(`/api/research/${citationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate_citation' }),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.valid) {
          toast.success('Citation validated successfully')
        } else {
          toast.warning(`Citation has issues: ${result.issues?.join(', ') || 'validation failed'}`)
        }
        fetchCitations()
      } else {
        toast.error('Failed to validate citation')
      }
    } catch {
      toast.error('Failed to validate citation')
    } finally {
      setValidatingCitationId(null)
    }
  }, [fetchCitations])

  const handleGenerateReport = useCallback(async () => {
    if (!reportTopic.trim()) {
      toast.error('Please enter a research topic')
      return
    }
    setIsGeneratingReport(true)
    setGeneratedReport(null)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_report',
          topic: reportTopic,
          geography: reportGeo,
          industry: reportIndustry,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeneratedReport(data.report)
        toast.success('Research report generated')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to generate report')
      }
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setIsGeneratingReport(false)
    }
  }, [reportTopic, reportGeo, reportIndustry])

  // ─── Stats ─────────────────────────────────────────────────────────────
  const verifiedCount = sources.filter(s => s.verified).length

  // ─── Chart Tooltip Style ───────────────────────────────────────────────
  const chartTooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Bank-Grade Research Agent
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {organization?.name ?? 'Your Organization'} · Verified sources, citations & AI-powered research
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Database className="w-3 h-3" />
            {sources.length} Sources
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {verifiedCount} Verified
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sources" className="text-xs sm:text-sm gap-1.5">
            <BookOpen className="w-3.5 h-3.5 hidden sm:inline" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="text-xs sm:text-sm gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 hidden sm:inline" />
            Benchmarks
          </TabsTrigger>
          <TabsTrigger value="citations" className="text-xs sm:text-sm gap-1.5">
            <Hash className="w-3.5 h-3.5 hidden sm:inline" />
            Citations
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs sm:text-sm gap-1.5">
            <Sparkles className="w-3.5 h-3.5 hidden sm:inline" />
            AI Report
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Verified Sources ──────────────────────────────────── */}
        <TabsContent value="sources" className="mt-4 space-y-4">
          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sources by name..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={sourceGeoFilter} onValueChange={setSourceGeoFilter}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Geography" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {GEOGRAPHY_OPTIONS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.flag} {g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sourceCatFilter} onValueChange={setSourceCatFilter}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORY_OPTIONS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(SOURCE_TYPE_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={handleSeedSources}
                    disabled={isSeedingSources}
                  >
                    {isSeedingSources ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Seed Sources
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9" onClick={fetchSources}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sources Count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {filteredSources.length} of {sources.length} sources
              {verifiedCount > 0 && ` · ${verifiedCount} verified`}
            </p>
          </div>

          {/* Sources Grid */}
          {isLoadingSources ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSources.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center">
                  <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No sources found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {sources.length === 0
                      ? 'Click "Seed Sources" to populate the database with 50+ verified research sources.'
                      : 'Try adjusting your filters or search query.'}
                  </p>
                  {sources.length === 0 && (
                    <Button className="mt-4 gap-1.5" size="sm" onClick={handleSeedSources} disabled={isSeedingSources}>
                      {isSeedingSources ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Seed Default Sources
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[calc(100vh-380px)] overflow-y-auto custom-scrollbar pr-1">
              {filteredSources.map((source) => {
                const typeConfig = SOURCE_TYPE_CONFIG[source.type as SourceType] || SOURCE_TYPE_CONFIG.database
                const TypeIcon = typeConfig.icon
                return (
                  <Card key={source.id} className="hover:shadow-md transition-shadow group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${typeConfig.color}`}>
                            <TypeIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">{source.name}</p>
                          </div>
                        </div>
                        {source.verified && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {typeConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getGeographyTag(source.geography)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                          {source.category}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        {renderStars(source.rating)}
                        <span className="text-[10px] text-muted-foreground">
                          Updated {formatDate(source.lastUpdated || source.updatedAt)}
                        </span>
                      </div>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline truncate block mt-1"
                        >
                          <ExternalLink className="w-2.5 h-2.5 inline mr-0.5" />
                          {source.url.replace(/^https?:\/\//, '').slice(0, 40)}
                        </a>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab 2: Industry Benchmarks ───────────────────────────────── */}
        <TabsContent value="benchmarks" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={benchmarkIndustry} onValueChange={setBenchmarkIndustry}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue placeholder="Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map(i => (
                        <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={benchmarkGeo} onValueChange={setBenchmarkGeo}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Geography" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {GEOGRAPHY_OPTIONS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.flag} {g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={handleSeedBenchmarks}
                    disabled={isSeedingBenchmarks}
                  >
                    {isSeedingBenchmarks ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Seed Benchmarks
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9" onClick={fetchBenchmarks}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benchmarks Table */}
          {isLoadingBenchmarks ? (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : benchmarks.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No benchmarks found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Click &quot;Seed Benchmarks&quot; to populate with industry standard data.
                  </p>
                  <Button className="mt-4 gap-1.5" size="sm" onClick={handleSeedBenchmarks} disabled={isSeedingBenchmarks}>
                    {isSeedingBenchmarks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Seed Default Benchmarks
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    {INDUSTRY_OPTIONS.find(i => i.value === benchmarkIndustry)?.label || benchmarkIndustry} Benchmarks
                  </CardTitle>
                  <CardDescription>{benchmarks.length} metrics across {new Set(benchmarks.map(b => b.geography)).size} regions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Sub-Industry</TableHead>
                          <TableHead className="text-xs">Metric</TableHead>
                          <TableHead className="text-xs text-right">Value</TableHead>
                          <TableHead className="text-xs text-right">P25</TableHead>
                          <TableHead className="text-xs text-right">P50</TableHead>
                          <TableHead className="text-xs text-right">P75</TableHead>
                          <TableHead className="text-xs">Geo</TableHead>
                          <TableHead className="text-xs">Source</TableHead>
                          <TableHead className="text-xs text-right">Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {benchmarks.map((b) => {
                          const confLevel = getConfidenceLevel(b.confidence)
                          return (
                            <TableRow key={b.id}>
                              <TableCell className="text-xs font-medium">
                                {b.subIndustry ? b.subIndustry.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—'}
                              </TableCell>
                              <TableCell className="text-xs">
                                {b.metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium">
                                {b.unit === 'percent' ? `${b.value}%` : b.unit === 'USD' ? `$${b.value.toLocaleString()}` : b.value.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs text-right text-muted-foreground">
                                {b.percentile25 != null ? (b.unit === 'percent' ? `${b.percentile25}%` : b.percentile25.toLocaleString()) : '—'}
                              </TableCell>
                              <TableCell className="text-xs text-right text-muted-foreground">
                                {b.percentile50 != null ? (b.unit === 'percent' ? `${b.percentile50}%` : b.percentile50.toLocaleString()) : '—'}
                              </TableCell>
                              <TableCell className="text-xs text-right text-muted-foreground">
                                {b.percentile75 != null ? (b.unit === 'percent' ? `${b.percentile75}%` : b.percentile75.toLocaleString()) : '—'}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {getGeographyTag(b.geography)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                                {b.source}
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${confLevel.color}`}>
                                  {confLevel.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison View */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Comparison View
                      </CardTitle>
                      <CardDescription>Compare your metrics against industry benchmarks</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={comparisonMetrics.length === 1 ? comparisonMetrics[0] : 'all'}
                        onValueChange={(v) => setComparisonMetrics(v === 'all' ? [] : [v])}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Metrics</SelectItem>
                          {benchmarks.map((b) => (
                            <SelectItem key={b.id} value={b.metric}>
                              {b.metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Your Value Input Row */}
                  <div className="mb-4 p-3 rounded-lg border bg-muted/30">
                    <p className="text-xs font-medium mb-2">Enter your values for comparison:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {benchmarks
                        .filter(b => comparisonMetrics.length === 0 || comparisonMetrics.includes(b.metric))
                        .slice(0, 8)
                        .map((b) => (
                          <div key={b.id} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground truncate block">
                              {b.metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {b.unit === 'percent' && ' (%)'}
                            </Label>
                            <Input
                              type="number"
                              placeholder={`${b.value}`}
                              className="h-7 text-xs"
                              value={yourValue[b.metric] ?? ''}
                              onChange={(e) => setYourValue(prev => ({
                                ...prev,
                                [b.metric]: parseFloat(e.target.value) || 0,
                              }))}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                  {/* Bar Chart */}
                  {comparisonChartData.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonChartData} layout="vertical" margin={{ left: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="metric" type="category" tick={{ fontSize: 10 }} width={80} />
                          <RechartsTooltip contentStyle={chartTooltipStyle} />
                          <Legend />
                          <Bar dataKey="industry" name="Industry Benchmark" fill="#10b981" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="yours" name="Your Value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
                      Enter your values above to see the comparison chart
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── Tab 3: Citations ─────────────────────────────────────────── */}
        <TabsContent value="citations" className="mt-4 space-y-4">
          {/* Filters + Add Button */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={citationConfidenceFilter} onValueChange={setCitationConfidenceFilter}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Confidence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">High (≥0.8)</SelectItem>
                      <SelectItem value="medium">Medium (0.5-0.8)</SelectItem>
                      <SelectItem value="low">Low (&lt;0.5)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={citationVerifiedFilter} onValueChange={setCitationVerifiedFilter}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="unverified">Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-9" onClick={fetchCitations}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Dialog open={addCitationOpen} onOpenChange={setAddCitationOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Add Citation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add Citation</DialogTitle>
                      <DialogDescription>Create a new research citation linked to a verified source</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Source</Label>
                        <Select value={newCitation.sourceId} onValueChange={(v) => setNewCitation(p => ({ ...p, sourceId: v }))}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select a source" />
                          </SelectTrigger>
                          <SelectContent>
                            {sources.filter(s => s.verified).map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {sources.length === 0 && (
                          <p className="text-[10px] text-muted-foreground">No sources available. Seed sources first.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Claim</Label>
                        <Input
                          placeholder="The assertion being cited"
                          value={newCitation.claim}
                          onChange={(e) => setNewCitation(p => ({ ...p, claim: e.target.value }))}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Citation Text</Label>
                        <Textarea
                          placeholder="The exact citation text from the source"
                          value={newCitation.citation}
                          onChange={(e) => setNewCitation(p => ({ ...p, citation: e.target.value }))}
                          className="min-h-[80px] text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Data Point (optional)</Label>
                          <Input
                            placeholder="e.g., $2.4B"
                            value={newCitation.dataPoint}
                            onChange={(e) => setNewCitation(p => ({ ...p, dataPoint: e.target.value }))}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Confidence: {newCitation.confidence.toFixed(1)}</Label>
                          <Input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={newCitation.confidence}
                            onChange={(e) => setNewCitation(p => ({ ...p, confidence: parseFloat(e.target.value) }))}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddCitationOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateCitation} disabled={!newCitation.sourceId || !newCitation.claim || !newCitation.citation}>
                        Create Citation
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Citations List */}
          {isLoadingCitations ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCitations.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center">
                  <Hash className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No citations found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {citations.length === 0
                      ? 'Add your first citation by clicking "Add Citation" above.'
                      : 'Try adjusting your filters.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-340px)] overflow-y-auto custom-scrollbar pr-1">
              {filteredCitations.map((citation) => {
                const confLevel = getConfidenceLevel(citation.confidence)
                return (
                  <Card key={citation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{citation.claim}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {citation.verified ? (
                            <Badge className="text-[10px] px-1.5 py-0 gap-0.5 text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Unverified
                            </Badge>
                          )}
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${confLevel.color}`}>
                            {confLevel.label} ({citation.confidence.toFixed(1)})
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed mb-2">
                        &ldquo;{citation.citation}&rdquo;
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <BookOpen className="w-2.5 h-2.5 mr-0.5" />
                            {citation.source?.name || 'Unknown Source'}
                          </Badge>
                          {citation.dataPoint && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Target className="w-2.5 h-2.5 mr-0.5" />
                              {citation.dataPoint}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => handleValidateCitation(citation.id)}
                          disabled={validatingCitationId === citation.id}
                        >
                          {validatingCitationId === citation.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Shield className="w-3 h-3" />
                          )}
                          Validate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab 4: AI Research Report ─────────────────────────────────── */}
        <TabsContent value="report" className="mt-4 space-y-4">
          {/* Report Generator Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Research Report Generator
              </CardTitle>
              <CardDescription>
                Generate a comprehensive research report with verified citations and industry benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3 space-y-2">
                  <Label className="text-xs">Research Topic</Label>
                  <Input
                    placeholder="e.g., SaaS market trends in Southeast Asia 2024"
                    value={reportTopic}
                    onChange={(e) => setReportTopic(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Geography</Label>
                  <Select value={reportGeo} onValueChange={setReportGeo}>
                    <SelectTrigger className="h-9 text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {GEOGRAPHY_OPTIONS.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.flag} {g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Industry</Label>
                  <Select value={reportIndustry} onValueChange={setReportIndustry}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map(i => (
                        <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full gap-1.5"
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport || !reportTopic.trim()}
                  >
                    {isGeneratingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isGeneratingReport && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <p className="text-sm font-medium mt-4">Generating your research report...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Analyzing sources, benchmarks, and generating citations
                  </p>
                  <div className="w-48 mt-4">
                    <Progress value={66} className="h-1.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Display */}
          {generatedReport && !isGeneratingReport && (
            <div className="space-y-4">
              {/* Report Header */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{generatedReport.topic}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getGeographyTag(generatedReport.geography)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                          {generatedReport.industry}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getConfidenceLevel(generatedReport.confidence).color}`}>
                          Confidence: {(generatedReport.confidence * 100).toFixed(0)}%
                        </Badge>
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                      const text = [
                        `# ${generatedReport.topic}\n`,
                        `## Executive Summary\n${generatedReport.executiveSummary}\n`,
                        `## Market Overview\n${generatedReport.marketOverview}\n`,
                        `## Competitive Landscape\n${generatedReport.competitiveLandscape}\n`,
                        `## Industry Benchmarks\n${generatedReport.industryBenchmarks}\n`,
                        `## Risk Factors\n${generatedReport.riskFactors}\n`,
                        `## Opportunities\n${generatedReport.opportunities}\n`,
                        `## References\n`,
                        ...generatedReport.references.map((r, i) => `${i + 1}. ${r.name} (${r.type})${r.url ? ` - ${r.url}` : ''}`),
                      ].join('\n')
                      navigator.clipboard.writeText(text)
                      toast.success('Report copied to clipboard')
                    }}>
                      <Download className="w-3.5 h-3.5" />
                      Copy
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Executive Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Executive Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {generatedReport.executiveSummary}
                  </p>
                </CardContent>
              </Card>

              {/* Market Overview + Competitive Landscape */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      Market Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {generatedReport.marketOverview}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Competitive Landscape
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {generatedReport.competitiveLandscape}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Industry Benchmarks */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Industry Benchmarks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {generatedReport.industryBenchmarks}
                  </p>
                </CardContent>
              </Card>

              {/* Risk Factors + Opportunities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Risk Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {generatedReport.riskFactors}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {generatedReport.opportunities}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Citations */}
              {generatedReport.citations && generatedReport.citations.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      Inline Citations
                    </CardTitle>
                    <CardDescription>{generatedReport.citations.length} verified citations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                      {generatedReport.citations.map((c, i) => (
                        <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{c.claim}</p>
                            <p className="text-[11px] text-muted-foreground italic mt-0.5">&ldquo;{c.citation}&rdquo;</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {c.source}
                              </Badge>
                              {c.dataPoint && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {c.dataPoint}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* References */}
              {generatedReport.references && generatedReport.references.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      References
                    </CardTitle>
                    <CardDescription>{generatedReport.references.length} sources referenced</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {generatedReport.references.map((ref, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <span className="text-xs text-muted-foreground font-mono w-6 text-right shrink-0">[{i + 1}]</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{ref.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                                {ref.type.replace(/_/g, ' ')}
                              </Badge>
                              {ref.url && (
                                <a
                                  href={ref.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary hover:underline truncate"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 inline mr-0.5" />
                                  {ref.url.replace(/^https?:\/\//, '').slice(0, 50)}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Empty State for Report */}
          {!generatedReport && !isGeneratingReport && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center">
                  <Sparkles className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No report generated yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Enter a research topic above and click &quot;Generate Report&quot; to create a comprehensive AI-powered research report with verified citations.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
