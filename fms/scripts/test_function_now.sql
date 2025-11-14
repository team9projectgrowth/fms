-- ============================================================================
-- Test Function and Process Pending Items
-- ============================================================================
-- Run these queries to understand the current state

-- 1. Check pending entries details
SELECT 
  id,
  ticket_id,
  activity_id,
  tenant_id,
  status,
  attempt_count,
  next_attempt_at <= NOW() as ready_to_process,
  created_at,
  NOW() - created_at as age
FROM ticket_webhook_queue
WHERE status = 'pending'
ORDER BY created_at ASC;

-- 2. Verify tenant webhook URLs exist
SELECT 
  q.id as queue_id,
  t.id as tenant_id,
  t.name as tenant_name,
  CASE 
    WHEN t.automation_webhook_url IS NULL OR t.automation_webhook_url = '' 
    THEN '✗ MISSING WEBHOOK URL'
    ELSE '✓ Has webhook URL'
  END as webhook_config_status,
  LEFT(t.automation_webhook_url, 60) as webhook_url_preview
FROM ticket_webhook_queue q
JOIN tenants t ON t.id = q.tenant_id
WHERE q.status = 'pending';

-- 3. Check if cron job is active
SELECT 
  'Cron Job Status' as check_item,
  jobid,
  schedule,
  active,
  jobname
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';

-- INTERPRETATION:
-- If ready_to_process = true → Function should process them when invoked
-- If webhook_config_status = ✗ → Items will be marked delivered without sending
-- If cron job is NULL → That's why it's not running automatically!

