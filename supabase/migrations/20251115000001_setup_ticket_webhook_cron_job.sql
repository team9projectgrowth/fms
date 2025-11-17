-- ============================================================================
-- Setup: Schedule Ticket Activity Webhook Cron Job
-- ============================================================================
-- This migration sets up a cron job to automatically invoke the 
-- ticket-activity-webhook function every minute.
--
-- IMPORTANT: You need to replace YOUR-SERVICE-ROLE-KEY with your actual
-- service role key from Supabase Dashboard → Settings → API → service_role
--
-- Run this SQL in Supabase SQL Editor after replacing the service role key.

-- Step 1: Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Drop existing job if it exists (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'ticket-activity-webhook-dispatcher'
  ) THEN
    PERFORM cron.unschedule('ticket-activity-webhook-dispatcher');
    RAISE NOTICE 'Removed existing cron job';
  END IF;
END $$;

-- Step 3: Create the cron job
-- REPLACE 'YOUR-SERVICE-ROLE-KEY' BELOW WITH YOUR ACTUAL SERVICE ROLE KEY
DO $$
DECLARE
  project_ref TEXT := 'mxrjygxhjeubisjrfmfr';
  -- ⚠️ REPLACE THE BELOW WITH YOUR SERVICE ROLE KEY ⚠️
  service_role_key TEXT := 'YOUR-SERVICE-ROLE-KEY';  -- Get from Supabase Dashboard → Settings → API → service_role
  webhook_url TEXT;
  cron_command TEXT;
BEGIN
  -- Build webhook URL
  webhook_url := 'https://' || project_ref || '.supabase.co/functions/v1/ticket-activity-webhook';
  
  -- Build cron command
  cron_command := format(
    'SELECT net.http_post(url:=%L, headers:=jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s''), body:=''{}''::jsonb) AS request_id;',
    webhook_url,
    service_role_key
  );
  
  -- Only schedule if service role key is provided
  IF service_role_key = 'YOUR-SERVICE-ROLE-KEY' THEN
    RAISE EXCEPTION 'Please replace YOUR-SERVICE-ROLE-KEY with your actual service role key before running this migration';
  END IF;
  
  -- Schedule the cron job
  PERFORM cron.schedule(
    'ticket-activity-webhook-dispatcher',
    '* * * * *', -- Every minute
    cron_command
  );
  
  RAISE NOTICE '✓ Cron job scheduled successfully!';
  RAISE NOTICE '  Job name: ticket-activity-webhook-dispatcher';
  RAISE NOTICE '  Schedule: Every minute (* * * * *)';
  RAISE NOTICE '  Webhook URL: %', webhook_url;
END $$;

-- Step 4: Verify the cron job was created
SELECT 
  'Cron Job Status' as check_item,
  jobid,
  schedule,
  active,
  jobname,
  CASE 
    WHEN active = true THEN '✓ ACTIVE - Running every minute'
    ELSE '✗ INACTIVE - Check configuration'
  END as status
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';

