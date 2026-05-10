'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type PageId } from '@/lib/stores/app-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Bell, Search, Menu, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch {
      // silently fail
    }
  }, [user])

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
        }
      } catch {
        // silently fail
      }
    }
    load()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [user, fetchNotifications])

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

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{pageTitles[currentPage]}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {pageDescriptions[currentPage]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 w-48 lg:w-64 h-9 text-sm"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
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
                <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <ScrollArea className="max-h-72">
                {notifications.slice(0, 10).map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className="cursor-pointer p-3"
                    onClick={() => !notif.read && markAsRead(notif.id)}
                  >
                    <div className="flex gap-3 w-full">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          notif.read ? 'bg-transparent' : 'bg-primary'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'font-medium'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
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
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name || 'User'}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => useAppStore.getState().setCurrentPage('settings')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => useAppStore.getState().setCurrentPage('settings')}>
              Organization
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => useAppStore.getState().setCurrentPage('settings')}>
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
