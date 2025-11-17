-- ============================================================================
-- Fix Cron Job: Enable pg_net Extension
-- ============================================================================
-- This script enables the pg_net extension required for HTTP requests in cron jobs
-- Run this in Supabase SQL Editor

-- Step 1: Enable pg_net extension (required for net.http_post)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Verify pg_net is enabled
SELECT 
  extname,
  extversion,
  CASE 
    WHEN extname = 'pg_net' THEN '✓ pg_net extension is enabled'
    ELSE '✗ pg_net extension not found'
  END as status
FROM pg_extension
WHERE extname = 'pg_net';

-- Step 3: Verify pg_cron is enabled
SELECT 
  extname,
  extversion,
  CASE 
    WHEN extname = 'pg_cron' THEN '✓ pg_cron extension is enabled'
    ELSE '✗ pg_cron extension not found'
  END as status
FROM pg_extension
WHERE extname = 'pg_cron';

-- Step 4: Remove existing broken cron job
SELECT cron.unschedule('ticket-activity-webhook-dispatcher')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher'
);

-- Step 5: Recreate the cron job with proper configuration
-- ⚠️ REPLACE 'YOUR-SERVICE-ROLE-KEY' with your actual service role key
DO $$
DECLARE
  project_ref TEXT := 'mxrjygxhjeubisjrfmfr';
  service_role_key TEXT := 'YOUR-SERVICE-ROLE-KEY';  -- ⚠️ REPLACE THIS
  webhook_url TEXT;
  cron_command TEXT;
  job_id BIGINT;
BEGIN
  -- Validate service role key
  IF service_role_key = 'YOUR-SERVICE-ROLE-KEY' OR service_role_key IS NULL OR service_role_key = '' THEN
    RAISE EXCEPTION 'Please replace YOUR-SERVICE-ROLE-KEY with your actual service role key from Supabase Dashboard → Settings → API → service_role';
  END IF;
  
  -- Build webhook URL
  webhook_url := 'https://' || project_ref || '.supabase.co/functions/v1/ticket-activity-webhook';
  
  -- Build cron command using net.http_post
  cron_command := format(
    'SELECT net.http_post(url:=%L, headers:=jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s''), body:=''{}''::jsonb) AS request_id;',
    webhook_url,
    service_role_key
  );
  
  -- Schedule the cron job
  SELECT cron.schedule(
    'ticket-activity-webhook-dispatcher',
    '* * * * *', -- Every minute
    cron_command
  ) INTO job_id;
  
  RAISE NOTICE '✓ Cron job scheduled successfully!';
  RAISE NOTICE '  Job ID: %', job_id;
  RAISE NOTICE '  Job name: ticket-activity-webhook-dispatcher';
  RAISE NOTICE '  Schedule: Every minute (* * * * *)';
  RAISE NOTICE '  Webhook URL: %', webhook_url;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✗ Error creating cron job: %', SQLERRM;
    RAISE NOTICE 'Error details: %', SQLSTATE;
    RAISE;
END $$;

-- Step 6: Verify the cron job was created and is active
SELECT 
  jobid,
  schedule,
  active,
  jobname,
  CASE 
    WHEN active = true THEN '✓ ACTIVE - Will run every minute'
    ELSE '✗ INACTIVE - Check configuration'
  END as status
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';

-- Step 7: Reset stuck processing items
UPDATE ticket_webhook_queue
SET 
  status = 'pending',
  updated_at = NOW(),
  next_attempt_at = NOW()
WHERE status = 'processing'
AND updated_at < NOW() - INTERVAL '10 minutes';

SELECT 
  'Reset stuck items' as action,
  COUNT(*) as items_reset
FROM ticket_webhook_queue
WHERE status = 'pending'
AND updated_at > NOW() - INTERVAL '1 minute';

