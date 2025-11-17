create table if not exists ticket_webhook_queue (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets (id) on delete cascade,
  activity_id uuid references ticket_activities (id) on delete cascade,
  tenant_id uuid not null references tenants (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed')),
  attempt_count integer not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_webhook_queue_status_next_attempt_idx
  on ticket_webhook_queue (status, next_attempt_at);

create index if not exists ticket_webhook_queue_tenant_idx
  on ticket_webhook_queue (tenant_id);

create or replace function public.enqueue_ticket_activity_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant uuid;
begin
  target_tenant := new.tenant_id;

  if target_tenant is null then
    select tenant_id into target_tenant from tickets where id = new.ticket_id;
  end if;

  if target_tenant is null then
    -- Skip enqueueing when we cannot resolve the tenant
    return new;
  end if;

  insert into ticket_webhook_queue (
    ticket_id,
    activity_id,
    tenant_id,
    payload
  )
  values (
    new.ticket_id,
    new.id,
    target_tenant,
    jsonb_build_object(
      'activity_type', new.activity_type,
      'comment', new.comment,
      'metadata', to_jsonb(new.metadata),
      'created_at', new.created_at
    )
  );

  return new;
end;
$$;

drop trigger if exists trigger_enqueue_ticket_activity_webhook on ticket_activities;

create trigger trigger_enqueue_ticket_activity_webhook
after insert on ticket_activities
for each row
execute function public.enqueue_ticket_activity_webhook();

create or replace function public.touch_ticket_webhook_queue_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trigger_ticket_webhook_queue_touch_updated_at on ticket_webhook_queue;

create trigger trigger_ticket_webhook_queue_touch_updated_at
before update on ticket_webhook_queue
for each row
execute function public.touch_ticket_webhook_queue_updated_at();

