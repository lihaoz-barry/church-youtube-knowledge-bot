/**
 * Supabase Client for Browser/Client-Side
 *
 * This client is used in React components and client-side code.
 * It automatically handles user sessions and RLS (Row Level Security).
 *
 * Usage:
 * import { createClient } from '@/lib/supabase/client'
 *
 * const supabase = createClient()
 * const { data, error } = await supabase.from('videos').select('*')
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'
import { validateSupabaseEnv } from './env'

export function createClient() {
  // Validate environment variables are set
  const { url, anonKey } = validateSupabaseEnv()

  return createBrowserClient<Database>(url, anonKey)
}
