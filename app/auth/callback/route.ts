/**
 * Auth Callback Route
 *
 * Handles OAuth callback from Google Sign-In
 * Exchanges code for session and redirects to dashboard
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    // Get the session to check user
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      console.log('User authenticated:', {
        id: session.user.id,
        email: session.user.email,
        metadata: session.user.user_metadata,
      })

      // TODO: Check if user has a church, create one if not
      // This will be implemented when we add church onboarding

      // Redirect to dashboard
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // No code or failed to authenticate, redirect to login
  return NextResponse.redirect(`${origin}/login?error=authentication_failed`)
}
