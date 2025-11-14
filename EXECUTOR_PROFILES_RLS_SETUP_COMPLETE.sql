/*
  ============================================================================
  COMPLETE EXECUTOR PROFILES RLS SETUP
  ============================================================================
  
  This is the complete script to set up RLS policies for executor_profiles table.
  Execute this entire script at once, or use the step-by-step version if you
  prefer to execute it section by section.
  
  Prerequisites:
  - executor_profiles table must exist
  - Table must have: id, executor_id, tenant_id columns
  - users table must have: id, role, tenant_id columns
*/

-- ============================================================================
-- STEP 1: Create Helper Functions
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION can_tenant_admin_access_executor_profile(uuid) TO authenticated, anon;

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

GRANT EXECUTE ON FUNCTION can_tenant_admin_create_executor_profile(uuid) TO authenticated, anon;

-- ============================================================================
-- STEP 2: Enable RLS on executor_profiles Table
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'executor_profiles'
  ) THEN
    ALTER TABLE executor_profiles ENABLE ROW LEVEL SECURITY;
  ELSE
    RAISE EXCEPTION 'executor_profiles table does not exist!';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Drop Existing Policies
-- ============================================================================

DROP POLICY IF EXISTS "Tenant admins can manage tenant executors" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can read tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can create tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can update tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can delete tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Admins can read all executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Admins can manage executor profiles" ON executor_profiles;

-- ============================================================================
-- STEP 4: Create Admin Policies
-- ============================================================================

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

-- ============================================================================
-- STEP 5: Create Tenant Admin Policies
-- ============================================================================

-- Tenant admins can READ executor profiles in their tenant
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

-- Tenant admins can CREATE executor profiles in their tenant
CREATE POLICY "Tenant admins can create tenant executor profiles"
  ON executor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    can_tenant_admin_create_executor_profile(tenant_id)
  );

-- Tenant admins can UPDATE executor profiles in their tenant
CREATE POLICY "Tenant admins can update tenant executor profiles"
  ON executor_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND executor_profiles.tenant_id = u.tenant_id
      AND u.tenant_id IS NOT NULL
    )
  )
  WITH CHECK (
    can_tenant_admin_create_executor_profile(tenant_id)
  );

-- Tenant admins can DELETE executor profiles in their tenant
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

