/*
  ============================================================================
  EXECUTOR PROFILES RLS SETUP - STEP BY STEP GUIDE
  ============================================================================
  
  This script links the executor_profiles table with proper RLS policies
  to allow tenant admins to manage executors in their tenant.
  
  IMPORTANT: Execute each step in order. If any step fails, fix the issue
  before proceeding to the next step.
  
  ============================================================================
  STEP 1: Create Helper Functions
  ============================================================================
  These functions use SECURITY DEFINER to bypass RLS when checking permissions.
  This avoids circular dependency issues.
*/

-- Step 1.1: Function to check if tenant admin can access an executor profile
CREATE OR REPLACE FUNCTION can_tenant_admin_access_executor_profile(profile_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 
      FROM executor_profiles ep
      JOIN users u ON u.id::text = auth.uid()::text
      WHERE ep.id = profile_id
        AND u.role = 'tenant_admin'
        AND ep.tenant_id = u.tenant_id
        AND u.tenant_id IS NOT NULL
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 1.2: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION can_tenant_admin_access_executor_profile(uuid) TO authenticated, anon;

-- Step 1.3: Function to check if tenant admin can create executor profile
-- This function checks if the current user is a tenant_admin with matching tenant_id
CREATE OR REPLACE FUNCTION can_tenant_admin_create_executor_profile(target_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  IF target_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN (
    SELECT EXISTS (
      SELECT 1 
      FROM users
      WHERE id::text = auth.uid()::text
        AND role = 'tenant_admin'
        AND tenant_id IS NOT NULL
        AND tenant_id = target_tenant_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 1.4: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION can_tenant_admin_create_executor_profile(uuid) TO authenticated, anon;

/*
  ============================================================================
  STEP 2: Enable RLS on executor_profiles Table
  ============================================================================
  Make sure RLS is enabled on the table before creating policies.
*/

-- Step 2.1: Check if table exists and enable RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'executor_profiles'
  ) THEN
    ALTER TABLE executor_profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on executor_profiles table';
  ELSE
    RAISE EXCEPTION 'executor_profiles table does not exist! Please create it first.';
  END IF;
END $$;

/*
  ============================================================================
  STEP 3: Drop Existing Policies
  ============================================================================
  Remove any existing policies to start with a clean slate.
  This prevents conflicts with previous migrations.
*/

-- Step 3.1: Drop tenant admin policies
DROP POLICY IF EXISTS "Tenant admins can manage tenant executors" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can read tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can create tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can update tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can delete tenant executor profiles" ON executor_profiles;

-- Step 3.2: Drop admin policies
DROP POLICY IF EXISTS "Admins can read all executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Admins can manage executor profiles" ON executor_profiles;

/*
  ============================================================================
  STEP 4: Create Admin Policies
  ============================================================================
  Super admins (role='admin') can read and manage all executor profiles.
*/

-- Step 4.1: Admins can read all executor profiles
CREATE POLICY "Admins can read all executor profiles"
  ON executor_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Step 4.2: Admins can manage all executor profiles (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage executor profiles"
  ON executor_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

/*
  ============================================================================
  STEP 5: Create Tenant Admin Policies
  ============================================================================
  Tenant admins can only manage executor profiles in their own tenant.
*/

-- Step 5.1: Tenant admins can READ executor profiles in their tenant
CREATE POLICY "Tenant admins can read tenant executor profiles"
  ON executor_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND executor_profiles.tenant_id = u.tenant_id
      AND u.tenant_id IS NOT NULL
    )
  );

-- Step 5.2: Tenant admins can CREATE executor profiles in their tenant
-- Using function-based approach to avoid NEW keyword parsing issues
CREATE POLICY "Tenant admins can create tenant executor profiles"
  ON executor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    can_tenant_admin_create_executor_profile(tenant_id)
  );

-- Step 5.3: Tenant admins can UPDATE executor profiles in their tenant
-- USING clause checks existing row, WITH CHECK validates the updated values
CREATE POLICY "Tenant admins can update tenant executor profiles"
  ON executor_profiles FOR UPDATE
  TO authenticated
  USING (
    -- Check if current user is tenant_admin and profile belongs to their tenant
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND executor_profiles.tenant_id = u.tenant_id
      AND u.tenant_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Validate that the updated tenant_id still matches their tenant
    -- Using function-based approach to avoid NEW keyword parsing issues
    can_tenant_admin_create_executor_profile(tenant_id)
  );

-- Step 5.4: Tenant admins can DELETE executor profiles in their tenant
CREATE POLICY "Tenant admins can delete tenant executor profiles"
  ON executor_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND executor_profiles.tenant_id = u.tenant_id
      AND u.tenant_id IS NOT NULL
    )
  );

/*
  ============================================================================
  VERIFICATION: Check if everything is set up correctly
  ============================================================================
  Run these queries to verify the setup:
  
  -- Check if RLS is enabled
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE tablename = 'executor_profiles';
  
  -- List all policies on executor_profiles
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies 
  WHERE tablename = 'executor_profiles';
  
  -- Check helper functions exist
  SELECT proname 
  FROM pg_proc 
  WHERE proname IN (
    'can_tenant_admin_access_executor_profile',
    'can_tenant_admin_create_executor_profile'
  );
*/

