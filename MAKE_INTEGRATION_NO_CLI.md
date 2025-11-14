# Make Integration Without Supabase CLI (Alternative Approach)

If you don't want to install Supabase CLI or use Edge Functions, you can use one of these approaches:

## Option 1: Use Supabase REST API Directly (Recommended - No CLI Required)

Make can call Supabase REST API directly to create tickets using a database function.

### Step 1: Run the Migration

Run the migration file in your Supabase SQL Editor:
**File**: `supabase/migrations/20251109000001_create_automation_ticket_function.sql`

Or copy and run the SQL directly:

See the migration file: `supabase/migrations/20251109000001_create_automation_ticket_function.sql`

This creates a function that:
- Validates the user by chat_id
- Creates the ticket
- Returns ticket ID and number
- Handles errors gracefully

### Step 3: Configure in Make

In Make, use **"Make an API Call"** module (recommended) or **HTTP > Make a Request** module:

#### Option A: Using "Make an API Call" Module (Recommended)

1. **Create API Connection:**
   - Click "Add a new connection"
   - Select "Custom API" or "REST API"
   - **Base URL**: `https://<your-project-ref>.supabase.co/rest/v1`
   - **Authentication**: 
     - Method: Bearer Token
     - Token: `<your-supabase-anon-key>`
     - Or use "API Key in Header" with header name: `apikey`

2. **Configure API Call:**
   - **Method**: `POST`
   - **Endpoint**: `/rpc/create_ticket_from_automation`
   - **Headers** (additional if needed):
     ```
     Content-Type: application/json
     ```
   - **Body** (JSON or use Make's mapper):
  ```json
  {
    "p_issue": "AC not working in Building A",
    "p_location": "Building A, Floor 3",
    "p_category": "HVAC",
    "p_priority": "high",
    "p_user_name": "John Doe",
    "p_chat_id": "123456789",
    "p_tenant_id": "your-tenant-uuid",
    "p_type": "Maintenance",
    "p_building": "Building A",
    "p_floor": "3",
    "p_room": "301"
  }
  ```

#### Option B: Using HTTP Module

If you prefer the HTTP module:
- **Method**: `POST`
- **URL**: `https://<your-project-ref>.supabase.co/rest/v1/rpc/create_ticket_from_automation`
- **Headers**:
  ```
  Content-Type: application/json
  apikey: <your-supabase-anon-key>
  Authorization: Bearer <your-supabase-anon-key>
  ```
- **Body**: Same JSON as above

**Note**: "Make an API Call" is preferred because it:
- Handles authentication more securely
- Provides better error handling
- Allows connection reuse across scenarios
- Has built-in retry logic

### Step 4: Rule Engine Processing

**Important Note**: The rule engine is in the application layer (TypeScript), not in the database. When you create a ticket via this database function, the rule engine won't run automatically.

**Option A**: The rule engine will process the ticket when:
- The ticket is fetched/displayed in the application
- An admin manually triggers rule processing
- You create a webhook/trigger that calls your application's rule engine endpoint

**Option B**: Create a database trigger that calls your application (requires HTTP extension):
```sql
-- This requires the http extension and is more complex
-- Not recommended unless you have specific needs
```

**Recommended**: Use the database function to create tickets. Rule engine will process when tickets are viewed in the application, or you can manually trigger it via the UI.

---

## Option 2: Create a Simple API Endpoint

If you have a server or can deploy a simple Node.js/Express endpoint:

### Create `api/telegram-webhook.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import { telegramWebhookService } from '../src/services/telegram-webhook.service.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ticket = await telegramWebhookService.receiveTicketFromAutomation(req.body);
    res.status(200).json({
      success: true,
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
}
```

### Deploy to:
- Vercel
- Netlify Functions
- Railway
- Render
- Any Node.js hosting

---

## Option 3: Use Make's Built-in Modules

If Make has Supabase modules, you can use them directly:
1. Add Supabase module in Make
2. Configure connection
3. Insert directly into tickets table
4. Handle rule engine processing separately

---

## Recommended: Use Option 1 (Database Function)

This is the simplest approach that doesn't require:
- Supabase CLI installation
- Edge Functions deployment
- Additional server setup

Just run the SQL in Supabase dashboard and configure Make to call the RPC function.

---

## Getting Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Settings → API
3. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: Use this as `apikey` and in `Authorization: Bearer`

---

## Testing the Database Function

Test in Supabase SQL Editor:

```sql
SELECT create_ticket_from_automation(
  'Test issue',
  'Test location',
  'IT',
  'medium',
  'Test User',
  '123456789',
  'your-tenant-uuid'::uuid
);
```

You should get a JSON response with `success: true` and ticket details.

