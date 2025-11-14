/*
  # Fix Categories RLS Policies

  1. Changes
    - Update "Anyone can read active categories" to allow reading ALL categories (not just active ones)
    - Add separate INSERT policy for admins
    - Add separate UPDATE policy for admins
    - Add separate DELETE policy for admins
    - Remove the broad "ALL" policy

  2. Security
    - Still requires admin role for modifications
    - Allows authenticated users to read all categories for the config screen
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DROP POLICY IF EXISTS "Anyone can read active categories" ON categories;

-- Allow all authenticated users to read categories
CREATE POLICY "Authenticated users can read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert categories
CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

-- Admins can update categories
CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

-- Admins can delete categories
CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );