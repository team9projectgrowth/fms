/*
  # Create Password Verification Function

  1. Functions
    - `verify_user_password` - Verifies user credentials and returns user data if valid
      - Takes email and password as parameters
      - Uses crypt extension for password verification
      - Returns user data (excluding password_hash) if credentials are valid
      - Returns empty array if credentials are invalid

  2. Security
    - Function is SECURITY DEFINER to bypass RLS for authentication
    - Only returns non-sensitive user data
    - Password hash is never returned to client
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to verify user password
CREATE OR REPLACE FUNCTION verify_user_password(
  user_email text,
  user_password text
)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.role
  FROM users u
  WHERE u.email = user_email
    AND u.password_hash = crypt(user_password, u.password_hash);
END;
$$;