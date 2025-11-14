# Setup Ticket Activity Webhook Cron Job

This guide shows how to schedule the `ticket-activity-webhook` function to run every minute.

## Option 1: Using Supabase pg_cron (Recommended)

### Prerequisites
- Access to Supabase Dashboard
- Service Role Key (Settings > API > service_role key)
- Project Reference (found in your Supabase URL)

### Steps

1. **Get your project details:**
   - Project Reference: Found in your Supabase URL (`https://YOUR-PROJECT-REF.supabase.co`)
   - Service Role Key: Supabase Dashboard > Settings > API > `service_role` key (secret)

2. **Run this SQL in Supabase SQL Editor:**

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job (replace YOUR-PROJECT-REF and YOUR-SERVICE-ROLE-KEY)
SELECT cron.schedule(
  'ticket-activity-webhook-dispatcher',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url:='https://YOUR-PROJECT-REF.supabase.co/functions/v1/ticket-activity-webhook',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY'
      ),
      body:='{}'::jsonb
    ) AS request_id;
  $$
);
```

3. **Verify the cron job is scheduled:**

```sql
SELECT * FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher';
```

4. **Check if it's running (optional):**

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher')
ORDER BY start_time DESC
LIMIT 10;
```

## Option 2: Manual Testing (Quick Check)

To manually trigger the function for testing:

```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/ticket-activity-webhook \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or use Supabase Dashboard:
1. Go to **Functions** in the sidebar
2. Find `ticket-activity-webhook`
3. Click **"Invoke Function"**
4. Body: `{}`
5. Click **"Invoke"**

## Option 3: Using External Scheduler (Alternative)

If pg_cron is not available, you can use an external service like:
- **Make.com** (Integromat) - Set up a webhook that triggers every minute
- **n8n** - Use cron node
- **GitHub Actions** - Schedule workflow
- **Vercel Cron** - If hosting elsewhere

## Troubleshooting

### Check if queue items are being created:

```sql
SELECT 
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
LIMIT 10;
```

### Check if trigger exists:

```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_enqueue_ticket_activity_webhook';
```

### Check function logs:

In Supabase Dashboard:
1. Go to **Functions** > `ticket-activity-webhook`
2. Click **"Logs"** tab
3. Look for errors or processing messages

## Verify End-to-End Flow

1. **Create an executor update:**
   - Update a ticket as an executor (via dashboard or Telegram bot)
   - This should create a ticket_activity with type `executor_update`

2. **Check queue:**
   ```sql
   SELECT * FROM ticket_webhook_queue 
   WHERE status = 'pending' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Wait 1 minute** or manually trigger the function

4. **Check queue status:**
   ```sql
   SELECT status, COUNT(*) 
   FROM ticket_webhook_queue 
   GROUP BY status;
   ```

5. **Check Make webhook** - Should receive the payload

