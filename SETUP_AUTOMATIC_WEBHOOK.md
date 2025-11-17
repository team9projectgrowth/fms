# Setup Automatic Webhook Processing

Now that manual invocation is working, let's set up automatic processing every minute!

## Quick Setup (3 Steps)

### Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard**
2. Click **Settings** (gear icon) → **API**
3. Scroll down to find **service_role** key
4. Click **reveal** or **eye icon** to show it
5. Copy the entire key (starts with `eyJ`)

### Step 2: Use the Interactive Script (Easiest)

```bash
cd fms/fms
./scripts/setup_cron_interactive.sh
```

The script will:
- Ask for your service role key
- Generate a SQL script ready to run
- Show you exactly what to do next

### Step 3: Run the SQL in Supabase

1. **Copy the SQL** from the script output (or the generated file)
2. Go to **Supabase Dashboard → SQL Editor**
3. **Paste the SQL** into the editor
4. Click **Run** or press `Cmd/Ctrl + Enter`
5. **Verify** you see: `✓ Cron job is scheduled and active!`

## Alternative: Manual SQL Setup

If you prefer to do it manually:

### Option A: Use the Ready-to-Use SQL File

1. Open `scripts/setup_cron_job.sql`
2. Replace `YOUR-SERVICE-ROLE-KEY` with your actual service role key
3. Copy the entire SQL
4. Run it in Supabase SQL Editor

### Option B: Copy-Paste Direct SQL

Run this in Supabase SQL Editor (replace `YOUR-SERVICE-ROLE-KEY`):

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if any
SELECT cron.unschedule('ticket-activity-webhook-dispatcher')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher'
);

-- Schedule the cron job
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
```

## Verify It's Working

After setting up, verify the cron job:

```sql
SELECT * FROM cron.job 
WHERE jobname = 'ticket-activity-webhook-dispatcher';
```

Should show:
- `schedule` = `* * * * *` (every minute)
- `active` = `true` ✓

### Check Recent Cron Runs

```sql
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher')
ORDER BY start_time DESC
LIMIT 10;
```

### Test It Works

1. **Create a new executor update** (via dashboard or Telegram)
2. **Wait 1-2 minutes**
3. **Check queue status**:
   ```sql
   SELECT status, COUNT(*) 
   FROM ticket_webhook_queue 
   GROUP BY status;
   ```
4. **Check Make webhook** - Should receive the payload automatically!

## Troubleshooting

### Cron Job Not Running

Check if it's active:
```sql
SELECT active FROM cron.job 
WHERE jobname = 'ticket-activity-webhook-dispatcher';
```

If `active = false`, enable it:
```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'ticket-activity-webhook-dispatcher';
```

### Check for Errors

```sql
SELECT 
  runid,
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ticket-activity-webhook-dispatcher')
  AND status = 'failed'
ORDER BY start_time DESC
LIMIT 5;
```

### Remove and Recreate Cron Job

If something goes wrong:

```sql
-- Remove
SELECT cron.unschedule('ticket-activity-webhook-dispatcher');

-- Then run the setup SQL again
```

## What Happens Now

✅ **Every minute**, the cron job will:
1. Invoke the `ticket-activity-webhook` function
2. Process pending queue items (up to 10 at a time)
3. Send webhooks to Make for each item
4. Update queue status to `delivered` or `failed`

✅ **Executor updates** will now:
1. Create ticket activity → Trigger adds to queue
2. Cron job processes it within 1 minute
3. Make webhook receives the payload automatically
4. Complainant gets notified via Make automation

## Monitoring

To monitor the system:

```sql
-- Check queue status
SELECT status, COUNT(*) 
FROM ticket_webhook_queue 
GROUP BY status;

-- Check recent activity
SELECT 
  q.status,
  q.attempt_count,
  q.created_at,
  ta.activity_type,
  LEFT(ta.comment, 50) as comment
FROM ticket_webhook_queue q
LEFT JOIN ticket_activities ta ON ta.id = q.activity_id
ORDER BY q.created_at DESC
LIMIT 20;
```

## Success Indicators

You'll know it's working when:
- ✅ Queue entries move from `pending` to `delivered` within 1-2 minutes
- ✅ Cron job runs show in `cron.job_run_details`
- ✅ Make webhook receives payloads automatically
- ✅ Function logs show processing activity

---

**All set!** Your webhook system is now fully automated. 🎉

