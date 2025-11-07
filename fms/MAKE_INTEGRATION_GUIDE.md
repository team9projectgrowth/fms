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

After ticket creation and rule engine processing, the FMS system sends ticket details to Make.

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

Make will receive POST requests with this structure:

```json
{
  "ticket_id": "uuid",
  "ticket_number": "TKT-1234",
  "issue": "AC not working in Building A",
  "location": "Building A, Floor 3",
  "category": "HVAC",
  "priority": "high",
  "status": "in-progress",
  "sla": "2024-11-10T18:00:00Z",
  "allocated_to": "executor-uuid",
  "allocated_to_name": "John Smith"
}
```

**Fields:**
- `ticket_id`: Unique ticket ID
- `ticket_number`: Human-readable ticket number
- `issue`: Ticket title/description
- `location`: Location of the issue
- `category`: Ticket category
- `priority`: Final priority (after rule engine processing)
- `status`: Current status ("open", "in-progress", "resolved", "closed")
- `sla`: Due date in ISO format (if set by rule engine)
- `allocated_to`: Executor ID (if allocated)
- `allocated_to_name`: Executor name (if allocated)

### When Webhooks are Sent:

1. **On Ticket Creation**: After rule engine processes the ticket (priority, SLA, allocation)
2. **On Executor Assignment**: When an executor is allocated to the ticket
3. **On Status Change**: When ticket status changes to "resolved" or "closed"

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
  "ticket_id": "uuid",
  "ticket_number": "TKT-1234",
  "issue": "AC not working in Building A",
  "location": "Building A, Floor 3",
  "category": "HVAC",
  "priority": "critical",
  "status": "in-progress",
  "sla": "2024-11-10T14:00:00Z",
  "allocated_to": "executor-uuid",
  "allocated_to_name": "Mike Johnson"
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
- Check FMS logs for webhook delivery issues

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

## 8. Next Steps

1. Deploy Supabase Edge Function
2. Create Make scenario with HTTP module pointing to Edge Function
3. Create Make webhook for receiving ticket updates
4. Configure webhook URL in Tenant Management
5. Test end-to-end flow
6. Monitor logs for any issues

