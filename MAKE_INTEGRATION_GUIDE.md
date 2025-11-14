# Make (Integromat) Integration Guide

This guide explains how to connect your Make (formerly Integromat) automation layer to the FMS Ticket System.

## Overview

There are two webhook directions:
1. **Incoming**: Make sends ticket data → FMS system (ticket creation)
2. **Outgoing**: FMS system sends ticket updates → Make webhook URL (configured per tenant)

---

## 1. Receiving Tickets from Make (Incoming Webhook)

Make will send validated ticket data to your FMS system. You have two options:

### Option A: Supabase Edge Function (Recommended if CLI installed)

**Endpoint:** `https://<your-project-ref>.supabase.co/functions/v1/telegram-webhook`

**Setup in Make:**
1. In your Make scenario, add a **"Make an API Call"** module
2. **Configure API Connection:**
   - Base URL: `https://<your-project-ref>.supabase.co/functions/v1`
   - Authentication: Bearer Token (use your Supabase anon key)
3. **Configure API Call:**
   - **Method**: `POST`
   - **Endpoint**: `/telegram-webhook`
   - **Headers**:
     ```
     Content-Type: application/json
     ```
   - **Body**: JSON payload with ticket data (use Make's mapper to map fields)

**Alternative:** You can also use **HTTP > Make a Request** module if you prefer.

**Payload Format:**
```json
{
  "issue": "AC not working in Building A",
  "location": "Building A, Floor 3",
  "category": "HVAC",
  "priority": "high",
  "name": "John Doe",
  "designation": "Manager",
  "department": "IT",
  "chat_id": "123456789",
  "tenant_id": "uuid-of-tenant",
  "type": "Maintenance",
  "building": "Building A",
  "floor": "3",
  "room": "301"
}
```

**Required Fields:**
- `issue` (string): Description of the issue
- `location` (string): Location of the issue
- `category` (string): Ticket category (e.g., "HVAC", "IT", "Plumbing")
- `priority` (string): "critical", "high", "medium", or "low"
- `name` (string): User's name
- `chat_id` (string): Telegram chat ID
- `tenant_id` (string): UUID of the tenant

**Optional Fields:**
- `designation` (string): User's designation
- `department` (string): User's department
- `type` (string): Ticket type (defaults to "Maintenance" if not provided)
- `building` (string): Building name/number
- `floor` (string): Floor number
- `room` (string): Room number

**Response:**
```json
{
  "success": true,
  "ticket_id": "uuid",
  "ticket_number": "TKT-1234"
}
```

### Option B: Direct API Call (Alternative)

If you prefer not to use Edge Functions, you can call the service directly through a custom API endpoint you create.

---

## 2. Sending Ticket Updates to Make (Outgoing Webhook)

After ticket creation and rule engine processing, the FMS system sends ticket details to Make. Each subsequent ticket activity (comments, status changes, executor updates, etc.) is also pushed through a durable queue so Make receives every change in order.

### Setup in Make:

1. **Create a Webhook in Make:**
   - Add a **Webhooks > Custom webhook** module
   - Choose **"Instant"** trigger
   - Copy the webhook URL (e.g., `https://hook.integromat.com/xxxxx`)

2. **Configure in FMS:**
   - Login as Tenant Admin
   - Go to **Tenant Management**
   - Scroll to **"Automation Integration"** section
   - Paste your Make webhook URL in **"Automation Webhook URL"** field
   - Click **"Save Changes"**

### Webhook Payload Format:

Ticket update and activity webhooks now include rich context so automations can notify complainants directly:

```json
{
  "tenant_id": "tenant-uuid",
  "tenant_name": "ACME Facilities",
  "ticket_id": "uuid",
  "ticket_number": "TKT-1234",
  "status": "in-progress",
  "priority": "high",
  "title": "AC not working in Building A",
  "description": "Compressor offline alarm triggered",
  "location": "Building A, Floor 3",
  "complainant": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0100",
    "chat_id": "123456789"
  },
  "latest_activity": {
    "id": "activity-uuid",
    "type": "executor_update",
    "comment": "On site, compressor motor replaced.",
    "metadata": {
      "photo_count": 2
    },
    "created_at": "2025-11-13T10:30:00.000Z",
    "created_by": {
      "id": "executor-user-uuid",
      "name": "Mike Johnson"
    }
  },
  "generated_at": "2025-11-13T10:31:02.000Z"
}
```

**Key Fields:**
- `complainant.chat_id`: Telegram chat ID used to reach the complainant
- `latest_activity`: Mirrors the newest row in `ticket_activities`
- `generated_at`: Timestamp when the dispatcher sent the webhook

### When Webhooks are Sent:

1. **On Ticket Creation**: After rule engine processes the ticket (priority, SLA, allocation)
2. **On Executor Assignment**: When an executor is allocated to the ticket
3. **On Status Change**: When ticket status changes to "resolved" or "closed"
4. **On Ticket Activities**: Any new row in `ticket_activities` (executor updates, comments, complainant interactions, etc.)

---

## 3. Complete Flow Example

### Step 1: User sends message via Telegram
User: "AC not working in Building A, Floor 3"

### Step 2: Make processes the message
- Validates user
- Parses natural language
- Determines category: "HVAC"
- Determines basic priority: "high"
- Extracts location: "Building A, Floor 3"

### Step 3: Make sends to FMS
Make → HTTP POST → FMS Edge Function
```json
{
  "issue": "AC not working in Building A",
  "location": "Building A, Floor 3",
  "category": "HVAC",
  "priority": "high",
  "name": "John Doe",
  "chat_id": "123456789",
  "tenant_id": "tenant-uuid"
}
```

### Step 4: FMS processes ticket
- Creates ticket
- Rule engine determines final priority, SLA, and executor allocation
- Ticket status may change to "in-progress" if executor is allocated

### Step 5: FMS sends update to Make
FMS → HTTP POST → Make Webhook URL
```json
{
  "tenant_id": "tenant-uuid",
  "ticket_id": "uuid",
  "ticket_number": "TKT-1234",
  "status": "in-progress",
  "priority": "critical",
  "title": "AC not working in Building A",
  "location": "Building A, Floor 3",
  "complainant": {
    "name": "John Doe",
    "chat_id": "123456789"
  },
  "latest_activity": {
    "type": "executor_update",
    "comment": "On site, compressor motor replaced."
  }
}
```

### Step 6: Make sends confirmation to user
Make → Telegram Bot → User
"✅ Ticket TKT-1234 created. Assigned to Mike Johnson. Due: Nov 10, 2:00 PM"

---

## 4. Error Handling

### Incoming Webhook Errors:

If Make receives an error response:
- **400 Bad Request**: Missing required fields or invalid data
- **404 Not Found**: User not found with provided chat_id
- **403 Forbidden**: User is not active
- **500 Internal Server Error**: Server error

Make should handle these errors and notify the user accordingly.

### Outgoing Webhook Errors:

If FMS cannot send to Make webhook:
- Error is logged but does not block ticket operations
- Webhook failures are non-blocking
- Entries remain in `ticket_webhook_queue` and the dispatcher retries with exponential backoff
- Check the Supabase function logs (`ticket-activity-webhook`) for detailed failure messages

---

## 5. Testing

### Test Incoming Webhook:

Use curl or Postman:
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/telegram-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -d '{
    "issue": "Test issue",
    "location": "Test location",
    "category": "IT",
    "priority": "medium",
    "name": "Test User",
    "chat_id": "123456789",
    "tenant_id": "your-tenant-uuid"
  }'
