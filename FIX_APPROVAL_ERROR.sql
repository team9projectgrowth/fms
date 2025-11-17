/*
  # Fix Approval Error - RLS Policy Update
  
  This fixes the "Cannot coerce the result to a single JSON object" error
  by updating RLS policies to use 'role' instead of 'user_type'
*/

-- Drop old policies that reference user_type
DROP POLICY IF EXISTS "Admins can read all tenants" ON tenants;
DROP POLICY IF EXISTS "Admins can update all tenants" ON tenants;
DROP POLICY IF EXISTS "Admins can delete tenants" ON tenants;

-- Recreate with role column
CREATE POLICY "Admins can read all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all tenants"
  ON tenants FOR UPDATE
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

CREATE POLICY "Admins can delete tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

