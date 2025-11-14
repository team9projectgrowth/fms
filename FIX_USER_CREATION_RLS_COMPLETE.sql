/*
  # Complete Fix for Tenant Admin User Creation RLS
  
  This script:
  1. Lists all existing policies on users table
  2. Drops ALL INSERT policies to start fresh
  3. Creates helper functions with SECURITY DEFINER
  4. Creates a single working INSERT policy
*/

-- ============================================================================
-- STEP 1: View current policies (for debugging)
-- ============================================================================

-- Uncomment to see current policies:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'users';

-- ============================================================================
-- STEP 2: Drop ALL existing INSERT policies (start fresh)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND cmd = 'INSERT'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON users';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Also drop by name (in case the above doesn't catch all)
DROP POLICY IF EXISTS "Tenant admins can create tenant users" ON users;
DROP POLICY IF EXISTS "Tenant admins can insert tenant users" ON users;
DROP POLICY IF EXISTS "Tenant admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Only admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins and tenant admins can insert users" ON users;

-- ============================================================================
-- STEP 3: Create Helper Functions (SECURITY DEFINER to bypass RLS)
-- ============================================================================

-- Function to check if current user is tenant_admin
CREATE OR REPLACE FUNCTION is_tenant_admin_bypassing_rls()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role = 'tenant_admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_tenant_admin_bypassing_rls() TO authenticated, anon;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin_bypassing_rls()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin_bypassing_rls() TO authenticated, anon;

-- Function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id_bypassing_rls()
RETURNS uuid AS $$
DECLARE
  user_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO user_tenant_id
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_tenant_id_bypassing_rls() TO authenticated, anon;

-- ============================================================================
-- STEP 4: Create Single INSERT Policy
-- ============================================================================

-- Policy for admins
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_bypassing_rls()
  );

-- Policy for tenant admins (separate policy to avoid complexity)
-- Use only SECURITY DEFINER functions to avoid RLS circular dependencies
-- IMPORTANT: In WITH CHECK, column names automatically refer to NEW values for INSERT
CREATE POLICY "Tenant admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      is_tenant_admin_bypassing_rls() = true
      AND tenant_id IS NOT NULL
      AND get_user_tenant_id_bypassing_rls() IS NOT NULL
      AND tenant_id = get_user_tenant_id_bypassing_rls()
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that policy was created
DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'users' AND cmd = 'INSERT';
    
    IF policy_count = 0 THEN
        RAISE EXCEPTION 'No INSERT policies found! Policy creation may have failed.';
    ELSE
        RAISE NOTICE 'Successfully created INSERT policy. Total INSERT policies: %', policy_count;
    END IF;
END $$;

