-- ============================================================================
-- Setup Script: Schedule Ticket Activity Webhook Cron Job
-- ============================================================================
-- IMPORTANT: Replace YOUR-PROJECT-REF and YOUR-SERVICE-ROLE-KEY before running
--
-- To get these values:
-- 1. Project Reference: Found in your Supabase URL (e.g., abc123xyz in https://abc123xyz.supabase.co)
-- 2. Service Role Key: Supabase Dashboard > Settings > API > service_role key (secret)
--
-- Run this in Supabase SQL Editor

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Check if extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN '✓ pg_cron extension is enabled'
    ELSE '✗ Failed to enable pg_cron extension. Check Supabase plan supports it.'
  END as extension_status;

-- Step 3: Unschedule existing job if it exists (idempotent)
SELECT cron.unschedule('ticket-activity-webhook-dispatcher')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher'
);

-- Step 4: Create the cron job
-- REPLACE THE FOLLOWING VALUES:
--   YOUR-PROJECT-REF: Your Supabase project reference
--   YOUR-SERVICE-ROLE-KEY: Your Supabase service role key

DO $$
DECLARE
  project_ref TEXT := 'YOUR-PROJECT-REF';  -- REPLACE THIS
  service_role_key TEXT := 'YOUR-SERVICE-ROLE-KEY';  -- REPLACE THIS
  webhook_url TEXT;
BEGIN
  -- Build webhook URL
  webhook_url := 'https://' || project_ref || '.supabase.co/functions/v1/ticket-activity-webhook';
  
  -- Schedule the cron job
  PERFORM cron.schedule(
    'ticket-activity-webhook-dispatcher',
    '* * * * *', -- Every minute
    format($cron$
      SELECT
        net.http_post(
          url:=%L,
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer %s'
          ),
          body:='{}'::jsonb
        ) AS request_id;
    $cron$, webhook_url, service_role_key)
  );
  
  RAISE NOTICE 'Cron job scheduled successfully: ticket-activity-webhook-dispatcher';
  RAISE NOTICE 'Webhook URL: %', webhook_url;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling cron job: %', SQLERRM;
    RAISE NOTICE 'You may need to run the SQL manually with actual values';
END $$;

-- Step 5: Verify the cron job was created
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname,
  '✓ Cron job is scheduled' as status
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';

-- ============================================================================
-- Alternative: Manual SQL (if DO block doesn't work)
-- ============================================================================
-- If the DO block above doesn't work, use this instead (replace values):
--
-- SELECT cron.schedule(
--   'ticket-activity-webhook-dispatcher',
--   '* * * * *',
--   $$
--   SELECT
--     net.http_post(
--       url:='https://YOUR-PROJECT-REF.supabase.co/functions/v1/ticket-activity-webhook',
--       headers:=jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY'
--       ),
--       body:='{}'::jsonb
--     ) AS request_id;
--   $$
-- );

