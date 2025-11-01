/**
 * YouTube Token Manager
 *
 * Handles token expiration detection and automatic refresh.
 *
 * Constitutional Principles:
 * - Multi-Tenancy: Always operates within church context
 * - User Experience First: Transparent token refresh
 * - Serverless-First: Stateless operations using database
 */

import { createClient } from '@/lib/supabase/server';
import { refreshAccessToken, isTokenExpired } from '@/lib/youtube/oauth';
import { decrypt, encrypt } from '@/lib/utils/encryption';

export interface YouTubeTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}

/**
 * Get YouTube tokens for a church, automatically refreshing if expired
 *
 * @param churchId - Church UUID
 * @returns Decrypted access token (refreshed if needed)
 * @throws Error if tokens not found or refresh fails
 */
export async function getYouTubeTokens(
  churchId: string
): Promise<YouTubeTokens> {
  const supabase = createClient();

  // Get stored tokens from database
  const { data: tokenData, error: fetchError } = await (supabase
    .from('oauth_tokens') as any)
    .select('access_token, refresh_token, expires_at')
    .eq('church_id', churchId)
    .eq('provider', 'youtube')
    .single();

  if (fetchError || !tokenData) {
    throw new Error(
      'YouTube not connected. Please connect your YouTube channel first.'
    );
  }

  // Decrypt tokens
  const decryptedAccessToken = decrypt(tokenData.access_token);
  const decryptedRefreshToken = tokenData.refresh_token
    ? decrypt(tokenData.refresh_token)
    : null;

  // Check if token is expired (with 5-minute buffer)
  const expiryDate = tokenData.expires_at
    ? new Date(tokenData.expires_at).getTime()
    : undefined;

  if (isTokenExpired(expiryDate)) {
    // Token is expired or expiring soon - refresh it
    if (!decryptedRefreshToken) {
      throw new Error(
        'YouTube access token expired and no refresh token available. Please reconnect your YouTube channel.'
      );
    }

    try {
      // Refresh the access token
      const newTokens = await refreshAccessToken(decryptedRefreshToken);

      // Encrypt new access token
      const encryptedAccessToken = encrypt(newTokens.access_token);

      // Update database with new access token
      const { error: updateError } = await (supabase
        .from('oauth_tokens')
        .update as any)({
          access_token: encryptedAccessToken,
          expires_at: newTokens.expiry_date
            ? new Date(newTokens.expiry_date).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('church_id', churchId)
        .eq('provider', 'youtube');

      if (updateError) {
        console.error('Failed to update refreshed token:', updateError);
        throw new Error('Failed to save refreshed access token');
      }

      // Return refreshed token
      return {
        accessToken: newTokens.access_token,
        refreshToken: decryptedRefreshToken,
        expiresAt: newTokens.expiry_date
          ? new Date(newTokens.expiry_date).toISOString()
          : null,
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error(
        `Failed to refresh YouTube access token: ${
          error instanceof Error ? error.message : 'Unknown error'
        }. Please reconnect your YouTube channel.`
      );
    }
  }

  // Token is still valid
  return {
    accessToken: decryptedAccessToken,
    refreshToken: decryptedRefreshToken,
    expiresAt: tokenData.expires_at,
  };
}

/**
 * Check if YouTube is connected for a church
 *
 * @param churchId - Church UUID
 * @returns true if connected, false otherwise
 */
export async function isYouTubeConnected(churchId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('id')
    .eq('church_id', churchId)
    .eq('provider', 'youtube')
    .single();

  return !error && !!data;
}

/**
 * Delete YouTube tokens for a church (disconnect)
 *
 * @param churchId - Church UUID
 */
export async function disconnectYouTube(churchId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('oauth_tokens')
    .delete()
    .eq('church_id', churchId)
    .eq('provider', 'youtube');

  if (error) {
    throw new Error('Failed to disconnect YouTube');
  }

  // Also clear YouTube channel info from church record
  await (supabase
    .from('churches')
    .update as any)({
      youtube_channel_id: null,
      youtube_channel_name: null,
      youtube_channel_thumbnail: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', churchId);
}
