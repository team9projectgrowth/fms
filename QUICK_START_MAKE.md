# Quick Start: Connect Make to FMS (No CLI Required)

## ✅ Simplest Approach: Use Database Function (Recommended)

### Step 1: Run SQL Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/20251109000001_create_automation_ticket_function.sql`
4. Copy the entire SQL and run it in SQL Editor
5. You should see "Success. No rows returned"

### Step 2: Get Your Supabase Credentials

1. In Supabase Dashboard, go to **Settings → API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: (under Project API keys)

### Step 3: Configure Make

In your Make scenario:

1. **Add "Make an API Call" Module**

2. **Configure the API Call:**
   - **API**: Select "Custom API" or create a new connection
   - **Connection Name**: "Supabase FMS" (or any name)
   - **Base URL**: `https://YOUR-PROJECT-REF.supabase.co/rest/v1`
   - **Authentication**: 
     - Type: **Bearer Token** or **API Key in Header**
     - API Key/Token: Your Supabase `anon` key
     - Header Name: `apikey` (if using API Key in Header)
   
3. **Configure the API Call Action:**
   - **Method**: `POST`
   - **URL Path**: `/rpc/create_ticket_from_automation`
   - **Headers** (if not handled by authentication):
     ```
     Content-Type: application/json
     apikey: YOUR-ANON-KEY
     ```
   - **Request Body** (JSON):
     ```json
     {
       "p_issue": "AC not working",
       "p_location": "Building A, Floor 3",
       "p_category": "HVAC",
       "p_priority": "high",
       "p_user_name": "John Doe",
       "p_chat_id": "123456789",
       "p_tenant_id": "your-tenant-uuid-here"
     }
     ```
   
   **Or use Make's data mapping** to map variables:
   - `p_issue`: Map from previous module (e.g., parsed message)
   - `p_location`: Map from previous module
   - `p_category`: Map from previous module
   - `p_priority`: Map from previous module
   - `p_user_name`: Map from Telegram user data
   - `p_chat_id`: Map from Telegram chat ID
   - `p_tenant_id`: Your tenant UUID (can be hardcoded or mapped)

3. **Response** will be:
   ```json
   {
     "success": true,
     "ticket_id": "uuid",
     "ticket_number": "TKT-1234",
     "message": "Ticket created successfully"
   }
   ```

### Step 4: Configure Outgoing Webhook (FMS → Make)

1. In Make, create a **Webhooks → Custom webhook** (Instant)
2. Copy the webhook URL
3. In FMS:
   - Login as Tenant Admin
   - Go to **Tenant Management**
   - Scroll to **"Automation Integration"**
   - Paste webhook URL
   - Save

---

## 🎯 Complete Flow

```
Telegram User → Make → Supabase REST API → Ticket Created
                                           ↓
                    Rule Engine (runs when ticket viewed in app)
                                           ↓
                    Webhook → Make → Telegram User (confirmation)
```

---

## ⚠️ Important Notes

1. **Rule Engine**: When tickets are created via database function, the rule engine processes them when:
   - Ticket is viewed in the FMS application
   - Admin manually triggers processing
   - You can add a second Make call to trigger processing (see below)

2. **User Setup**: Ensure users have `telegram_chat_id` set in the users table

3. **Testing**: Test with a sample request first before connecting to Telegram

---

## 🔧 Advanced: Trigger Rule Engine Immediately

If you want rule engine to run immediately, add a second HTTP call in Make after ticket creation:

1. Create ticket via `create_ticket_from_automation`
2. Add another HTTP module that calls your application's API to trigger rule engine
3. Or wait for the ticket to be viewed in the application

---

## 📝 Example Make Scenario Structure

```
Telegram (Trigger)
  ↓
Parse Message / Validate User
  ↓
HTTP → create_ticket_from_automation (Create Ticket)
  ↓
HTTP → Application API (Trigger Rule Engine) [Optional]
  ↓
Webhook (Receive Update from FMS)
  ↓
Telegram (Send Confirmation to User)
```

---

## 🆘 Troubleshooting

**Error: "User not found"**
- Check user exists with correct `telegram_chat_id`
- Verify `tenant_id` matches

**Error: "Invalid priority"**
- Use: "critical", "high", "medium", or "low" (lowercase)

**Webhook not receiving updates**
- Verify webhook URL is configured in Tenant Management
- Check webhook is active in Make
- Check FMS logs for errors

---

## 📚 Full Documentation

- See `MAKE_INTEGRATION_NO_CLI.md` for detailed guide
- See `MAKE_INTEGRATION_GUIDE.md` for Edge Function approach (if you install CLI later)

