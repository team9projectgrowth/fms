-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous tenant registration" ON tenants;
DROP POLICY IF EXISTS "Allow anonymous to read own tenant" ON tenants;

-- Create INSERT policy for anonymous tenant registration
CREATE POLICY "Allow anonymous tenant registration"
  ON tenants FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create SELECT policy for anonymous users (to read after insert)
CREATE POLICY "Allow anonymous to read tenants"
  ON tenants FOR SELECT
  TO anon, authenticated
  USING (true);;
