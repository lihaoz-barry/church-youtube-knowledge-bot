-- Migration: 004_functions
-- Description: Database functions for token management and triggers
-- Constitutional Principle: Serverless-First Architecture
-- Provides database-level logic for token refresh and video status management

-- ============================================
-- 1. OAUTH TOKEN EXPIRY CHECK
-- ============================================

-- Function to check if an OAuth token needs refresh
CREATE OR REPLACE FUNCTION public.is_token_expired(
  token_expires_at TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Token is expired if expires_at is in the past
  -- Add 5 minute buffer to refresh before actual expiry
  RETURN token_expires_at IS NULL OR token_expires_at < (NOW() + INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_token_expired IS 'Check if OAuth token is expired or needs refresh (5min buffer)';

-- ============================================
-- 2. AUTO-UPDATE VIDEO STATUS TRIGGER
-- ============================================

-- Function to automatically update video status based on transcripts
CREATE OR REPLACE FUNCTION public.update_video_status_on_transcript_change()
RETURNS TRIGGER AS $$
DECLARE
  video_record RECORD;
  total_segments INT;
  segments_with_embeddings INT;
BEGIN
  -- Get video record
  SELECT * INTO video_record
  FROM public.videos
  WHERE id = NEW.video_id;

  -- Count total segments and segments with embeddings for this video
  SELECT
    COUNT(*) AS total,
    COUNT(embedding) AS with_embeddings
  INTO total_segments, segments_with_embeddings
  FROM public.transcripts
  WHERE video_id = NEW.video_id;

  -- Update video status based on transcript state
  IF total_segments > 0 THEN
    IF segments_with_embeddings = total_segments THEN
      -- All segments have embeddings
      UPDATE public.videos
      SET
        status = 'indexed',
        has_embeddings = TRUE,
        updated_at = NOW()
      WHERE id = NEW.video_id;
    ELSIF segments_with_embeddings > 0 THEN
      -- Some segments have embeddings (processing)
      UPDATE public.videos
      SET
        status = 'processing',
        has_embeddings = FALSE,
        updated_at = NOW()
      WHERE id = NEW.video_id AND status != 'failed';
    ELSE
      -- Transcripts exist but no embeddings yet
      UPDATE public.videos
      SET
        status = 'completed',
        has_embeddings = FALSE,
        updated_at = NOW()
      WHERE id = NEW.video_id AND status != 'failed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_video_status_on_transcript_change IS 'Auto-update video status when transcripts or embeddings are added';

-- Trigger on transcript insert/update
CREATE TRIGGER update_video_status_on_transcript_insert
  AFTER INSERT ON public.transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_status_on_transcript_change();

CREATE TRIGGER update_video_status_on_transcript_update
  AFTER UPDATE ON public.transcripts
  FOR EACH ROW
  WHEN (OLD.embedding IS DISTINCT FROM NEW.embedding)
  EXECUTE FUNCTION public.update_video_status_on_transcript_change();

-- ============================================
-- 3. GET EXPIRED TOKENS FOR REFRESH
-- ============================================

-- Function to find all expired tokens that need refresh
CREATE OR REPLACE FUNCTION public.get_tokens_needing_refresh()
RETURNS TABLE (
  id UUID,
  church_id UUID,
  provider TEXT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.church_id,
    t.provider,
    t.expires_at
  FROM public.oauth_tokens t
  WHERE public.is_token_expired(t.expires_at)
    AND t.refresh_token IS NOT NULL -- Only tokens that have refresh capability
  ORDER BY t.expires_at ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_tokens_needing_refresh IS 'Returns all OAuth tokens that need refreshing (expired or expiring soon)';

-- ============================================
-- 4. CHURCH STATISTICS VIEW
-- ============================================

-- View to show church statistics (for admin dashboard)
CREATE OR REPLACE VIEW public.church_stats AS
SELECT
  c.id AS church_id,
  c.name AS church_name,
  c.youtube_channel_name,
  COUNT(DISTINCT v.id) AS total_videos,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'pending') AS pending_videos,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'processing') AS processing_videos,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') AS completed_videos,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'indexed') AS indexed_videos,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'failed') AS failed_videos,
  COUNT(DISTINCT t.id) AS total_transcript_segments,
  COUNT(t.embedding) AS segments_with_embeddings,
  ROUND(100.0 * COUNT(t.embedding) / NULLIF(COUNT(DISTINCT t.id), 0), 2) AS embedding_coverage_percent,
  c.created_at AS church_created_at,
  MAX(v.updated_at) AS last_video_update
FROM public.churches c
LEFT JOIN public.videos v ON v.church_id = c.id
LEFT JOIN public.transcripts t ON t.church_id = c.id
GROUP BY c.id, c.name, c.youtube_channel_name, c.created_at;

COMMENT ON VIEW public.church_stats IS 'Statistics for each church showing video processing progress';

-- ============================================
-- 5. PROCESSING JOB CLEANUP
-- ============================================

-- Function to clean up old completed/failed jobs (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_processing_jobs()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  -- Delete completed/failed jobs older than 30 days
  WITH deleted AS (
    DELETE FROM public.processing_jobs
    WHERE status IN ('completed', 'failed')
      AND completed_at < NOW() - INTERVAL '30 days'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.cleanup_old_processing_jobs IS 'Delete completed/failed jobs older than 30 days. Run via cron job.';

-- ============================================
-- 6. VIDEO PROCESSING PROGRESS
-- ============================================

-- Function to get real-time processing progress for a video
CREATE OR REPLACE FUNCTION public.get_video_processing_progress(
  video_uuid UUID
)
RETURNS TABLE (
  video_id UUID,
  video_status TEXT,
  current_job_type TEXT,
  current_job_status TEXT,
  current_progress_message TEXT,
  current_progress_percent INT,
  total_segments INT,
  segments_with_embeddings INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS video_id,
    v.status AS video_status,
    j.job_type AS current_job_type,
    j.status AS current_job_status,
    j.progress_message AS current_progress_message,
    j.progress_percent AS current_progress_percent,
    COUNT(DISTINCT t.id)::INT AS total_segments,
    COUNT(t.embedding)::INT AS segments_with_embeddings
  FROM public.videos v
  LEFT JOIN LATERAL (
    SELECT *
    FROM public.processing_jobs
    WHERE video_id = v.id
      AND status IN ('pending', 'running')
    ORDER BY created_at DESC
    LIMIT 1
  ) j ON TRUE
  LEFT JOIN public.transcripts t ON t.video_id = v.id
  WHERE v.id = video_uuid
  GROUP BY v.id, v.status, j.job_type, j.status, j.progress_message, j.progress_percent;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_video_processing_progress IS 'Get comprehensive processing progress for a video including current job status';

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

-- Additional indexes for function performance
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON public.oauth_tokens(expires_at)
  WHERE refresh_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processing_jobs_completed_at ON public.processing_jobs(completed_at)
  WHERE status IN ('completed', 'failed');

COMMENT ON INDEX idx_oauth_tokens_expires_at IS 'Index for finding expired tokens needing refresh';
COMMENT ON INDEX idx_processing_jobs_completed_at IS 'Index for cleanup of old jobs';
