-- ============================================================================
-- Final Step: Create Cron Job with Service Role Key
-- ============================================================================
-- Run this in Supabase SQL Editor after replacing YOUR-SERVICE-ROLE-KEY
--
-- To get your service role key:
-- 1. Go to Supabase Dashboard → Settings → API
-- 2. Copy the "service_role" key (starts with eyJ...)
-- 3. Replace YOUR-SERVICE-ROLE-KEY below

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

-- Verify the cron job was created
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

-- Check queue status
SELECT 
  status,
  COUNT(*) as count,
  MAX(updated_at) as last_updated
FROM ticket_webhook_queue
GROUP BY status
ORDER BY status;

