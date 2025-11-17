-- ============================================================================
-- Migration: Ensure tickets table has all required columns
-- ============================================================================
-- This migration ensures that the tickets table has all required columns
-- including category, tenant_id, and executor_profile_id

DO $$
BEGIN
  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE tickets ADD COLUMN category text;
    -- Set a default value for existing rows if needed
    UPDATE tickets SET category = 'General' WHERE category IS NULL;
    -- Make it NOT NULL after setting defaults
    ALTER TABLE tickets ALTER COLUMN category SET NOT NULL;
  END IF;

  -- Add tenant_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE tickets 
    ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL;
    
    -- Create index for tenant_id
    CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON tickets(tenant_id);
  END IF;

  -- Add executor_profile_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets' 
    AND column_name = 'executor_profile_id'
  ) THEN
    ALTER TABLE tickets 
    ADD COLUMN executor_profile_id uuid REFERENCES executor_profiles(id) ON DELETE SET NULL;
    
    -- Create index for executor_profile_id
    CREATE INDEX IF NOT EXISTS idx_tickets_executor_profile_id ON tickets(executor_profile_id);
  END IF;

  -- Ensure executor_id still exists (for backward compatibility)
  -- If it doesn't exist, we'll keep it as optional
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets' 
    AND column_name = 'executor_id'
  ) THEN
    -- Check if executors table exists before adding foreign key
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'executors'
    ) THEN
      ALTER TABLE tickets 
      ADD COLUMN executor_id uuid REFERENCES executors(id) ON DELETE SET NULL;
    ELSE
      ALTER TABLE tickets 
      ADD COLUMN executor_id uuid;
    END IF;
  END IF;
END $$;

-- Remove complainant_email, complainant_name, complainant_phone columns if they exist
-- These should come from users table via complainant_id foreign key
DO $$
BEGIN
  -- Drop complainant_email if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets' 
    AND column_name = 'complainant_email'
  ) THEN
    ALTER TABLE tickets DROP COLUMN complainant_email;
  END IF;

  -- Drop complainant_name if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets' 
    AND column_name = 'complainant_name'
  ) THEN
    ALTER TABLE tickets DROP COLUMN complainant_name;
  END IF;

  -- Drop complainant_phone if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets' 
    AND column_name = 'complainant_phone'
  ) THEN
    ALTER TABLE tickets DROP COLUMN complainant_phone;
  END IF;
END $$;

-- Ensure status column has a default value
DO $$
BEGIN
  -- Check if status column exists and doesn't have a default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets' 
    AND column_name = 'status'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'open';
  END IF;
  
  -- Ensure status is NOT NULL (it should be, but just in case)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tickets' 
    AND column_name = 'status'
    AND is_nullable = 'YES'
  ) THEN
    -- Set default for existing NULL values
    UPDATE tickets SET status = 'open' WHERE status IS NULL;
    -- Make it NOT NULL
    ALTER TABLE tickets ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- Ensure ticket_number trigger and function exist
-- Format: FMS-{first 3 chars of tenant name}-{progressive unique number}
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $function$
DECLARE
  tenant_name TEXT;
  tenant_prefix TEXT;
  last_number INTEGER;
  new_number INTEGER;
BEGIN
  -- Only generate if ticket_number is NULL or empty
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    -- Get tenant name
    IF NEW.tenant_id IS NOT NULL THEN
      SELECT name INTO tenant_name
      FROM tenants
      WHERE id = NEW.tenant_id;
    END IF;

    -- Extract first 3 alphanumeric characters from tenant name (uppercase)
    -- Remove spaces and special characters first, then take first 3
    IF tenant_name IS NOT NULL AND LENGTH(tenant_name) > 0 THEN
      -- Remove all non-alphanumeric characters and convert to uppercase
      tenant_prefix := UPPER(REGEXP_REPLACE(tenant_name, '[^A-Z0-9]', '', 'g'));
      -- Take first 3 characters
      tenant_prefix := SUBSTRING(tenant_prefix FROM 1 FOR 3);
      -- If after removing special chars we have less than 3 chars, pad with 'X'
      IF LENGTH(tenant_prefix) < 3 THEN
        tenant_prefix := RPAD(tenant_prefix, 3, 'X');
      END IF;
    ELSE
      -- Default prefix if no tenant or tenant name
      tenant_prefix := 'DEF';
    END IF;

    -- Get the last ticket number for this tenant prefix
    -- Find the highest number for tickets with this prefix and same tenant
    SELECT COALESCE(MAX(
      CAST(
        SUBSTRING(ticket_number FROM 'FMS-' || tenant_prefix || '-(.+)$') AS INTEGER
      )
    ), 0) INTO last_number
    FROM tickets
    WHERE ticket_number LIKE 'FMS-' || tenant_prefix || '-%'
    AND tenant_id = NEW.tenant_id;

    -- Increment to get next number
    new_number := last_number + 1;

    -- Generate ticket number: FMS-{prefix}-{4 digit number}
    NEW.ticket_number := 'FMS-' || tenant_prefix || '-' || LPAD(new_number::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Drop and recreate trigger
-- Trigger runs BEFORE INSERT, so it sets the value before NOT NULL constraint is checked
DROP TRIGGER IF EXISTS set_ticket_number ON tickets;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Add comments for documentation
COMMENT ON COLUMN tickets.category IS 'Category of the ticket (e.g., HVAC, Electrical, Plumbing)';
COMMENT ON COLUMN tickets.tenant_id IS 'Tenant that owns this ticket';
COMMENT ON COLUMN tickets.executor_profile_id IS 'Executor profile assigned to this ticket';
COMMENT ON COLUMN tickets.executor_id IS 'Legacy executor reference (deprecated, use executor_profile_id)';
COMMENT ON COLUMN tickets.complainant_id IS 'Reference to users table - complainant details come from users table';
COMMENT ON COLUMN tickets.status IS 'Status of the ticket: open, in-progress, resolved, closed (default: open)';
COMMENT ON COLUMN tickets.ticket_number IS 'Auto-generated ticket number (format: FMS-{first 3 chars of tenant name}-{progressive unique number}, e.g., FMS-ACM-0001)';

