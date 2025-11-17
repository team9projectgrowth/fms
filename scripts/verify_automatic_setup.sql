-- ============================================================================
-- Verify Automatic Webhook Setup
-- ============================================================================
-- Run this after setting up the cron job to verify everything is working

-- 1. Check cron job exists and is active
SELECT 
  'Cron Job Status' as check_item,
  jobid,
  schedule,
  active,
  jobname,
  CASE 
    WHEN active = true AND schedule = '* * * * *' THEN '✓ SET UP CORRECTLY - Running every minute'
    WHEN active = false THEN '✗ CRON JOB IS INACTIVE - Enable it!'
    ELSE '⚠️  Check configuration'
  END as status
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';

-- 2. Check recent cron job runs (should show runs every minute)
SELECT 
  'Recent Cron Runs' as check_item,
  runid,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher')
ORDER BY start_time DESC
LIMIT 10;

-- 3. Check queue status
SELECT 
  'Queue Status' as check_item,
  status,
  COUNT(*) as count,
  MAX(created_at) as newest_entry
FROM ticket_webhook_queue
GROUP BY status
ORDER BY status;

-- 4. Check if items are being processed automatically
SELECT 
  'Auto-Processing Status' as check_item,
  COUNT(*) FILTER (WHERE status = 'delivered' AND updated_at > NOW() - INTERVAL '5 minutes') as recent_delivered,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'delivered' AND updated_at > NOW() - INTERVAL '5 minutes') > 0 
    THEN '✓ WORKING - Items are being delivered automatically'
    WHEN COUNT(*) FILTER (WHERE status = 'pending') > 0 
    THEN '⚠️  Has pending items - Wait 1-2 minutes and check again'
    ELSE 'ℹ️  No recent activity or all items processed'
  END as status
FROM ticket_webhook_queue;

-- 5. Check tenant webhook configuration
SELECT 
  'Tenant Webhook Config' as check_item,
  COUNT(*) as total_tenants,
  COUNT(*) FILTER (WHERE automation_webhook_url IS NOT NULL AND automation_webhook_url != '') as configured,
  COUNT(*) FILTER (WHERE automation_webhook_url IS NULL OR automation_webhook_url = '') as not_configured,
  CASE 
    WHEN COUNT(*) FILTER (WHERE automation_webhook_url IS NOT NULL AND automation_webhook_url != '') > 0 
    THEN '✓ At least one tenant configured'
    ELSE '⚠️  No tenants have webhook URLs configured'
  END as status
FROM tenants;

-- INTERPRETATION:
-- 1. Cron job should show active = true and schedule = '* * * * *'
-- 2. Recent cron runs should show runs within the last few minutes
-- 3. Queue should have some delivered entries if working
-- 4. Recent delivered items within 5 minutes means it's working!
-- 5. At least one tenant should have webhook URL configured

