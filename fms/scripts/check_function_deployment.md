# Check Function Deployment

## Step 1: Verify Function is Deployed

Run this command:
```bash
cd fms/fms
supabase functions list
```

You should see `ticket-activity-webhook` in the list.

## Step 2: If Not Deployed, Deploy It

```bash
cd fms/fms
supabase functions deploy ticket-activity-webhook
```

## Step 3: Verify Function Configuration

Check if the function has the required environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

These should be set automatically by Supabase, but you can verify in the dashboard:
- Supabase Dashboard → Functions → `ticket-activity-webhook` → Settings → Environment Variables

## Step 4: Test Function Manually

### Option A: Using Supabase Dashboard
1. Go to Supabase Dashboard
2. Navigate to Functions → `ticket-activity-webhook`
3. Click "Invoke Function"
4. Body: `{}`
5. Click "Invoke"
6. Check the response

### Option B: Using cURL

Get your values:
- **Project Reference**: Found in your Supabase URL (e.g., `abc123xyz` in `https://abc123xyz.supabase.co`)
- **Service Role Key**: Supabase Dashboard → Settings → API → `service_role` key (secret)

Then run:
```bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/ticket-activity-webhook \
  -H "Authorization: Bearer YOUR-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Option C: Using the Script

Edit `scripts/manual_invoke_webhook.sh` with your values, then:
```bash
chmod +x scripts/manual_invoke_webhook.sh
./scripts/manual_invoke_webhook.sh
```

## Expected Response

If successful, you should see:
```json
{
  "processed": 6,
  "delivered": 6,
  "failed": 0
}
```

## Troubleshooting Empty Logs

If logs are empty:
1. **Function might not be deployed** - Deploy it first
2. **Function might have errors on startup** - Check function code
3. **Function might not be receiving requests** - Verify URL and authentication
4. **Logs might be delayed** - Wait a few seconds and refresh

## Check Function Code

Make sure the function exists at:
```
fms/fms/supabase/functions/ticket-activity-webhook/index.ts
```

If it exists, verify it's properly configured.

