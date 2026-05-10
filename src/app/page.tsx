'use client'

import { useAppStore } from '@/lib/stores/app-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { CommandPalette } from '@/components/layout/command-palette'
import { AuthPage } from '@/components/auth/auth-page'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { PlansPage } from '@/components/plans/plans-page'
import { ForecastingPage } from '@/components/forecasting/forecasting-page'
import { AgentsPage } from '@/components/agents/agents-page'
import { CopilotPage } from '@/components/copilot/copilot-page'
import { ReportsPage } from '@/components/reports/reports-page'
import { WorkflowsPage } from '@/components/workflows/workflows-page'
import { ObservabilityPage } from '@/components/observability/observability-page'
import { BrowserPage } from '@/components/browser/browser-page'
import { SettingsPage } from '@/components/settings/settings-page'
import { IdeaCanvasPage } from '@/components/idea-canvas/idea-canvas-page'
import { ResearchPage } from '@/components/research/research-page'
import { PlanReviewPage } from '@/components/plan-review/plan-review-page'
import { PitchDeckPage } from '@/components/pitch-deck/pitch-deck-page'
import { ActualsPage } from '@/components/actuals/actuals-page'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const pageComponents: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  'idea-canvas': IdeaCanvasPage,
  plans: PlansPage,
  forecasting: ForecastingPage,
  actuals: ActualsPage,
  'pitch-deck': PitchDeckPage,
  agents: AgentsPage,
  copilot: CopilotPage,
  reports: ReportsPage,
  research: ResearchPage,
  workflows: WorkflowsPage,
  observability: ObservabilityPage,
  browser: BrowserPage,
  'plan-review': PlanReviewPage,
  settings: SettingsPage,
}

function PageRouter() {
  const { currentPage } = useAppStore()
  const PageComponent = pageComponents[currentPage] || DashboardPage

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <PageComponent />
      </motion.div>
    </AnimatePresence>
  )
}

function AuthenticatedApp() {
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - hidden on mobile unless open */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <AppSidebar />
      </div>
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
          <PageRouter />
        </main>
        {/* Footer */}
        <footer className="border-t bg-card px-4 py-2 shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium">GangNiaga AI OS</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">v4.0</span>
            </div>
            <span className="hidden sm:inline">Autonomous Business Operating System</span>
            <span className="sm:hidden">AI Business OS</span>
          </div>
        </footer>
      </div>

      {/* Command Palette */}
      <CommandPalette />
    </div>
  )
}

export default function Home() {
  const { isAuthenticated, setUser, setOrganization } = useAuthStore()
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            setOrganization(data.organization)
          }
        }
      } catch {
        // No active session
      } finally {
        setIsCheckingSession(false)
      }
    }
    checkSession()
  }, [setUser, setOrganization])

  if (isCheckingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground animate-pulse">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
          </div>
          <p className="text-sm text-muted-foreground">Loading GangNiaga AI...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return <AuthenticatedApp />
}
