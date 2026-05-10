'use client'

import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  FileText,
  Download,
  Plus,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle,
  Zap,
  ExternalLink,
  FileSpreadsheet,
  FileImage,
  Table,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'

// --- Types ---
type ReportType = 'investor' | 'board' | 'kpi' | 'financial' | 'market'
type ReportFormat = 'pdf' | 'docx' | 'pptx' | 'csv' | 'xlsx'
type ReportStatus = 'ready' | 'generating' | 'scheduled' | 'draft'

interface Report {
  id: string
  title: string
  type: ReportType
  format: ReportFormat
  status: ReportStatus
  date: string
  size: string
  aiGenerated: boolean
  description: string
  content?: string // JSON string from API
}

// --- Quick Templates ---
const quickTemplates = [
  {
    id: 't1',
    title: 'Weekly KPI Summary',
    type: 'kpi' as ReportType,
    format: 'pdf' as ReportFormat,
    description: 'Automated weekly snapshot of key metrics including MRR, churn, and growth rates.',
    icon: BarChart3,
  },
  {
    id: 't2',
    title: 'Monthly Financial Report',
    type: 'financial' as ReportType,
    format: 'xlsx' as ReportFormat,
    description: 'Complete monthly financials with P&L, balance sheet, and cash flow analysis.',
    icon: FileSpreadsheet,
  },
  {
    id: 't3',
    title: 'Quarterly Investor Update',
    type: 'investor' as ReportType,
    format: 'pdf' as ReportFormat,
    description: 'Investor-ready quarterly update with narrative, metrics, and forward guidance.',
    icon: FileText,
  },
  {
    id: 't4',
    title: 'Annual Board Report',
    type: 'board' as ReportType,
    format: 'pptx' as ReportFormat,
    description: 'Comprehensive annual report for board review with strategic analysis.',
    icon: FileImage,
  },
]

