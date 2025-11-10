# Executor Ticket Webhook

This Supabase Edge Function handles **all Telegram interactions for executors**. When the bot receives `/start`, inline button presses, or replies to update prompts, Telegram calls this endpoint, which:

1. Looks up the executor by `telegram_chat_id`.
2. Lists assigned tickets (statuses `open` or `in-progress`) with inline actions (`In Progress`, `Resolved`, `Update`).
3. Records button presses in `executor_ticket_sessions`, updates the `tickets` table, and logs activities in `ticket_activities`.

Ticket creation is still handled through the [`telegram-webhook`](../telegram-webhook/README.md) automation endpoint.

## Deployment

```bash
supabase functions deploy executor-ticket-webhook
```

## Endpoint

```
https://<project-ref>.supabase.co/functions/v1/executor-ticket-webhook
```

## Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`

`TELEGRAM_BOT_TOKEN` **must** be set before deploying so the function can call the Telegram Bot API.

## Registering the Telegram Webhook

Run once (replace placeholders):

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<project-ref>.supabase.co/functions/v1/executor-ticket-webhook"
```

## Manual Test Checklist

1. **Pre-requisites**
   - Executor user has `role = 'executor'` and `telegram_chat_id` populated.
   - Matching row exists in `executor_profiles` for that user.
   - At least one ticket assigned to the executor with status `open` or `in-progress`.

2. **Bot flow**
   - Send `/start` → expect ticket cards with inline buttons.
   - Tap `In Progress` → status changes to `in-progress`, the button is disabled, and a `status_change` activity is logged.
   - Tap `Update` → bot sends a reply prompt; responding adds an `executor_update` activity and marks the session `completed`.
   - Tap `Resolved` → ticket status becomes `resolved`, the message is removed, and a `status_change` activity records the action.

3. **Session audit**
   - Check `executor_ticket_sessions` to confirm entries are created/updated with states `awaiting_input`, `completed`, `cancelled`, or `expired` as appropriate.

## Related Automation Endpoint

Ticket creation and initial notifications still go through [`telegram-webhook`](../telegram-webhook/README.md). This function is solely for executor interactions after a ticket has been created.
