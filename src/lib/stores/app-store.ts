import { create } from 'zustand'

export type PageId = 
  | 'dashboard' 
  | 'plans' 
  | 'forecasting' 
  | 'agents' 
  | 'copilot'
  | 'reports' 
  | 'workflows'
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
