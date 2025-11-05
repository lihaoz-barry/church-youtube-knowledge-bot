'use client';

/**
 * YouTubeConnectCard Component
 *
 * Displays YouTube channel connection status and provides OAuth connection flow.
 *
 * Features:
 * - Connect YouTube button (initiates OAuth)
 * - Connection status display
 * - Channel thumbnail and name when connected
 * - Error handling with actionable messages
 *
 * Constitutional Principles:
 * - User Experience First: Clear status, loading states, actionable errors
 * - Multi-Tenancy: Automatically filters by church_id via RLS
 */

import { useState, useEffect } from 'react';
import { Youtube, CheckCircle2, AlertCircle, Video } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface ConnectionStatus {
  isConnected: boolean;
  channelName?: string;
  channelThumbnail?: string;
  channelId?: string;
}

export function YouTubeConnectCard() {
  const [status, setStatus] = useState<ConnectionStatus>({ isConnected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch connection status on mount
  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  // Refetch connection status when URL has success parameter (after OAuth)
  // Use polling mechanism to ensure database has been updated
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const successMessage = urlParams.get('success');

    if (successMessage) {
      console.log('✅ [OAuth Success] Returned from OAuth with success message:', successMessage);
      console.log('🔄 [Polling] Starting connection status polling...');

      let attempts = 0;
      const maxAttempts = 10; // Try for 10 seconds
      const pollInterval = 1000; // Check every 1 second

      const pollStatus = async () => {
        attempts++;
        console.log(`🔍 [Polling] Attempt ${attempts}/${maxAttempts}`);

        await fetchConnectionStatus();

        // Check if connected after fetch
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: church } = await (supabase
            .from('churches') as any)
            .select('youtube_channel_id')
            .eq('id', session.user.id)
            .single();

          if (church?.youtube_channel_id) {
            console.log('✅ [Polling] Connection confirmed! YouTube channel ID:', church.youtube_channel_id);
            clearInterval(interval);

            // Remove success parameter from URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('success');
            window.history.replaceState({}, '', newUrl);
            return;
          }
        }

        if (attempts >= maxAttempts) {
          console.warn('⚠️ [Polling] Max attempts reached without confirmation');
          console.warn('⚠️ [Polling] Database may be slow or there was an error');
          setError('Connection status check timed out. Please refresh the page to see if connection succeeded.');
          clearInterval(interval);
        }
      };

      // Start polling immediately
      pollStatus();

      // Then poll every second
      const interval = setInterval(pollStatus, pollInterval);

      // Cleanup on unmount
      return () => clearInterval(interval);
    }
  }, []);

  const fetchConnectionStatus = async () => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔍 [fetchConnectionStatus] Starting connection status check');
    console.log('═══════════════════════════════════════════════════════════\n');

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // PREREQUISITE 1: Check user session
      console.log('📋 [Prerequisite 1/4] Checking user authentication...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      console.log('   └─ User authenticated:', !!session);
      console.log('   └─ User ID:', session?.user?.id || 'N/A');
      console.log('   └─ User email:', session?.user?.email || 'N/A');
      console.log('   └─ Session error:', sessionError || 'None');

      if (sessionError || !session?.user) {
        console.error('   ❌ FAILED: User not authenticated');
        throw new Error('Not authenticated. Please sign in first.');
      }
      console.log('   ✅ PASSED: User is authenticated\n');

      const userId = session.user.id;

      // PREREQUISITE 2: Check church record exists
      console.log('📋 [Prerequisite 2/4] Checking church record...');
      const { data: church, error: churchError } = await (supabase
        .from('churches') as any)
        .select('youtube_channel_id, youtube_channel_name, youtube_channel_thumbnail')
        .eq('id', userId)
        .single();

      console.log('   └─ Church record found:', !!church);
      console.log('   └─ Church ID:', church?.id || 'N/A');
      console.log('   └─ Query error:', churchError?.message || 'None');
      console.log('   └─ Error code:', churchError?.code || 'N/A');

      if (churchError && churchError.code !== 'PGRST116') {
        console.error('   ❌ FAILED: Database error', churchError);
        throw churchError;
      }

      if (!church) {
        console.log('   ⚠️ WARNING: No church record found (will be created on first connect)');
        console.log('   ✅ PASSED: This is normal for first-time users\n');
      } else {
        console.log('   ✅ PASSED: Church record exists\n');
      }

      // PREREQUISITE 3: Check YouTube channel ID
      console.log('📋 [Prerequisite 3/4] Checking YouTube connection...');
      console.log('   └─ youtube_channel_id:', church?.youtube_channel_id || 'Not set');
      console.log('   └─ youtube_channel_name:', church?.youtube_channel_name || 'Not set');
      console.log('   └─ youtube_channel_thumbnail:', church?.youtube_channel_thumbnail ? 'Set' : 'Not set');

      if (church?.youtube_channel_id) {
        console.log('   ✅ PASSED: YouTube is connected\n');

        // PREREQUISITE 4: Verify all required data
        console.log('📋 [Prerequisite 4/4] Verifying connection data...');
        console.log('   └─ Has channel ID:', !!church.youtube_channel_id);
        console.log('   └─ Has channel name:', !!church.youtube_channel_name);
        console.log('   └─ Has thumbnail:', !!church.youtube_channel_thumbnail);

        setStatus({
          isConnected: true,
          channelName: church.youtube_channel_name || undefined,
          channelThumbnail: church.youtube_channel_thumbnail || undefined,
          channelId: church.youtube_channel_id,
        });

        console.log('   ✅ PASSED: All connection data verified\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('✅ [Result] YouTube is CONNECTED');
        console.log('   └─ Channel:', church.youtube_channel_name);
        console.log('   └─ Channel ID:', church.youtube_channel_id);
        console.log('═══════════════════════════════════════════════════════════\n');
      } else {
        console.log('   ❌ FAILED: YouTube not connected (youtube_channel_id is null)\n');

        setStatus({ isConnected: false });

        console.log('═══════════════════════════════════════════════════════════');
        console.log('❌ [Result] YouTube is NOT CONNECTED');
        console.log('   └─ Action required: Click "Connect YouTube" button');
        console.log('═══════════════════════════════════════════════════════════\n');
      }
    } catch (err) {
      console.error('\n❌❌❌ [ERROR] fetchConnectionStatus failed:', err);
      console.error('   └─ Error type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('   └─ Error message:', err instanceof Error ? err.message : String(err));
      console.error('═══════════════════════════════════════════════════════════\n');
      setError(err instanceof Error ? err.message : 'Failed to check connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔗 [handleConnect] Starting YouTube OAuth connection');
    console.log('═══════════════════════════════════════════════════════════\n');

    setIsConnecting(true);
    setError(null);

    try {
      // Pre-flight check: Verify user is logged in
      console.log('📋 [Pre-flight] Checking user authentication...');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      console.log('   └─ User authenticated:', !!session);
      console.log('   └─ User ID:', session?.user?.id || 'N/A');

      if (!session) {
        console.error('   ❌ FAILED: User not authenticated');
        throw new Error('Please sign in first to connect YouTube');
      }
      console.log('   ✅ PASSED: User is authenticated\n');

      // Call connect API endpoint
      console.log('🌐 [API Call] Calling /api/youtube/connect...');
      console.log('   └─ URL:', '/api/youtube/connect');
      console.log('   └─ Method: POST');
      console.log('   └─ Window origin:', window.location.origin);

      const response = await fetch('/api/youtube/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('   └─ Response status:', response.status);
      console.log('   └─ Response OK:', response.ok);

      if (!response.ok) {
        const { error } = await response.json();
        console.error('   ❌ FAILED: API returned error');
        console.error('   └─ Error message:', error);
        throw new Error(error || 'Failed to initiate YouTube connection');
      }

      const { authUrl, state } = await response.json();

      console.log('   ✅ PASSED: Received OAuth URL\n');
      console.log('🔗 [OAuth URL] Generated:');
      console.log('   └─ State:', state?.substring(0, 20) + '...');
      console.log('   └─ URL length:', authUrl?.length, 'characters');

      // Redirect to Google OAuth consent screen
      console.log('\n🔀 [Redirect] Navigating to Google OAuth...');
      console.log('   └─ Destination: accounts.google.com');
      console.log('═══════════════════════════════════════════════════════════\n');

      window.location.href = authUrl;
    } catch (err) {
      console.error('\n❌❌❌ [ERROR] handleConnect failed:', err);
      console.error('   └─ Error type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('   └─ Error message:', err instanceof Error ? err.message : String(err));
      console.error('═══════════════════════════════════════════════════════════\n');

      setError(err instanceof Error ? err.message : 'Failed to connect to YouTube');
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="hover:shadow-xl transition-shadow">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Youtube className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle>YouTube Channel</CardTitle>
              <CardDescription>Connect your sermon library</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading connection status...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Youtube className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle>YouTube Channel</CardTitle>
              <CardDescription>
                {status.isConnected
                  ? 'Your YouTube channel is connected'
                  : 'Connect your sermon library'}
              </CardDescription>
            </div>
          </div>
          {status.isConnected && (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.isConnected ? (
          <>
            <p className="text-sm text-gray-600">
              Authorize access to your YouTube channel to automatically sync sermon videos.
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Fetches all videos automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Syncs daily at midnight</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Secure OAuth 2.0 authentication</span>
              </li>
            </ul>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect YouTube'}
            </Button>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {status.channelThumbnail && (
                  <img
                    src={status.channelThumbnail}
                    alt={status.channelName || 'Channel thumbnail'}
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-900">Connected</span>
                  </div>
                  {status.channelName && (
                    <p className="text-sm text-green-700">
                      {status.channelName}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Link href="/videos" className="block w-full">
              <Button className="w-full">
                <Video className="w-4 h-4 mr-2" />
                View Videos
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Reconnecting...' : 'Reconnect Channel'}
            </Button>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
