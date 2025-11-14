# Make Scenario: Telegram Bot Onboarding via Email Deep Link

This playbook describes the Make (Integromat) scenario that powers the tenant user onboarding workflow.  
It assumes the Supabase Edge Function `user-onboarding-request` sends a payload containing:

- `correlation_id`
- `tenant` object (`id`, `name`)
- `user` object (`id`, `email`, `full_name`, `role`, `employee_id`)
- `initiated_by` (tenant admin who triggered the flow)
- `requested_at`

## Prerequisites
- Telegram bot token (the same bot used for complaint/executor workflows).
- Supabase project URL & anon key (for callback).
- Edge function callback URL: `https://<project-ref>.supabase.co/functions/v1/user-onboarding-callback`
- SMTP (or Gmail, Outlook, etc.) connection in Make for sending emails.
- Optional: Make Data Store for tracking pending correlations (recommended for retries).

## Scenario Overview
```
1. Webhooks > Custom webhook (trigger)
2. Tools > Set Variable (deep link token + email content)
3. Tools > Text aggregator (compose Telegram deep link)
4. Email > Send an email (invite user)
5. Tools > Create Data Store record (store correlation + metadata)
6. Flow control > Sleep (short delay to avoid race)
7. Tools > HTTP Make a Request (notify Supabase that invite sent)
```

A second scenario listens to Telegram bot updates and completes the onboarding:
```
1. Telegram Bot > Watch updates (polling or webhook)
2. Tools > Parse / Route based on /start payload
3. Data Store > Get record (lookup by correlation id token)
4. HTTP > Make a request (POST chat_id to user-onboarding-callback)
5. Data Store > Delete record (cleanup)
```

Both scenarios can be exported/imported via the JSON blueprints below.

---

## Scenario A: Send Email Invite

| Step | Module | Notes |
| --- | --- | --- |
| 1 | **Webhooks → Custom webhook** | Name `fms_user_onboarding`. Use the auto-generated URL as `MAKE_USER_ONBOARDING_WEBHOOK_URL`. |
| 2 | **Tools → Set variable** | Set `correlation_id` = `{{1.correlation_id}}` (pass-through). |
| 3 | **Tools → Set variable** | `deep_link` = `https://t.me/<bot_username>?start={{1.correlation_id}}`. URL-encode the correlation id if needed. |
| 4 | **Email module** | Subject: `Finish setting up your FMS chatbot access`. Body template can include tenant name, deep link, and contact instructions. |
| 5 | **Data Store → Create a record** | Store `correlation_id`, `tenant_id`, `user_id`, `email`, `role`, `requested_at`. This allows the confirmation scenario to map Telegram response to the right user. |
| 6 | **Tools → Sleep** | 2–3 seconds to avoid racing the callback. |
| 7 | **HTTP → Make a request** | POST to Supabase callback with `{ correlation_id, status: "invite_sent", deep_link }` to update the user row (optional). |

### Email Template Snippet (HTML)
```html
Hi {{1.user.full_name | default("there")}},
<p>You have been invited to use the FMS Telegram assistant for {{1.tenant.name}}.</p>
<p>Click the button below to connect the bot and finish onboarding:</p>
<p><a href="{{2.deep_link}}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">Start Telegram Bot</a></p>
<p>If the button doesn't work, copy & paste this link:<br/>{{2.deep_link}}</p>
```

### Optional: Resend Logic
- Add a `Router` branch to check if `{{1.user.bot_onboarding_status}}` is `'failed'` or `'pending'`.
- Include a time-based True/False (e.g., only resend after 15 minutes).
- Update Data Store record with retry count.

---

## Scenario B: Capture Telegram Chat ID

