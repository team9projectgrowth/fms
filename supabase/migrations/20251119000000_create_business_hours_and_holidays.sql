/*
  # Create Business Hours and Holidays Tables for Tenant-Level Configuration

  1. New Tables
    - `business_hours`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants) - Tenant-level configuration
      - `day_of_week` (text, required) - Monday, Tuesday, etc.
      - `is_working_day` (boolean, default false)
      - `start_time` (time) - Start time for working day
      - `end_time` (time) - End time for working day
      - `timezone` (text, default 'UTC+05:30 (IST)') - Timezone for business hours
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `holidays`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants) - Tenant-level configuration
      - `date` (date, required) - Holiday date
      - `name` (text, required) - Holiday name
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for tenant admins to manage their own tenant's business hours and holidays
    - Users can read business hours and holidays for their tenant
*/

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create business_hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  is_working_day boolean DEFAULT false,
  start_time time,
  end_time time,
  timezone text DEFAULT 'UTC+05:30 (IST)',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_day_per_tenant UNIQUE (day_of_week, tenant_id)
);

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  date date NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_holiday_per_tenant UNIQUE (date, tenant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_hours_tenant_id ON business_hours(tenant_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_day ON business_hours(day_of_week);
CREATE INDEX IF NOT EXISTS idx_holidays_tenant_id ON holidays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- Create trigger for updated_at on business_hours
DROP TRIGGER IF EXISTS update_business_hours_updated_at ON business_hours;
CREATE TRIGGER update_business_hours_updated_at
  BEFORE UPDATE ON business_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on holidays
DROP TRIGGER IF EXISTS update_holidays_updated_at ON holidays;
CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_hours table

-- Anyone authenticated can read business hours for their tenant
CREATE POLICY "Users can read business hours for their tenant"
  ON business_hours FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.tenant_id = business_hours.tenant_id
    )
  );

-- Tenant admins can read all business hours for their tenant
CREATE POLICY "Tenant admins can read all tenant business hours"
  ON business_hours FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND business_hours.tenant_id = u.tenant_id
    )
  );

-- System admins can read all business hours
CREATE POLICY "System admins can read all business hours"
  ON business_hours FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- Tenant admins can insert business hours within their tenant
CREATE POLICY "Tenant admins can insert tenant business hours"
  ON business_hours FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'tenant_admin'
    )
  );

-- Tenant admins can update business hours within their tenant
CREATE POLICY "Tenant admins can update tenant business hours"
  ON business_hours FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND business_hours.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'tenant_admin'
    )
  );

-- Tenant admins can delete business hours within their tenant
CREATE POLICY "Tenant admins can delete tenant business hours"
  ON business_hours FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND business_hours.tenant_id = u.tenant_id
    )
  );

-- System admins can insert all business hours
CREATE POLICY "System admins can insert all business hours"
  ON business_hours FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- System admins can update all business hours
CREATE POLICY "System admins can update all business hours"
  ON business_hours FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- System admins can delete all business hours
CREATE POLICY "System admins can delete all business hours"
  ON business_hours FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- RLS Policies for holidays table

-- Anyone authenticated can read holidays for their tenant
CREATE POLICY "Users can read holidays for their tenant"
  ON holidays FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.tenant_id = holidays.tenant_id
    )
  );

-- Tenant admins can read all holidays for their tenant
CREATE POLICY "Tenant admins can read all tenant holidays"
  ON holidays FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND holidays.tenant_id = u.tenant_id
    )
  );

-- System admins can read all holidays
CREATE POLICY "System admins can read all holidays"
  ON holidays FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- Tenant admins can insert holidays within their tenant
CREATE POLICY "Tenant admins can insert tenant holidays"
  ON holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'tenant_admin'
    )
  );

-- Tenant admins can update holidays within their tenant
CREATE POLICY "Tenant admins can update tenant holidays"
  ON holidays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND holidays.tenant_id = u.tenant_id
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'tenant_admin'
    )
  );

-- Tenant admins can delete holidays within their tenant
CREATE POLICY "Tenant admins can delete tenant holidays"
  ON holidays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND holidays.tenant_id = u.tenant_id
    )
  );

-- System admins can insert all holidays
CREATE POLICY "System admins can insert all holidays"
  ON holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- System admins can update all holidays
CREATE POLICY "System admins can update all holidays"
  ON holidays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

-- System admins can delete all holidays
CREATE POLICY "System admins can delete all holidays"
  ON holidays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'admin'
      AND u.tenant_id IS NULL
    )
  );

