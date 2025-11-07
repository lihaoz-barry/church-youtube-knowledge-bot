-- ============================================
-- SQL 脚本 2: 修复所有 RLS 策略
-- ============================================
-- 用途：修复所有表的 RLS 策略，从 get_user_church_id() 改为 auth.uid()
-- 问题原因：旧策略使用 get_user_church_id() 函数，但用户没有 app_metadata.church_id
-- 修复方案：MVP 设计是 church.id = user.id，直接使用 auth.uid() 判断
-- 执行时机：在执行 "1-检查当前数据和策略.sql" 确认有问题后
-- 执行位置：Supabase Dashboard → SQL Editor
-- 影响范围：所有环境（localhost、staging、production）共享同一个数据库
-- ============================================

-- ============================================
-- 第一步：删除所有旧的 RLS 策略
-- ============================================

-- Churches 表
DROP POLICY IF EXISTS "Users can view their own church" ON public.churches;
DROP POLICY IF EXISTS "Users can update their own church" ON public.churches;
DROP POLICY IF EXISTS "Users can insert their own church" ON public.churches;

-- OAuth Tokens 表
DROP POLICY IF EXISTS "Users can view their church's OAuth tokens" ON public.oauth_tokens;
DROP POLICY IF EXISTS "Users can insert their church's OAuth tokens" ON public.oauth_tokens;
DROP POLICY IF EXISTS "Users can update their church's OAuth tokens" ON public.oauth_tokens;
DROP POLICY IF EXISTS "Users can delete their church's OAuth tokens" ON public.oauth_tokens;

-- Videos 表
DROP POLICY IF EXISTS "Users can view their church's videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their church's videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their church's videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their church's videos" ON public.videos;

-- Transcripts 表
DROP POLICY IF EXISTS "Users can view their church's transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can insert their church's transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can update their church's transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can delete their church's transcripts" ON public.transcripts;

-- Processing Jobs 表
DROP POLICY IF EXISTS "Users can view their church's processing jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Users can insert their church's processing jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Users can update their church's processing jobs" ON public.processing_jobs;
DROP POLICY IF EXISTS "Users can delete their church's processing jobs" ON public.processing_jobs;


-- ============================================
-- 第二步：创建新的 RLS 策略（CHURCHES 表）
-- ============================================
-- 逻辑：church.id = user.id (MVP 简化设计)
-- 使用 auth.uid() 直接获取当前用户 ID

-- 允许用户查看自己的 church 记录
CREATE POLICY "Users can view their own church"
  ON public.churches
  FOR SELECT
  USING (id = auth.uid());

-- 允许用户更新自己的 church 记录
CREATE POLICY "Users can update their own church"
  ON public.churches
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 允许用户创建自己的 church 记录（首次连接 YouTube 时）
CREATE POLICY "Users can insert their own church"
  ON public.churches
  FOR INSERT
  WITH CHECK (id = auth.uid());


-- ============================================
-- 第三步：创建新的 RLS 策略（OAUTH_TOKENS 表）
-- ============================================
-- 逻辑：oauth_tokens.church_id = user.id

-- 允许用户查看自己 church 的 OAuth tokens
CREATE POLICY "Users can view their church's OAuth tokens"
  ON public.oauth_tokens
  FOR SELECT
  USING (church_id = auth.uid());

-- 允许用户插入自己 church 的 OAuth tokens
CREATE POLICY "Users can insert their church's OAuth tokens"
  ON public.oauth_tokens
  FOR INSERT
  WITH CHECK (church_id = auth.uid());

-- 允许用户更新自己 church 的 OAuth tokens
CREATE POLICY "Users can update their church's OAuth tokens"
  ON public.oauth_tokens
  FOR UPDATE
  USING (church_id = auth.uid())
  WITH CHECK (church_id = auth.uid());

-- 允许用户删除自己 church 的 OAuth tokens
CREATE POLICY "Users can delete their church's OAuth tokens"
  ON public.oauth_tokens
  FOR DELETE
  USING (church_id = auth.uid());


-- ============================================
-- 第四步：创建新的 RLS 策略（VIDEOS 表）
-- ============================================
-- 逻辑：videos.church_id = user.id

