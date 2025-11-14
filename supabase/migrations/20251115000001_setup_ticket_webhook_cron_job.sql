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

-- Step 3: Create the cron job (only if service role key is provided)
-- NOTE: If service role key is not provided, this step will be skipped
-- You can set up the cron job manually later using the script in scripts/setup_ticket_webhook_cron.sql
DO $$
DECLARE
  project_ref TEXT := 'mxrjygxhjeubisjrfmfr';
  -- ⚠️ REPLACE THE BELOW WITH YOUR SERVICE ROLE KEY ⚠️
  service_role_key TEXT := 'YOUR-SERVICE-ROLE-KEY';  -- Get from Supabase Dashboard → Settings → API → service_role
  webhook_url TEXT;
  cron_command TEXT;
  cron_exists BOOLEAN;
BEGIN
  -- Check if cron job already exists
  SELECT EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'ticket-activity-webhook-dispatcher'
  ) INTO cron_exists;
  
  -- If cron job already exists and is active, skip
  IF cron_exists THEN
    RAISE NOTICE 'Cron job already exists, skipping creation';
    RETURN;
  END IF;
  
  -- Only schedule if service role key is provided
  IF service_role_key = 'YOUR-SERVICE-ROLE-KEY' THEN
    RAISE NOTICE '⚠️  Service role key not provided. Cron job will not be created.';
    RAISE NOTICE '   To set up the cron job later, run scripts/setup_ticket_webhook_cron.sql with your service role key.';
    RETURN;
  END IF;
  
  -- Build webhook URL
  webhook_url := 'https://' || project_ref || '.supabase.co/functions/v1/ticket-activity-webhook';
  
  -- Build cron command
  cron_command := format(
    'SELECT net.http_post(url:=%L, headers:=jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s''), body:=''{}''::jsonb) AS request_id;',
    webhook_url,
    service_role_key
  );
  
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

