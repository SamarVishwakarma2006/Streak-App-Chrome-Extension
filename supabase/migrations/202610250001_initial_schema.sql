-- Apply once to a fresh development Supabase project using a migration owner.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create function private.valid_timezone(value text) returns boolean
language sql stable set search_path = '' as $$
  select exists(select 1 from pg_catalog.pg_timezone_names where name = value);
$$;
revoke all on function private.valid_timezone(text) from public, anon, authenticated;
grant execute on function private.valid_timezone(text) to service_role;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC' check (private.valid_timezone(timezone)),
  preferences jsonb not null default '{}' check (jsonb_typeof(preferences) = 'object' and octet_length(preferences::text) <= 4096),
  schema_version integer not null default 1 check (schema_version = 1),
  created_at timestamptz not null default now()
);

create table public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  provider_id text not null check (provider_id = 'geeksforgeeks'),
  name text not null check (length(btrim(name)) between 1 and 80),
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, provider_id)
);

create table public.streak_rule_versions (
  id uuid primary key default gen_random_uuid(),
  streak_id uuid not null,
  user_id uuid not null,
  version integer not null check (version > 0),
  target integer not null check (target between 1 and 1440),
  unit text not null check (unit in ('minutes', 'lessons')),
  timezone text not null check (private.valid_timezone(timezone)),
  effective_at timestamptz not null,
  foreign key (streak_id, user_id) references public.streaks(id, user_id) on delete cascade,
  unique (streak_id, version),
  unique (streak_id, effective_at),
  unique (id, streak_id, user_id)
);

create table public.streak_runs (
  id uuid primary key default gen_random_uuid(),
  streak_id uuid not null,
  user_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz check (ended_at >= started_at),
  foreign key (streak_id, user_id) references public.streaks(id, user_id) on delete cascade,
  unique (id, streak_id, user_id)
);
create unique index streak_one_open_run on public.streak_runs(streak_id) where ended_at is null;

-- No provider passwords, tokens or resume URLs belong in this table.
create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  provider_id text not null check (provider_id = 'geeksforgeeks'),
  status text not null check (status in ('connected', 'disconnected')),
  created_at timestamptz not null default now(),
  unique (user_id, provider_id)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  streak_id uuid not null,
  event_uuid uuid not null,
  provider_id text not null check (provider_id = 'geeksforgeeks'),
  activity_id text not null check (length(activity_id) between 1 and 512),
  received_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  evidence_level text not null default 'browser_tracked' check (evidence_level = 'browser_tracked'),
  evidence jsonb not null default '{}' check (jsonb_typeof(evidence) = 'object' and octet_length(evidence::text) <= 16384),
  foreign key (streak_id, user_id, provider_id) references public.streaks(id, user_id, provider_id) on delete cascade,
  unique (user_id, event_uuid),
  unique (id, streak_id, user_id),
  unique (id, user_id, provider_id, activity_id)
);

create table public.provider_activity_credits (
  user_id uuid not null,
  provider_id text not null,
  activity_id text not null,
  event_id uuid not null,
  primary key (user_id, provider_id, activity_id),
  foreign key (event_id, user_id, provider_id, activity_id)
    references public.activity_events(id, user_id, provider_id, activity_id) on delete cascade
);

create table public.daily_completions (
  id uuid primary key default gen_random_uuid(),
  streak_id uuid not null,
  user_id uuid not null,
  run_id uuid not null,
  rule_version_id uuid not null,
  event_id uuid not null,
  local_date date not null,
  evidence_level text not null default 'browser_tracked' check (evidence_level = 'browser_tracked'),
  created_at timestamptz not null default now(),
  foreign key (run_id, streak_id, user_id) references public.streak_runs(id, streak_id, user_id) on delete cascade,
  foreign key (rule_version_id, streak_id, user_id) references public.streak_rule_versions(id, streak_id, user_id) on delete cascade,
  foreign key (event_id, streak_id, user_id) references public.activity_events(id, streak_id, user_id) on delete cascade,
  unique (streak_id, local_date),
  unique (event_id),
  unique (id, streak_id, user_id)
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  streak_id uuid not null,
  completion_id uuid not null,
  award_key text not null check (length(award_key) between 1 and 160),
  amount integer not null check (amount > 0 and amount <= 1000),
  reason text not null check (reason in ('daily', 'milestone')),
  created_at timestamptz not null default now(),
  foreign key (completion_id, streak_id, user_id) references public.daily_completions(id, streak_id, user_id) on delete cascade,
  unique (user_id, award_key),
  unique (id, streak_id, user_id)
);
create unique index one_daily_award on public.points_ledger(completion_id) where reason = 'daily';

create table public.milestone_awards (
  streak_id uuid not null,
  user_id uuid not null,
  milestone integer not null check (milestone in (3, 7, 14, 30, 100)),
  points_id uuid not null unique,
  primary key (streak_id, milestone),
  foreign key (points_id, streak_id, user_id) references public.points_ledger(id, streak_id, user_id) on delete cascade
);

-- Explicit grants supplement RLS. Clients cannot write even their own reward rows.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles', 'streaks', 'streak_rule_versions', 'streak_runs',
    'provider_connections', 'activity_events', 'provider_activity_credits', 'daily_completions',
    'points_ledger', 'milestone_awards'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to service_role', table_name);
    execute format('create policy own_rows on public.%I for select to authenticated using (user_id = (select auth.uid()))', table_name);
    execute format('create index %I on public.%I(user_id)', table_name || '_owner', table_name);
  end loop;
end $$;

-- All goal/rule changes go through authenticated server operations in later steps.
-- No accepting/awarding RPC is exposed until its validator exists (Step 12).
commit;
