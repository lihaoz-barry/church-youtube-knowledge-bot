/**
 * GET /api/videos/list
 *
 * Lists videos for the authenticated church from the database.
 * Supports filtering by status and pagination.
 *
 * Constitutional Principles:
 * - Multi-Tenancy by Design: Automatically filters by church_id via RLS
 * - User Experience First: Returns paginated results with metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Get authenticated user
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

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // pending, processing, completed, failed
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. Build query
    let query = (supabase
      .from('videos') as any)
      .select('*', { count: 'exact' })
      .eq('church_id', churchId)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // 4. Execute query
    const { data: videos, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Failed to fetch videos:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch videos. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videos: videos || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Video list error:', {
      error,
      endpoint: '/api/videos/list',
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to list videos. Please try again.',
      },
      { status: 500 }
    );
  }
}
