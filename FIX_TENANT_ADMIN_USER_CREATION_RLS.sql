/*
  # Fix Tenant Admin User Creation RLS Policy
  
  Fixes circular dependency issue when tenant admins try to create users.
  Uses SECURITY DEFINER function to bypass RLS when checking tenant_admin permissions.
*/

-- Helper function to get tenant_id of current user, bypassing RLS
CREATE OR REPLACE FUNCTION get_user_tenant_id_bypassing_rls()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id
    FROM public.users -- Explicitly use public.users to bypass RLS
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_tenant_id_bypassing_rls() TO authenticated, anon;

-- Helper function to check if current user is tenant_admin, bypassing RLS
CREATE OR REPLACE FUNCTION is_tenant_admin_bypassing_rls()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1
      FROM public.users -- Explicitly use public.users to bypass RLS
      WHERE id = auth.uid()
      AND role = 'tenant_admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_tenant_admin_bypassing_rls() TO authenticated, anon;

-- Drop existing tenant admin user creation policy
DROP POLICY IF EXISTS "Tenant admins can create tenant users" ON users;

-- Create new policy using SECURITY DEFINER function to avoid circular dependency
CREATE POLICY "Tenant admins can create tenant users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if current user is tenant_admin and tenant_id matches
    (
      is_tenant_admin_bypassing_rls() 
      AND NEW.tenant_id IS NOT NULL 
      AND NEW.tenant_id = get_user_tenant_id_bypassing_rls()
    )
    OR
    -- Also allow admins (existing behavior)
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

