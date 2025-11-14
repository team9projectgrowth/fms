-- ============================================================================
-- Diagnostic Script: Check Webhook Setup Status
-- ============================================================================
-- Run this in Supabase SQL Editor to check if everything is set up correctly

-- 1. Check if trigger exists
SELECT 
  'Trigger Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_enqueue_ticket_activity_webhook'
    ) THEN '✓ Trigger exists'
    ELSE '✗ Trigger missing'
  END as status;

-- 2. Check if function exists
SELECT 
  'Function Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'enqueue_ticket_activity_webhook'
    ) THEN '✓ Function exists'
    ELSE '✗ Function missing'
  END as status;

-- 3. Check queue status
SELECT 
  'Queue Status' as check_type,
  status,
  COUNT(*) as count
FROM ticket_webhook_queue
GROUP BY status
ORDER BY status;

-- 4. Check recent queue entries
SELECT 
  'Recent Queue Entries' as check_type,
  id,
  ticket_id,
  activity_id,
  tenant_id,
  status,
  attempt_count,
  next_attempt_at,
  created_at,
  last_error
FROM ticket_webhook_queue
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check recent activities
SELECT 
  'Recent Activities' as check_type,
  id,
  ticket_id,
  activity_type,
  comment,
  created_at
FROM ticket_activities
WHERE activity_type = 'executor_update'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if tenants have webhook URLs configured
SELECT 
  'Tenant Webhook Config' as check_type,
  id,
  name,
  CASE 
    WHEN automation_webhook_url IS NULL OR automation_webhook_url = '' 
    THEN '✗ Not configured'
    ELSE '✓ Configured'
  END as webhook_status
FROM tenants;

-- 7. Check if pg_cron extension is available
SELECT 
  'pg_cron Extension' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN '✓ Available'
    ELSE '✗ Not available (may need to enable)'
  END as status;

-- 8. Check if cron job is scheduled (if pg_cron is available)
SELECT 
  'Cron Job Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher'
    ) THEN '✓ Scheduled'
    ELSE '✗ Not scheduled'
  END as status;

-- 9. If cron job exists, show details
SELECT 
  'Cron Job Details' as check_type,
  jobid,
  schedule,
  active,
  jobname
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';

