-- ========================================
-- STEP 1: CHECK CURRENT RLS POLICIES
-- ========================================
-- This shows all policies on the churches table
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual AS "using_clause",
  with_check AS "with_check_clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'churches'
ORDER BY policyname;

-- ========================================
-- STEP 2: FIX THE INSERT POLICY
-- ========================================

-- Drop the old policy (if it exists)
DROP POLICY IF EXISTS "Users can insert their own church" ON public.churches;

-- Create the fixed policy
-- This allows users to create churches where id = their own user_id
CREATE POLICY "Users can insert their own church"
  ON public.churches
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ========================================
-- STEP 3: VERIFY THE FIX
-- ========================================

-- Check the updated policy
SELECT
  policyname,
  with_check AS "with_check_clause"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'churches'
  AND policyname = 'Users can insert their own church';

-- Expected result:
-- policyname: "Users can insert their own church"
-- with_check_clause: (id = auth.uid())

-- ========================================
-- STEP 4: TEST THE FIX (OPTIONAL)
-- ========================================

-- To test, try inserting your own church record
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- You can find it by running: SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Example test (DON'T RUN THIS YET - read instructions below):
-- INSERT INTO public.churches (id, name) VALUES ('YOUR_USER_ID_HERE', 'Test Church');

-- If the policy is working, this should:
-- - Succeed if YOUR_USER_ID_HERE matches the authenticated user's ID
-- - Fail if YOUR_USER_ID_HERE is different from the authenticated user's ID

-- ========================================
-- TROUBLESHOOTING
-- ========================================

-- If you still get RLS errors after running this script:

-- 1. Check if RLS is enabled on churches table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'churches';
-- Should show: rowsecurity = t (true)

-- 2. Check all policies on churches table
SELECT * FROM pg_policies WHERE tablename = 'churches';

-- 3. Verify auth.uid() function works
SELECT auth.uid(); -- Should return your current user_id if authenticated

-- 4. Check if there are any conflicting policies
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'churches' AND cmd = 'INSERT';
-- Should only show our one INSERT policy