```

### Test Outgoing Webhook:

1. Configure webhook URL in Tenant Management
2. Create a ticket (manually or via incoming webhook)
3. Check Make webhook to see if data was received
4. Verify payload structure matches expected format

---

## 6. Security Considerations

1. **API Keys**: Keep Supabase keys secure in Make
2. **Webhook URLs**: Use HTTPS for webhook URLs
3. **Validation**: Always validate incoming data in Make
4. **Error Handling**: Implement proper error handling in Make scenarios
5. **Rate Limiting**: Be aware of rate limits on both sides

---

## 7. Troubleshooting

### Issue: Webhook not receiving data
- Check webhook URL is correctly configured in Tenant Management
- Verify webhook is active in Make
- Check FMS logs for webhook sending errors

### Issue: User not found error
- Ensure user exists in FMS with matching `telegram_chat_id`
- Verify `tenant_id` matches the user's tenant
- Check user is active

### Issue: Ticket created but webhook not sent
- Verify webhook URL is configured for the tenant
- Check webhook URL is valid (starts with https://)
- Review FMS logs for webhook errors

---

## 8. Ticket Activity Dispatcher (Supabase Edge Function)

### Purpose
The `ticket-activity-webhook` edge function dequeues records from `ticket_webhook_queue` (populated by an AFTER INSERT trigger on `ticket_activities`) and posts enriched payloads to each tenant’s Automation Webhook URL. This keeps ticket transactions fast while providing retry/audit visibility.

### Deployment
```bash
supabase functions deploy ticket-activity-webhook
```

### Scheduling
Use a Supabase Cron job (or any scheduler) to invoke the dispatcher, for example every minute:
```bash
supabase functions schedule create ticket-activity-webhook \
  --schedule "*/1 * * * *" \
  --request-body '{}' \
  ticket-activity-webhook
```

### Configuration
Optional environment variables for the function:
- `TICKET_ACTIVITY_WEBHOOK_BATCH` (default `10`)
- `TICKET_ACTIVITY_WEBHOOK_TIMEOUT_MS` (default `10000`)
- `TICKET_ACTIVITY_WEBHOOK_MAX_BACKOFF_MS` (default `3600000`)

### Interaction with Other Webhooks
- User onboarding continues to flow through `user-onboarding-request` using `MAKE_USER_ONBOARDING_WEBHOOK_URL`.
- Ticket activity delivery uses only the per-tenant `Automation Webhook URL`, so onboarding and ticket notifications never interfere with one another.

---

## 9. Next Steps

1. Deploy Supabase Edge Function
2. Create Make scenario with HTTP module pointing to Edge Function
3. Create Make webhook for receiving ticket updates
4. Configure webhook URL in Tenant Management
5. Test end-to-end flow
6. Monitor logs for any issues

---

## 10. Telegram Bot User Onboarding (Deep Link Email)

New complainants and executors are invited to the Telegram bot through a Make scenario:

1. Supabase Edge Function `user-onboarding-request` sends a payload (email, role, correlation id) to the Make webhook.
2. Make generates a Telegram deep-link URL (`https://t.me/<bot>?start=<correlation_id>`).
3. Make sends an invite email with the deep link.
4. The correlation id is stored (Make Data Store) while the system waits for the user.
5. When the user clicks "Start" in Telegram, Make (or the Telegram bot webhook) posts the chat id and correlation id to `user-onboarding-callback`.
6. Supabase updates the user record (`telegram_chat_id`, onboarding status) and pushes a dashboard notification.

Implementation details, blueprints, and optional modules are documented in [`docs/make-user-onboarding-scenario.md`](docs/make-user-onboarding-scenario.md).