| Step | Module | Notes |
| --- | --- | --- |
| 1 | **Telegram Bot → Watch updates** | Use `getUpdates` polling or Telegram webhook. Parse `/start <token>` payload. |
| 2 | **Tools → Parse JSON / Text Router** | Extract the token passed after `/start`. This is the `correlation_id`. |
| 3 | **Data Store → Get a record** | Lookup by `correlation_id`. If missing, ignore (maybe user clicked outdated link). |
| 4 | **HTTP → Make a request (POST)** | Call Supabase `user-onboarding-callback` with `{ correlation_id, chat_id: {{1.message.chat.id}}, telegram_user_id: {{1.message.from.id}} }`. Include bearer auth using Supabase service role key or stored connection. |
| 5 | **Data Store → Delete a record** | Clean up correlation entry to keep the store lean. |
| 6 | **Telegram Bot → Send message (optional)** | Confirm to the user that onboarding succeeded (`"You're all set! You can now create tickets."`). |

### Handling Errors
- If Supabase callback returns non-2xx, log the error and keep the Data Store record for retry.
- Use Make’s error handlers to escalate repeated failures (e.g., email tenant admin).

---

## Callback Payloads

### Invite Sent (Optional Ping)
```json
POST https://<project-ref>.supabase.co/functions/v1/user-onboarding-callback
Headers: Authorization: Bearer <service-key>

{
  "correlation_id": "{{1.correlation_id}}",
  "status": "invite_sent",
  "deep_link": "{{2.deep_link}}"
}
```

### Chat ID Confirmed
```json
POST https://<project-ref>.supabase.co/functions/v1/user-onboarding-callback
Headers: Authorization: Bearer <service-key>

{
  "correlation_id": "{{3.correlation_id}}",
  "chat_id": "{{1.message.chat.id}}",
  "telegram_user_id": "{{1.message.from.id}}",
  "joined_at": "{{1.message.date | toIsoString}}"
}
```

Supabase responds with `{ "status": "completed" }` when the user record is updated successfully.

---

## Blueprint JSON (Scenario A)
The snippet below can be imported directly into Make (replacing placeholders).
```json
{
  "name": "FMS User Onboarding (Invite)",
  "flow": [
    { "id": 1, "module": "webhooks", "action": "customWebhook", "name": "FMS Onboarding Webhook" },
    { "id": 2, "module": "tools", "action": "setVariable", "name": "Prepare Deep Link", "values": { "deep_link": "https://t.me/<bot>?start={{1.correlation_id}}" } },
    { "id": 3, "module": "email", "action": "sendEmail", "name": "Send Invite Email" },
    { "id": 4, "module": "datastore", "action": "create", "name": "Store Correlation" },
    { "id": 5, "module": "tools", "action": "sleep", "name": "Delay 3s", "values": { "duration": 3 } },
    { "id": 6, "module": "http", "action": "makeRequest", "name": "Ping Supabase Callback" }
  ]
}
```

## Blueprint JSON (Scenario B)
```json
{
  "name": "FMS User Onboarding (Confirmation)",
  "flow": [
    { "id": 1, "module": "telegramBot", "action": "watchUpdates", "name": "Watch Telegram Bot" },
    { "id": 2, "module": "tools", "action": "textParser", "name": "Extract Correlation Token" },
    { "id": 3, "module": "datastore", "action": "get", "name": "Lookup Correlation" },
    { "id": 4, "module": "http", "action": "makeRequest", "name": "Send Chat ID to Supabase" },
    { "id": 5, "module": "datastore", "action": "delete", "name": "Cleanup Correlation" },
    { "id": 6, "module": "telegramBot", "action": "sendMessage", "name": "Confirm to User" }
  ]
}
```

> Replace placeholders (`<bot>`, API keys, URLs) before importing.  
> For production, configure error handlers and retries on HTTP modules.

---

## Operational Notes
- **Rate limiting:** Telegram deep links (`start` parameters) must be ≤ 64 characters. Use compact UUIDs or base64url encoding.
- **Security:** Never expose Supabase service key directly. Store it in Make’s encrypted connection or use a proxy.
- **Auditing:** Include `correlation_id` in every log/notification so Make runs, Supabase logs, and dashboard notifications stay aligned.
- **Re-invite:** Tenant admins can trigger onboarding again, generating a new correlation id. Make should update the Data Store record accordingly.
- **Timeouts:** Use a separate Make scenario or scheduled task to detect entries older than X hours and notify tenant admins (status `timeout`).


