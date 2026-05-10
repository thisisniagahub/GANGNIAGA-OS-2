'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

interface ApiError {
  error: string
  code?: string
  details?: string
}

/**
 * Custom hook for making API calls with consistent error handling.
 * Automatically shows toast notifications for errors.
 */
export function useApi() {
  const apiCall = useCallback(async <T = unknown>(
    url: string,
    options?: RequestInit
  ): Promise<{ data: T | null; error: string | null }> => {
    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      if (!res.ok) {
        let errorMessage = 'Something went wrong'
        try {
          const errorData: ApiError = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Response is not JSON
          if (res.status === 401) errorMessage = 'Authentication required. Please log in again.'
          else if (res.status === 403) errorMessage = 'You do not have permission to perform this action.'
          else if (res.status === 404) errorMessage = 'Resource not found.'
          else if (res.status === 429) errorMessage = 'Too many requests. Please try again later.'
          else if (res.status >= 500) errorMessage = 'Server error. Please try again later.'
        }

        toast.error(errorMessage)
        return { data: null, error: errorMessage }
      }

      const data = await res.json() as T
      return { data, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error. Please check your connection.'
      toast.error(message)
      return { data: null, error: message }
    }
  }, [])

  return { apiCall }
}