-- 允许用户查看自己 church 的视频
CREATE POLICY "Users can view their church's videos"
  ON public.videos
  FOR SELECT
  USING (church_id = auth.uid());

-- 允许用户插入自己 church 的视频
CREATE POLICY "Users can insert their church's videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (church_id = auth.uid());

-- 允许用户更新自己 church 的视频
CREATE POLICY "Users can update their church's videos"
  ON public.videos
  FOR UPDATE
  USING (church_id = auth.uid())
  WITH CHECK (church_id = auth.uid());

-- 允许用户删除自己 church 的视频
CREATE POLICY "Users can delete their church's videos"
  ON public.videos
  FOR DELETE
  USING (church_id = auth.uid());


-- ============================================
-- 第五步：创建新的 RLS 策略（TRANSCRIPTS 表）
-- ============================================
-- 逻辑：transcripts.church_id = user.id

-- 允许用户查看自己 church 的转录文本
CREATE POLICY "Users can view their church's transcripts"
  ON public.transcripts
  FOR SELECT
  USING (church_id = auth.uid());

-- 允许用户插入自己 church 的转录文本
CREATE POLICY "Users can insert their church's transcripts"
  ON public.transcripts
  FOR INSERT
  WITH CHECK (church_id = auth.uid());

-- 允许用户更新自己 church 的转录文本
CREATE POLICY "Users can update their church's transcripts"
  ON public.transcripts
  FOR UPDATE
  USING (church_id = auth.uid())
  WITH CHECK (church_id = auth.uid());

-- 允许用户删除自己 church 的转录文本
CREATE POLICY "Users can delete their church's transcripts"
  ON public.transcripts
  FOR DELETE
  USING (church_id = auth.uid());


-- ============================================
-- 第六步：创建新的 RLS 策略（PROCESSING_JOBS 表）
-- ============================================
-- 逻辑：processing_jobs.church_id = user.id

-- 允许用户查看自己 church 的处理任务
CREATE POLICY "Users can view their church's processing jobs"
  ON public.processing_jobs
  FOR SELECT
  USING (church_id = auth.uid());

-- 允许用户插入自己 church 的处理任务
CREATE POLICY "Users can insert their church's processing jobs"
  ON public.processing_jobs
  FOR INSERT
  WITH CHECK (church_id = auth.uid());

-- 允许用户更新自己 church 的处理任务
CREATE POLICY "Users can update their church's processing jobs"
  ON public.processing_jobs
  FOR UPDATE
  USING (church_id = auth.uid())
  WITH CHECK (church_id = auth.uid());

-- 允许用户删除自己 church 的处理任务
CREATE POLICY "Users can delete their church's processing jobs"
  ON public.processing_jobs
  FOR DELETE
  USING (church_id = auth.uid());


-- ============================================
-- 第七步：验证修复结果
-- ============================================
-- 说明：检查所有策略是否已经修复成功

SELECT
  tablename as "表名",
  policyname as "策略名称",
  cmd as "操作",
  CASE
    WHEN qual LIKE '%auth.uid()%' THEN '✅ 已修复'
    WHEN qual LIKE '%get_user_church_id()%' THEN '❌ 仍有问题'
    WHEN qual IS NULL THEN '⚠️ 无条件'
    ELSE '⚠️ 需检查'
  END as "状态",
  qual as "条件"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('churches', 'oauth_tokens', 'videos', 'transcripts', 'processing_jobs')
ORDER BY tablename, cmd, policyname;

-- 预期结果：
-- 所有策略的"状态"列都应该显示 "✅ 已修复"
-- 条件列应该显示：
--   - churches 表: (id = auth.uid())
--   - 其他表: (church_id = auth.uid())


-- ============================================
-- 执行完毕提示
-- ============================================

-- ✅ 如果验证结果显示所有策略都是 "✅ 已修复"
-- → 刷新浏览器 http://localhost:8000
-- → 应该可以看到 YouTube 连接成功，显示 "View Videos" 按钮
--
-- ❌ 如果还有策略显示 "❌ 仍有问题"
-- → 请联系开发人员检查
