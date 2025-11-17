-- Drop all existing policies and recreate them properly
DROP POLICY IF EXISTS "Allow anonymous tenant registration" ON tenants;
DROP POLICY IF EXISTS "Allow anonymous to read tenants" ON tenants;

-- Recreate INSERT policy - this allows anonymous and authenticated users to insert
CREATE POLICY "Allow anonymous tenant registration"
  ON tenants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Recreate SELECT policy for reading after insert
CREATE POLICY "Allow anonymous to read tenants"
  ON tenants
  FOR SELECT  
  TO anon, authenticated
  USING (true);;
