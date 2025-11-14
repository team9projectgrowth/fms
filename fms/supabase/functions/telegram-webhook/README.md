# Telegram Webhook Edge Function

This Supabase Edge Function receives automation payloads (for example, from Make/Integromat) and creates tickets in FMS. It no longer manages executor Telegram interactions—those now live in the dedicated [`executor-ticket-webhook`](../executor-ticket-webhook/README.md) function.

## Deployment

After logging in with the Supabase CLI and linking your project:

```bash
supabase functions deploy telegram-webhook
```

## Endpoint

```
https://<project-ref>.supabase.co/functions/v1/telegram-webhook
```

## Request Format

`POST` JSON body:

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
  "ticket_number": "FMS-XXX-0000"
}
```

Errors (400/403/404/500) return:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

These are provided automatically for Supabase Edge Functions. No Telegram token is needed for this automation-only endpoint.

## Related Executor Webhook

Executors interacting with the Telegram bot should target the separate [`executor-ticket-webhook`](../executor-ticket-webhook/README.md) endpoint, which lists assigned tickets, handles status changes, and records updates in `ticket_activities`.

