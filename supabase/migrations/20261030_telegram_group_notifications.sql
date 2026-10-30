create table if not exists public.telegram_notification_group_subscriptions (
  chat_id bigint primary key,
  chat_title text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_notification_group_subscriptions enable row level security;

revoke all on public.telegram_notification_group_subscriptions from public, anon, authenticated;
grant all on public.telegram_notification_group_subscriptions to service_role;

drop trigger if exists telegram_notification_group_subscriptions_set_updated_at
  on public.telegram_notification_group_subscriptions;
create trigger telegram_notification_group_subscriptions_set_updated_at
  before update on public.telegram_notification_group_subscriptions
  for each row execute function private.set_updated_at();
