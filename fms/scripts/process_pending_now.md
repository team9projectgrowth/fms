# Process Pending Queue Items Now

Since you have 6 pending entries and logs are empty, let's manually invoke the function to process them.

## Quick Fix: Manual Invocation

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard**
2. Navigate to **Functions** → `ticket-activity-webhook`
3. Click **"Invoke Function"** button
4. In the body field, enter: `{}`
5. Click **"Invoke"**
6. Check the response - should show:
   ```json
   {
     "processed": 6,
     "delivered": 6,
     "failed": 0
   }
   ```

### Option 2: Using cURL

First, get your values from Supabase Dashboard:
- **Project Reference**: Found in your Supabase URL
- **Service Role Key**: Settings → API → `service_role` key (secret)

Then run:
```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/ticket-activity-webhook \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Option 3: Check What's Preventing Processing

Run this SQL to see if there are any issues:

```sql
-- Check if entries are ready to process
SELECT 
  COUNT(*) as pending_count,
  MIN(next_attempt_at) as earliest_attempt,
  MAX(created_at) as newest_entry
FROM ticket_webhook_queue
WHERE status = 'pending';

-- Check tenant webhook configuration
SELECT 
  q.id,
  t.name as tenant_name,
  t.automation_webhook_url
FROM ticket_webhook_queue q
JOIN tenants t ON t.id = q.tenant_id
WHERE q.status = 'pending'
LIMIT 6;
```

## After Manual Invocation

1. **Check the response** - Should show processed/delivered counts
2. **Check Make webhook** - Should receive the payloads
3. **Verify queue status**:
   ```sql
   SELECT status, COUNT(*) 
   FROM ticket_webhook_queue 
   GROUP BY status;
   ```
   Should show entries moved from `pending` to `delivered`

## Why Logs Are Empty

Empty logs usually mean:
1. Function hasn't been invoked yet (most likely - fix with manual invocation above)
2. Cron job isn't running (need to set it up)
3. Function has silent errors (check response after manual invocation)

## Next: Fix Cron Job

After confirming manual invocation works, set up the cron job so it runs automatically every minute.

