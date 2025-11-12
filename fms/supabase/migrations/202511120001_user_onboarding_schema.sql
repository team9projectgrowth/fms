-- Add columns to users table for bot onboarding lifecycle
alter table users
  add column if not exists bot_onboarding_status text not null default 'not_required',
  add column if not exists bot_onboarding_started_at timestamptz,
  add column if not exists bot_onboarding_completed_at timestamptz,
  add column if not exists bot_onboarding_error text,
  add column if not exists bot_onboarding_retry_count integer not null default 0,
  add column if not exists bot_deep_link text,
  add column if not exists bot_correlation_id uuid;

-- Backfill sensible defaults for existing data
update users
set bot_onboarding_status = case
  when role in ('executor', 'complainant') and telegram_chat_id is not null then 'completed'
  when role in ('executor', 'complainant') then 'pending'
  else 'not_required'
end,
bot_onboarding_started_at = case
  when role in ('executor', 'complainant') and telegram_chat_id is not null then coalesce(bot_onboarding_started_at, now())
  else bot_onboarding_started_at
end,
bot_onboarding_completed_at = case
  when role in ('executor', 'complainant') and telegram_chat_id is not null then coalesce(bot_onboarding_completed_at, now())
  else bot_onboarding_completed_at
end,
bot_onboarding_error = null
where bot_onboarding_status is null
  or bot_onboarding_status = 'not_required';

-- Ensure a basic check constraint for status values
alter table users
  drop constraint if exists users_bot_onboarding_status_check;

alter table users
  add constraint users_bot_onboarding_status_check
    check (bot_onboarding_status in ('not_required', 'pending', 'invited', 'awaiting_chat', 'completed', 'failed', 'cancelled'));

-- Create tenant_notifications table
create table if not exists tenant_notifications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  triggered_by uuid references users(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  level text not null default 'info',
  status text not null default 'unread',
  metadata jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists tenant_notifications_tenant_id_idx
  on tenant_notifications (tenant_id, created_at desc);

create index if not exists tenant_notifications_status_idx
  on tenant_notifications (tenant_id, status);

-- Enable RLS
alter table tenant_notifications enable row level security;

-- Allow tenant admins to read their notifications
create policy if not exists "tenant_admins_can_read_notifications"
  on tenant_notifications
  for select
  using (
    auth.uid() is not null
    and exists (
      select 1
      from users u
      where u.id = auth.uid()
        and u.tenant_id = tenant_notifications.tenant_id
        and u.role = 'tenant_admin'
    )
  );

-- Allow tenant admins to mark notifications as read
create policy if not exists "tenant_admins_can_update_notifications"
  on tenant_notifications
  for update
  using (
    auth.uid() is not null
    and exists (
      select 1
      from users u
      where u.id = auth.uid()
        and u.tenant_id = tenant_notifications.tenant_id
        and u.role = 'tenant_admin'
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from users u
      where u.id = auth.uid()
        and u.tenant_id = tenant_notifications.tenant_id
        and u.role = 'tenant_admin'
    )
  );

-- Allow service role to insert notifications (edge functions use service role key)
create policy if not exists "service_role_can_insert_notifications"
  on tenant_notifications
  for insert
  with check (auth.role() = 'service_role');


