/**
 * YouTube API Wrapper
 *
 * Provides typed functions for YouTube Data API v3:
 * - Get channel information (ID, name, thumbnail)
 * - List videos from a channel
 *
 * Constitutional Principle: User Experience First
 * - Actionable error messages with quota information
 * - Handles pagination automatically
 */

import { google, youtube_v3 } from 'googleapis';

export interface ChannelInfo {
  id: string;
  name: string;
  thumbnail: string;
  description?: string;
  customUrl?: string;
  videoCount?: number;
}

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  duration: number; // Duration in seconds
  channelId: string;
  channelTitle: string;
}

/**
 * Get channel information for authenticated user
 *
 * @param accessToken - Valid YouTube API access token
 * @returns Channel information
 * @throws Error with actionable message if API call fails
 *
 * @example
 * const channel = await getChannelInfo(accessToken);
 * console.log(`Connected to: ${channel.name}`);
 */
export async function getChannelInfo(
  accessToken: string
): Promise<ChannelInfo> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true, // Get authenticated user's channel
    });

    const channel = response.data.items?.[0];

    if (!channel || !channel.id) {
      throw new Error(
        'No YouTube channel found for this account. Make sure you have a YouTube channel associated with your Google account.'
      );
    }

    const snippet = channel.snippet!;
    const statistics = channel.statistics;

    return {
      id: channel.id,
      name: snippet.title || 'Unknown Channel',
      thumbnail:
        snippet.thumbnails?.default?.url ||
        snippet.thumbnails?.medium?.url ||
        '',
      description: snippet.description || undefined,
      customUrl: snippet.customUrl || undefined,
      videoCount: statistics?.videoCount
        ? parseInt(statistics.videoCount)
        : undefined,
    };
  } catch (error: any) {
    if (error.code === 401) {
      throw new Error(
        'YouTube access token expired. Please reconnect your YouTube account.'
      );
    }

    if (error.code === 403) {
      // Check if it's a quota error
      if (
        error.message?.includes('quota') ||
        error.errors?.[0]?.reason === 'quotaExceeded'
      ) {
        const resetTime = new Date();
        resetTime.setHours(24, 0, 0, 0); // Quota resets at midnight Pacific Time
        const hoursUntilReset = Math.ceil(
          (resetTime.getTime() - Date.now()) / (1000 * 60 * 60)
        );

        throw new Error(
          `YouTube API quota exceeded. Quota resets in approximately ${hoursUntilReset} hours. ` +
            `Learn more: https://developers.google.com/youtube/v3/getting-started#quota`
        );
      }

      throw new Error(
        'YouTube API access forbidden. Verify that YouTube Data API v3 is enabled in Google Cloud Console.'
      );
    }

    console.error('YouTube API error:', error);
    throw new Error(
      `Failed to fetch YouTube channel info: ${
        error.message || 'Unknown error'
      }`
    );
  }
}

/**
 * List all videos from a YouTube channel with pagination
 *
 * @param accessToken - Valid YouTube API access token
 * @param channelId - YouTube channel ID
 * @param maxResults - Maximum number of videos to fetch (default: 50, max: 500)
 * @returns Array of video information
 * @throws Error with actionable message if API call fails
 *
 * @example
 * const videos = await listVideos(accessToken, channelId);
 * console.log(`Found ${videos.length} videos`);
 */
export async function listVideos(
  accessToken: string,
  channelId: string,
  maxResults: number = 50
): Promise<VideoInfo[]> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const videos: VideoInfo[] = [];
  let pageToken: string | undefined;

  try {
    // Fetch videos in batches of 50 (YouTube API max per request)
    while (videos.length < maxResults) {
      const batchSize = Math.min(50, maxResults - videos.length);

      const response = await youtube.search.list({
        part: ['snippet'],
        channelId: channelId,
        maxResults: batchSize,
        order: 'date', // Most recent first
        type: ['video'], // Only videos, not playlists or channels
        pageToken: pageToken,
      });

      const items = response.data.items || [];

      if (items.length === 0) {
        break; // No more videos
      }

      // Get video details (including duration) in batch
      const videoIds = items
        .map((item) => item.id?.videoId)
        .filter((id): id is string => !!id);

      const detailsResponse = await youtube.videos.list({
        part: ['snippet', 'contentDetails'],
        id: videoIds,
      });

      const detailsItems = detailsResponse.data.items || [];

      for (const video of detailsItems) {
        if (!video.id || !video.snippet || !video.contentDetails) continue;

        videos.push({
          id: video.id,
          title: video.snippet.title || 'Untitled Video',
          description: video.snippet.description || '',
          thumbnail:
            video.snippet.thumbnails?.medium?.url ||
            video.snippet.thumbnails?.default?.url ||
            '',
          publishedAt: video.snippet.publishedAt || new Date().toISOString(),
          duration: parseDuration(video.contentDetails.duration || 'PT0S'),
          channelId: video.snippet.channelId || channelId,
          channelTitle: video.snippet.channelTitle || '',
        });
      }

      pageToken = response.data.nextPageToken || undefined;

      if (!pageToken) {
        break; // No more pages
      }
    }

    return videos;
  } catch (error: any) {
    if (error.code === 401) {
      throw new Error(
        'YouTube access token expired. Please reconnect your YouTube account.'
      );
    }

    if (error.code === 403) {
      // Check if it's a quota error
      if (
        error.message?.includes('quota') ||
        error.errors?.[0]?.reason === 'quotaExceeded'
      ) {
        throw new Error(
          'YouTube API quota exceeded. Try again tomorrow or reduce the number of videos to sync.'
        );
      }
    }

    console.error('YouTube API error:', error);
    throw new Error(
      `Failed to fetch videos from channel: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Parse ISO 8601 duration string to seconds
 *
 * @param duration - ISO 8601 duration (e.g., "PT1H2M30S" = 1 hour, 2 min, 30 sec)
 * @returns Duration in seconds
 *
 * @example
 * parseDuration("PT1H2M30S") // 3750 seconds
 * parseDuration("PT5M") // 300 seconds
 */
function parseDuration(duration: string): number {
  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!matches) {
    return 0;
  }

  const hours = parseInt(matches[1] || '0');
  const minutes = parseInt(matches[2] || '0');
  const seconds = parseInt(matches[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration (e.g., "1:23:45", "5:30", "0:45")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
