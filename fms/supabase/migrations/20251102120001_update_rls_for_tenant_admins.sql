/*
  # Update RLS Policies for Tenant Admin Support

  1. Helper Function
    - `get_user_tenant_id()` - Returns the tenant_id of the currently authenticated user

  2. RLS Policy Updates
    - Add policies for tenant_admin role to manage their own tenant's data
    - Ensure tenant admins can only access data within their tenant
    - System admins (no tenant_id) retain global access

  3. Tables Updated
    - tenants
    - users
    - tickets
    - categories
    - priorities
    - executor_profiles
    - sla_configurations
    - allocation_rules
    - Other tenant-scoped tables
*/

-- Create helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM users 
    WHERE id::text = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO authenticated, anon;

-- ============================================================================
-- TENANTS TABLE POLICIES
-- ============================================================================

-- Drop existing tenant update policy if it exists
DROP POLICY IF EXISTS "Tenant admins can update own tenant" ON tenants;

-- Tenant admins can update their own tenant
CREATE POLICY "Tenant admins can update own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'tenant_admin'
      AND users.tenant_id = tenants.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'tenant_admin'
      AND users.tenant_id = tenants.id
    )
  );

-- Tenant admins can read their own tenant
DROP POLICY IF EXISTS "Tenant admins can read own tenant" ON tenants;

CREATE POLICY "Tenant admins can read own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'tenant_admin'
      AND users.tenant_id = tenants.id
    )
  );

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Tenant admins can read users within their tenant
DROP POLICY IF EXISTS "Tenant admins can read tenant users" ON users;

CREATE POLICY "Tenant admins can read tenant users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND users.tenant_id = u.tenant_id
    )
  );

-- Tenant admins can insert users within their tenant
DROP POLICY IF EXISTS "Tenant admins can create tenant users" ON users;

CREATE POLICY "Tenant admins can create tenant users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND NEW.tenant_id = u.tenant_id
    )
  );

-- Tenant admins can update users within their tenant
DROP POLICY IF EXISTS "Tenant admins can update tenant users" ON users;

CREATE POLICY "Tenant admins can update tenant users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND users.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND NEW.tenant_id = u.tenant_id
    )
  );

-- ============================================================================
-- TICKETS TABLE POLICIES
-- ============================================================================

-- Tenant admins can read tickets within their tenant
DROP POLICY IF EXISTS "Tenant admins can read tenant tickets" ON tickets;

CREATE POLICY "Tenant admins can read tenant tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND tickets.tenant_id = u.tenant_id
    )
  );

-- Tenant admins can update tickets within their tenant
DROP POLICY IF EXISTS "Tenant admins can update tenant tickets" ON tickets;

CREATE POLICY "Tenant admins can update tenant tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND tickets.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND NEW.tenant_id = u.tenant_id
    )
  );

-- Tenant admins can insert tickets within their tenant
DROP POLICY IF EXISTS "Tenant admins can create tenant tickets" ON tickets;

CREATE POLICY "Tenant admins can create tenant tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND NEW.tenant_id = u.tenant_id
    )
  );

-- ============================================================================
-- CATEGORIES TABLE POLICIES
-- ============================================================================

-- Tenant admins can manage categories within their tenant
DROP POLICY IF EXISTS "Tenant admins can manage tenant categories" ON categories;

CREATE POLICY "Tenant admins can manage tenant categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND categories.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND NEW.tenant_id = u.tenant_id
    )
  );

-- ============================================================================
-- PRIORITIES TABLE POLICIES
-- ============================================================================

-- Tenant admins can manage priorities within their tenant
DROP POLICY IF EXISTS "Tenant admins can manage tenant priorities" ON priorities;

CREATE POLICY "Tenant admins can manage tenant priorities"
  ON priorities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND priorities.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND NEW.tenant_id = u.tenant_id
    )
  );

-- ============================================================================
-- EXECUTOR_PROFILES TABLE POLICIES
-- ============================================================================

-- Tenant admins can manage executor profiles within their tenant
DROP POLICY IF EXISTS "Tenant admins can manage tenant executors" ON executor_profiles;

CREATE POLICY "Tenant admins can manage tenant executors"
  ON executor_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND executor_profiles.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND NEW.tenant_id = u.tenant_id
    )
  );

-- ============================================================================
-- SLA_CONFIGURATIONS TABLE POLICIES
-- ============================================================================

-- Tenant admins can manage SLA configurations within their tenant
DROP POLICY IF EXISTS "Tenant admins can manage tenant SLA configs" ON sla_configurations;

CREATE POLICY "Tenant admins can manage tenant SLA configs"
  ON sla_configurations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND sla_configurations.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND NEW.tenant_id = u.tenant_id
    )
  );

-- ============================================================================
-- ALLOCATION_RULES TABLE POLICIES
-- ============================================================================

-- Tenant admins can manage allocation rules within their tenant
DROP POLICY IF EXISTS "Tenant admins can manage tenant allocation rules" ON allocation_rules;

CREATE POLICY "Tenant admins can manage tenant allocation rules"
  ON allocation_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND allocation_rules.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND NEW.tenant_id = u.tenant_id
    )
  );

