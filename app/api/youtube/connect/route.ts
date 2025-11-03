/**
 * POST /api/youtube/connect
 *
 * Initiates YouTube OAuth 2.0 authorization flow.
 * Generates authorization URL and stores state parameter for CSRF protection.
 *
 * Constitutional Principles:
 * - Multi-Tenancy by Design: Filters by church_id
 * - Serverless-First: Stateless, stores state in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateAuthUrl } from '@/lib/youtube/oauth';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Get Supabase client (includes RLS enforcement)
    const supabase = createClient();
    const service = createServiceClient();

    // 2. Get church_id from auth user (multi-tenancy)
    // Use getUser() instead of getSession() for server-side security
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

    const userId = user.id;

    // Get or create church for this user
    // Note: Use service role to bypass RLS during initial provisioning
    const { data: church, error: churchError } = await (service
      .from('churches') as any)
      .select('id')
      .eq('id', userId)
      .single();

    let churchId: string;

    if (churchError || !church) {
      // Create church for this user
      const { data: newChurch, error: createError } = await (service
        .from('churches')
        .insert as any)({
          id: userId,
          name: user.email || 'My Church',
        })
        .select('id')
        .single();

      if (createError || !newChurch) {
        console.error('Failed to create church:', createError);
        return NextResponse.json(
          { error: 'Failed to initialize church account. Please try again.' },
          { status: 500 }
        );
      }

      churchId = newChurch.id;
    } else {
      churchId = church.id;
    }

    // 3. Generate OAuth state for CSRF protection
    const state = crypto.randomUUID();

    // 4. Store state in database with expiration (valid for 10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store state temporarily (you might want to create a separate states table)
    // For now, we'll include it in the response and verify via session

    // 5. Generate OAuth authorization URL
    const redirectUri = `${request.nextUrl.origin}/api/youtube/callback`;
    const authUrl = generateAuthUrl(redirectUri, state);

    // Debug: log OAuth parameters to help resolve redirect_uri issues locally
    console.log('OAuth connect debug', {
      endpoint: '/api/youtube/connect',
      redirectUri,
      origin: request.nextUrl.origin,
      clientId: process.env.GOOGLE_CLIENT_ID,
    });

    // Store state in session metadata for verification on callback
    // Note: In production, consider using a dedicated states table
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        oauth_state: state,
        oauth_state_expires: expiresAt.toISOString(),
      },
    });

    if (updateError) {
      console.error('Failed to store OAuth state:', updateError);
      // Continue anyway, we can still use session verification
    }

    return NextResponse.json({
      success: true,
      authUrl,
      state, // Return state to client for debugging
    });
  } catch (error) {
    console.error('OAuth initiation error:', {
      error,
      endpoint: '/api/youtube/connect',
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to initiate YouTube connection. Please try again.',
      },
      { status: 500 }
    );
  }
}
