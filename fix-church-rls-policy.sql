-- Fix RLS Policy for Church Creation
-- Issue: Users couldn't create church records because the policy checked for church_id in app_metadata,
-- which doesn't exist yet during first-time church creation.
--
-- Solution: For MVP, since church_id = user_id, allow users to insert churches where id = auth.uid()

-- Drop the old policy
DROP POLICY IF EXISTS "Users can insert their own church" ON public.churches;

-- Create the fixed policy
CREATE POLICY "Users can insert their own church"
  ON public.churches
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Verify the fix
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'churches' AND policyname = 'Users can insert their own church';
