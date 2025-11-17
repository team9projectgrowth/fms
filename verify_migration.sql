-- Verification queries to check if the migration ran successfully
-- Run these queries in Supabase SQL Editor to verify the schema changes

-- 1. Check if rules table exists (should exist, either renamed from allocation_rules or already exists)
SELECT 
    table_name,
    CASE WHEN table_name = 'rules' THEN '✓ Table exists as "rules"' 
         WHEN table_name = 'allocation_rules' THEN '⚠ Table still named "allocation_rules"'
         ELSE '✗ Table not found'
    END as status
FROM information_schema.tables 
WHERE table_name IN ('rules', 'allocation_rules') 
AND table_schema = 'public';

-- 2. Check if new columns were added to rules table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'rules' 
AND table_schema = 'public'
AND column_name IN ('trigger_event', 'stop_on_match', 'max_executions', 'created_at', 'updated_at')
ORDER BY column_name;

-- 3. Check if actions table has rule_id column (renamed from priority_id)
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'actions' 
AND table_schema = 'public'
AND column_name IN ('rule_id', 'priority_id', 'action_condition')
ORDER BY column_name;

-- 4. Check if conditions table has field_path column (renamed from attribute)
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'conditions' 
AND table_schema = 'public'
AND column_name IN ('field_path', 'attribute', 'group_id', 'logical_operator')
ORDER BY column_name;

-- 5. Check if rule_execution_logs table exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rule_execution_logs' 
        AND table_schema = 'public'
    ) THEN '✓ rule_execution_logs table exists'
    ELSE '✗ rule_execution_logs table does not exist'
    END as status;

-- 6. Check if automation_action_type enum exists
SELECT 
    typname as enum_name,
    array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'automation_action_type'
GROUP BY typname;

-- 7. Check if indexes were created
SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename IN ('rules', 'actions', 'conditions', 'rule_execution_logs')
     OR indexname LIKE '%rules%' OR indexname LIKE '%actions%' OR indexname LIKE '%conditions%')
ORDER BY tablename, indexname;

-- 8. Check if RLS policies exist for rules table
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('rules', 'rule_execution_logs')
ORDER BY tablename, policyname;

-- 9. Check if trigger exists for rules table
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'rules'
AND trigger_name = 'trigger_update_rules_updated_at';

