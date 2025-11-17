-- ============================================================================
-- Quick Verification - Run this to check everything is working
-- ============================================================================

-- 1. Verify cron job exists and is active
SELECT 
  'Cron Job Status' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher')
    THEN '✓ Cron job EXISTS'
    ELSE '✗ Cron job MISSING - Need to schedule it!'
  END as status;

-- 2. Show cron job details
SELECT 
  'Cron Job Details' as check_item,
  jobid,
  schedule,
  active,
  jobname
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';

-- 3. Check if queue has pending items
SELECT 
  'Pending Queue Items' as check_item,
  COUNT(*) as count
FROM ticket_webhook_queue
WHERE status = 'pending';

-- 4. Check recent queue activity
SELECT 
  'Recent Queue Activity' as check_item,
  status,
  COUNT(*) as count
FROM ticket_webhook_queue
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- 5. Check if any items were delivered successfully
SELECT 
  'Successfully Delivered' as check_item,
  COUNT(*) as delivered_count,
  MAX(created_at) as last_delivered
FROM ticket_webhook_queue
WHERE status = 'delivered';

-- INTERPRETATION:
-- If cron job exists and active = true → Good!
-- If you see pending items → Function needs to run
-- If you see delivered items → Webhooks are working!
-- If you see failed items → Check last_error column for issues

