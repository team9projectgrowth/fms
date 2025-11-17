/*
  # Test and Debug User Creation RLS
  
  Run these queries to diagnose the issue
*/

-- 1. Check what INSERT policies exist
SELECT policyname, cmd, with_check, qual
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'INSERT';

-- 2. Check if helper functions exist
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%bypassing_rls%';

-- 3. Check your current user's role and tenant_id
SELECT id, email, role, tenant_id 
FROM users 
WHERE id = auth.uid();

-- 4. Test the helper functions
SELECT 
  is_tenant_admin_bypassing_rls() as is_tenant_admin,
  is_admin_bypassing_rls() as is_admin,
  get_user_tenant_id_bypassing_rls() as my_tenant_id;

-- 5. Check if RLS is enabled on users table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- 6. Try to manually test an insert (this will show the actual error)
-- Replace 'test@example.com' and tenant_id with actual values
/*
INSERT INTO users (id, email, full_name, role, tenant_id, is_active)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Test User',
  'complainant',
  get_user_tenant_id_bypassing_rls(),
  true
);
*/

