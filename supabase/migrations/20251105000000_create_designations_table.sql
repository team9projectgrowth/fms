/*
  # Create Designations Table for Tenant-Level Configuration

  1. New Tables
    - `designations`
      - `id` (uuid, primary key)
      - `name` (text, required) - Designation name
      - `description` (text) - Optional description
      - `tenant_id` (uuid, foreign key to tenants) - Tenant-level configuration
      - `active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Schema Changes
    - Add `designation_id` column to `users` table
    - Foreign key reference to designations table

  3. Security
    - Enable RLS on designations table
    - Add policies for tenant admins to manage their own tenant's designations
    - Users can read designations for their tenant
*/

-- Create designations table
CREATE TABLE IF NOT EXISTS designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_designation_per_tenant UNIQUE (name, tenant_id)
);

-- Add designation_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS designation_id uuid REFERENCES designations(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_designations_tenant_id ON designations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_designations_active ON designations(active);
CREATE INDEX IF NOT EXISTS idx_users_designation_id ON users(designation_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_designations_updated_at ON designations;
CREATE TRIGGER update_designations_updated_at
  BEFORE UPDATE ON designations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for designations table

-- Anyone authenticated can read active designations for their tenant
CREATE POLICY "Users can read active designations for their tenant"
  ON designations FOR SELECT
  TO authenticated
  USING (
    active = true
    AND (
      tenant_id IS NULL
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id::text = auth.uid()::text
        AND users.tenant_id = designations.tenant_id
      )
    )
  );

-- Tenant admins can read all designations for their tenant
CREATE POLICY "Tenant admins can read all tenant designations"
  ON designations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND designations.tenant_id = u.tenant_id
    )
  );

-- System admins can read all designations
CREATE POLICY "System admins can read all designations"
  ON designations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- Tenant admins can insert designations within their tenant  
CREATE POLICY "Tenant admins can insert tenant designations"
  ON designations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'tenant_admin'
    )
  );

-- Tenant admins can update designations within their tenant
CREATE POLICY "Tenant admins can update tenant designations"
  ON designations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND designations.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'tenant_admin'
    )
  );

-- Tenant admins can delete designations within their tenant
CREATE POLICY "Tenant admins can delete tenant designations"
  ON designations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND designations.tenant_id = u.tenant_id
    )
  );

-- System admins can insert all designations
CREATE POLICY "System admins can insert all designations"
  ON designations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- System admins can update all designations
CREATE POLICY "System admins can update all designations"
  ON designations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- System admins can delete all designations
CREATE POLICY "System admins can delete all designations"
  ON designations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

