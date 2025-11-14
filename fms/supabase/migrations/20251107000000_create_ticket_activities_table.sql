-- ============================================================================
-- Migration: Create ticket_activities table for comments and activity tracking
-- ============================================================================

-- Create ticket_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS ticket_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('comment', 'query', 'status_change', 'reassignment', 'priority_change', 'category_change', 'update', 'creation')),
  comment TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB -- Store additional data like old_value, new_value, etc.
);

-- Ensure the foreign key constraint exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_activities_ticket_id_fkey'
  ) THEN
    ALTER TABLE ticket_activities 
    ADD CONSTRAINT ticket_activities_ticket_id_fkey 
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ticket_activities_created_by_fkey'
  ) THEN
    ALTER TABLE ticket_activities 
    ADD CONSTRAINT ticket_activities_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket_id ON ticket_activities(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_tenant_id ON ticket_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_created_at ON ticket_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_activity_type ON ticket_activities(activity_type);

-- Enable RLS
ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;

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

-- Add comment field
COMMENT ON TABLE ticket_activities IS 'Tracks all activities, comments, and queries on tickets';
COMMENT ON COLUMN ticket_activities.activity_type IS 'Type of activity: comment, query, status_change, reassignment, priority_change, category_change, update, creation';
COMMENT ON COLUMN ticket_activities.comment IS 'The comment or query text';
COMMENT ON COLUMN ticket_activities.metadata IS 'Additional data like old_value, new_value for changes';

