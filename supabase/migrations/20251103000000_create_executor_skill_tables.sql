-- Create executor_skill table (master table for skills)
CREATE TABLE IF NOT EXISTS executor_skill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop existing executor_skills table if it exists (will recreate with new schema)
DROP TABLE IF EXISTS executor_skills CASCADE;

-- Create executor_skills junction table (links executors to skills)
CREATE TABLE executor_skills (
  executor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  executor_skill_id uuid NOT NULL REFERENCES executor_skill(id) ON DELETE CASCADE,
  PRIMARY KEY (executor_user_id, executor_skill_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_executor_skill_tenant_id ON executor_skill(tenant_id);
CREATE INDEX IF NOT EXISTS idx_executor_skill_category ON executor_skill(category);
CREATE INDEX IF NOT EXISTS idx_executor_skill_is_active ON executor_skill(is_active);
CREATE INDEX IF NOT EXISTS idx_executor_skills_user_id ON executor_skills(executor_user_id);
CREATE INDEX IF NOT EXISTS idx_executor_skills_skill_id ON executor_skills(executor_skill_id);

-- Enable RLS on both tables
ALTER TABLE executor_skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE executor_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for executor_skill table
-- Allow tenant admins to manage skills for their tenant
CREATE POLICY "Tenant admins can manage their own tenant skills"
  ON executor_skill
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'tenant_admin'
      AND users.tenant_id = executor_skill.tenant_id
    )
  );

-- Allow super admin to manage all skills
CREATE POLICY "Super admin can manage all skills"
  ON executor_skill
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.tenant_id IS NULL
    )
  );

-- Allow users to read skills for their tenant
CREATE POLICY "Users can read skills for their tenant"
  ON executor_skill
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id = executor_skill.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.tenant_id IS NULL
    )
  );

-- RLS Policies for executor_skills junction table
-- Allow tenant admins to manage skill assignments for their tenant
CREATE POLICY "Tenant admins can manage skill assignments for their tenant"
  ON executor_skills
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u2.id = executor_skills.executor_user_id
      WHERE u1.id = auth.uid()
      AND u1.role = 'tenant_admin'
      AND u1.tenant_id = u2.tenant_id
    )
  );

-- Allow super admin to manage all skill assignments
CREATE POLICY "Super admin can manage all skill assignments"
  ON executor_skills
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.tenant_id IS NULL
    )
  );

-- Allow users to read skill assignments for their tenant
CREATE POLICY "Users can read skill assignments for their tenant"
  ON executor_skills
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u2.id = executor_skills.executor_user_id
      WHERE u1.id = auth.uid()
      AND u1.tenant_id = u2.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.tenant_id IS NULL
    )
  );

