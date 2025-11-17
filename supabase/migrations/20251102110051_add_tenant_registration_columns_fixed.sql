-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add columns to tenants table for registration form
-- These columns complement the existing JSONB structure

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'inactive', 'expired')),
ADD COLUMN IF NOT EXISTS subscription_start_date date,
ADD COLUMN IF NOT EXISTS subscription_end_date date,
ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index on email if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email) WHERE email IS NOT NULL;

-- Create index on subscription_status
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status) WHERE subscription_status IS NOT NULL;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();;