// --- Helpers ---
const typeConfig: Record<ReportType, { label: string; color: string }> = {
  investor: { label: 'Investor', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' },
  board: { label: 'Board', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400' },
  kpi: { label: 'KPI', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' },
  financial: { label: 'Financial', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400' },
  market: { label: 'Market', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400' },
}

const formatConfig: Record<ReportFormat, { label: string; icon: React.ElementType }> = {
  pdf: { label: 'PDF', icon: FileText },
  docx: { label: 'DOCX', icon: FileText },
  pptx: { label: 'PPTX', icon: FileImage },
  csv: { label: 'CSV', icon: Table },
  xlsx: { label: 'XLSX', icon: FileSpreadsheet },
}

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: React.ElementType }> = {
  ready: { label: 'Ready', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400', icon: CheckCircle },
  generating: { label: 'Generating', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400', icon: Loader2 },
  scheduled: { label: 'Scheduled', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400', icon: Clock },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-950/30 dark:text-gray-400', icon: FileText },
}

// Map API report status to UI status
function mapApiStatus(status: string): ReportStatus {
  if (status === 'generated' || status === 'approved' || status === 'sent') return 'ready'
  if (status === 'draft') return 'draft'
  return 'ready'
}

// --- Sub-Components ---
function ReportCard({ report, onClick }: { report: Report; onClick: () => void }) {
  const typeInfo = typeConfig[report.type]
  const formatInfo = formatConfig[report.format]
  const statusInfo = statusConfig[report.status]
  const StatusIcon = statusInfo.icon
  const FormatIcon = formatInfo.icon

  return (
    <Card
      className="hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
              <FormatIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold truncate">{report.title}</h3>
                {report.aiGenerated && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                    <Zap className="w-2.5 h-2.5 mr-0.5" />
                    AI
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{report.description}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${typeInfo.color}`}>
                  {typeInfo.label}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <FormatIcon className="w-2.5 h-2.5 mr-0.5" />
                  {formatInfo.label}
                </Badge>
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusInfo.color}`}>
                  <StatusIcon className={`w-2.5 h-2.5 mr-0.5 ${report.status === 'generating' ? 'animate-spin' : ''}`} />
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 gap-1">
            <span className="text-[10px] text-muted-foreground">{report.date}</span>
            {report.size !== '-' && (
              <span className="text-[10px] text-muted-foreground">{report.size}</span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReportPreviewPanel({ report, onClose }: { report: Report; onClose: () => void }) {
  const typeInfo = typeConfig[report.type]
  const formatInfo = formatConfig[report.format]
  const FormatIcon = formatInfo.icon

  // Parse AI-generated content from the report
  let parsedContent: { fullContent?: string; sections?: string[]; title?: string; error?: boolean } = {}
  try {
    if (report.content) {
      parsedContent = JSON.parse(report.content)
    }
  } catch {
    parsedContent = { fullContent: report.content }
  }

  // Extract sections from markdown content
  const extractSections = (markdown: string | undefined) => {
    if (!markdown) return []
    const sectionRegex = /^##\s+(.+)$/gm
    const sections: { title: string; content: string }[] = []
    let match
    while ((match = sectionRegex.exec(markdown)) !== null) {
      sections.push({ title: match[1], content: '' })
    }
    // If no ## headers found, try # headers
    if (sections.length === 0) {
      const h1Regex = /^#\s+(.+)$/gm
      while ((match = h1Regex.exec(markdown)) !== null) {
        sections.push({ title: match[1], content: '' })
      }
    }
    return sections
  }

  const markdownSections = extractSections(parsedContent.fullContent)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}>
          &larr; Back to Reports
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
                <FormatIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription className="mt-1">{report.description}</CardDescription>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${typeInfo.color}`}>
                    {typeInfo.label}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {formatInfo.label}
                  </Badge>
                  {report.aiGenerated && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                      <Zap className="w-2.5 h-2.5 mr-0.5" />
                      AI Generated
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Preview
              </Button>
              <Button size="sm" disabled={report.status !== 'ready'}>
                <Download className="w-3.5 h-3.5 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Created</p>
              <p className="text-sm font-semibold mt-0.5">{report.date}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Format</p>
              <p className="text-sm font-semibold mt-0.5">{formatInfo.label}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">File Size</p>
              <p className="text-sm font-semibold mt-0.5">{report.size === '-' ? 'Pending' : report.size}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</p>
              <p className="text-sm font-semibold mt-0.5 capitalize">{report.status}</p>
            </div>
          </div>

          {/* AI-generated content preview */}
          {parsedContent.fullContent ? (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                AI-Generated Report Content
              </h4>
              {markdownSections.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Sections</h5>
                  <div className="flex flex-wrap gap-2">
                    {markdownSections.map((section, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {i + 1}. {section.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <ScrollArea className="max-h-[500px]">
                <div className="prose-ai text-sm p-4 border rounded-lg bg-card">
                  <ReactMarkdown>{parsedContent.fullContent}</ReactMarkdown>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold mb-3">Report Sections</h4>
              <div className="space-y-2">
                {(parsedContent.sections || []).length > 0 ? (
                  (parsedContent.sections as string[]).map((section: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm">{section}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No content available yet. Generate this report to see AI content.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function GenerateReportDialog({
  onGenerate,
  isGenerating,
}: {
  onGenerate: (data: { title: string; type: ReportType; format: ReportFormat; aiGenerate: boolean }) => void
  isGenerating: boolean
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ReportType>('kpi')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [aiGenerate, setAiGenerate] = useState(true)

  const handleGenerate = () => {
    if (!title.trim()) {
      toast.error('Please enter a report title')
      return
    }
    onGenerate({ title, type, format, aiGenerate })
    setTitle('')
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Generate Report
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label htmlFor="report-title">Report Title</Label>
          <Input
            id="report-title"
            placeholder="Enter report title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kpi">KPI</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="investor">Investor</SelectItem>
                <SelectItem value="board">Board</SelectItem>
                <SelectItem value="market">Market</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="docx">DOCX</SelectItem>
                <SelectItem value="pptx">PPTX</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">XLSX</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium">AI Generate</p>
              <p className="text-[11px] text-muted-foreground">Let AI populate the report content</p>
            </div>
          </div>
          <Switch checked={aiGenerate} onCheckedChange={setAiGenerate} />
        </div>

        <Button className="w-full" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating with AI...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </DialogContent>
  )
}

// --- Main Component ---
export function ReportsPage() {
  const { user, organization } = useAuthStore()
  const userId = user?.id
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // Fetch reports from API
  const fetchReports = useCallback(async () => {
    if (!organization?.id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reports?organizationId=${organization.id}&userId=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch reports')
      const data = await res.json()

      const mappedReports: Report[] = (data.reports || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        title: r.title as string,
        type: (r.type as ReportType) || 'kpi',
        format: (r.format as ReportFormat) || 'pdf',
        status: mapApiStatus(r.status as string),
        date: new Date(r.createdAt as string).toISOString().split('T')[0],
        size: r.content ? `${(JSON.stringify(r.content).length / 1024).toFixed(1)} KB` : '-',
        aiGenerated: !!r.content && r.content !== '{}',
        description: (r.content ? extractDescription(r.content as string) : `${(r.type as string) || 'Custom'} report`) as string,
        content: r.content as string,
      }))

      setReports(mappedReports)
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // Extract a short description from report content
  function extractDescription(contentStr: string): string {
    try {
      const parsed = JSON.parse(contentStr)
      if (parsed.fullContent) {
        // Get first paragraph after any headers
        const lines = parsed.fullContent.split('\n').filter((l: string) => l.trim() && !l.startsWith('#'))
        return lines.slice(0, 2).join(' ').slice(0, 150) + (lines.join(' ').length > 150 ? '...' : '')
      }
    } catch {
      // ignore
    }
    return 'AI-generated report'
  }

  const filteredReports = filterType === 'all'
    ? reports
    : reports.filter((r) => r.type === filterType)

  // Generate report via real API
  const handleGenerate = async (data: { title: string; type: ReportType; format: ReportFormat; aiGenerate: boolean }) => {
    if (!organization?.id) return
    setIsGenerating(true)

    // Add a "generating" placeholder
    const tempId = `temp-${Date.now()}`
    const tempReport: Report = {
      id: tempId,
      title: data.title,
      type: data.type,
      format: data.format,
      status: 'generating',
      date: new Date().toISOString().split('T')[0],
      size: '-',
      aiGenerated: data.aiGenerate,
      description: `Custom ${typeConfig[data.type].label.toLowerCase()} report${data.aiGenerate ? ' being generated by AI' : ''}.`,
    }
    setReports((prev) => [tempReport, ...prev])
    setDialogOpen(false)

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          title: data.title,
          type: data.type,
          format: data.format,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate report')

      const result = await res.json()
      const newReport = result.report

      // Replace the temp report with the real one
      setReports((prev) =>
        prev.map((r) =>
          r.id === tempId
            ? {
                id: newReport.id,
                title: newReport.title,
                type: newReport.type as ReportType,
                format: newReport.format as ReportFormat,
                status: mapApiStatus(newReport.status),
                date: new Date(newReport.createdAt).toISOString().split('T')[0],
                size: newReport.content ? `${(JSON.stringify(newReport.content).length / 1024).toFixed(1)} KB` : '-',
                aiGenerated: !!newReport.content && newReport.content !== '{}',
                description: extractDescription(newReport.content),
                content: newReport.content,
              }
            : r
        )
      )
      toast.success(`"${data.title}" is ready!`)
    } catch {
      // Mark the temp report as draft on error
      setReports((prev) =>
        prev.map((r) =>
          r.id === tempId ? { ...r, status: 'draft' as ReportStatus } : r
        )
      )
      toast.error('Failed to generate report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleQuickTemplate = (template: typeof quickTemplates[number]) => {
    handleGenerate({
      title: template.title,
      type: template.type,
      format: template.format,
      aiGenerate: true,
    })
  }

  const handleRefresh = () => {
    fetchReports()
    toast.success('Reports refreshed')
  }

  // --- Report Preview Mode ---
  if (selectedReport) {
    return (
      <div className="space-y-6">
        <ReportPreviewPanel
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      </div>
    )
  }

  // --- Report List Mode ---
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Reports
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate, manage, and export business reports
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={isGenerating}>
              <Plus className="w-4 h-4 mr-1" />
              Generate Report
            </Button>
          </DialogTrigger>
          <GenerateReportDialog onGenerate={handleGenerate} isGenerating={isGenerating} />
        </Dialog>
      </div>

      {/* Quick Templates */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Quick Templates
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickTemplates.map((template) => {
            const TemplateIcon = template.icon
            return (
              <Card
                key={template.id}
                className="hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => handleQuickTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/20 transition-colors">
                      <TemplateIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{template.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {typeConfig[template.type].label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {template.format.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{template.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Filter + List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">All Reports</h3>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="kpi">KPI</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="investor">Investor</SelectItem>
                <SelectItem value="board">Board</SelectItem>
                <SelectItem value="market">Market</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading reports...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No reports found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different filter or generate a new report</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onClick={() => setSelectedReport(report)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
