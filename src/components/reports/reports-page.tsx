'use client'

import { useState } from 'react'
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
  Calendar,
  FileSpreadsheet,
  FileImage,
  Table,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

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
}

// --- Mock Data ---
const mockReports: Report[] = [
  {
    id: '1',
    title: 'Q4 2025 Investor Update',
    type: 'investor',
    format: 'pdf',
    status: 'ready',
    date: '2025-12-15',
    size: '2.4 MB',
    aiGenerated: true,
    description: 'Comprehensive quarterly update for investors covering financials, growth metrics, and strategic initiatives.',
  },
  {
    id: '2',
    title: 'Monthly Financial Summary - November',
    type: 'financial',
    format: 'xlsx',
    status: 'ready',
    date: '2025-12-01',
    size: '1.8 MB',
    aiGenerated: true,
    description: 'Detailed P&L, balance sheet, and cash flow statement for November 2025.',
  },
  {
    id: '3',
    title: 'Weekly KPI Dashboard',
    type: 'kpi',
    format: 'pdf',
    status: 'generating',
    date: '2025-12-18',
    size: '-',
    aiGenerated: true,
    description: 'Weekly performance metrics across all business verticals.',
  },
  {
    id: '4',
    title: 'Board Meeting Deck - December',
    type: 'board',
    format: 'pptx',
    status: 'ready',
    date: '2025-12-10',
    size: '5.2 MB',
    aiGenerated: false,
    description: 'Presentation deck for the December board meeting with strategic recommendations.',
  },
  {
    id: '5',
    title: 'Market Analysis - Southeast Asia',
    type: 'market',
    format: 'docx',
    status: 'scheduled',
    date: '2025-12-20',
    size: '-',
    aiGenerated: true,
    description: 'Deep-dive market analysis for expansion opportunities in Southeast Asia.',
  },
  {
    id: '6',
    title: 'Annual KPI Report 2025',
    type: 'kpi',
    format: 'pdf',
    status: 'draft',
    date: '2025-12-12',
    size: '0.5 MB',
    aiGenerated: false,
    description: 'Annual key performance indicators report for fiscal year 2025.',
  },
]

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

  const sectionMap: Record<ReportType, string[]> = {
    investor: ['Executive Summary', 'Financial Highlights', 'Key Metrics', 'Growth Analysis', 'Strategic Outlook', 'Risk Factors'],
    board: ['Company Overview', 'Financial Performance', 'Operational Updates', 'Strategic Initiatives', 'Team & Culture', 'Recommendations'],
    kpi: ['Dashboard Summary', 'Revenue Metrics', 'Customer Metrics', 'Operational Metrics', 'Trend Analysis', 'Action Items'],
    financial: ['Income Statement', 'Balance Sheet', 'Cash Flow Statement', 'Budget vs Actual', 'Variance Analysis', 'Forecasts'],
    market: ['Market Overview', 'Competitive Landscape', 'Market Size & Growth', 'Customer Segments', 'Opportunities', 'Recommendations'],
  }

  const sections = sectionMap[report.type] || []

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

          {/* Content sections preview */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Report Sections</h4>
            <div className="space-y-2">
              {sections.map((section, i) => (
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
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GenerateReportDialog({ onGenerate }: { onGenerate: (report: Partial<Report>) => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ReportType>('kpi')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [aiGenerate, setAiGenerate] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    if (!title.trim()) {
      toast.error('Please enter a report title')
      return
    }
    setIsGenerating(true)
    setTimeout(() => {
      onGenerate({
        title,
        type,
        format,
        status: aiGenerate ? 'generating' : 'draft',
        aiGenerated: aiGenerate,
        description: `Custom ${typeConfig[type].label.toLowerCase()} report${aiGenerate ? ' generated by AI' : ''}.`,
      })
      setIsGenerating(false)
      setTitle('')
      setDateFrom('')
      setDateTo('')
      toast.success('Report generation started!')
    }, 800)
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date-from">From Date</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-to">To Date</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
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
              Generating...
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
  const [reports, setReports] = useState<Report[]>(mockReports)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredReports = filterType === 'all'
    ? reports
    : reports.filter((r) => r.type === filterType)

  const handleGenerate = (partial: Partial<Report>) => {
    const newReport: Report = {
      id: String(Date.now()),
      title: partial.title || 'Untitled Report',
      type: partial.type || 'kpi',
      format: partial.format || 'pdf',
      status: partial.status || 'draft',
      date: new Date().toISOString().split('T')[0],
      size: '-',
      aiGenerated: partial.aiGenerated || false,
      description: partial.description || 'Custom report.',
    }
    setReports((prev) => [newReport, ...prev])
    setDialogOpen(false)

    // Simulate generation completion
    if (newReport.status === 'generating') {
      setTimeout(() => {
        setReports((prev) =>
          prev.map((r) =>
            r.id === newReport.id ? { ...r, status: 'ready' as ReportStatus, size: '1.2 MB' } : r
          )
        )
        toast.success(`"${newReport.title}" is ready!`)
      }, 3000)
    }
  }

  const handleQuickTemplate = (template: typeof quickTemplates[number]) => {
    handleGenerate({
      title: template.title,
      type: template.type,
      format: template.format,
      status: 'generating',
      aiGenerated: true,
      description: template.description,
    })
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
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Generate Report
            </Button>
          </DialogTrigger>
          <GenerateReportDialog onGenerate={handleGenerate} />
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
            <Button variant="outline" size="sm" className="h-8">
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {filteredReports.length === 0 ? (
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
