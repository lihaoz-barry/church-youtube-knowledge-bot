/**
 * Login Page - Test Supabase Auth & Database Connection
 *
 * This page allows testing:
 * 1. Google Sign-In via Supabase Auth
 * 2. Database connection (fetch churches)
 * 3. User session management
 */

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)
  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error

      console.log('OAuth initiated:', data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      console.error('Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }

  const testDatabaseConnection = async () => {
    setLoading(true)
    setError(null)
    setTestResult(null)

    try {
      // Test 1: Check if we can connect to database
      const { data: churches, error: dbError } = await supabase
        .from('churches')
        .select('*')
        .limit(5)

      if (dbError) throw dbError

      // Test 2: Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      setTestResult(JSON.stringify({
        database: {
          connected: true,
          churches_count: churches?.length || 0,
          churches: churches,
        },
        auth: {
          authenticated: !!session,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email,
            metadata: session.user.user_metadata,
          } : null,
        },
      }, null, 2))

      console.log('Test successful:', { churches, session })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Database test failed')
      console.error('Database test error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setTestResult(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Authentication & Database Test</CardTitle>
          <CardDescription>
            Test Supabase Google Sign-In and database connection
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Google Sign-In */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">1. Test Google Sign-In</h3>
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full"
              variant="default"
            >
              {loading ? 'Loading...' : 'Sign in with Google'}
            </Button>
          </div>

          {/* Database Connection Test */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">2. Test Database Connection</h3>
            <Button
              onClick={testDatabaseConnection}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? 'Testing...' : 'Test Database'}
            </Button>
          </div>

          {/* Sign Out */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">3. Sign Out</h3>
            <Button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full"
              variant="destructive"
            >
              {loading ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800">Error:</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}

          {/* Test Result Display */}
          {testResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 mb-2">Test Result:</p>
              <pre className="text-xs text-green-700 overflow-auto max-h-96">
                {testResult}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-800 mb-2">Instructions:</p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Click "Sign in with Google" to test OAuth flow</li>
              <li>After signing in, click "Test Database" to verify connection</li>
              <li>Check the browser console for detailed logs</li>
              <li>Verify Supabase Dashboard shows the authenticated user</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
