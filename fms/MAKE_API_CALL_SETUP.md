# Make API Call Module Setup for Supabase

This guide shows how to configure Make's "Make an API Call" module to connect to Supabase FMS.

## Step-by-Step Setup

### 1. Create API Connection in Make

1. In your Make scenario, add **"Make an API Call"** module
2. Click **"Add a new connection"** or select existing
3. Choose **"Custom API"** or **"REST API"**
4. Configure connection:
   - **Connection Name**: `Supabase FMS` (or any name)
   - **Base URL**: `https://YOUR-PROJECT-REF.supabase.co/rest/v1`
   - **Authentication Type**: Choose one:
     
     **Option 1: Bearer Token (Recommended)**
     - Authentication: `Bearer Token`
     - Token: Your Supabase `anon` key
     
     **Option 2: API Key in Header**
     - Authentication: `API Key in Header`
     - Header Name: `apikey`
     - API Key: Your Supabase `anon` key
     - Additional Header: `Authorization: Bearer YOUR-ANON-KEY`

5. Click **"Save"** to create connection

### 2. Configure API Call Action

1. **Method**: Select `POST`
2. **Endpoint/Path**: `/rpc/create_ticket_from_automation`
3. **Headers** (if needed):
   ```
   Content-Type: application/json
   ```
   (Authorization should be handled by connection settings)

4. **Request Body**:
   
   **Option A: Use JSON Editor**
   ```json
   {
     "p_issue": "{{parsed_issue}}",
     "p_location": "{{parsed_location}}",
     "p_category": "{{parsed_category}}",
     "p_priority": "{{parsed_priority}}",
     "p_user_name": "{{telegram.user.first_name}}",
     "p_chat_id": "{{telegram.chat.id}}",
     "p_tenant_id": "YOUR-TENANT-UUID",
     "p_type": "Maintenance",
     "p_building": "{{parsed_building}}",
     "p_floor": "{{parsed_floor}}",
     "p_room": "{{parsed_room}}"
   }
   ```
   
   **Option B: Use Make's Data Mapper**
   - Click on body field
   - Use Make's mapper to select data from previous modules
   - Map each field:
     - `p_issue` → From your text parser module
     - `p_location` → From your text parser module
     - `p_category` → From your category detection module
     - `p_priority` → From your priority detection module
     - `p_user_name` → From Telegram module
     - `p_chat_id` → From Telegram module (`chat.id`)
     - `p_tenant_id` → Hardcode your tenant UUID or map from database
     - Other fields → Map as available

### 3. Handle Response

The API will return:
```json
{
  "success": true,
  "ticket_id": "uuid",
  "ticket_number": "TKT-1234",
  "message": "Ticket created successfully"
}
```

Use Make's mapper to access:
- `{{api_response.ticket_id}}`
- `{{api_response.ticket_number}}`

### 4. Error Handling

If there's an error, the API returns:
```json
{
  "success": false,
  "error": "Error message here"
}
```

In Make, add an **Error Handler** module or use **Router** to check:
- `{{api_response.success}}` = `false` → Handle error
- `{{api_response.success}}` = `true` → Continue flow

## Example Make Scenario Flow

```
1. Telegram (Trigger)
   ↓
2. Text Parser / AI Module (Parse message)
   ↓
3. Make API Call → create_ticket_from_automation
   ↓
4. Router (Check success)
   ├─ Success → Continue
   └─ Error → Send error message to user
   ↓
5. Webhook (Receive update from FMS)
   ↓
6. Telegram (Send confirmation)
```

## Benefits of Using "Make an API Call"

✅ **Connection Reuse**: Create once, use in multiple scenarios  
✅ **Better Authentication**: Handles auth automatically  
✅ **Error Handling**: Built-in retry and error handling  
✅ **Data Mapping**: Visual mapper for easy data transformation  
✅ **Type Safety**: Better validation of request/response  
✅ **Debugging**: Easier to debug with Make's tools  

## Troubleshooting

**Error: "Unauthorized"**
- Check your Supabase anon key is correct
- Verify authentication is configured in connection
- Ensure both `apikey` header and `Authorization` header are set

**Error: "Function not found"**
- Verify you ran the SQL migration
- Check function exists: `SELECT proname FROM pg_proc WHERE proname = 'create_ticket_from_automation';`

**Error: "User not found"**
- Verify user exists with correct `telegram_chat_id`
- Check `tenant_id` matches the user's tenant

**Error: "Invalid priority"**
- Use lowercase: "critical", "high", "medium", "low"
- Check priority value is not null

## Testing the Connection

1. Run a test execution in Make
2. Check the API Call module output
3. Verify response contains `"success": true`
4. Check Supabase dashboard to see if ticket was created

