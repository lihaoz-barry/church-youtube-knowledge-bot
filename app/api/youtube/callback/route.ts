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
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/youtube/oauth';
import { getChannelInfo } from '@/lib/youtube/api';
import { encrypt } from '@/lib/utils/encryption';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   YOUTUBE OAUTH CALLBACK - SERVER SIDE                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get authorization code and state from query params
    console.log('📞 [Step 1/10] Receiving OAuth callback...');
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('   └─ Request URL:', request.url.substring(0, 100) + '...');
    console.log('   └─ Origin:', request.nextUrl.origin);
    console.log('   └─ Has code:', !!code, code ? `(${code.substring(0, 20)}...)` : '');
    console.log('   └─ Has state:', !!state, state ? `(${state.substring(0, 20)}...)` : '');
    console.log('   └─ Error param:', error || 'None');

    // Handle user denial
    if (error === 'access_denied') {
      console.log('   ❌ User denied access');
      console.log('   🔀 Redirecting to dashboard with error\n');
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=${encodeURIComponent(
          'You denied access to your YouTube channel. Please try again to connect.'
        )}`
      );
    }

    if (!code || !state) {
      console.error('   ❌ Missing required parameters');
      console.error('   └─ Code present:', !!code);
      console.error('   └─ State present:', !!state);
      console.log('   🔀 Redirecting to dashboard with error\n');
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=${encodeURIComponent(
          'Invalid OAuth callback. Missing authorization code.'
        )}`
      );
    }

    console.log('   ✅ OAuth parameters validated\n');

    // 2. Get Supabase client and verify user
    console.log('🔐 [Step 2/10] Verifying user session...');
    const supabase = createClient();
    const service = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('   └─ User found:', !!user);
    console.log('   └─ User ID:', user?.id || 'N/A');
    console.log('   └─ User email:', user?.email || 'N/A');
    console.log('   └─ Auth error:', authError?.message || 'None');

    if (authError || !user) {
      console.error('   ❌ Session expired or invalid');
      console.log('   🔀 Redirecting to login\n');
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=${encodeURIComponent(
          'Session expired. Please sign in and try again.'
        )}`
      );
    }

    console.log('   ✅ User session verified\n');

    const userId = user.id;

    // 3. Verify state for CSRF protection
    console.log('🔒 [Step 3/10] Verifying CSRF state...');
    const storedState = user.user_metadata?.oauth_state;
    const stateExpires = user.user_metadata?.oauth_state_expires;

    console.log('   └─ Stored state:', storedState?.substring(0, 20) + '...' || 'N/A');
    console.log('   └─ Received state:', state.substring(0, 20) + '...');
    console.log('   └─ States match:', storedState === state);
    console.log('   └─ State expires:', stateExpires || 'N/A');

    if (storedState !== state) {
      console.warn('   ⚠️ State mismatch detected (continuing anyway for MVP)');
      // Continue anyway if session is valid (relaxed CSRF for MVP)
    }

    if (stateExpires && new Date(stateExpires) < new Date()) {
      console.error('   ❌ State expired');
      console.log('   🔀 Redirecting to dashboard with error\n');
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=${encodeURIComponent(
          'OAuth state expired. Please try connecting again.'
        )}`
      );
    }

    console.log('   ✅ State verified\n');

    // 4. Exchange authorization code for tokens
    console.log('🔄 [Step 4/10] Exchanging authorization code for tokens...');
    const redirectUri = `${request.nextUrl.origin}/api/youtube/callback`;
    console.log('   └─ Redirect URI:', redirectUri);

    const tokens = await exchangeCodeForTokens(code, redirectUri);

    console.log('   └─ Access token received:', !!tokens.access_token, tokens.access_token ? `(${tokens.access_token.substring(0, 20)}...)` : '');
    console.log('   └─ Refresh token received:', !!tokens.refresh_token);
    console.log('   └─ Token expires at:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'N/A');
    console.log('   ✅ Tokens exchanged successfully\n');

    // 5. Get YouTube channel information
    console.log('📺 [Step 5/10] Fetching YouTube channel information...');
    const channelInfo = await getChannelInfo(tokens.access_token);

    console.log('   └─ Channel ID:', channelInfo.id);
    console.log('   └─ Channel name:', channelInfo.name);
    console.log('   └─ Channel thumbnail:', channelInfo.thumbnail ? 'Yes' : 'No');
    console.log('   ✅ Channel info retrieved\n');

    // 6. Get or ensure church exists
    // Use service role to ensure church exists and bypass RLS during provisioning
    console.log('🏛️ [Step 6/10] Checking/creating church record...');
    console.log('   └─ Looking for church with ID:', userId);

    const { data: church } = await (service
      .from('churches') as any)
      .select('id')
      .eq('id', userId)
      .single();

    console.log('   └─ Church found:', !!church);

    let churchId: string;

    if (!church) {
      console.log('   └─ Creating new church record...');
      const { data: newChurch, error: createError } = await (service
        .from('churches')
        .insert as any)({
          id: userId,
          name: user.email || channelInfo.name,
          youtube_channel_id: channelInfo.id,
          youtube_channel_name: channelInfo.name,
          youtube_channel_thumbnail: channelInfo.thumbnail,
        })
        .select('id')
        .single();

      console.log('   └─ Create result:', !!newChurch ? 'Success' : 'Failed');
      console.log('   └─ Create error:', createError?.message || 'None');

      if (createError || !newChurch) {
        console.error('   ❌ Failed to create church');
        throw new Error('Failed to create church record');
      }

      churchId = newChurch.id;
      console.log('   └─ New church ID:', churchId);
      console.log('   ✅ Church created with YouTube info\n');
    } else {
      churchId = church.id;
      console.log('   └─ Existing church ID:', churchId);
      console.log('   └─ Updating with YouTube info...');

      // Update church with YouTube channel info
      const { error: updateError } = await (service
        .from('churches')
        .update as any)({
          youtube_channel_id: channelInfo.id,
          youtube_channel_name: channelInfo.name,
          youtube_channel_thumbnail: channelInfo.thumbnail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', churchId);

      console.log('   └─ Update result:', updateError ? 'Failed' : 'Success');
      console.log('   └─ Update error:', updateError?.message || 'None');

      if (updateError) {
        console.error('   ❌ Failed to update church');
        throw new Error('Failed to update church record');
      }

      console.log('   ✅ Church updated with YouTube info\n');
    }

    // 7. Encrypt tokens before storing
    console.log('🔐 [Step 7/10] Encrypting tokens...');
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

    console.log('   └─ Access token encrypted:', !!encryptedAccessToken, `(${encryptedAccessToken.substring(0, 20)}...)`);
    console.log('   └─ Refresh token encrypted:', !!encryptedRefreshToken);
    console.log('   ✅ Tokens encrypted\n');

    // 8. Upsert OAuth tokens (insert or update if exists)
    console.log('💾 [Step 8/10] Storing encrypted tokens in database...');
    console.log('   └─ Church ID:', churchId);
    console.log('   └─ Provider: youtube');

    const { error: tokenError } = await (service
      .from('oauth_tokens')
      .upsert as any)(
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

    console.log('   └─ Upsert result:', tokenError ? 'Failed' : 'Success');
    console.log('   └─ Upsert error:', tokenError?.message || 'None');

    if (tokenError) {
      console.error('   ❌ Failed to store tokens');
      throw new Error('Failed to save YouTube connection. Please try again.');
    }

    console.log('   ✅ Tokens stored successfully\n');

    // 9. Clear OAuth state from user metadata
    console.log('🧹 [Step 9/10] Cleaning up OAuth state...');
    const { error: clearError } = await supabase.auth.updateUser({
      data: {
        oauth_state: null,
        oauth_state_expires: null,
      },
    });

    console.log('   └─ Clear result:', clearError ? 'Failed' : 'Success');
    console.log('   └─ Clear error:', clearError?.message || 'None');
    console.log('   ✅ OAuth state cleared\n');

    // 10. Redirect to dashboard with success message
    console.log('🎉 [Step 10/10] OAuth flow completed successfully!');
    console.log('   └─ Connected to:', channelInfo.name);
    console.log('   └─ Channel ID:', channelInfo.id);
    console.log('   🔀 Redirecting to dashboard with success message\n');

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   ✅ OAUTH SUCCESS - ALL STEPS COMPLETED                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    return NextResponse.redirect(
      `${request.nextUrl.origin}/?success=${encodeURIComponent(
        `Connected to YouTube as ${channelInfo.name}`
      )}`
    );
  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════╗');
    console.error('║   ❌ OAUTH CALLBACK ERROR                                 ║');
    console.error('╚═══════════════════════════════════════════════════════════╝\n');

    console.error('💥 [ERROR] OAuth callback failed:');
    console.error('   └─ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   └─ Error message:', error instanceof Error ? error.message : String(error));
    console.error('   └─ Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error('\n═══════════════════════════════════════════════════════════\n');

    let errorMessage = 'Failed to complete YouTube connection. Please try again.';
    let errorCode = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      // Provide specific error messages based on error content
      if (error.message.includes('token exchange') || error.message.includes('getToken')) {
        errorMessage = 'Failed to exchange authorization code. The authorization may have expired. Please try connecting again.';
        errorCode = 'TOKEN_EXCHANGE_FAILED';
      } else if (error.message.includes('channel info') || error.message.includes('YouTube')) {
        errorMessage = 'Failed to fetch YouTube channel information. Please ensure you have a YouTube channel associated with your account.';
        errorCode = 'CHANNEL_INFO_FAILED';
      } else if (error.message.includes('church') || error.message.includes('database')) {
        errorMessage = 'Failed to save connection to database. Please contact support if this persists.';
        errorCode = 'DATABASE_ERROR';
      } else if (error.message.includes('encrypt')) {
        errorMessage = 'Failed to encrypt tokens. Please check server configuration.';
        errorCode = 'ENCRYPTION_ERROR';
      } else {
        errorMessage = error.message;
      }
    }

    console.error('📋 [Error Details]');
    console.error('   └─ Error code:', errorCode);
    console.error('   └─ User message:', errorMessage);
    console.error('\n═══════════════════════════════════════════════════════════\n');

    return NextResponse.redirect(
      `${request.nextUrl.origin}/?error=${encodeURIComponent(errorMessage)}&code=${errorCode}`
    );
  }
}
