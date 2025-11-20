/*
  # Tighten tenant notification policies

  - Ensure tenant admins can only read/update their own notifications
  - Allow platform admins to read/update notifications for troubleshooting
*/

-- Drop existing policies
DROP POLICY IF EXISTS "tenant_admins_can_read_notifications" ON tenant_notifications;
DROP POLICY IF EXISTS "tenant_admins_can_update_notifications" ON tenant_notifications;
DROP POLICY IF EXISTS "service_role_can_insert_notifications" ON tenant_notifications;

-- Recreate tenant admin policies with stricter checks
CREATE POLICY "tenant_admins_can_read_notifications"
  ON tenant_notifications
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_notifications.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'tenant_admin'
        AND u.tenant_id = tenant_notifications.tenant_id
    )
  );

CREATE POLICY "tenant_admins_can_update_notifications"
  ON tenant_notifications
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND tenant_notifications.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'tenant_admin'
        AND u.tenant_id = tenant_notifications.tenant_id
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_notifications.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'tenant_admin'
        AND u.tenant_id = tenant_notifications.tenant_id
    )
  );

-- Allow platform admins to read/update all notifications
CREATE POLICY "admins_can_read_notifications"
  ON tenant_notifications
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  );

CREATE POLICY "admins_can_update_notifications"
  ON tenant_notifications
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  );

-- Recreate service role insert policy
CREATE POLICY "service_role_can_insert_notifications"
  ON tenant_notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

