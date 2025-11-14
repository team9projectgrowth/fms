/*
  # Create Default Admin User

  1. Changes
    - Insert a user record for the currently authenticated user with admin privileges
    - This allows the logged-in user to manage categories and other admin functions

  2. Security
    - Only creates the user if they don't already exist
    - Links to the auth.uid() of the current session
*/

-- Insert the current authenticated user as an admin
INSERT INTO users (id, email, user_type, name, active)
SELECT 
  auth.uid(),
  'admin@system.local',
  'admin',
  'System Admin',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE id = auth.uid()
)
AND auth.uid() IS NOT NULL;