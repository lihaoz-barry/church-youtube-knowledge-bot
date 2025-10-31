-- Migration: 001_initial_schema
-- Description: Create core tables for church multi-tenancy and video processing
-- Constitutional Principle: Multi-Tenancy by Design
-- All tables include church_id for data isolation

-- ============================================
-- 1. CHURCHES TABLE (Tenant Root)
-- ============================================
CREATE TABLE IF NOT EXISTS public.churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  youtube_channel_id TEXT UNIQUE,
  youtube_channel_name TEXT,
  youtube_channel_thumbnail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by YouTube channel
CREATE INDEX idx_churches_youtube_channel ON public.churches(youtube_channel_id);

-- ============================================
-- 2. OAUTH_TOKENS TABLE (Encrypted Credentials)
-- ============================================
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'youtube', 'telegram', 'google'
  access_token TEXT NOT NULL, -- Encrypted using AES-256
  refresh_token TEXT, -- Encrypted using AES-256
  expires_at TIMESTAMPTZ,
  scope TEXT, -- OAuth scopes granted
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one token per church per provider
  UNIQUE(church_id, provider)
);

-- Index for quick token lookup
CREATE INDEX idx_oauth_tokens_church_provider ON public.oauth_tokens(church_id, provider);

-- ============================================
-- 3. VIDEOS TABLE (YouTube Videos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- Duration in seconds
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'indexed'
  error_message TEXT, -- Store error details if status is 'failed'
  caption_source TEXT, -- 'youtube_captions', 'whisper', null
  has_embeddings BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique video per church
  UNIQUE(church_id, youtube_video_id)
);

-- Indexes for common queries
CREATE INDEX idx_videos_church_id ON public.videos(church_id);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_youtube_video_id ON public.videos(youtube_video_id);
CREATE INDEX idx_videos_published_at ON public.videos(published_at DESC);

-- ============================================
-- 4. TRANSCRIPTS TABLE (Time-Stamped Segments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL, -- Order of segments in video
  start_time FLOAT NOT NULL, -- Start time in seconds
  end_time FLOAT NOT NULL, -- End time in seconds
  text TEXT NOT NULL, -- Transcript text for this segment
  language TEXT, -- Detected language (e.g., 'en', 'zh')
  embedding vector(1536), -- OpenAI text-embedding-3-small (1536 dimensions)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique segments per video
  UNIQUE(video_id, segment_index)
);

-- Indexes for queries and search
CREATE INDEX idx_transcripts_church_id ON public.transcripts(church_id);
CREATE INDEX idx_transcripts_video_id ON public.transcripts(video_id);
CREATE INDEX idx_transcripts_start_time ON public.transcripts(start_time);

-- Note: pgvector index created in migration 003

-- ============================================
-- 5. PROCESSING_JOBS TABLE (Track Long-Running Tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'video_sync', 'transcription', 'embedding_generation'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  progress_message TEXT, -- Human-readable progress (e.g., "Transcribing segment 2/5...")
  progress_percent INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  n8n_execution_id TEXT, -- Reference to n8n workflow execution
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for job tracking
CREATE INDEX idx_processing_jobs_church_id ON public.processing_jobs(church_id);
CREATE INDEX idx_processing_jobs_video_id ON public.processing_jobs(video_id);
CREATE INDEX idx_processing_jobs_status ON public.processing_jobs(status);
CREATE INDEX idx_processing_jobs_job_type ON public.processing_jobs(job_type);

-- ============================================
-- 6. UPDATE TRIGGERS (Auto-update updated_at)
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON public.churches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON public.oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at
  BEFORE UPDATE ON public.processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE public.churches IS 'Tenant root table - each church is isolated';
COMMENT ON TABLE public.oauth_tokens IS 'Encrypted OAuth tokens for YouTube, Google, Telegram';
COMMENT ON TABLE public.videos IS 'YouTube videos synced from connected channels';
COMMENT ON TABLE public.transcripts IS 'Time-stamped transcript segments with embeddings';
COMMENT ON TABLE public.processing_jobs IS 'Track async jobs (n8n workflows) with real-time progress';

COMMENT ON COLUMN public.oauth_tokens.access_token IS 'AES-256 encrypted token';
COMMENT ON COLUMN public.oauth_tokens.refresh_token IS 'AES-256 encrypted token';
COMMENT ON COLUMN public.transcripts.embedding IS 'pgvector embedding for semantic search (1536d)';
