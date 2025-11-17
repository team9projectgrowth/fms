-- ============================================================================
-- Migration: Add rule_type field and fix automation_action_type enum
-- ============================================================================

-- 0. Fix foreign key constraint issues on actions table
DO $$
DECLARE
    rules_table_name TEXT;
BEGIN
    -- Determine which table name exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rules' 
        AND table_schema = 'public'
    ) THEN
        rules_table_name := 'rules';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'allocation_rules' 
        AND table_schema = 'public'
    ) THEN
        rules_table_name := 'allocation_rules';
    ELSE
        RETURN;
    END IF;
    
    -- Drop ALL possible constraint names that might exist
    -- This handles cases where the table was called 'automation_steps' or 'actions'
    ALTER TABLE actions DROP CONSTRAINT IF EXISTS automation_steps_priority_id_fkey;
    ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_priority_id_fkey;
    ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_rule_id_fkey;
    ALTER TABLE actions DROP CONSTRAINT IF EXISTS automation_steps_rule_id_fkey;
    
    -- Ensure rule_id column exists (rename priority_id if needed)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'actions' 
        AND column_name = 'priority_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE actions RENAME COLUMN priority_id TO rule_id;
    END IF;
    
    -- Add the correct foreign key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'actions' 
        AND column_name = 'rule_id'
        AND table_schema = 'public'
    ) THEN
        EXECUTE format('
            ALTER TABLE actions 
            ADD CONSTRAINT actions_rule_id_fkey 
            FOREIGN KEY (rule_id) REFERENCES %I(id) ON DELETE CASCADE
        ', rules_table_name);
    END IF;
END $$;

-- 1. Fix automation_action_type enum to include all required values
DO $$
BEGIN
    -- Check if enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_action_type') THEN
        -- Add missing enum values if they don't exist
        -- Note: PostgreSQL doesn't support IF NOT EXISTS for enum values, so we use exception handling
        BEGIN
            ALTER TYPE automation_action_type ADD VALUE 'assign_executor';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE automation_action_type ADD VALUE 'set_priority';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE automation_action_type ADD VALUE 'set_due_date';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE automation_action_type ADD VALUE 'escalate';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE automation_action_type ADD VALUE 'notify';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE automation_action_type ADD VALUE 'set_status';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    ELSE
        -- Create enum if it doesn't exist
        CREATE TYPE automation_action_type AS ENUM (
            'assign_executor',
            'set_priority',
            'set_due_date',
            'escalate',
            'notify',
            'set_status'
        );
    END IF;
END $$;

-- 2. Create rule_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rule_type_enum') THEN
        CREATE TYPE rule_type_enum AS ENUM (
            'priority',
            'sla',
            'allocation'
        );
    END IF;
END $$;

-- 3. Add rule_type column to rules table
DO $$
DECLARE
    rules_table_name TEXT;
BEGIN
    -- Determine which table name exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rules' 
        AND table_schema = 'public'
    ) THEN
        rules_table_name := 'rules';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'allocation_rules' 
        AND table_schema = 'public'
    ) THEN
        rules_table_name := 'allocation_rules';
    ELSE
        RAISE EXCEPTION 'Neither rules nor allocation_rules table exists';
    END IF;
    
    -- Add rule_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = rules_table_name 
        AND column_name = 'rule_type'
        AND table_schema = 'public'
    ) THEN
        EXECUTE format('
            ALTER TABLE %I 
            ADD COLUMN rule_type rule_type_enum NOT NULL DEFAULT ''allocation''
        ', rules_table_name);
        
        -- Add comment
        EXECUTE format('
            COMMENT ON COLUMN %I.rule_type IS ''Type of rule: priority, sla, or allocation''
        ', rules_table_name);
    END IF;
    
    -- Create index on rule_type for better query performance
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_rules_rule_type ON %I(rule_type)
    ', rules_table_name);
END $$;

