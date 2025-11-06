-- ============================================
-- SQL 脚本 1: 检查当前数据和策略状态
-- ============================================
-- 用途：全面检查数据库中的数据和 RLS 策略配置
-- 执行时机：在修复 RLS 策略之前，了解当前状态
-- 执行位置：Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 第一部分：检查当前数据
-- ============================================

-- 1. 检查 churches 表数据
-- 说明：查看是否有 church 记录，以及 YouTube 连接信息是否存在
SELECT
  id as "Church ID",
  name as "教会名称",
  youtube_channel_id as "YouTube频道ID",
  youtube_channel_name as "YouTube频道名称",
  created_at as "创建时间"
FROM churches;

-- 预期结果：
-- 应该看到你的用户 ID 对应的一条记录
-- youtube_channel_id 应该有值（如果已经连接了 YouTube）


-- 2. 检查 oauth_tokens 表数据
-- 说明：查看 OAuth token 是否已存储（加密后的）
SELECT
  church_id as "Church ID",
  provider as "OAuth提供商",
  LENGTH(access_token) as "Access Token长度（字符数）",
  LENGTH(refresh_token) as "Refresh Token长度（字符数）",
  expires_at as "Token过期时间",
  created_at as "创建时间"
FROM oauth_tokens;

-- 预期结果：
-- 应该看到一条 provider='youtube' 的记录
-- access_token 和 refresh_token 应该有长度（说明已加密存储）


-- 3. 检查 videos 表数据
-- 说明：查看是否有视频数据（目前应该还没有）
SELECT
  COUNT(*) as "视频数量",
  church_id as "Church ID"
FROM videos
GROUP BY church_id;

-- 预期结果：
-- 目前应该返回 0 行（还没有同步视频）


-- ============================================
-- 第二部分：检查 RLS 策略状态
-- ============================================

-- 4. 检查所有表的 RLS 是否启用
-- 说明：确认所有表都启用了 Row Level Security
SELECT
  schemaname as "Schema",
  tablename as "表名",
  CASE
    WHEN rowsecurity = true THEN '✅ 已启用'
    ELSE '❌ 未启用'
  END as "RLS状态"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('churches', 'oauth_tokens', 'videos', 'transcripts', 'processing_jobs')
ORDER BY tablename;

-- 预期结果：
-- 所有表的 RLS 都应该显示 "✅ 已启用"


-- 5. 检查所有 RLS 策略详情（最重要！）
-- 说明：查看每个表的策略是否使用了正确的逻辑
SELECT
  tablename as "表名",
  policyname as "策略名称",
  cmd as "操作类型",
  CASE
    WHEN qual LIKE '%auth.uid()%' THEN '✅ 已修复（使用 auth.uid）'
    WHEN qual LIKE '%get_user_church_id()%' THEN '❌ 有问题（使用旧函数）'
    WHEN qual IS NULL THEN '⚠️ 无条件（INSERT 策略正常）'
    ELSE '⚠️ 需要检查'
  END as "策略状态",
  qual as "WHERE条件（USING）",
  with_check as "CHECK条件"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('churches', 'oauth_tokens', 'videos', 'transcripts', 'processing_jobs')
ORDER BY tablename, cmd, policyname;

-- 预期结果（修复前）：
-- SELECT 策略应该显示 "❌ 有问题（使用旧函数）"
-- qual 列显示类似：(id = get_user_church_id())
--
-- 预期结果（修复后）：
-- 所有策略应该显示 "✅ 已修复（使用 auth.uid）"
-- qual 列显示类似：(id = auth.uid()) 或 (church_id = auth.uid())


-- ============================================
-- 执行完毕提示
-- ============================================

-- 如果看到策略状态显示 "❌ 有问题"，
-- 请继续执行 "2-修复所有RLS策略.sql"
