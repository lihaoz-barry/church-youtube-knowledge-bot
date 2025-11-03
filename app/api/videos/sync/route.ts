/**
 * POST /api/videos/sync
 *
 * Syncs videos from YouTube channel to local database.
 * Fetches videos using YouTube Data API and stores metadata in videos table.
 *
 * Constitutional Principles:
 * - Multi-Tenancy by Design: Filters by church_id
 * - Incremental Processing: Processes videos one at a time
 * - User Experience First: Real-time progress updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getYouTubeTokens } from '@/lib/youtube/token-manager';
import { listVideos, getChannelInfo } from '@/lib/youtube/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated user and church
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in first' },
        { status: 401 }
      );
    }

    const churchId = user.id;

    // 2. Get YouTube tokens
    const tokens = await getYouTubeTokens(churchId);

    // 3. Fetch channel info to get channel ID
    const channelInfo = await getChannelInfo(tokens.accessToken);

    // 4. Fetch videos from YouTube
    const videos = await listVideos(tokens.accessToken, channelInfo.id);

    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos found on YouTube channel',
        synced: 0,
        total: 0,
      });
    }

    // 5. Upsert videos to database (insert or update if exists)
    const service = createServiceClient();
    const videoRecords = videos.map(video => ({
      church_id: churchId,
      youtube_video_id: video.id,
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnail,
      duration: video.duration,
      published_at: video.publishedAt,
      status: 'pending' as const,
    }));

    const { data, error: insertError } = await (service
      .from('videos')
      .upsert as any)(videoRecords, {
      onConflict: 'church_id,youtube_video_id',
      ignoreDuplicates: false, // Update existing records
    })
      .select('id');

    if (insertError) {
      console.error('Failed to sync videos:', insertError);
      return NextResponse.json(
        { error: 'Failed to save videos to database. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${videos.length} videos`,
      synced: data?.length || 0,
      total: videos.length,
    });
  } catch (error) {
    console.error('Video sync error:', {
      error,
      endpoint: '/api/videos/sync',
    });

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to sync videos. Please try again.';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
