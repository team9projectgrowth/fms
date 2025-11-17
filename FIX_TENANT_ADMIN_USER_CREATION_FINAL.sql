/*
  # Fix Tenant Admin User Creation RLS - FINAL FIX
  
  This script fixes the circular dependency issue by:
  1. Dropping ALL conflicting INSERT policies
  2. Creating SECURITY DEFINER helper functions
  3. Creating a single comprehensive INSERT policy that works for both admins and tenant admins
*/

-- ============================================================================
-- STEP 1: Create Helper Functions (SECURITY DEFINER to bypass RLS)
-- ============================================================================

-- Function to check if current user is tenant_admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_tenant_admin_bypassing_rls()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_role = 'tenant_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_tenant_admin_bypassing_rls() TO authenticated, anon;

-- Function to get current user's tenant_id (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_tenant_id_bypassing_rls()
RETURNS uuid AS $$
DECLARE
  user_tenant_id uuid;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  SELECT tenant_id INTO user_tenant_id
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_tenant_id_bypassing_rls() TO authenticated, anon;

-- Function to check if tenant admin can create user (bypasses RLS)
-- This function checks the current user's tenant_id against a passed tenant_id
CREATE OR REPLACE FUNCTION can_tenant_admin_create_user_with_tenant(target_tenant_id uuid)
RETURNS boolean AS $$
DECLARE
  user_tenant_id uuid;
  user_role text;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  SELECT tenant_id, role INTO user_tenant_id, user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role = 'tenant_admin', false)
    AND user_tenant_id IS NOT NULL 
    AND target_tenant_id IS NOT NULL
    AND user_tenant_id = target_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_tenant_admin_create_user_with_tenant(uuid) TO authenticated, anon;

-- Alternative: Function that checks tenant admin can create user (no parameters, uses current context)
-- This might work better with RLS policies
CREATE OR REPLACE FUNCTION tenant_admin_can_create_user()
RETURNS boolean AS $$
DECLARE
  user_tenant_id uuid;
  user_role text;
  new_user_tenant_id uuid;
BEGIN
  -- Get current user's info (bypasses RLS)
  SELECT tenant_id, role INTO user_tenant_id, user_role
  FROM public.users
  WHERE id = auth.uid();
  
  -- Check if user is tenant_admin
  IF user_role != 'tenant_admin' OR user_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- For INSERT operations, we need to get the tenant_id from the new row
  -- Since we can't access NEW directly here, this function won't work alone
  -- We'll use the parameter version instead
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION tenant_admin_can_create_user() TO authenticated, anon;

-- Function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin_bypassing_rls()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin_bypassing_rls() TO authenticated, anon;

-- ============================================================================
-- STEP 2: Drop ALL existing INSERT policies to avoid conflicts
-- ============================================================================

DROP POLICY IF EXISTS "Tenant admins can create tenant users" ON users;
DROP POLICY IF EXISTS "Tenant admins can insert tenant users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Only admins can insert users" ON users;

-- ============================================================================
-- STEP 3: Create comprehensive INSERT policy for users table
-- ============================================================================

-- Single policy that allows both admins and tenant admins to insert users
-- Simplest approach: direct column reference in WITH CHECK clause
CREATE POLICY "Admins and tenant admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admins can insert any user
    is_admin_bypassing_rls()
    OR
    -- Tenant admins can insert users with matching tenant_id
    -- Direct reference to tenant_id column (PostgreSQL resolves to NEW.tenant_id in INSERT)
    (
      is_tenant_admin_bypassing_rls()
      AND tenant_id IS NOT NULL
      AND tenant_id = get_user_tenant_id_bypassing_rls()
    )
  );

-- ============================================================================
-- VERIFICATION: Check if policies were created correctly
-- ============================================================================

-- Run this to verify:
-- SELECT policyname, cmd, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'users' AND cmd = 'INSERT';

