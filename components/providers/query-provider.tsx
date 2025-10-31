/**
 * React Query Provider
 *
 * Provides React Query client to the entire app for data fetching,
 * caching, and state management.
 *
 * Constitutional Principle: User Experience First
 * - Optimistic updates for instant UI feedback
 * - Background refetching for fresh data
 * - Automatic retry on failures
 */

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create Query Client with custom configuration
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: Data is considered fresh for 1 minute
            staleTime: 60 * 1000,
            // Cache time: Keep unused data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests 3 times with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Don't refetch on window focus in development (can be annoying)
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
            // Refetch on reconnect (when internet connection is restored)
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Add React Query Devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <DevTools />
      )}
    </QueryClientProvider>
  )
}

// Lazy load devtools only in development
function DevTools() {
  if (typeof window === 'undefined') return null

  const { ReactQueryDevtools } = require('@tanstack/react-query-devtools')
  return <ReactQueryDevtools initialIsOpen={false} />
}
