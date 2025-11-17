-- ============================================================================
-- Test Webhook Flow
-- ============================================================================
-- Use this to verify the complete webhook flow is working

-- Step 1: Check recent executor updates (activities)
SELECT 
  'Recent Executor Updates' as step,
  id,
  ticket_id,
  activity_type,
  LEFT(comment, 50) as comment_preview,
  created_at
FROM ticket_activities
WHERE activity_type = 'executor_update'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Check if queue items were created for those activities
SELECT 
  'Queue Items Created' as step,
  q.id,
  q.ticket_id,
  q.activity_id,
  q.tenant_id,
  q.status,
  q.attempt_count,
  q.created_at,
  q.last_error
FROM ticket_webhook_queue q
ORDER BY q.created_at DESC
LIMIT 10;

-- Step 3: Check queue statistics
SELECT 
  'Queue Statistics' as step,
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM ticket_webhook_queue
GROUP BY status
ORDER BY status;

-- Step 4: Check if any failed entries need retry
SELECT 
  'Failed Entries' as step,
  id,
  ticket_id,
  activity_id,
  status,
  attempt_count,
  last_error,
  next_attempt_at,
  created_at
FROM ticket_webhook_queue
WHERE status = 'failed'
ORDER BY next_attempt_at ASC
LIMIT 10;

-- Step 5: Verify tenant has webhook URL configured
SELECT 
  'Tenant Webhook Config' as step,
  id,
  name,
  CASE 
    WHEN automation_webhook_url IS NULL OR automation_webhook_url = '' 
    THEN '✗ NOT CONFIGURED - This is required!'
    ELSE CONCAT('✓ Configured: ', LEFT(automation_webhook_url, 50), '...')
  END as webhook_status
FROM tenants;

-- Expected Results:
-- 1. Should see recent executor_update activities
-- 2. Should see corresponding queue items (status: pending, processing, or delivered)
-- 3. Queue statistics should show some delivered entries if webhooks are working
-- 4. Failed entries should have next_attempt_at set for retry
-- 5. Tenant should show webhook URL is configured

