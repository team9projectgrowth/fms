-- Migration: Update Rules Engine Schema
-- This migration updates the existing allocation_rules, actions, and conditions tables
-- to align with the rule engine requirements

-- ============================================================================
-- 1. RENAME allocation_rules TO rules (if it exists and hasn't been renamed)
-- ============================================================================

DO $$
BEGIN
    -- Check if allocation_rules exists and rules doesn't exist, then rename
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'allocation_rules' 
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rules' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE allocation_rules RENAME TO rules;
    END IF;
END $$;

-- ============================================================================
-- 2. UPDATE rules TABLE - Add missing columns and modify existing ones
-- Use the table name that exists (rules or allocation_rules)
-- ============================================================================

-- Determine which table name to use
DO $$
DECLARE
    table_name_var TEXT;
BEGIN
    -- Check which table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rules' 
        AND table_schema = 'public'
    ) THEN
        table_name_var := 'rules';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'allocation_rules' 
        AND table_schema = 'public'
    ) THEN
        table_name_var := 'allocation_rules';
    ELSE
        RAISE EXCEPTION 'Neither rules nor allocation_rules table exists';
    END IF;
    
    -- Execute ALTER statements using the correct table name
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS trigger_event VARCHAR(50) NOT NULL DEFAULT %L', table_name_var, 'on_create');
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS stop_on_match BOOLEAN DEFAULT false', table_name_var);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS max_executions INTEGER', table_name_var);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()', table_name_var);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()', table_name_var);
    
    -- Make priority_order NOT NULL with default
    EXECUTE format('ALTER TABLE %I ALTER COLUMN priority_order SET DEFAULT 999', table_name_var);
    EXECUTE format('UPDATE %I SET priority_order = 999 WHERE priority_order IS NULL', table_name_var);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN priority_order SET NOT NULL', table_name_var);
    
    -- Make is_active NOT NULL with default
    EXECUTE format('ALTER TABLE %I ALTER COLUMN is_active SET DEFAULT true', table_name_var);
    EXECUTE format('UPDATE %I SET is_active = true WHERE is_active IS NULL', table_name_var);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN is_active SET NOT NULL', table_name_var);
    
    -- Add check constraint for trigger_event (drop first if exists)
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS check_trigger_event', table_name_var);
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT check_trigger_event CHECK (trigger_event IN (%L, %L, %L, %L))', 
        table_name_var, 'on_create', 'on_update', 'on_manual', 'on_status_change');
END $$;

-- Note: executor_pool and assignment_strategy columns are kept for backward compatibility
-- but should be migrated to action configs. They will be deprecated in future.

-- ============================================================================
-- 3. UPDATE actions TABLE - Fix column name and add missing columns
-- ============================================================================

-- Rename priority_id to rule_id (fix incorrect column name)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'actions' 
        AND column_name = 'priority_id'
    ) THEN
        ALTER TABLE actions RENAME COLUMN priority_id TO rule_id;
    END IF;
END $$;

-- Add foreign key constraint to rules table (use whichever table name exists)
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
    
    -- Drop existing constraint if it exists
    ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_rule_id_fkey;
    ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_priority_id_fkey;
    
    -- Add foreign key constraint
    EXECUTE format('ALTER TABLE actions ADD CONSTRAINT actions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES %I(id) ON DELETE CASCADE', rules_table_name);
END $$;

-- Add optional action_condition column
ALTER TABLE actions
ADD COLUMN IF NOT EXISTS action_condition TEXT;

-- Note: trigger_after_minutes is kept for time-based action execution
-- Note: action_type enum should support: 'assign_executor', 'set_priority', 'set_due_date', 'escalate', 'notify', 'set_status'
-- If the enum doesn't exist or has different values, we'll need to create/update it

-- Check if automation_action_type enum exists and create if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_action_type') THEN
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

-- Update action_type column if it exists but doesn't use the enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'actions' 
        AND column_name = 'action_type' 
        AND data_type != 'USER-DEFINED'
    ) THEN
        -- Convert varchar to enum if needed
        ALTER TABLE actions
        ALTER COLUMN action_type TYPE automation_action_type
        USING action_type::automation_action_type;
    END IF;
END $$;

-- ============================================================================
-- 4. UPDATE conditions TABLE - Add grouping support and field path
-- ============================================================================

-- Rename attribute to field_path (supports nested paths like 'complainant.department')
ALTER TABLE conditions
RENAME COLUMN attribute TO field_path;

-- Add group_id for grouping conditions with AND/OR logic
ALTER TABLE conditions
ADD COLUMN IF NOT EXISTS group_id UUID;

-- Add logical_operator for AND/OR grouping
ALTER TABLE conditions
ADD COLUMN IF NOT EXISTS logical_operator VARCHAR(10);

-- Add check constraint for logical_operator
ALTER TABLE conditions
ADD CONSTRAINT check_logical_operator 
CHECK (logical_operator IS NULL OR logical_operator IN ('AND', 'OR'));

-- Note: value column is kept as text[] for backward compatibility
-- Consider migrating to jsonb in future for more flexibility

