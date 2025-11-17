-- ============================================================================
-- Quick Test Script for Rule Engine Backend
-- Run this in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Get your tenant_id and a test user (complainant) ID
-- Replace 'your-email@example.com' with an actual user email
SELECT id as tenant_id FROM tenants LIMIT 1;
SELECT id as complainant_id, email, full_name, designation_id FROM users WHERE role = 'complainant' LIMIT 1;

-- STEP 2: Create a simple test rule
-- Replace 'YOUR-TENANT-ID' with the tenant_id from step 1
WITH new_rule AS (
  INSERT INTO rules (tenant_id, rule_name, priority_order, trigger_event, is_active, stop_on_match)
  VALUES (
    'YOUR-TENANT-ID',  -- Replace with actual tenant_id
    'Test Rule: Set High Priority for Critical Category',
    1,
    'on_create',
    true,
    false
  )
  RETURNING id
)
-- Add condition
INSERT INTO conditions (tenant_id, rule_id, field_path, operator, value, sequence)
SELECT 
  'YOUR-TENANT-ID',
  new_rule.id,
  'category',
  'equals',
  ARRAY['Critical']::text[],
  1
FROM new_rule
RETURNING rule_id;

-- Add action (use the rule_id from above)
INSERT INTO actions (tenant_id, rule_id, action_type, action_params, step_order, trigger_after_minutes)
VALUES (
  'YOUR-TENANT-ID',
  'RULE-ID-FROM-ABOVE',  -- Replace with rule_id from previous query
  'set_priority',
  '{"priority": "critical"}'::jsonb,
  1,
  0
);

-- STEP 3: Create a test ticket (this will trigger the rule automatically)
-- Replace values with actual IDs
INSERT INTO tickets (
  tenant_id,
  title,
  description,
  category,
  priority,
  type,
  location,
  status,
  complainant_id,
  complainant_name,
  complainant_email
)
VALUES (
  'YOUR-TENANT-ID',
  'Test Ticket for Rule Engine',
  'This ticket should have priority changed from "low" to "critical" by the rule',
  'Critical',  -- This matches our condition
  'low',  -- Initial priority, should be changed by rule
  'Repair',
  'Test Location',
  'open',
  'YOUR-COMPLAINANT-ID',  -- Replace with actual complainant_id
  'Test User',
  'test@example.com'
)
RETURNING id, ticket_number, title, priority;

-- STEP 4: Wait a few seconds for rule to process, then check execution logs
-- Replace 'YOUR-TICKET-ID' with ticket id from step 3
SELECT 
  r.rule_name,
  rel.execution_status,
  rel.matched_conditions,
  rel.actions_executed,
  rel.error_message,
  rel.execution_time_ms,
  rel.created_at
FROM rule_execution_logs rel
JOIN rules r ON r.id = rel.rule_id
WHERE rel.ticket_id = 'YOUR-TICKET-ID'
ORDER BY rel.created_at DESC;

-- STEP 5: Verify ticket was updated by the rule
-- Replace 'YOUR-TICKET-ID' with ticket id from step 3
SELECT 
  id,
  ticket_number,
  title,
  category,
  priority,  -- Should be "critical" if rule worked
  executor_profile_id,  -- Should be assigned if rule has assign_executor action
  due_date,  -- Should be set if rule has set_due_date action
  updated_at
FROM tickets
WHERE id = 'YOUR-TICKET-ID';

-- ============================================================================
-- Test Rule with Designation Condition
-- ============================================================================

-- Create rule that checks designation
WITH new_rule AS (
  INSERT INTO rules (tenant_id, rule_name, priority_order, trigger_event, is_active)
  VALUES (
    'YOUR-TENANT-ID',
    'Test Rule: VIP Users Get High Priority',
    2,
    'on_create',
    true
  )
  RETURNING id
)
INSERT INTO conditions (tenant_id, rule_id, field_path, operator, value, sequence)
SELECT 
  'YOUR-TENANT-ID',
  new_rule.id,
  'complainant.designation.name',  -- Check designation name
  'in',
  ARRAY['CEO', 'Director', 'Manager']::text[],  -- VIP designations
  1
FROM new_rule
RETURNING rule_id;

-- Add action to set priority
INSERT INTO actions (tenant_id, rule_id, action_type, action_params, step_order)
VALUES (
  'YOUR-TENANT-ID',
  'RULE-ID-FROM-ABOVE',
  'set_priority',
  '{"priority": "high"}'::jsonb,
  1
);

-- ============================================================================
-- Debugging Queries
-- ============================================================================

-- List all active rules for a tenant
SELECT 
  id,
  rule_name,
  priority_order,
  trigger_event,
  is_active,
  stop_on_match,
  max_executions
FROM rules
WHERE tenant_id = 'YOUR-TENANT-ID'
  AND is_active = true
ORDER BY priority_order;

-- View all conditions for a rule
SELECT 
  c.id,
  c.field_path,
  c.operator,
  c.value,
  c.sequence,
  c.logical_operator,
  c.group_id
FROM conditions c
WHERE c.rule_id = 'YOUR-RULE-ID'
ORDER BY c.sequence;

-- View all actions for a rule
SELECT 
  a.id,
  a.action_type,
  a.action_params,
  a.step_order,
  a.trigger_after_minutes,
  a.action_condition
FROM actions a
WHERE a.rule_id = 'YOUR-RULE-ID'
ORDER BY a.step_order;

-- View recent execution logs
SELECT 
  rel.id,
  r.rule_name,
  t.ticket_number,
  rel.execution_status,
  rel.matched_conditions,
  rel.actions_executed,
  rel.error_message,
  rel.execution_time_ms,
  rel.created_at
FROM rule_execution_logs rel
JOIN rules r ON r.id = rel.rule_id
JOIN tickets t ON t.id = rel.ticket_id
WHERE rel.created_at > NOW() - INTERVAL '1 hour'
ORDER BY rel.created_at DESC
LIMIT 20;

-- Check ticket with complainant and designation data
SELECT 
  t.id,
  t.ticket_number,
  t.title,
  t.priority,
  t.category,
  u.full_name as complainant_name,
  u.email as complainant_email,
  u.designation_id,
  d.name as designation_name
FROM tickets t
LEFT JOIN users u ON u.id = t.complainant_id
LEFT JOIN designations d ON d.id = u.designation_id
WHERE t.id = 'YOUR-TICKET-ID';

