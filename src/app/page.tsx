'use client'

import { useAppStore } from '@/lib/stores/app-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { AuthPage } from '@/components/auth/auth-page'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { PlansPage } from '@/components/plans/plans-page'
import { ForecastingPage } from '@/components/forecasting/forecasting-page'
import { AgentsPage } from '@/components/agents/agents-page'
import { CopilotPage } from '@/components/copilot/copilot-page'
import { ReportsPage } from '@/components/reports/reports-page'
import { WorkflowsPage } from '@/components/workflows/workflows-page'
import { SettingsPage } from '@/components/settings/settings-page'
import { useEffect } from 'react'

function PageRouter() {
  const { currentPage } = useAppStore()

  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage />
    case 'plans':
      return <PlansPage />
    case 'forecasting':
      return <ForecastingPage />
    case 'agents':
      return <AgentsPage />
    case 'copilot':
      return <CopilotPage />
    case 'reports':
      return <ReportsPage />
    case 'workflows':
      return <WorkflowsPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <DashboardPage />
  }
}

function AuthenticatedApp() {
  const { sidebarOpen } = useAppStore()

  return (
    <div className="flex h-screen overflow-hidden">
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => useAppStore.getState().setSidebarOpen(false)}
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
            <span>GangNiaga AI OS v2.0</span>
            <span>Autonomous Business Operating System</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default function Home() {
  const { isAuthenticated, setUser, setOrganization } = useAuthStore()

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
      }
    }
    checkSession()
  }, [setUser, setOrganization])

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return <AuthenticatedApp />
}