-- Add check constraint for operator values
ALTER TABLE conditions
DROP CONSTRAINT IF EXISTS check_operator;

ALTER TABLE conditions
ADD CONSTRAINT check_operator 
CHECK (operator IN (
    'equals', 'not_equals', 'contains', 'not_contains',
    'in', 'not_in', 'greater_than', 'less_than', 
    'greater_than_or_equal', 'less_than_or_equal',
    'between', 'is_null', 'is_not_null', 'regex', 'starts_with', 'ends_with'
));

-- ============================================================================
-- 5. CREATE rule_execution_logs TABLE (for debugging/auditing)
-- ============================================================================

-- Create rule_execution_logs table with dynamic foreign key reference
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
    
    -- Create table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rule_execution_logs' 
        AND table_schema = 'public'
    ) THEN
        EXECUTE format('
            CREATE TABLE rule_execution_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                rule_id UUID NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
                ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                execution_status VARCHAR(20) NOT NULL CHECK (execution_status IN (''success'', ''failed'', ''skipped'')),
                matched_conditions JSONB,
                actions_executed JSONB,
                error_message TEXT,
                execution_time_ms INTEGER,
                created_at TIMESTAMPTZ DEFAULT now()
            )
        ', rules_table_name);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_rule_id ON rule_execution_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_ticket_id ON rule_execution_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_created_at ON rule_execution_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_status ON rule_execution_logs(execution_status);

-- ============================================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes on rules table (use whichever table name exists)
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
    
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rules_tenant_id ON %I(tenant_id)', rules_table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rules_trigger_event ON %I(trigger_event)', rules_table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rules_is_active ON %I(is_active)', rules_table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_rules_priority_order ON %I(priority_order)', rules_table_name);
END $$;

-- Indexes on actions table
CREATE INDEX IF NOT EXISTS idx_actions_rule_id ON actions(rule_id);
CREATE INDEX IF NOT EXISTS idx_actions_tenant_id ON actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_actions_step_order ON actions(step_order);

-- Indexes on conditions table
CREATE INDEX IF NOT EXISTS idx_conditions_rule_id ON conditions(rule_id);
CREATE INDEX IF NOT EXISTS idx_conditions_tenant_id ON conditions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conditions_group_id ON conditions(group_id);
CREATE INDEX IF NOT EXISTS idx_conditions_sequence ON conditions(sequence);

-- ============================================================================
-- 7. ENABLE RLS ON NEW TABLE
-- ============================================================================

ALTER TABLE rule_execution_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS POLICIES FOR rule_execution_logs
-- ============================================================================

-- Tenant admins can view execution logs for their tenant's rules
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
    
    EXECUTE format('
        CREATE POLICY "Tenant admins can view their tenant rule execution logs"
            ON rule_execution_logs
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    JOIN %I r ON r.id = rule_execution_logs.rule_id
                    WHERE u.id::text = auth.uid()::text
                    AND u.role = ''tenant_admin''
                    AND r.tenant_id = u.tenant_id
                )
            )
    ', rules_table_name);
END $$;

-- Super admin can view all execution logs
CREATE POLICY "Super admin can view all rule execution logs"
    ON rule_execution_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id::text = auth.uid()::text
            AND u.role = 'admin'
            AND u.tenant_id IS NULL
        )
    );

-- ============================================================================
-- 9. UPDATE EXISTING RLS POLICIES (if rules table was renamed)
-- ============================================================================

-- Drop old policy if it exists (check both old and new table names)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'allocation_rules' 
        AND table_schema = 'public'
    ) THEN
        DROP POLICY IF EXISTS "Tenant admins can manage tenant allocation rules" ON allocation_rules;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rules' 
        AND table_schema = 'public'
    ) THEN
        DROP POLICY IF EXISTS "Tenant admins can manage tenant allocation rules" ON rules;
    END IF;
END $$;

-- Create new policy for rules table (use whichever table name exists)
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
    
    -- Create tenant admin policy
    EXECUTE format('
        CREATE POLICY "Tenant admins can manage tenant rules"
            ON %I
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id::text = auth.uid()::text
                    AND u.role = ''tenant_admin''
                    AND %I.tenant_id = u.tenant_id
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id::text = auth.uid()::text
                    AND u.role = ''tenant_admin''
                    AND tenant_id = u.tenant_id
                )
            )
    ', rules_table_name, rules_table_name);
    
    -- Create super admin policy
    EXECUTE format('
        CREATE POLICY "Super admin can manage all rules"
            ON %I
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id::text = auth.uid()::text
                    AND u.role = ''admin''
                    AND u.tenant_id IS NULL
                )
            )
    ', rules_table_name);
END $$;

-- ============================================================================
-- 10. CREATE TRIGGER FOR updated_at ON rules TABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at (use whichever table name exists)
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
    
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_rules_updated_at ON %I', rules_table_name);
    EXECUTE format('
        CREATE TRIGGER trigger_update_rules_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_rules_updated_at()
    ', rules_table_name);
END $$;

