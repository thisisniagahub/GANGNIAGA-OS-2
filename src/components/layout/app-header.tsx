'use client'

import { useAppStore, type PageId } from '@/lib/stores/app-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Bell, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  plans: 'Business Plans',
  forecasting: 'Financial Forecasting',
  agents: 'AI Agents',
  copilot: 'AI Copilot',
  reports: 'Reports',
  workflows: 'Workflows',
  settings: 'Settings',
}

const pageDescriptions: Record<PageId, string> = {
  dashboard: 'Overview of your business metrics and AI insights',
  plans: 'Create and manage AI-powered business plans',
  forecasting: 'Financial projections and scenario modeling',
  agents: 'Autonomous AI agents for business operations',
  copilot: 'Chat with your AI business assistant',
  reports: 'Generate and export business reports',
  workflows: 'Automate repetitive business tasks',
  settings: 'Manage your account and organization',
}

export function AppHeader() {
  const { currentPage, toggleSidebar } = useAppStore()
  const { user, logout } = useAuthStore()

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Revenue alert</span>
                <span className="text-xs text-muted-foreground">MRR increased by 12% this month</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Forecast updated</span>
                <span className="text-xs text-muted-foreground">Q2 projections are now available</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Agent task complete</span>
                <span className="text-xs text-muted-foreground">CFO Agent finished financial analysis</span>
              </div>
            </DropdownMenuItem>
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
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Organization</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
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
