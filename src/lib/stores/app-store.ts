import { create } from 'zustand'

export type PageId = 
  | 'dashboard' 
  | 'idea-canvas'
  | 'plans' 
  | 'forecasting' 
  | 'actuals'
  | 'plan-review'
  | 'pitch-deck'
  | 'hermes'
  | 'agents' 
  | 'copilot'
  | 'research'
  | 'reports' 
  | 'workflows'
  | 'observability'
  | 'browser'
  | 'settings'

interface AppState {
  currentPage: PageId
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setCurrentPage: (page: PageId) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  sidebarOpen: true,
  sidebarCollapsed: false,
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
