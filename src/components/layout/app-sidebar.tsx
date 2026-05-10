'use client'

import { useAppStore, type PageId } from '@/lib/stores/app-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Bot,
  MessageSquare,
  BarChart3,
  Workflow,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navItems: { id: PageId; label: string; icon: React.ElementType; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 'plans', label: 'Business Plans', icon: FileText, group: 'Planning' },
  { id: 'forecasting', label: 'Forecasting', icon: TrendingUp, group: 'Planning' },
  { id: 'agents', label: 'AI Agents', icon: Bot, group: 'Intelligence' },
  { id: 'copilot', label: 'AI Copilot', icon: MessageSquare, group: 'Intelligence' },
  { id: 'reports', label: 'Reports', icon: BarChart3, group: 'Operations' },
  { id: 'workflows', label: 'Workflows', icon: Workflow, group: 'Operations' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'System' },
]

export function AppSidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, setSidebarCollapsed } = useAppStore()
  const { user, organization, logout } = useAuthStore()

  const groupedItems = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen border-r bg-card transition-all duration-300 ease-in-out relative',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 px-4 h-16 border-b shrink-0',
          sidebarCollapsed && 'justify-center px-2'
        )}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate">GangNiaga</span>
              <span className="text-[10px] text-muted-foreground truncate">AI Business OS</span>
            </div>
          )}
        </div>

        {/* Organization */}
        {!sidebarCollapsed && organization && (
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate">{organization.name}</span>
                <span className="text-[10px] text-muted-foreground">{organization.currency}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} className="mb-3">
              {!sidebarCollapsed && (
                <div className="px-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </span>
                </div>
              )}
              {items.map((item) => {
                const isActive = currentPage === item.id
                const NavButton = (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={cn(
                      'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive
                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                        : 'text-muted-foreground',
                      sidebarCollapsed && 'justify-center px-2'
                    )}
                  >
                    <item.icon className={cn(
                      'shrink-0',
                      isActive ? 'w-4 h-4' : 'w-4 h-4'
                    )} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                )

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>{NavButton}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return NavButton
              })}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t p-2 shrink-0">
          {!sidebarCollapsed && user && (
            <div className="flex items-center gap-2 px-2 py-1 mb-1">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium truncate">{user.name || user.email}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={logout}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          {sidebarCollapsed && user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-8"
                  onClick={logout}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground">Click to logout</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-card shadow-sm z-10"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </Button>
      </aside>
    </TooltipProvider>
  )
}
