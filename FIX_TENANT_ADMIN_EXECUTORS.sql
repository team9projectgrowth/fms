/*
  # Fix Tenant Admin Executor Creation
  
  Adds RLS policies to allow tenant admins to create and manage executors
  within their tenant. Since executors table doesn't have tenant_id directly,
  we check through the users table join.
*/

-- Helper function to check if a user belongs to the same tenant as the current tenant_admin
CREATE OR REPLACE FUNCTION is_user_in_same_tenant(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 
      FROM users u1
      JOIN users u2 ON u1.tenant_id = u2.tenant_id
      WHERE u1.id::text = auth.uid()::text
        AND u1.role = 'tenant_admin'
        AND u2.id = user_uuid
        AND u1.tenant_id IS NOT NULL
        AND u2.tenant_id IS NOT NULL
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_user_in_same_tenant(uuid) TO authenticated, anon;

-- Drop existing executor policies that might conflict
DROP POLICY IF EXISTS "Tenant admins can read tenant executors" ON executors;
DROP POLICY IF EXISTS "Tenant admins can create tenant executors" ON executors;
DROP POLICY IF EXISTS "Tenant admins can update tenant executors" ON executors;
DROP POLICY IF EXISTS "Tenant admins can delete tenant executors" ON executors;

-- Tenant admins can read executors where the executor's user is in their tenant
CREATE POLICY "Tenant admins can read tenant executors"
  ON executors FOR SELECT
  TO authenticated
  USING (
    -- Allow if executor's user belongs to same tenant as current tenant_admin
    is_user_in_same_tenant(user_id)
    OR
    -- Also allow admins (existing policy)
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
    OR
    -- Allow executor to read their own data (existing policy)
    user_id::text = auth.uid()::text
  );

-- Tenant admins can create executors for users in their tenant
CREATE POLICY "Tenant admins can create tenant executors"
  ON executors FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if executor's user belongs to same tenant as current tenant_admin
    is_user_in_same_tenant(NEW.user_id)
    OR
    -- Also allow admins (existing policy)
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Tenant admins can update executors for users in their tenant
CREATE POLICY "Tenant admins can update tenant executors"
  ON executors FOR UPDATE
  TO authenticated
  USING (
    -- Allow if executor's user belongs to same tenant as current tenant_admin
    is_user_in_same_tenant(user_id)
    OR
    -- Also allow admins (existing policy)
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
    OR
    -- Allow executor to update their own data
    user_id::text = auth.uid()::text
  )
  WITH CHECK (
    -- Same check for WITH CHECK
    is_user_in_same_tenant(user_id)
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
    OR
    user_id::text = auth.uid()::text
  );

-- Tenant admins can delete executors for users in their tenant
CREATE POLICY "Tenant admins can delete tenant executors"
  ON executors FOR DELETE
  TO authenticated
  USING (
    -- Allow if executor's user belongs to same tenant as current tenant_admin
    is_user_in_same_tenant(user_id)
    OR
    -- Also allow admins (existing policy)
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

