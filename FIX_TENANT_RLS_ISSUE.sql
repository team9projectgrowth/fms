/*
  # Fix Tenant RLS Policy Issue
  
  The issue is that RLS policies on tenants table need to check users table,
  but RLS policies might prevent this check from working properly.
  
  Solution: Use SECURITY DEFINER functions to bypass RLS when checking user role/tenant_id
*/

-- Create helper function to check if current user is tenant admin with specific tenant_id
CREATE OR REPLACE FUNCTION is_tenant_admin_for_tenant(tenant_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM users
      WHERE id::text = auth.uid()::text
      AND role = 'tenant_admin'
      AND tenant_id = tenant_uuid
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_tenant_admin_for_tenant(uuid) TO authenticated, anon;

-- Drop and recreate tenant SELECT policy using the helper function
DROP POLICY IF EXISTS "Tenant admins can read own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can read own tenant" ON tenants;

-- Combined policy: users can read their own tenant (any role) OR tenant admins can read their tenant
CREATE POLICY "Users and tenant admins can read own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    -- User can read if their tenant_id matches (works for any role)
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.tenant_id = tenants.id
    )
    OR
    -- Or use the SECURITY DEFINER function
    is_tenant_admin_for_tenant(tenants.id)
  );

-- Also ensure tenant admins can update using the helper function
DROP POLICY IF EXISTS "Tenant admins can update own tenant" ON tenants;

CREATE POLICY "Tenant admins can update own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (is_tenant_admin_for_tenant(tenants.id))
  WITH CHECK (is_tenant_admin_for_tenant(tenants.id));

