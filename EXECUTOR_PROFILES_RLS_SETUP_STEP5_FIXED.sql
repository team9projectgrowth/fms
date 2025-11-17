/*
  ============================================================================
  STEP 5 ALTERNATIVE - If the NEW keyword is still causing issues
  ============================================================================
  This version uses a different approach that avoids potential NEW keyword issues.
*/

-- Alternative Step 5.2: Tenant admins can CREATE executor profiles
-- Using a simpler WITH CHECK clause
CREATE POLICY "Tenant admins can create tenant executor profiles"
  ON executor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT tenant_id FROM users WHERE id::text = auth.uid()::text AND role = 'tenant_admin') = NEW.tenant_id
    AND NEW.tenant_id IS NOT NULL
    AND (SELECT tenant_id FROM users WHERE id::text = auth.uid()::text AND role = 'tenant_admin') IS NOT NULL
  );

-- Alternative Step 5.3: Tenant admins can UPDATE executor profiles
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
    (SELECT tenant_id FROM users WHERE id::text = auth.uid()::text AND role = 'tenant_admin') = NEW.tenant_id
    AND NEW.tenant_id IS NOT NULL
    AND (SELECT tenant_id FROM users WHERE id::text = auth.uid()::text AND role = 'tenant_admin') IS NOT NULL
  );

