'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Globe,
  Plus,
  X,
  MousePointerClick,
  Keyboard,
  Camera,
  FileText,
  ArrowRight,
  Clock,
  AlertCircle,
  Monitor,
  Search,
  Loader2,
  ExternalLink,
  Trash2,
  Zap,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================

interface BrowserSnapshot {
  id: string
  screenshotUrl: string | null
  extractedContent: string | null
  url: string | null
  title: string | null
  createdAt: string
}

interface BrowserSession {
  id: string
  userId: string
  status: string
  startUrl: string | null
  currentUrl: string | null
  title: string | null
  snapshots?: BrowserSnapshot[]
  createdAt: string
  updatedAt: string
}

interface BrowserActionResult {
  success: boolean
  data?: string
  url?: string
  title?: string
  error?: string
  duration?: number
}

type ActionType = 'navigate' | 'click' | 'type' | 'screenshot' | 'extract'

// ============================================
// Quick workflow definitions
// ============================================

const QUICK_WORKFLOWS = [
  {
    id: 'research_competitor',
    name: 'Research Competitor',
    description: 'Navigate to a competitor site and extract key information',
    icon: Search,
    actions: [
      { type: 'navigate' as const, url: '', selector: '', value: '' },
      { type: 'screenshot' as const, url: '', selector: '', value: '' },
      { type: 'extract' as const, url: '', selector: '', value: '' },
    ],
  },
  {
    id: 'extract_pricing',
    name: 'Extract Pricing',
    description: 'Navigate to a page and extract pricing information',
    icon: FileText,
    actions: [
      { type: 'navigate' as const, url: '', selector: '', value: '' },
      { type: 'extract' as const, url: '', selector: '', value: '' },
    ],
  },
  {
    id: 'fill_form',
    name: 'Fill Form',
    description: 'Navigate to a page and fill out a form',
    icon: Keyboard,
    actions: [
      { type: 'navigate' as const, url: '', selector: '', value: '' },
      { type: 'type' as const, url: '', selector: '', value: '' },
      { type: 'screenshot' as const, url: '', selector: '', value: '' },
    ],
  },
]

// ============================================
// Helper functions
// ============================================

function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'completed':
      return 'secondary'
    case 'error':
      return 'destructive'
    default:
      return 'outline'
  }
}

// ============================================
// Main Component
// ============================================

