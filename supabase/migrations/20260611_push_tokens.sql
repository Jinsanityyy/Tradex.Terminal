-- Push notification recipient tables.
-- These were referenced by the API (/api/push/*) since the push feature
-- shipped, but the tables were never created — every token save silently
-- failed and broadcasts always found 0 recipients.

-- FCM device tokens (Android/iOS via @capacitor/push-notifications)
create table if not exists public.fcm_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fcm_tokens_user_id_idx on public.fcm_tokens(user_id);

-- Web Push subscriptions (browser PWA path)
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  subscription jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- Only the service-role key (server API routes) touches these tables.
-- RLS on with no policies = no anon/authenticated access.
alter table public.fcm_tokens enable row level security;
alter table public.push_subscriptions enable row level security;
