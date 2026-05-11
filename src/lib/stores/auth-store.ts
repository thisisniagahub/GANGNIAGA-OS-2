import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: string
}

interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
  industry?: string
  size?: string
  currency: string
}

interface AuthState {
  user: User | null
  organization: Organization | null
  isAuthenticated: boolean
  isLoading: boolean
  isGuest: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  loginAsGuest: () => void
  logout: () => void
  setUser: (user: User) => void
  setOrganization: (org: Organization) => void
}

const GUEST_USER: User = {
  id: 'guest-user-001',
  email: 'demo@gangniaga.ai',
  name: 'Demo User',
  role: 'owner',
}

const GUEST_ORG: Organization = {
  id: 'guest-org-001',
  name: "Demo's Organization",
  slug: 'demo-org',
  industry: 'saas',
  size: 'startup',
  currency: 'USD',
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: false,
  isGuest: false,

  loginAsGuest: () => {
    // Persist guest session to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('gangniaga_guest', 'true')
      localStorage.setItem('gangniaga_user', JSON.stringify(GUEST_USER))
      localStorage.setItem('gangniaga_org', JSON.stringify(GUEST_ORG))
    }
    set({
      user: GUEST_USER,
      organization: GUEST_ORG,
      isAuthenticated: true,
      isLoading: false,
      isGuest: true,
    })
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        // Auto-switch to guest mode if database is not available
        if (data.hint === 'GUEST_MODE') {
          if (typeof window !== 'undefined') {
            localStorage.setItem('gangniaga_guest', 'true')
            localStorage.setItem('gangniaga_user', JSON.stringify(GUEST_USER))
            localStorage.setItem('gangniaga_org', JSON.stringify(GUEST_ORG))
          }
          set({
            user: GUEST_USER,
            organization: GUEST_ORG,
            isAuthenticated: true,
            isLoading: false,
            isGuest: true,
          })
          return
        }
        throw new Error(data.error || 'Login failed')
      }
      const data = await res.json()
      // Clear guest session if real login succeeds
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gangniaga_guest')
        localStorage.removeItem('gangniaga_user')
        localStorage.removeItem('gangniaga_org')
      }
      set({
        user: data.user,
        organization: data.organization,
        isAuthenticated: true,
        isLoading: false,
        isGuest: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        // Auto-switch to guest mode if database is not available
        if (data.hint === 'GUEST_MODE') {
          if (typeof window !== 'undefined') {
            localStorage.setItem('gangniaga_guest', 'true')
            localStorage.setItem('gangniaga_user', JSON.stringify({ ...GUEST_USER, name, email }))
            localStorage.setItem('gangniaga_org', JSON.stringify(GUEST_ORG))
          }
          set({
            user: { ...GUEST_USER, name, email },
            organization: GUEST_ORG,
            isAuthenticated: true,
            isLoading: false,
            isGuest: true,
          })
          return
        }
        throw new Error(data.error || 'Registration failed')
      }
      const data = await res.json()
      // Clear guest session if real register succeeds
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gangniaga_guest')
        localStorage.removeItem('gangniaga_user')
        localStorage.removeItem('gangniaga_org')
      }
      set({
        user: data.user,
        organization: data.organization,
        isAuthenticated: true,
        isLoading: false,
        isGuest: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    // Clear all session data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gangniaga_guest')
      localStorage.removeItem('gangniaga_user')
      localStorage.removeItem('gangniaga_org')
      // Also clear server session cookie
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    }
    set({
      user: null,
      organization: null,
      isAuthenticated: false,
      isGuest: false,
    })
  },

  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }),
}))
