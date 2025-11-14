-- ============================================================================
-- Migration: Ensure ticket_activities table exists with all required columns
-- ============================================================================
-- This migration ensures that the ticket_activities table exists and has
-- all required columns including activity_type

-- Create ticket_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS ticket_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  tenant_id UUID,
  activity_type TEXT NOT NULL,
  comment TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Ensure all required columns exist
DO $$
BEGIN
  -- Check if action_type column exists (wrong name) and rename it to activity_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ticket_activities' 
    AND column_name = 'action_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ticket_activities' 
    AND column_name = 'activity_type'
  ) THEN
    ALTER TABLE ticket_activities RENAME COLUMN action_type TO activity_type;
  END IF;

  -- Add activity_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ticket_activities' 
    AND column_name = 'activity_type'
  ) THEN
    ALTER TABLE ticket_activities ADD COLUMN activity_type TEXT NOT NULL;
  END IF;

  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ticket_activities' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE ticket_activities ADD COLUMN created_by UUID;
  END IF;

  -- Add comment column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ticket_activities' 
    AND column_name = 'comment'
  ) THEN
    ALTER TABLE ticket_activities ADD COLUMN comment TEXT;
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ticket_activities' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE ticket_activities ADD COLUMN metadata JSONB;
  END IF;

  -- Drop old check constraint if it exists for action_type (wrong name)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_activities_action_type_check'
  ) THEN
    ALTER TABLE ticket_activities DROP CONSTRAINT ticket_activities_action_type_check;
  END IF;

  -- Drop existing check constraint if it exists (to update with new values)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_activities_activity_type_check'
  ) THEN
    ALTER TABLE ticket_activities DROP CONSTRAINT ticket_activities_activity_type_check;
  END IF;

  -- Add check constraint for activity_type with new values
  ALTER TABLE ticket_activities 
  ADD CONSTRAINT ticket_activities_activity_type_check 
  CHECK (activity_type IN ('reassignment', 'priority_change', 'sla_change', 'admin_comment', 'complainant_comment', 'executor_update', 'status_change'));

  -- Ensure activity_type is NOT NULL
  -- First, update any NULL values or old values to a default value
  -- Map old activity types to new ones
  UPDATE ticket_activities SET activity_type = 'status_change' WHERE activity_type IS NULL OR activity_type NOT IN ('reassignment', 'priority_change', 'sla_change', 'admin_comment', 'complainant_comment', 'executor_update', 'status_change');
  -- Map old values to new ones
  UPDATE ticket_activities SET activity_type = 'admin_comment' WHERE activity_type IN ('comment', 'query', 'update', 'creation');
  UPDATE ticket_activities SET activity_type = 'status_change' WHERE activity_type = 'category_change';
  ALTER TABLE ticket_activities ALTER COLUMN activity_type SET NOT NULL;
END $$;

-- Ensure foreign key constraints exist
DO $$
BEGIN
  -- Foreign key to tickets
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_activities_ticket_id_fkey'
  ) THEN
    ALTER TABLE ticket_activities 
    ADD CONSTRAINT ticket_activities_ticket_id_fkey 
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
  END IF;

  -- Foreign key to tenants
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'ticket_activities_tenant_id_fkey'
    ) THEN
      ALTER TABLE ticket_activities 
      ADD CONSTRAINT ticket_activities_tenant_id_fkey 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Foreign key to users (only if created_by column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ticket_activities' 
    AND column_name = 'created_by'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'ticket_activities_created_by_fkey'
    ) THEN
      ALTER TABLE ticket_activities 
      ADD CONSTRAINT ticket_activities_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket_id ON ticket_activities(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_tenant_id ON ticket_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_created_at ON ticket_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_activity_type ON ticket_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_created_by ON ticket_activities(created_by);

-- Enable RLS
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can read all ticket activities" ON ticket_activities;
DROP POLICY IF EXISTS "Admins can create ticket activities" ON ticket_activities;
DROP POLICY IF EXISTS "Tenant admins can read tenant ticket activities" ON ticket_activities;
DROP POLICY IF EXISTS "Tenant admins can create tenant ticket activities" ON ticket_activities;
DROP POLICY IF EXISTS "Executors can read assigned ticket activities" ON ticket_activities;
DROP POLICY IF EXISTS "Executors can create assigned ticket activities" ON ticket_activities;
DROP POLICY IF EXISTS "Complainants can read their ticket activities" ON ticket_activities;
DROP POLICY IF EXISTS "Complainants can create their ticket activities" ON ticket_activities;

-- RLS Policies for ticket_activities
-- Admins can read all activities
CREATE POLICY "Admins can read all ticket activities"
  ON ticket_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Admins can create all activities
CREATE POLICY "Admins can create ticket activities"
  ON ticket_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Tenant admins can read activities for tickets in their tenant
CREATE POLICY "Tenant admins can read tenant ticket activities"
  ON ticket_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN tickets t ON t.id = ticket_activities.ticket_id
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND t.tenant_id = u.tenant_id
      AND u.tenant_id IS NOT NULL
    )
  );

-- Tenant admins can create activities for tickets in their tenant
CREATE POLICY "Tenant admins can create tenant ticket activities"
  ON ticket_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN tickets t ON t.id = ticket_activities.ticket_id
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'tenant_admin'
      AND t.tenant_id = u.tenant_id
      AND u.tenant_id IS NOT NULL
    )
  );

-- Executors can read activities for tickets assigned to them
CREATE POLICY "Executors can read assigned ticket activities"
  ON ticket_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN executor_profiles ep ON ep.user_id = u.id
      JOIN tickets t ON t.executor_profile_id = ep.id AND t.id = ticket_activities.ticket_id
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'executor'
    )
  );

-- Executors can create activities for tickets assigned to them
CREATE POLICY "Executors can create assigned ticket activities"
  ON ticket_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN executor_profiles ep ON ep.user_id = u.id
      JOIN tickets t ON t.executor_profile_id = ep.id AND t.id = ticket_activities.ticket_id
      WHERE u.id::text = auth.uid()::text
      AND u.role = 'executor'
    )
  );

-- Complainants can read activities for tickets they created
CREATE POLICY "Complainants can read their ticket activities"
  ON ticket_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_activities.ticket_id
      AND t.complainant_id::text = auth.uid()::text
    )
  );

-- Complainants can create activities for tickets they created
CREATE POLICY "Complainants can create their ticket activities"
  ON ticket_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_activities.ticket_id
      AND t.complainant_id::text = auth.uid()::text
    )
  );

-- Add comments for documentation
COMMENT ON TABLE ticket_activities IS 'Tracks all activities, comments, and queries on tickets';
COMMENT ON COLUMN ticket_activities.activity_type IS 'Type of activity: reassignment, priority_change, sla_change, admin_comment, complainant_comment, executor_update, status_change';
COMMENT ON COLUMN ticket_activities.comment IS 'The comment or query text';
COMMENT ON COLUMN ticket_activities.metadata IS 'Additional data like old_value, new_value for changes';

