-- ============================================================================
-- Verify Cron Job Setup
-- ============================================================================
-- Run this to verify your cron job is properly configured

-- Check if cron job exists and show details
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';

-- Check recent cron job runs (last 10)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher')
ORDER BY start_time DESC
LIMIT 10;

-- If you see the schedule as "* * * * *", that means it runs every minute (✓ Good!)
-- If you see active = true, the cron job is active (✓ Good!)
-- Check the return_message for any errors

