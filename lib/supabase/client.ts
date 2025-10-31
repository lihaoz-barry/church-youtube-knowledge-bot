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

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
