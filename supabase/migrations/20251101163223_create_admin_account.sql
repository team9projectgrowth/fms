/*
  # Create Default Admin Account

  1. Purpose
    - Creates a default admin user in the users table
    - This allows initial access to the system

  2. Default Credentials
    - Email: admin@facility.com
    - User Type: admin
    - Name: System Administrator

  3. Important Notes
    - You must create the corresponding auth user through Supabase Dashboard or signUp
    - The password must be set separately through Supabase Auth
    - This migration creates a placeholder UUID that should be updated when the real auth user is created
*/

-- Create a function to generate a consistent UUID for the admin user
CREATE OR REPLACE FUNCTION get_or_create_admin_id() RETURNS uuid AS $$
DECLARE
  admin_uuid uuid;
BEGIN
  -- Try to find existing admin user
  SELECT id INTO admin_uuid FROM users WHERE email = 'admin@facility.com' LIMIT 1;
  
  -- If not found, generate a new UUID
  IF admin_uuid IS NULL THEN
    admin_uuid := gen_random_uuid();
  END IF;
  
  RETURN admin_uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert or update the admin user
INSERT INTO users (id, email, user_type, name, active)
VALUES (
  get_or_create_admin_id(),
  'admin@facility.com',
  'admin',
  'System Administrator',
  true
)
ON CONFLICT (email) DO UPDATE SET
  user_type = 'admin',
  active = true,
  updated_at = now();

-- Clean up the function
DROP FUNCTION IF EXISTS get_or_create_admin_id();