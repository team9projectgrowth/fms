-- ============================================================================
-- Quick Setup: Ticket Activity Webhook Cron Job
-- ============================================================================
-- Run this in Supabase SQL Editor
-- 
-- STEP 1: Get your Service Role Key
--   - Go to Supabase Dashboard → Settings → API
--   - Find 'service_role' key (secret, starts with 'eyJ')
--   - Copy the entire key
--
-- STEP 2: Replace YOUR-SERVICE-ROLE-KEY below with your actual key
-- 
-- STEP 3: Run this SQL in Supabase SQL Editor

-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if any
SELECT cron.unschedule('ticket-activity-webhook-dispatcher')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher'
);

-- Schedule the cron job
-- ⚠️ REPLACE YOUR-SERVICE-ROLE-KEY WITH YOUR ACTUAL KEY ⚠️
SELECT cron.schedule(
  'ticket-activity-webhook-dispatcher',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url:='https://mxrjygxhjeubisjrfmfr.supabase.co/functions/v1/ticket-activity-webhook',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY'  -- ⚠️ REPLACE THIS ⚠️
      ),
      body:='{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify it was created
SELECT 
  jobid,
  schedule,
  active,
  jobname,
  '✓ Cron job is scheduled and active!' as status
FROM cron.job
WHERE jobname = 'ticket-activity-webhook-dispatcher';