export function BrowserPage() {
  const { user, organization } = useAuthStore()
  const [sessions, setSessions] = useState<BrowserSession[]>([])
  const [selectedSession, setSelectedSession] = useState<BrowserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [newSessionUrl, setNewSessionUrl] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Action inputs
  const [navigateUrl, setNavigateUrl] = useState('')
  const [selectorInput, setSelectorInput] = useState('')
  const [valueInput, setValueInput] = useState('')

  // Action results
  const [screenshotData, setScreenshotData] = useState<string | null>(null)
  const [extractedContent, setExtractedContent] = useState<string | null>(null)

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/browser?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch browser sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Fetch single session detail
  const fetchSessionDetail = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/browser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_session', sessionId }),
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedSession(data.session)
      }
    } catch (error) {
      console.error('Failed to fetch session detail:', error)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Create new session
  const handleCreateSession = async () => {
    if (!user?.id) return
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_session',
          userId: user.id,
          startUrl: newSessionUrl || undefined,
          organizationId: organization?.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success('Browser session created')
        setIsCreateDialogOpen(false)
        setNewSessionUrl('')
        await fetchSessions()
        if (data.session) {
          setSelectedSession(data.session)
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create session')
      }
    } catch (error) {
      toast.error('Failed to create browser session')
      console.error(error)
    }
  }

  // Close session
  const handleCloseSession = async (sessionId: string) => {
    try {
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', sessionId }),
      })
      if (res.ok) {
        toast.success('Session closed')
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null)
          setScreenshotData(null)
          setExtractedContent(null)
        }
        await fetchSessions()
      }
    } catch (error) {
      toast.error('Failed to close session')
      console.error(error)
    }
  }

  // Execute browser action
  const executeAction = async (actionType: ActionType) => {
    if (!selectedSession) return
    setIsActionLoading(true)

    try {
      let res: Response

      if (actionType === 'screenshot') {
        res = await fetch('/api/browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'screenshot', sessionId: selectedSession.id }),
        })
      } else if (actionType === 'extract') {
        res = await fetch('/api/browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'extract', sessionId: selectedSession.id, selector: selectorInput || undefined }),
        })
      } else {
        const browserAction: Record<string, string> = { type: actionType }
        if (actionType === 'navigate') {
          browserAction.url = navigateUrl
        }
        if (selectorInput) {
          browserAction.selector = selectorInput
        }
        if (valueInput && (actionType === 'type' || actionType === 'fill')) {
          browserAction.value = valueInput
        }
        res = await fetch('/api/browser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'execute', sessionId: selectedSession.id, browserAction }),
        })
      }

      if (res.ok) {
        const data = await res.json()
        const result: BrowserActionResult = data.result

        if (result.success) {
          toast.success(`${actionType} action completed`)
          // Update session state
          await fetchSessionDetail(selectedSession.id)

          // Handle screenshot
          if (actionType === 'screenshot' && result.data) {
            setScreenshotData(result.data)
          }

          // Handle extract
          if (actionType === 'extract' && result.data) {
            setExtractedContent(result.data)
          }
        } else {
          toast.error(result.error || `${actionType} action failed`)
        }
      } else {
        const data = await res.json()
        toast.error(data.error || `${actionType} action failed`)
      }
    } catch (error) {
      toast.error(`Failed to execute ${actionType} action`)
      console.error(error)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Execute quick workflow
  const executeQuickWorkflow = async (workflowId: string) => {
    if (!selectedSession) {
      toast.error('Please select a session first')
      return
    }

    const workflow = QUICK_WORKFLOWS.find(w => w.id === workflowId)
    if (!workflow) return

    setIsActionLoading(true)
    try {
      // Execute workflow via API
      const res = await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_workflow',
          sessionId: selectedSession.id,
          browserActions: workflow.actions.map(a => ({
            ...a,
            url: a.type === 'navigate' ? navigateUrl || selectedSession.currentUrl || '' : a.url,
            selector: a.selector || (a.type === 'type' ? selectorInput : ''),
            value: a.value || (a.type === 'type' ? valueInput : ''),
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Workflow "${workflow.name}" executed`)
        await fetchSessionDetail(selectedSession.id)

        // Check results for screenshot/extract
        if (data.results) {
          for (const result of data.results) {
            if (result.data) {
              if (result.data.startsWith && result.data.startsWith('data:image')) {
                setScreenshotData(result.data)
              } else {
                setExtractedContent(result.data)
              }
            }
          }
        }
      } else {
        toast.error('Workflow execution failed')
      }
    } catch (error) {
      toast.error('Failed to execute workflow')
      console.error(error)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Select session
  const handleSelectSession = async (session: BrowserSession) => {
    setSelectedSession(session)
    setScreenshotData(null)
    setExtractedContent(null)
    await fetchSessionDetail(session.id)
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Browser Automation</h2>
          <p className="text-sm text-muted-foreground">
            Control browser sessions for web automation and data extraction
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <Plus className="w-3 h-3 mr-1" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Browser Session</DialogTitle>
              <DialogDescription>
                Start a new browser automation session. Optionally provide a starting URL.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start URL</label>
                <Input
                  placeholder="https://example.com"
                  value={newSessionUrl}
                  onChange={(e) => setNewSessionUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave empty to start with a blank page</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSession}>
                Create Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Sessions Panel */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Active Sessions</CardTitle>
              </div>
              <CardDescription>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedSession?.id === session.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleSelectSession(session)}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                        <Globe className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium truncate">
                            {session.title || session.currentUrl || 'New Session'}
                          </span>
                          <Badge
                            variant={getStatusBadgeVariant(session.status)}
                            className="text-[10px] px-1.5 py-0 shrink-0"
                          >
                            {session.status}
                          </Badge>
                        </div>
                        {session.currentUrl && (
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {session.currentUrl.replace(/^https?:\/\//, '').slice(0, 40)}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {getTimeAgo(session.createdAt)}
                          {session.snapshots && ` · ${session.snapshots.length} snapshots`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCloseSession(session.id)
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  message="No browser sessions"
                  description="Create a new session to start automating browser tasks."
                  icon={Monitor}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Detail View */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedSession ? (
            <Card>
              <CardContent className="p-12">
                <EmptyState
                  message="No session selected"
                  description="Select a session from the left panel or create a new one to get started."
                  icon={Globe}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Session Info */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">Session Detail</CardTitle>
                      <Badge variant={getStatusBadgeVariant(selectedSession.status)} className="text-[10px] px-1.5 py-0">
                        {selectedSession.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive hover:text-destructive"
                      onClick={() => handleCloseSession(selectedSession.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Current URL</span>
                      <p className="text-xs font-medium mt-0.5 truncate">{selectedSession.currentUrl || 'No URL'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</span>
                      <p className="text-xs font-medium mt-0.5 truncate">{selectedSession.title || 'No title'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</span>
                      <p className="text-xs font-medium mt-0.5">{new Date(selectedSession.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Session ID</span>
                      <p className="text-xs font-mono mt-0.5">{selectedSession.id.slice(0, 20)}...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Toolbar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Actions</CardTitle>
                  <CardDescription>Execute browser actions on the current session</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Navigation */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com"
                        value={navigateUrl}
                        onChange={(e) => setNavigateUrl(e.target.value)}
                        className="flex-1 h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => executeAction('navigate')}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ArrowRight className="w-3 h-3 mr-1" />}
                        Navigate
                      </Button>
                    </div>

                    {/* Click / Type with Selector */}
                    <div className="flex gap-2 flex-wrap">
                      <Input
                        placeholder="CSS Selector (e.g., #search, .btn-primary)"
                        value={selectorInput}
                        onChange={(e) => setSelectorInput(e.target.value)}
                        className="flex-1 min-w-[180px] h-8 text-xs"
                      />
                      <Input
                        placeholder="Value (for type action)"
                        value={valueInput}
                        onChange={(e) => setValueInput(e.target.value)}
                        className="flex-1 min-w-[120px] h-8 text-xs"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => executeAction('click')}
                        disabled={isActionLoading || !selectorInput}
                      >
                        <MousePointerClick className="w-3 h-3 mr-1" />
                        Click
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => executeAction('type')}
                        disabled={isActionLoading || !selectorInput || !valueInput}
                      >
                        <Keyboard className="w-3 h-3 mr-1" />
                        Type
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => executeAction('screenshot')}
                        disabled={isActionLoading}
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        Screenshot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => executeAction('extract')}
                        disabled={isActionLoading}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Extract
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Screenshot Preview & Extracted Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Screenshot */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">Screenshot</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {screenshotData ? (
                      <div className="rounded-lg border overflow-hidden bg-muted/30">
                        <img
                          src={screenshotData.startsWith('data:') ? screenshotData : `data:image/png;base64,${screenshotData}`}
                          alt="Browser screenshot"
                          className="w-full h-auto"
                        />
                      </div>
                    ) : selectedSession.snapshots && selectedSession.snapshots.length > 0 ? (
                      <div className="space-y-2">
                        {selectedSession.snapshots
                          .filter(s => s.screenshotUrl)
                          .slice(0, 3)
                          .map((snapshot) => (
                            <div
                              key={snapshot.id}
                              className="rounded-lg border overflow-hidden bg-muted/30 cursor-pointer hover:border-primary transition-colors"
                              onClick={() => setScreenshotData(snapshot.screenshotUrl)}
                            >
                              <img
                                src={snapshot.screenshotUrl!.startsWith('data:') ? snapshot.screenshotUrl! : `data:image/png;base64,${snapshot.screenshotUrl}`}
                                alt="Snapshot"
                                className="w-full h-auto max-h-32 object-cover"
                              />
                              <div className="p-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getTimeAgo(snapshot.createdAt)}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
                        <Camera className="w-8 h-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground">No screenshot yet</p>
                        <p className="text-[10px] text-muted-foreground">Click the Screenshot button to capture</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Extracted Content */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">Extracted Content</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {extractedContent ? (
                      <div className="rounded-lg border p-3 bg-muted/30 max-h-64 overflow-y-auto custom-scrollbar">
                        <pre className="text-xs whitespace-pre-wrap break-words">{extractedContent}</pre>
                      </div>
                    ) : selectedSession.snapshots && selectedSession.snapshots.some(s => s.extractedContent) ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {selectedSession.snapshots
                          .filter(s => s.extractedContent)
                          .slice(0, 3)
                          .map((snapshot) => (
                            <div
                              key={snapshot.id}
                              className="rounded-lg border p-2 bg-muted/30 cursor-pointer hover:border-primary transition-colors"
                              onClick={() => setExtractedContent(snapshot.extractedContent)}
                            >
                              <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getTimeAgo(snapshot.createdAt)}
                              </p>
                              <p className="text-xs line-clamp-4">{snapshot.extractedContent}</p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
                        <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground">No extracted content</p>
                        <p className="text-[10px] text-muted-foreground">Click the Extract button to get page content</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Snapshots Panel */}
              {selectedSession.snapshots && selectedSession.snapshots.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base">Session Snapshots</CardTitle>
                    </div>
                    <CardDescription>{selectedSession.snapshots.length} snapshot{selectedSession.snapshots.length !== 1 ? 's' : ''} recorded</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[11px] h-8">Time</TableHead>
                            <TableHead className="text-[11px] h-8">URL</TableHead>
                            <TableHead className="text-[11px] h-8">Title</TableHead>
                            <TableHead className="text-[11px] h-8">Content</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSession.snapshots.map((snapshot) => (
                            <TableRow
                              key={snapshot.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                if (snapshot.screenshotUrl) setScreenshotData(snapshot.screenshotUrl)
                                if (snapshot.extractedContent) setExtractedContent(snapshot.extractedContent)
                              }}
                            >
                              <TableCell className="text-[11px] whitespace-nowrap py-2">
                                {getTimeAgo(snapshot.createdAt)}
                              </TableCell>
                              <TableCell className="text-[11px] py-2 max-w-[150px] truncate">
                                {snapshot.url || '—'}
                              </TableCell>
                              <TableCell className="text-[11px] py-2 max-w-[150px] truncate">
                                {snapshot.title || '—'}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex gap-1">
                                  {snapshot.screenshotUrl && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                                      <Camera className="w-2.5 h-2.5 mr-0.5" />
                                      Image
                                    </Badge>
                                  )}
                                  {snapshot.extractedContent && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                                      <FileText className="w-2.5 h-2.5 mr-0.5" />
                                      Text
                                    </Badge>
                                  )}
                                  {!snapshot.screenshotUrl && !snapshot.extractedContent && (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Workflows */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Quick Workflows</CardTitle>
                  </div>
                  <CardDescription>Pre-defined browser automation sequences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {QUICK_WORKFLOWS.map((workflow) => (
                      <button
                        key={workflow.id}
                        className="flex flex-col items-start gap-2 p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-left"
                        onClick={() => executeQuickWorkflow(workflow.id)}
                        disabled={isActionLoading}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                          <workflow.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{workflow.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{workflow.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {workflow.actions.length} steps
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function EmptyState({
  message,
  description,
  icon: Icon = AlertCircle,
}: {
  message: string
  description: string
  icon?: React.ElementType
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
    </div>
  )
}
