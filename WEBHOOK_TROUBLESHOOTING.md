# Webhook Troubleshooting Guide

## Problem: Webhooks Not Triggering for Executor Updates

When executor updates are saved to the database but webhooks aren't triggered, the issue is typically that the `ticket-activity-webhook` function is not being invoked periodically.

## How It Works

1. **Executor updates a ticket** → Creates a `ticket_activity` record
2. **Database trigger** → Automatically inserts a record into `ticket_webhook_queue`
3. **Cron job** → Invokes `ticket-activity-webhook` function every minute
4. **Function processes queue** → Sends webhooks to Make

## Diagnosis Steps

### Step 1: Check Database Trigger

Run this in Supabase SQL Editor:

```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_enqueue_ticket_activity_webhook';
```

**Expected**: Should return one row showing the trigger exists.

**If missing**: The trigger may not have been created. Run the migration:
```bash
supabase migration up
```

### Step 2: Check if Queue Items Are Being Created

When you create an executor update, check if items are added to the queue:

```sql
SELECT 
  id,
  ticket_id,
  activity_id,
  tenant_id,
  status,
  attempt_count,
  created_at
FROM ticket_webhook_queue
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: Should show entries with `status = 'pending'` when activities are created.

**If empty**: The trigger may not be firing. Check:
- Is `ticket_activities` table being populated?
- Are there any errors in the database logs?

### Step 3: Check Function Deployment

Check if the function is deployed:

```bash
cd fms/fms
supabase functions list
```

Look for `ticket-activity-webhook` in the list.

If not deployed:
```bash
supabase functions deploy ticket-activity-webhook
```

### Step 4: Check Cron Job Scheduling (CRITICAL)

This is usually the issue! Check if the cron job is scheduled:

```sql
SELECT * FROM cron.job 
WHERE jobname = 'ticket-activity-webhook-dispatcher';
```

**If empty**: The cron job is not scheduled. **This is likely your problem!**

### Step 5: Check Tenant Webhook Configuration

Verify your tenant has the Make webhook URL configured:

```sql
SELECT 
  id,
  name,
  automation_webhook_url
FROM tenants
WHERE id = 'YOUR-TENANT-ID';
```

**If NULL or empty**: Configure it in Tenant Management page or via SQL.

## Solution: Set Up Cron Job

### Option A: Using Supabase SQL Editor (Recommended)

1. Get your **Project Reference** from Supabase Dashboard (in the URL)
2. Get your **Service Role Key** from Supabase Dashboard (Settings > API > service_role key)

3. Run this SQL (replace values):

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cron job
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

4. Verify it's scheduled:

```sql
SELECT * FROM cron.job 
WHERE jobname = 'ticket-activity-webhook-dispatcher';
```

### Option B: Use the Setup Script

Use the provided script:

```bash
cd fms/fms
# Edit scripts/setup_ticket_webhook_cron.sql with your values
# Then run it in Supabase SQL Editor
```

### Option C: Manual Testing (Quick Check)

To test immediately without waiting for cron:

```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/ticket-activity-webhook \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or use Supabase Dashboard:
1. Go to **Functions** → `ticket-activity-webhook`
2. Click **"Invoke Function"**
3. Body: `{}`
4. Click **"Invoke"**

## Verification

After setting up the cron job:

1. **Create an executor update** (via dashboard or Telegram bot)

2. **Wait 1-2 minutes** or manually trigger the function

3. **Check queue status**:
   ```sql
   SELECT status, COUNT(*) 
   FROM ticket_webhook_queue 
   GROUP BY status;
   ```
   Should see `delivered` entries increasing.

4. **Check function logs**:
   - Supabase Dashboard → Functions → `ticket-activity-webhook` → Logs
   - Look for processing messages

5. **Check Make webhook** - Should receive the payload

## Common Issues

### Issue: pg_cron extension not available

**Solution**: 
- Check your Supabase plan - pg_cron may require a paid plan
- Alternative: Use external scheduler (Make.com, n8n, GitHub Actions)

### Issue: Cron job runs but webhooks fail

**Check**:
- Is tenant `automation_webhook_url` configured?
- Check function logs for errors
- Verify Make webhook URL is correct

### Issue: Queue items stuck in "pending"

**Check**:
- Is the cron job active?
- Check function logs for errors
- Manually trigger the function to process pending items

### Issue: Trigger not firing

**Check**:
- Is the trigger enabled? (should be automatic)
- Check database logs for trigger errors
- Verify `ticket_activities` insert is successful

## Quick Diagnostic Script

Run this comprehensive check:

```sql
-- Run: scripts/check_webhook_setup.sql
```

This will show the status of all components.

## Need More Help?

1. Check function logs for errors
2. Check database logs for trigger errors
3. Verify all migrations have been run
4. Check Supabase project settings and plan limits

