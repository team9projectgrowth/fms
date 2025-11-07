# Telegram Webhook Edge Function

This Supabase Edge Function receives webhook calls from the automation layer (MCP) to create tickets.

## Deployment

To deploy this function:

```bash
supabase functions deploy telegram-webhook
```

## Endpoint

After deployment, the endpoint will be:
```
https://<project-ref>.supabase.co/functions/v1/telegram-webhook
```

## Request Format

POST request with JSON body:

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
  "tenant_id": "uuid-here",
  "type": "Maintenance",
  "building": "Building A",
  "floor": "3",
  "room": "301"
}
```

## Response Format

Success (200):
```json
{
  "success": true,
  "ticket_id": "uuid",
  "ticket_number": "TKT-1234"
}
```

Error (400/404/500):
```json
{
  "error": "Error message"
}
```

## Environment Variables

The function requires:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for bypassing RLS

These are automatically available in Supabase Edge Functions.

## Note

This is an optional implementation. The automation layer can also call the `telegramWebhookService.receiveTicketFromAutomation()` function directly if you have an API endpoint set up, or you can create a custom API route that uses the service.

