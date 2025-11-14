/*
  # Link Executor Profiles Table and Update RLS Policies
  
  Updates RLS policies for executor_profiles table to properly support tenant admins.
  Uses SECURITY DEFINER helper functions to avoid circular RLS dependencies.
  
  Assumes executor_profiles table already exists with:
  - id (uuid, primary key)
  - executor_id (uuid, foreign key to executors)
  - tenant_id (uuid, foreign key to tenants)
  - other profile fields
*/

-- Helper function to check if an executor_profile belongs to the tenant admin's tenant
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

-- Helper function to check if tenant admin can create executor profile for given tenant_id
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

-- Ensure executor_profiles table exists and has RLS enabled
-- Note: Using IF EXISTS check - if table doesn't exist, this will fail gracefully
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'executor_profiles'
  ) THEN
    ALTER TABLE executor_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop ALL existing policies on executor_profiles to ensure clean state
-- This handles any policies created by previous migrations
DROP POLICY IF EXISTS "Tenant admins can manage tenant executors" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can read tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can create tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can update tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Tenant admins can delete tenant executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Admins can read all executor profiles" ON executor_profiles;
DROP POLICY IF EXISTS "Admins can manage executor profiles" ON executor_profiles;

-- Admins can read all executor profiles
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

-- Admins can manage all executor profiles
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

-- Tenant admins can read executor profiles in their tenant
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

-- Tenant admins can create executor profiles in their tenant
-- Using function-based approach to avoid NEW keyword issues
CREATE POLICY "Tenant admins can create tenant executor profiles"
  ON executor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    can_tenant_admin_create_executor_profile(tenant_id)
  );

-- Tenant admins can update executor profiles in their tenant
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
    -- Using function-based approach to avoid NEW keyword issues
    can_tenant_admin_create_executor_profile(tenant_id)
  );

-- Tenant admins can delete executor profiles in their tenant
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

