'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  TrendingUp,
  Presentation,
  Target,
  Bot,
  MessageSquare,
  BarChart3,
  Workflow,
  Settings,
  ShieldCheck,
  Globe,
  Search,
  Plus,
  Play,
  FileBarChart,
  User,
  Building2,
  Plug,
  Palette,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react'
import { useAppStore, type PageId } from '@/lib/stores/app-store'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommandItemDef {
  id: string
  label: string
  icon: React.ElementType
  keywords: string[]
  shortcut?: string
  action: () => void
}

interface CommandGroupDef {
  heading: string
  items: CommandItemDef[]
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const contentVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -8,
    transition: { duration: 0.15 },
  },
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  // ── Keyboard shortcut ──────────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K on macOS, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // ── Navigation handler ─────────────────────────────────────────────────────

  const navigate = useCallback(
    (pageId: PageId) => {
      setCurrentPage(pageId)
      setOpen(false)
    },
    [setCurrentPage]
  )

  // ── Action handlers ────────────────────────────────────────────────────────

  const createNewPlan = useCallback(() => {
    setCurrentPage('plans')
    setOpen(false)
  }, [setCurrentPage])

  const createForecast = useCallback(() => {
    setCurrentPage('forecasting')
    setOpen(false)
  }, [setCurrentPage])

  const startAgent = useCallback(() => {
    setCurrentPage('agents')
    setOpen(false)
  }, [setCurrentPage])

  const generateReport = useCallback(() => {
    setCurrentPage('reports')
    setOpen(false)
  }, [setCurrentPage])

  const newPitchDeck = useCallback(() => {
    setCurrentPage('pitch-deck')
    setOpen(false)
  }, [setCurrentPage])

  const openSettingsPage = useCallback(() => {
    setCurrentPage('settings')
    setOpen(false)
  }, [setCurrentPage])

  // ── Command groups ─────────────────────────────────────────────────────────

  const commandGroups: CommandGroupDef[] = [
    {
      heading: 'Navigation',
      items: [
        {
          id: 'nav-dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          keywords: ['home', 'overview', 'main'],
          shortcut: '⌘1',
          action: () => navigate('dashboard'),
        },
        {
          id: 'nav-idea-canvas',
          label: 'Idea Canvas',
          icon: Lightbulb,
          keywords: ['ideas', 'brainstorm', 'canvas'],
          shortcut: '⌘2',
          action: () => navigate('idea-canvas'),
        },
        {
          id: 'nav-plans',
          label: 'Business Plans',
          icon: FileText,
          keywords: ['plans', 'business', 'strategy'],
          shortcut: '⌘3',
          action: () => navigate('plans'),
        },
        {
          id: 'nav-forecasting',
          label: 'Forecasting',
          icon: TrendingUp,
          keywords: ['forecast', 'predictions', 'projections'],
          shortcut: '⌘4',
          action: () => navigate('forecasting'),
        },
        {
          id: 'nav-actuals',
          label: 'Plan vs Actuals',
          icon: Target,
          keywords: ['actuals', 'comparison', 'tracking', 'variance'],
          shortcut: '⌘5',
          action: () => navigate('actuals'),
        },
        {
          id: 'nav-plan-review',
          label: 'Plan Review',
          icon: ShieldCheck,
          keywords: ['review', 'audit', 'approval'],
          shortcut: '⌘6',
          action: () => navigate('plan-review'),
        },
        {
          id: 'nav-pitch-deck',
          label: 'Pitch Decks',
          icon: Presentation,
          keywords: ['pitch', 'deck', 'presentation', 'investor'],
          shortcut: '⌘7',
          action: () => navigate('pitch-deck'),
        },
        {
          id: 'nav-agents',
          label: 'AI Agents',
          icon: Bot,
          keywords: ['agents', 'ai', 'automation', 'pipeline'],
          action: () => navigate('agents'),
        },
        {
          id: 'nav-copilot',
          label: 'AI Copilot',
          icon: MessageSquare,
          keywords: ['copilot', 'chat', 'assistant', 'ai'],
          action: () => navigate('copilot'),
        },
        {
          id: 'nav-research',
          label: 'Research',
          icon: Search,
          keywords: ['research', 'market', 'analysis'],
          action: () => navigate('research'),
        },
        {
          id: 'nav-reports',
          label: 'Reports',
          icon: BarChart3,
          keywords: ['reports', 'analytics', 'data'],
          action: () => navigate('reports'),
        },
        {
          id: 'nav-workflows',
          label: 'Workflows',
          icon: Workflow,
          keywords: ['workflows', 'automation', 'process'],
          action: () => navigate('workflows'),
        },
        {
          id: 'nav-observability',
          label: 'Observability',
          icon: BarChart3,
          keywords: ['monitoring', 'logs', 'metrics', 'traces'],
          action: () => navigate('observability'),
        },
        {
          id: 'nav-browser',
          label: 'Browser',
          icon: Globe,
          keywords: ['browser', 'web', 'browse'],
          action: () => navigate('browser'),
        },
        {
          id: 'nav-settings',
          label: 'Settings',
          icon: Settings,
          keywords: ['settings', 'preferences', 'config'],
          action: () => navigate('settings'),
        },
      ],
    },
    {
      heading: 'Actions',
      items: [
        {
          id: 'action-new-plan',
          label: 'Create New Plan',
          icon: Plus,
          keywords: ['create', 'new', 'plan', 'business'],
          action: createNewPlan,
        },
        {
          id: 'action-new-forecast',
          label: 'Create Forecast',
          icon: TrendingUp,
          keywords: ['create', 'forecast', 'prediction', 'projection'],
          action: createForecast,
        },
        {
          id: 'action-start-agent',
          label: 'Start Agent',
          icon: Play,
          keywords: ['start', 'run', 'agent', 'ai', 'pipeline'],
          action: startAgent,
        },
        {
          id: 'action-generate-report',
          label: 'Generate Report',
          icon: FileBarChart,
          keywords: ['generate', 'report', 'analytics'],
          action: generateReport,
        },
        {
          id: 'action-new-pitch-deck',
          label: 'New Pitch Deck',
          icon: FileSpreadsheet,
          keywords: ['create', 'new', 'pitch', 'deck', 'presentation'],
          action: newPitchDeck,
        },
      ],
    },
    {
      heading: 'Settings',
      items: [
        {
          id: 'settings-profile',
          label: 'Profile',
          icon: User,
          keywords: ['profile', 'account', 'user'],
          action: openSettingsPage,
        },
        {
          id: 'settings-organization',
          label: 'Organization',
          icon: Building2,
          keywords: ['organization', 'org', 'team', 'company'],
          action: openSettingsPage,
        },
        {
          id: 'settings-integrations',
          label: 'Integrations',
          icon: Plug,
          keywords: ['integrations', 'connect', 'api', 'third-party'],
          action: openSettingsPage,
        },
        {
          id: 'settings-appearance',
          label: 'Appearance',
          icon: Palette,
          keywords: ['appearance', 'theme', 'dark', 'light', 'mode'],
          action: openSettingsPage,
        },
      ],
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <DialogContent
            className="overflow-hidden p-0 border-0 shadow-2xl max-w-xl w-full"
            showCloseButton={false}
            onInteractOutside={(e) => {
              e.preventDefault()
              setOpen(false)
            }}
            asChild
          >
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Command className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl">
                {/* Search Header */}
                <div className="flex items-center border-b border-border/50 px-4">
                  <Sparkles className="mr-2 h-4 w-4 shrink-0 text-primary/60" />
                  <CommandInput
                    placeholder="Type a command or search..."
                    className="border-0 focus:ring-0 h-11 text-sm"
                  />
                  <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0">
                    ESC
                  </kbd>
                </div>

                {/* Results List */}
                <CommandList className="max-h-[420px] scroll-py-1">
                  <CommandEmpty className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No results found</p>
                      <p className="text-xs">Try a different search term</p>
                    </div>
                  </CommandEmpty>

                  {commandGroups.map((group, groupIdx) => (
                    <div key={group.heading}>
                      <CommandGroup
                        heading={group.heading}
                        className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
                      >
                        {group.items.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={`${item.label} ${item.keywords.join(' ')}`}
                            onSelect={item.action}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent/80 aria-selected:text-accent-foreground transition-colors duration-150"
                          >
                            <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted/60 shrink-0">
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="flex-1 text-sm font-medium truncate">
                              {item.label}
                            </span>
                            {item.shortcut && (
                              <CommandShortcut className="text-[10px] font-mono">
                                {item.shortcut}
                              </CommandShortcut>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {groupIdx < commandGroups.length - 1 && (
                        <CommandSeparator className="mx-2" />
                      )}
                    </div>
                  ))}
                </CommandList>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px]">↵</kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px]">esc</kbd>
                      Close
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                    <Sparkles className="h-3 w-3" />
                    <span>GangNiaga AI</span>
                  </div>
                </div>
              </Command>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  )
}
