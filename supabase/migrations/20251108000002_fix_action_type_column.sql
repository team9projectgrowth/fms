-- ============================================================================
-- Migration: Fix action_type column name to activity_type
-- ============================================================================
-- This migration fixes the column name from action_type to activity_type
-- Run this if you're getting "action_type" column errors

DO $$
BEGIN
  -- Check if action_type column exists and rename it to activity_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ticket_activities' 
    AND column_name = 'action_type'
  ) THEN
    -- Rename the column
    ALTER TABLE ticket_activities RENAME COLUMN action_type TO activity_type;
    
    -- Drop old constraint if it exists
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'ticket_activities_action_type_check'
    ) THEN
      ALTER TABLE ticket_activities DROP CONSTRAINT ticket_activities_action_type_check;
    END IF;
    
    -- Add new constraint with correct values
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'ticket_activities_activity_type_check'
    ) THEN
      ALTER TABLE ticket_activities 
      ADD CONSTRAINT ticket_activities_activity_type_check 
      CHECK (activity_type IN ('reassignment', 'priority_change', 'sla_change', 'admin_comment', 'complainant_comment', 'executor_update', 'status_change'));
    END IF;
    
    -- Update any old values to new ones
    UPDATE ticket_activities 
    SET activity_type = 'admin_comment' 
    WHERE activity_type IN ('comment', 'query', 'update', 'creation');
    
    UPDATE ticket_activities 
    SET activity_type = 'status_change' 
    WHERE activity_type = 'category_change';
    
    -- Ensure NOT NULL
    UPDATE ticket_activities SET activity_type = 'status_change' WHERE activity_type IS NULL;
    ALTER TABLE ticket_activities ALTER COLUMN activity_type SET NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN ticket_activities.activity_type IS 'Type of activity: reassignment, priority_change, sla_change, admin_comment, complainant_comment, executor_update, status_change';

