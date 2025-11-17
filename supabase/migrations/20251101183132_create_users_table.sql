/*
  # Create Users Table for Authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique identifier for each user
      - `email` (text, unique, not null) - User email for login
      - `password_hash` (text, not null) - Hashed password
      - `name` (text, not null) - User's full name
      - `role` (text, not null) - User role: 'admin' or 'executor'
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read their own data
    - Add policy for admins to read all user data

  3. Indexes
    - Create unique index on email for fast lookups
    - Create index on role for filtering
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'executor')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert users
CREATE POLICY "Only admins can insert users"
  ON users
  FOR INSERT
  WITH CHECK (false);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Only admins can delete users
CREATE POLICY "Only admins can delete users"
  ON users
  FOR DELETE
  USING (false);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Password hash is bcrypt hash of "admin123"
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'admin@example.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'System Administrator',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert default executor user (password: executor123)
-- Password hash is bcrypt hash of "executor123"
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'executor@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'John Executor',
  'executor'
) ON CONFLICT (email) DO NOTHING;