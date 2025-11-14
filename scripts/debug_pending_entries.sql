-- ============================================================================
# Debug Pending Queue Entries
-- ============================================================================
-- Run this to see why entries might not be processing

-- 1. Show all pending entries with details
SELECT 
  id,
  ticket_id,
  activity_id,
  tenant_id,
  status,
  attempt_count,
  next_attempt_at,
  created_at,
  last_error,
  payload
FROM ticket_webhook_queue
WHERE status = 'pending'
ORDER BY created_at ASC;

-- 2. Check if next_attempt_at is in the past (should be processed)
SELECT 
  'Ready to Process' as check_item,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Items ready - function should process them'
    ELSE '✗ No items ready - check next_attempt_at'
  END as status
FROM ticket_webhook_queue
WHERE status = 'pending' 
  AND next_attempt_at <= NOW();

-- 3. Check tenant webhook URLs for pending entries
SELECT DISTINCT
  q.id as queue_id,
  t.id as tenant_id,
  t.name as tenant_name,
  CASE 
    WHEN t.automation_webhook_url IS NULL OR t.automation_webhook_url = '' 
    THEN '✗ NO WEBHOOK URL - Will be marked as delivered without sending'
    ELSE CONCAT('✓ ', LEFT(t.automation_webhook_url, 50), '...')
  END as webhook_status
FROM ticket_webhook_queue q
JOIN tenants t ON t.id = q.tenant_id
WHERE q.status = 'pending'
ORDER BY q.created_at ASC;

-- 4. Check if tickets still exist (should not be deleted)
SELECT 
  q.id as queue_id,
  q.ticket_id,
  CASE 
    WHEN t.id IS NULL THEN '✗ TICKET DELETED'
    ELSE '✓ Ticket exists'
  END as ticket_status
FROM ticket_webhook_queue q
LEFT JOIN tickets t ON t.id = q.ticket_id
WHERE q.status = 'pending'
ORDER BY q.created_at ASC;

-- 5. Check if activities still exist
SELECT 
  q.id as queue_id,
  q.activity_id,
  CASE 
    WHEN ta.id IS NULL THEN '✗ ACTIVITY DELETED'
    ELSE CONCAT('✓ Activity exists: ', ta.activity_type)
  END as activity_status
FROM ticket_webhook_queue q
LEFT JOIN ticket_activities ta ON ta.id = q.activity_id
WHERE q.status = 'pending'
ORDER BY q.created_at ASC;

-- INTERPRETATION:
-- If next_attempt_at is in the past → Items are ready, function should process
-- If tenant has no webhook URL → Will be marked as delivered without sending
-- If ticket/activity deleted → Function will skip or error

