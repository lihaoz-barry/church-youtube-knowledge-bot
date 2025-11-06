-- Migration: 005_fix_rls_policies
-- Description: Fix RLS policies for MVP (church.id = user.id)
-- Issue: get_user_church_id() expects app_metadata.church_id, but MVP uses church.id = user.id

-- ============================================
-- DROP OLD POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own church" ON public.churches;
DROP POLICY IF EXISTS "Users can update their own church" ON public.churches;
DROP POLICY IF EXISTS "Users can insert their own church" ON public.churches;

DROP POLICY IF EXISTS "Users can view their church's OAuth tokens" ON public.oauth_tokens;
DROP POLICY IF EXISTS "Users can insert their church's OAuth tokens" ON public.oauth_tokens;
DROP POLICY IF EXISTS "Users can update their church's OAuth tokens" ON public.oauth_tokens;
DROP POLICY IF EXISTS "Users can delete their church's OAuth tokens" ON public.oauth_tokens;

DROP POLICY IF EXISTS "Users can view their church's videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their church's videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their church's videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their church's videos" ON public.videos;

DROP POLICY IF EXISTS "Users can view their church's transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can insert their church's transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can update their church's transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can delete their church's transcripts" ON public.transcripts;

DROP POLICY IF EXISTS "Users can view their church's processing jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Users can insert their church's processing jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Users can update their church's processing jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Users can delete their church's processing jobs" ON public.processing_jobs;

-- ============================================
-- CHURCHES TABLE - FIXED POLICIES
-- ============================================

-- Users can view their own church (MVP: church.id = user.id)
CREATE POLICY "Users can view their own church"
  ON public.churches
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own church
CREATE POLICY "Users can update their own church"
  ON public.churches
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own church (during first connect)
CREATE POLICY "Users can insert their own church"
  ON public.churches
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================
-- OAUTH_TOKENS TABLE - FIXED POLICIES
-- ============================================

-- Users can view their church's OAuth tokens (MVP: church_id = user.id)
CREATE POLICY "Users can view their church's OAuth tokens"
  ON public.oauth_tokens
  FOR SELECT
  USING (church_id = auth.uid());

-- Users can insert OAuth tokens for their church
CREATE POLICY "Users can insert their church's OAuth tokens"
  ON public.oauth_tokens
  FOR INSERT
  WITH CHECK (church_id = auth.uid());

-- Users can update their church's OAuth tokens
CREATE POLICY "Users can update their church's OAuth tokens"
  ON public.oauth_tokens
  FOR UPDATE
  USING (church_id = auth.uid())
  WITH CHECK (church_id = auth.uid());

-- Users can delete their church's OAuth tokens
CREATE POLICY "Users can delete their church's OAuth tokens"
  ON public.oauth_tokens
  FOR DELETE
  USING (church_id = auth.uid());

-- ============================================
-- VIDEOS TABLE - FIXED POLICIES
-- ============================================

-- Users can view their church's videos
CREATE POLICY "Users can view their church's videos"
  ON public.videos
  FOR SELECT
  USING (church_id = auth.uid());

-- Users can insert videos for their church
CREATE POLICY "Users can insert their church's videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (church_id = auth.uid());

-- Users can update their church's videos
CREATE POLICY "Users can update their church's videos"
  ON public.videos
  FOR UPDATE
  USING (church_id = auth.uid())
  WITH CHECK (church_id = auth.uid());

-- Users can delete their church's videos
CREATE POLICY "Users can delete their church's videos"
  ON public.videos
  FOR DELETE
  USING (church_id = auth.uid());

-- ============================================
-- TRANSCRIPTS TABLE - FIXED POLICIES
-- ============================================

-- Users can view their church's transcripts
CREATE POLICY "Users can view their church's transcripts"
  ON public.transcripts
  FOR SELECT
  USING (church_id = auth.uid());

-- Users can insert transcripts for their church
CREATE POLICY "Users can insert their church's transcripts"
  ON public.transcripts
  FOR INSERT
  WITH CHECK (church_id = auth.uid());

-- Users can update their church's transcripts
CREATE POLICY "Users can update their church's transcripts"
  ON public.transcripts
  FOR UPDATE
  USING (church_id = auth.uid())
  WITH CHECK (church_id = auth.uid());

-- Users can delete their church's transcripts
CREATE POLICY "Users can delete their church's transcripts"
  ON public.transcripts
  FOR DELETE
  USING (church_id = auth.uid());

-- ============================================
-- PROCESSING_JOBS TABLE - FIXED POLICIES
-- ============================================

-- Users can view their church's processing jobs
CREATE POLICY "Users can view their church's processing jobs"
  ON public.processing_jobs
  FOR SELECT
  USING (church_id = auth.uid());

-- Users can insert processing jobs for their church
CREATE POLICY "Users can insert their church's processing jobs"
  ON public.processing_jobs
  FOR INSERT
  WITH CHECK (church_id = auth.uid());

-- Users can update their church's processing jobs
CREATE POLICY "Users can update their church's processing jobs"
  ON public.processing_jobs
  FOR UPDATE
  USING (church_id = auth.uid())
  WITH CHECK (church_id = auth.uid());

-- Users can delete their church's processing jobs
CREATE POLICY "Users can delete their church's processing jobs"
  ON public.processing_jobs
  FOR DELETE
  USING (church_id = auth.uid());

-- ============================================
-- COMMENT
-- ============================================

COMMENT ON SCHEMA public IS 'RLS policies enforce church-level data isolation. MVP: church.id = user.id, so policies check against auth.uid() directly.';
