-- Drop existing INSERT policies that might be blocking registration
DROP POLICY IF EXISTS "Anyone can create tenants" ON tenants;

-- Create a policy that allows anonymous users to insert tenants (for registration)
CREATE POLICY "Allow anonymous tenant registration"
  ON tenants FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also ensure authenticated users can insert if needed
-- This allows anyone (including anonymous/unauthenticated users) to register a tenant;
