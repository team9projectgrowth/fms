/*
  # Create Tenants Table for Facility Management System

  1. New Tables
    - `tenants`
      - `id` (uuid, primary key)
      - `name` (text, required) - Company/Organization name
      - `email` (text, required, unique) - Contact email
      - `phone` (text) - Contact phone number
      - `address` (text) - Full address
      - `city` (text) - City
      - `state` (text) - State/Province
      - `country` (text) - Country
      - `postal_code` (text) - Postal/ZIP code
      - `contact_person` (text) - Name of primary contact person
      - `subscription_status` (text, default 'trial') - 'trial', 'active', 'inactive', 'expired'
      - `subscription_start_date` (date)
      - `subscription_end_date` (date)
      - `max_users` (integer, default 10) - Maximum number of users allowed
      - `active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on tenants table
    - Add policies for authenticated users
    - Admins can read/write all tenants
    - Tenants can read their own data
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  contact_person text,
  subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'inactive', 'expired')),
  subscription_start_date date,
  subscription_end_date date,
  max_users integer DEFAULT 10,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add tenant_id to users table to associate users with tenants
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

-- Add tenant_id to tickets table to associate tickets with tenants
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON tickets(tenant_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants table
-- Admins can read all tenants
CREATE POLICY "Admins can read all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

-- Anyone can create a tenant (for registration) - allows anonymous registration
CREATE POLICY "Anyone can create tenants"
  ON tenants FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can read their own tenant
CREATE POLICY "Users can read own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.tenant_id = tenants.id
    )
  );

-- Admins can update all tenants
CREATE POLICY "Admins can update all tenants"
  ON tenants FOR UPDATE
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

-- Admins can delete tenants
CREATE POLICY "Admins can delete tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

