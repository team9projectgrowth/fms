-- Add tenant_admin role support
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
GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO authenticated, anon;;
