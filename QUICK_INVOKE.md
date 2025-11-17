# Quick Invoke Function - Process Your 6 Pending Entries

Since the "Invoke Function" button isn't visible in your dashboard, here's the easiest way:

## Option 1: Use the Script (Easiest)

Run this command:

```bash
cd fms/fms
./scripts/invoke_webhook_quick.sh
```

The script will ask for your Service Role Key, then invoke the function.

## Option 2: Direct cURL Command

### Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard**
2. Click **Settings** (gear icon) → **API**
3. Scroll down to find **service_role** key
4. Click the **eye icon** or **reveal** to show it
5. Copy the entire key (it starts with `eyJ`)

### Step 2: Run This Command

Replace `YOUR-SERVICE-ROLE-KEY` with the key you just copied:

```bash
curl -X POST https://mxrjygxhjeubisjrfmfr.supabase.co/functions/v1/ticket-activity-webhook \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Expected Response

You should see something like:

```json
{
  "processed": 6,
  "delivered": 6,
  "failed": 0
}
```

## Verify It Worked

After running the command, check your queue:

1. **Go to Supabase Dashboard → Table Editor**
2. **Select `ticket_webhook_queue` table**
3. **Filter by status** - You should see entries moved from `pending` to `delivered`

Or run this SQL:

```sql
SELECT status, COUNT(*) 
FROM ticket_webhook_queue 
GROUP BY status;
```

## What to Check After Invocation

1. **Response shows processed/delivered counts** ✅
2. **Queue entries moved to `delivered`** ✅  
3. **Check Make webhook** - Should receive payloads
4. **Function logs should now show activity** ✅

## If You Get Errors

### 401 Unauthorized
- Make sure you're using the **service_role** key, not the **anon** key
- The key should start with `eyJ`

### 404 Not Found
- Function might not be deployed (but we verified it is)
- Check the URL is correct

### 500 Internal Server Error
- Check function logs in Supabase Dashboard → Functions → `ticket-activity-webhook` → Logs
- Might be an issue with tenant webhook URLs

## Next Step: Set Up Cron Job

After confirming the manual invocation works, set up the cron job so it runs automatically every minute. Use the setup script: `scripts/setup_ticket_webhook_cron.sql`

