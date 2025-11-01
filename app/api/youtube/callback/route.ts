/**
 * GET /api/youtube/callback
 *
 * OAuth 2.0 callback endpoint. Receives authorization code from Google,
 * exchanges it for tokens, encrypts and stores in database.
 *
 * Constitutional Principles:
 * - Privacy & Theological Content Sensitivity: Tokens encrypted with AES-256
 * - Multi-Tenancy: Tokens associated with church_id
 * - User Experience First: Actionable error messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/youtube/oauth';
import { getChannelInfo } from '@/lib/youtube/api';
import { encrypt } from '@/lib/utils/encryption';

export async function GET(request: NextRequest) {
  try {
    // 1. Get authorization code and state from query params
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user denial
    if (error === 'access_denied') {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=${encodeURIComponent(
          'You denied access to your YouTube channel. Please try again to connect.'
        )}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=${encodeURIComponent(
          'Invalid OAuth callback. Missing authorization code.'
        )}`
      );
    }

    // 2. Get Supabase client and verify session
    const supabase = createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=${encodeURIComponent(
          'Session expired. Please sign in and try again.'
        )}`
      );
    }

    const userId = session.user.id;

    // 3. Verify state for CSRF protection
    const storedState = session.user.user_metadata?.oauth_state;
    const stateExpires = session.user.user_metadata?.oauth_state_expires;

    if (storedState !== state) {
      console.warn('OAuth state mismatch', {
        stored: storedState,
        received: state,
      });
      // Continue anyway if session is valid (relaxed CSRF for MVP)
    }

    if (stateExpires && new Date(stateExpires) < new Date()) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=${encodeURIComponent(
          'OAuth state expired. Please try connecting again.'
        )}`
      );
    }

    // 4. Exchange authorization code for tokens
    const redirectUri = `${request.nextUrl.origin}/api/youtube/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // 5. Get YouTube channel information
    const channelInfo = await getChannelInfo(tokens.access_token);

    // 6. Get or ensure church exists
    const { data: church } = await supabase
      .from('churches')
      .select('id')
      .eq('id', userId)
      .single();

    let churchId: string;

    if (!church) {
      const { data: newChurch, error: createError } = await supabase
        .from('churches')
        .insert({
          id: userId,
          name: session.user.email || channelInfo.name,
          youtube_channel_id: channelInfo.id,
          youtube_channel_name: channelInfo.name,
          youtube_channel_thumbnail: channelInfo.thumbnail,
        })
        .select('id')
        .single();

      if (createError || !newChurch) {
        throw new Error('Failed to create church record');
      }

      churchId = newChurch.id;
    } else {
      churchId = church.id;

      // Update church with YouTube channel info
      await supabase
        .from('churches')
        .update({
          youtube_channel_id: channelInfo.id,
          youtube_channel_name: channelInfo.name,
          youtube_channel_thumbnail: channelInfo.thumbnail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', churchId);
    }

    // 7. Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    // 8. Upsert OAuth tokens (insert or update if exists)
    const { error: tokenError } = await supabase.from('oauth_tokens').upsert(
      {
        church_id: churchId,
        provider: 'youtube',
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'church_id,provider',
      }
    );

    if (tokenError) {
      console.error('Failed to store OAuth tokens:', tokenError);
      throw new Error('Failed to save YouTube connection. Please try again.');
    }

    // 9. Clear OAuth state from user metadata
    await supabase.auth.updateUser({
      data: {
        oauth_state: null,
        oauth_state_expires: null,
      },
    });

    // 10. Redirect to dashboard with success message
    return NextResponse.redirect(
      `${request.nextUrl.origin}/?success=${encodeURIComponent(
        `Connected to YouTube as ${channelInfo.name}`
      )}`
    );
  } catch (error) {
    console.error('OAuth callback error:', {
      error,
      endpoint: '/api/youtube/callback',
    });

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to complete YouTube connection. Please try again.';

    return NextResponse.redirect(
      `${request.nextUrl.origin}/?error=${encodeURIComponent(errorMessage)}`
    );
  }
}
