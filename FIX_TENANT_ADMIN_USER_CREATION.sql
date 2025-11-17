/*
  # Fix Tenant Admin User Creation RLS
  
  Ensures tenant admins can create users using SECURITY DEFINER function
  to avoid circular RLS dependency issues.
*/

-- Helper function to check if current user is tenant_admin and can create users with given tenant_id
CREATE OR REPLACE FUNCTION can_tenant_admin_create_user(target_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 
      FROM users
      WHERE id::text = auth.uid()::text
        AND role = 'tenant_admin'
        AND tenant_id = target_tenant_id
        AND tenant_id IS NOT NULL
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_tenant_admin_create_user(uuid) TO authenticated, anon;

-- Drop and recreate tenant admin user creation policy using the helper function
DROP POLICY IF EXISTS "Tenant admins can create tenant users" ON users;

CREATE POLICY "Tenant admins can create tenant users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if using the SECURITY DEFINER helper function
    (NEW.tenant_id IS NOT NULL AND can_tenant_admin_create_user(NEW.tenant_id))
    OR
    -- Also allow admins (existing behavior)
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

