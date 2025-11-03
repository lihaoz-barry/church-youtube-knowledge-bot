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
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('success')) {
      // Wait a bit for database to update
      setTimeout(() => {
        fetchConnectionStatus();
      }, 500);
    }
  }, []);

  const fetchConnectionStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        throw new Error('Not authenticated. Please sign in first.');
      }

      const userId = session.user.id;

      // Get church record for this user
      const { data: church, error: churchError } = await (supabase
        .from('churches') as any)
        .select('youtube_channel_id, youtube_channel_name, youtube_channel_thumbnail')
        .eq('id', userId)
        .single();

      if (churchError && churchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (not an error)
        throw churchError;
      }

      // Check if YouTube is connected
      if (church?.youtube_channel_id) {
        setStatus({
          isConnected: true,
          channelName: church.youtube_channel_name || undefined,
          channelThumbnail: church.youtube_channel_thumbnail || undefined,
          channelId: church.youtube_channel_id,
        });
      } else {
        setStatus({ isConnected: false });
      }
    } catch (err) {
      console.error('Failed to fetch connection status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Call connect API endpoint
      const response = await fetch('/api/youtube/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to initiate YouTube connection');
      }

      const { authUrl } = await response.json();

      // Redirect to Google OAuth consent screen
      window.location.href = authUrl;
    } catch (err) {
      console.error('Connection error:', err);
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
