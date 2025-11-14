# User Onboarding Automation – Test Plan

This document outlines end-to-end tests for the complainant/executor Telegram onboarding flow.

## 1. Pre-requisites
- Supabase migrations applied (users table columns + tenant_notifications table).
- Edge functions deployed: `user-onboarding-request`, `user-onboarding-callback`.
- Make scenarios configured per [`make-user-onboarding-scenario.md`](make-user-onboarding-scenario.md).
- Telegram bot token connected to Make.
- Test tenant admin account and sample complainant/executor users.

## 2. Happy Path
| Step | Expected Outcome | Verification |
| --- | --- | --- |
| 1. Tenant admin creates executor via UI | `users.is_active=false`, `bot_onboarding_status='pending'`, notification `onboarding.queued` | Supabase `users` table, dashboard notifications |
| 2. Edge function posts to Make | HTTP 202 | Supabase function logs show success |
| 3. Make sends email | Email received with deep link | Test inbox or Mailtrap |
| 4. User clicks deep link and clicks “Start” in Telegram | Make captures chat id | Telegram chat log, Make run history |
| 5. Make calls callback | 200 response | Supabase function logs |
| 6. User record updated | `telegram_chat_id` populated, `is_active=true`, `bot_onboarding_status='completed'` | Supabase `users` table |
| 7. Notification emitted | `onboarding.completed` visible in dashboard | Dashboard badge decreases unread count |

## 3. Invite Failure (Make webhook unreachable)
1. Temporarily break `MAKE_USER_ONBOARDING_WEBHOOK_URL`.
2. Create new complainant.
3. Expect `user-onboarding-request` to retry once, then:
   - Return 502 to UI.
   - Update user `bot_onboarding_status='failed'`, `bot_onboarding_error='Unable to reach automation webhook'`.
   - Notification `onboarding.error`.
4. Dashboard shows error badge; user stays inactive.

## 4. Email Delivery Success but No Telegram Start
1. Keep Make webhook functional but skip clicking deep link.
2. After configured timeout (e.g., 24h), run Make timeout path to call callback with `{ status: 'timeout' }`.
3. Verify:
   - `bot_onboarding_status='failed'`, error message logged.
   - Notification `onboarding.timeout` with escalation guidance.
   - User remains inactive.

## 5. Manual Retry
1. From dashboard (or via Supabase SQL), re-trigger onboarding by calling `user-onboarding-request` again for same user.
2. Validate:
   - New `correlation_id`.
   - `bot_onboarding_retry_count` increments.
   - Notifications show new `onboarding.queued`.
   - Previous failure notification remains for audit.

## 6. Duplicate Completion Safeguard
1. Send callback twice with same correlation id and chat id.
2. Expect second attempt to:
   - Return 200 but not duplicate notifications (only one `completed` entry should be inserted—verify by ensuring Make does not send second call normally, but edge function tolerates it).
   - User record remains accurate (no counters changed).

## 7. Invalid Correlation Id
1. Call `user-onboarding-callback` with fake correlation.
2. Expect 404 response, no DB modifications, log entry for diagnostics.

## 8. Notification UX
1. With seeded notifications covering each level (`info`, `success`, `warning`, `error`), verify:
   - Header badge counts unread items.
   - Dropdown lists newest first (descending date).
   - “Mark all read” updates status and removes badge.
   - Item click marks single notification read.

## 9. Regression Checks
- Existing executor/complainant update flow still works (editing user retains chat id & status).
- Ticket creation via Telegram still succeeds (ensures chat id stored correctly).
- Automation webhook for tickets unaffected.

## 10. Tooling Tips
- Use Supabase dashboard SQL editor or `psql` to inspect `users` and `tenant_notifications`.
- Make run history → download execution log with correlation id.
- Supabase edge functions logs: `supabase functions logs user-onboarding-request --since 1h`.
- To simulate callback manually: `curl -X POST https://<ref>.supabase.co/functions/v1/user-onboarding-callback -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"correlation_id":"<uuid>","status":"invite_sent"}'`.

