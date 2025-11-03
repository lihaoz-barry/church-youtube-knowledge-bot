-- Migration: 002_rls_policies
-- Description: Row Level Security policies for multi-tenancy
-- Constitutional Principle: Multi-Tenancy by Design
-- Ensures church-level data isolation at the database level

-- ============================================
-- HELPER FUNCTION: Get current user's church_id
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_church_id()
RETURNS UUID AS $$
BEGIN
  -- Get church_id from authenticated user's metadata
  -- Set during user signup/signin
  RETURN (auth.jwt() -> 'app_metadata' ->> 'church_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_church_id() IS 'Returns the church_id of the currently authenticated user';

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CHURCHES TABLE POLICIES
-- ============================================

-- Users can view their own church
CREATE POLICY "Users can view their own church"
  ON public.churches
  FOR SELECT
  USING (id = public.get_user_church_id());

-- Users can update their own church
CREATE POLICY "Users can update their own church"
  ON public.churches
  FOR UPDATE
  USING (id = public.get_user_church_id())
  WITH CHECK (id = public.get_user_church_id());

-- Users can insert their own church (during signup)
-- For MVP: church_id = user_id, so users can create church with id = auth.uid()
CREATE POLICY "Users can insert their own church"
  ON public.churches
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================
-- 3. OAUTH_TOKENS TABLE POLICIES
-- ============================================

-- Users can view their church's OAuth tokens
CREATE POLICY "Users can view their church's OAuth tokens"
  ON public.oauth_tokens
  FOR SELECT
  USING (church_id = public.get_user_church_id());

-- Users can insert OAuth tokens for their church
CREATE POLICY "Users can insert their church's OAuth tokens"
  ON public.oauth_tokens
  FOR INSERT
  WITH CHECK (church_id = public.get_user_church_id());

-- Users can update their church's OAuth tokens
CREATE POLICY "Users can update their church's OAuth tokens"
  ON public.oauth_tokens
  FOR UPDATE
  USING (church_id = public.get_user_church_id())
  WITH CHECK (church_id = public.get_user_church_id());

-- Users can delete their church's OAuth tokens
CREATE POLICY "Users can delete their church's OAuth tokens"
  ON public.oauth_tokens
  FOR DELETE
  USING (church_id = public.get_user_church_id());

-- ============================================
-- 4. VIDEOS TABLE POLICIES
-- ============================================

-- Users can view their church's videos
CREATE POLICY "Users can view their church's videos"
  ON public.videos
  FOR SELECT
  USING (church_id = public.get_user_church_id());

-- Users can insert videos for their church
CREATE POLICY "Users can insert their church's videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (church_id = public.get_user_church_id());

-- Users can update their church's videos
CREATE POLICY "Users can update their church's videos"
  ON public.videos
  FOR UPDATE
  USING (church_id = public.get_user_church_id())
  WITH CHECK (church_id = public.get_user_church_id());

-- Users can delete their church's videos
CREATE POLICY "Users can delete their church's videos"
  ON public.videos
  FOR DELETE
  USING (church_id = public.get_user_church_id());

-- ============================================
-- 5. TRANSCRIPTS TABLE POLICIES
-- ============================================

-- Users can view their church's transcripts
CREATE POLICY "Users can view their church's transcripts"
  ON public.transcripts
  FOR SELECT
  USING (church_id = public.get_user_church_id());

-- Users can insert transcripts for their church
CREATE POLICY "Users can insert their church's transcripts"
  ON public.transcripts
  FOR INSERT
  WITH CHECK (church_id = public.get_user_church_id());

-- Users can update their church's transcripts
CREATE POLICY "Users can update their church's transcripts"
  ON public.transcripts
  FOR UPDATE
  USING (church_id = public.get_user_church_id())
  WITH CHECK (church_id = public.get_user_church_id());

-- Users can delete their church's transcripts
CREATE POLICY "Users can delete their church's transcripts"
  ON public.transcripts
  FOR DELETE
  USING (church_id = public.get_user_church_id());

-- ============================================
-- 6. PROCESSING_JOBS TABLE POLICIES
-- ============================================

-- Users can view their church's processing jobs
CREATE POLICY "Users can view their church's processing jobs"
  ON public.processing_jobs
  FOR SELECT
  USING (church_id = public.get_user_church_id());

-- Users can insert processing jobs for their church
CREATE POLICY "Users can insert their church's processing jobs"
  ON public.processing_jobs
  FOR INSERT
  WITH CHECK (church_id = public.get_user_church_id());

-- Users can update their church's processing jobs
CREATE POLICY "Users can update their church's processing jobs"
  ON public.processing_jobs
  FOR UPDATE
  USING (church_id = public.get_user_church_id())
  WITH CHECK (church_id = public.get_user_church_id());

-- Users can delete their church's processing jobs
CREATE POLICY "Users can delete their church's processing jobs"
  ON public.processing_jobs
  FOR DELETE
  USING (church_id = public.get_user_church_id());

-- ============================================
-- 7. SERVICE ROLE BYPASS (For server-side operations)
-- ============================================

-- The service role key bypasses RLS entirely
-- When using service role client, ALWAYS manually filter by church_id
-- Example:
-- const { data } = await serviceClient
--   .from('videos')
--   .select('*')
--   .eq('church_id', churchId) -- ALWAYS filter manually!

COMMENT ON SCHEMA public IS 'RLS policies enforce church-level data isolation. Service role bypasses RLS - use with caution and always filter by church_id manually.';
