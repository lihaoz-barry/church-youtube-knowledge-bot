/**
 * Environment Variable Validation
 *
 * Checks that required Supabase environment variables are set
 * and provides helpful error messages if they're missing
 */

export function validateSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    const missing = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n\n` +
      `To fix this:\n` +
      `1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables\n` +
      `2. Add the missing variables for the Production environment\n` +
      `3. Redeploy your application\n\n` +
      `For local development, ensure .env.local has these variables.\n` +
      `See docs/VERCEL_SETUP.md for details.`
    )
  }

  return { url, anonKey }
}

export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  }
}

export function hasSupabaseEnv() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
