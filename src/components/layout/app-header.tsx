'use client'

import { useState, useEffect } from 'react'
import { useAppStore, type PageId } from '@/lib/stores/app-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Bell, Search, Menu, Check, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const pageTitles: Record<PageId, string> = {
  dashboard: 'Dashboard',
  'idea-canvas': 'Idea Canvas',
  plans: 'Business Plans',
  forecasting: 'Financial Forecasting',
  actuals: 'Plan vs Actuals',
  'plan-review': 'Plan Review',
  'pitch-deck': 'Pitch Decks',
  agents: 'AI Agents',
  copilot: 'AI Copilot',
  research: 'Research',
  reports: 'Reports',
  workflows: 'Workflows',
  observability: 'Observability',
  browser: 'Browser',
  settings: 'Settings',
}

const pageDescriptions: Record<PageId, string> = {
  dashboard: 'Overview of your business metrics and AI insights',
  'idea-canvas': 'Pressure-test your ideas before financial investment',
  plans: 'Create and manage AI-powered business plans',
  forecasting: 'Financial projections and scenario modeling',
  actuals: 'Live financial tracking with QuickBooks/Xero integration',
  'plan-review': 'AI-powered lender review of your business plans',
  'pitch-deck': 'Dynamic investor presentations with auto-synced data',
  agents: 'Autonomous AI agents for business operations',
  copilot: 'Chat with your AI business assistant',
  research: 'Bank-grade research with verified sources and citations',
  reports: 'Generate and export business reports',
  workflows: 'Automate repetitive business tasks',
  observability: 'System monitoring and token usage tracking',
  browser: 'Browser automation and web scraping',
  settings: 'Manage your account and organization',
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export function AppHeader() {
  const { currentPage, toggleSidebar } = useAppStore()
  const { user, logout } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`)
        if (res.ok && mounted) {
          const data = await res.json()
          setNotifications(data.notifications || [])
        }
      } catch {
        // silently fail
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch {
      // silently fail
    }
  }

  const markAllRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.read)
          .map((n) =>
            fetch('/api/notifications', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: n.id, read: true }),
            })
          )
      )
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      // silently fail
    }
  }

  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))
  }

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8"
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-sm font-semibold">{pageTitles[currentPage]}</h1>
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            {pageDescriptions[currentPage]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Command Palette Trigger */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 h-8 px-3 text-muted-foreground hover:text-foreground bg-muted/30 border-dashed"
          onClick={openCommandPalette}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-1 inline-flex h-4 select-none items-center gap-0.5 rounded border bg-background px-1 font-mono text-[9px] font-medium text-muted-foreground">
            <Command className="w-2 h-2" />K
          </kbd>
        </Button>

        {/* Mobile search */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={openCommandPalette}
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-destructive text-destructive-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2">
              <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={markAllRead}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-6 text-center">
                <Bell className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                {notifications.slice(0, 10).map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className="cursor-pointer p-2.5"
                    onClick={() => !notif.read && markAsRead(notif.id)}
                  >
                    <div className="flex gap-2.5 w-full">
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          notif.read ? 'bg-transparent' : 'bg-primary'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${notif.read ? 'text-muted-foreground' : 'font-medium'}`}>
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => useAppStore.getState().setCurrentPage('settings')} className="text-xs">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => useAppStore.getState().setCurrentPage('settings')} className="text-xs">
              Organization
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => useAppStore.getState().setCurrentPage('settings')} className="text-xs">
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-xs text-destructive focus:text-destructive">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
