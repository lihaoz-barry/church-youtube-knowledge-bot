/**
 * Supabase Client for Server-Side (API Routes, Server Components)
 *
 * This client is used in API routes and server components.
 * It handles cookies properly for SSR and maintains user sessions.
 *
 * Usage in API routes:
 * import { createClient } from '@/lib/supabase/server'
 *
 * export async function GET(request: Request) {
 *   const supabase = createClient()
 *   const { data, error } = await supabase.from('videos').select('*')
 *   ...
 * }
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'
import { validateSupabaseEnv } from './env'

export function createClient() {
  const cookieStore = cookies()

  // Validate environment variables are set
  const { url, anonKey } = validateSupabaseEnv()

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Service Role Client (ADMIN ACCESS - USE WITH CAUTION)
 *
 * This client bypasses RLS and has full database access.
 * Only use when absolutely necessary (e.g., server-side operations that need
 * to access data across all churches).
 *
 * ⚠️ WARNING: Always manually filter by church_id when using this client!
 */
export function createServiceClient() {
  // Validate environment variables are set
  const { url } = validateSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is required for service client.\n' +
      'Add this to Vercel Dashboard → Settings → Environment Variables'
    )
  }

  return createServerClient<Database>(
    url,
    serviceRoleKey,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookies().set({ name, value, ...options })
          } catch (error) {
            // Ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookies().set({ name, value: '', ...options })
          } catch (error) {
            // Ignore
          }
        },
      },
    }
  )
}
