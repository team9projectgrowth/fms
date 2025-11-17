-- ============================================================================
-- Migration: Schedule ticket-activity-webhook function to run periodically
-- ============================================================================
-- This migration sets up a cron job to invoke the ticket-activity-webhook
-- function every minute to process the ticket_webhook_queue.

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: The actual cron job needs to be created manually via Supabase Dashboard
-- or using the Supabase CLI/MCP tools because it requires the project reference
-- and service role key which are environment-specific.

-- Instructions:
-- 1. Get your project reference from Supabase Dashboard
-- 2. Get your service role key from Supabase Dashboard (Settings > API)
-- 3. Run this SQL manually in Supabase SQL Editor or use Supabase CLI:
--
-- SELECT cron.schedule(
--   'ticket-activity-webhook-dispatcher',
--   '* * * * *', -- Every minute
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
--
-- To check if cron job exists:
-- SELECT * FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher';
--
-- To remove cron job if needed:
-- SELECT cron.unschedule('ticket-activity-webhook-dispatcher');

-- Create a helper function to check if cron job is scheduled
CREATE OR REPLACE FUNCTION public.check_ticket_webhook_cron_scheduled()
RETURNS TABLE (
  job_id bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
  FROM cron.job
  WHERE jobname = 'ticket-activity-webhook-dispatcher';
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_ticket_webhook_cron_scheduled() TO authenticated;

COMMENT ON FUNCTION public.check_ticket_webhook_cron_scheduled() IS 
'Check if the ticket-activity-webhook cron job is scheduled. Returns empty if not scheduled.';

