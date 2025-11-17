# How to Invoke the Function Manually

Since the "Invoke Function" button isn't visible in your Supabase dashboard, here are alternative methods:

## Method 1: Using the Script (Easiest)

Run the provided script:

```bash
cd fms/fms
./scripts/invoke_function.sh
```

The script will:
1. Try to detect your project reference automatically
2. Ask you for your service role key
3. Invoke the function and show results

## Method 2: Using cURL Directly

### Step 1: Get Your Project Reference

Find it in your Supabase Dashboard URL:
- Example: `https://abc123xyz.supabase.co` → Project ref is `abc123xyz`
- Or go to **Settings → General** to see your Project Reference

### Step 2: Get Your Service Role Key

1. Go to **Supabase Dashboard**
2. Click **Settings** (gear icon) in the left sidebar
3. Click **API** in the settings menu
4. Scroll down to find **service_role** key (it's a secret, starts with `eyJ`)
5. Copy the entire key

### Step 3: Invoke the Function

Replace `YOUR-PROJECT-REF` and `YOUR-SERVICE-ROLE-KEY` with your actual values:

```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/ticket-activity-webhook \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Expected Response

If successful, you'll see:
```json
{
  "processed": 6,
  "delivered": 6,
  "failed": 0
}
```

## Method 3: Using Supabase CLI

If you're logged in via CLI:

```bash
cd fms/fms

# Get project ref and invoke
PROJECT_REF=$(supabase status | grep "API URL" | sed 's/.*https:\/\/\([^.]*\)\..*/\1/')
SERVICE_ROLE_KEY="YOUR-SERVICE-ROLE-KEY"  # Get from dashboard

curl -X POST "https://${PROJECT_REF}.supabase.co/functions/v1/ticket-activity-webhook" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Method 4: Using Browser or Postman

### Using Browser (with extension):

Install a REST client extension like "REST Client" or use Postman:

1. **URL**: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/ticket-activity-webhook`
2. **Method**: `POST`
3. **Headers**:
   - `Authorization`: `Bearer YOUR-SERVICE-ROLE-KEY`
   - `Content-Type`: `application/json`
4. **Body**: `{}`

### Using Postman:

1. Create new request
2. Method: `POST`
3. URL: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/ticket-activity-webhook`
4. Headers tab:
   - Key: `Authorization`, Value: `Bearer YOUR-SERVICE-ROLE-KEY`
   - Key: `Content-Type`, Value: `application/json`
5. Body tab → raw → JSON: `{}`
6. Click Send

## After Invocation

1. **Check the response** - Should show processed/delivered/failed counts
2. **Verify queue status** - Run this SQL:
   ```sql
   SELECT status, COUNT(*) 
   FROM ticket_webhook_queue 
   GROUP BY status;
   ```
3. **Check Make webhook** - Should receive the payloads
4. **Check function logs** - Should now show activity

## Troubleshooting

### Error: 404 Not Found
- Check project reference is correct
- Verify function is deployed: `supabase functions list`

### Error: 401 Unauthorized
- Check service role key is correct
- Make sure you're using the `service_role` key, not `anon` key

### Error: 500 Internal Server Error
- Check function logs in Supabase Dashboard
- Verify environment variables are set

### Empty Response or No Change
- Check if queue items have tenant webhook URLs configured
- Verify queue items are in 'pending' status

## Quick Test

To quickly test if the function works:

```sql
-- Check pending entries
SELECT COUNT(*) as pending_count 
FROM ticket_webhook_queue 
WHERE status = 'pending';

-- After invocation, check again
SELECT status, COUNT(*) 
FROM ticket_webhook_queue 
GROUP BY status;
```

The pending count should decrease and delivered count should increase!

