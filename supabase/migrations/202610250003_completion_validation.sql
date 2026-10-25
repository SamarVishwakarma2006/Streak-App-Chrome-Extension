begin;
alter table public.activity_events add column rule_version_id uuid;
alter table public.activity_events add column result jsonb not null default '{}';
alter table public.activity_events add foreign key (rule_version_id, streak_id, user_id)
  references public.streak_rule_versions(id, streak_id, user_id);
create index activity_receipt on public.activity_events(user_id, streak_id, received_at);

create table private.ingestion_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null
);
alter table private.ingestion_limits enable row level security;
revoke all on private.ingestion_limits from public, anon, authenticated;

create function private.streak_summary(owner_id uuid, goal_id uuid, at_time timestamptz)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  rule public.streak_rule_versions;
  item record;
  previous_date date;
  previous_run uuid;
  open_run uuid;
  length integer := 0;
  best integer := 0;
  today date;
  active boolean;
begin
  select * into rule from public.streak_rule_versions where streak_id = goal_id and user_id = owner_id and effective_at <= at_time order by effective_at desc limit 1;
  if rule.id is null then return jsonb_build_object('code', 'RULE_MISSING'); end if;
  today := (at_time at time zone rule.timezone)::date;
  select status = 'active' into active from public.streaks where id = goal_id and user_id = owner_id;
  select id into open_run from public.streak_runs where streak_id = goal_id and user_id = owner_id and ended_at is null;
  for item in select local_date, run_id from public.daily_completions where streak_id = goal_id and user_id = owner_id order by local_date loop
    length := case when previous_run = item.run_id and previous_date + 1 = item.local_date then length + 1 else 1 end;
    best := greatest(best, length); previous_date := item.local_date; previous_run := item.run_id;
  end loop;
  return jsonb_build_object('current', case when active and previous_run = open_run and previous_date between today - 1 and today then length else 0 end,
    'best', best, 'completed_today', coalesce(previous_date = today, false), 'local_date', today,
    'rule_version_id', rule.id, 'target', rule.target, 'unit', rule.unit, 'timezone', rule.timezone,
    'xp', (select coalesce(sum(amount), 0) from public.points_ledger where user_id = owner_id and streak_id = goal_id),
    'account_xp', (select coalesce(sum(amount), 0) from public.points_ledger where user_id = owner_id),
    'server_time', at_time, 'evidence_level', 'browser_tracked');
end;
$$;
revoke all on function private.streak_summary(uuid, uuid, timestamptz) from public, anon, authenticated;

create function public.get_streak_summary(p_streak_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.streaks where id = p_streak_id and user_id = auth.uid()) then
    raise exception 'Goal unavailable' using errcode = '42501';
  end if;
  return private.streak_summary(auth.uid(), p_streak_id, clock_timestamp());
end;
$$;
revoke all on function public.get_streak_summary(uuid) from public, anon;
grant execute on function public.get_streak_summary(uuid) to authenticated;

create function public.set_reading_connection(p_connected boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null or p_connected is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  perform 1 from public.profiles where user_id = owner_id for update;
  if not found then raise exception 'Copy a goal first'; end if;
  insert into public.provider_connections(user_id, provider_id, status)
    values (owner_id, 'geeksforgeeks', case when p_connected then 'connected' else 'disconnected' end)
    on conflict (user_id, provider_id) do update set status = excluded.status;
end;
$$;
revoke all on function public.set_reading_connection(boolean) from public, anon;
grant execute on function public.set_reading_connection(boolean) to authenticated;

create function public.submit_reading_event(p_event_uuid uuid, p_streak_id uuid, p_rule_version_id uuid, p_activity_id text, p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  received timestamptz;
  goal public.streaks;
  rule public.streak_rule_versions;
  prior public.activity_events;
  last_day record;
  run_id uuid;
  event_id uuid;
  completion_id uuid;
  points_id uuid;
  today date;
  start_day timestamptz;
  end_day timestamptz;
  word_count numeric := 0;
  covered numeric := 0;
  weight numeric;
  dwell numeric;
  seconds numeric;
  amount numeric;
  attempts integer;
  streak_length integer;
  bonus integer;
  awarded integer := 0;
  outcome jsonb;
  i integer;
begin
  if owner_id is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_event_uuid is null or p_streak_id is null or p_rule_version_id is null then return jsonb_build_object('status','rejected','code','INVALID_ID'); end if;
  -- ponytail: one lock per account coordinates cross-goal activity credit and rate limits.
  perform 1 from public.profiles where user_id = owner_id for update;
  if not found then return jsonb_build_object('status','rejected','code','PROFILE_MISSING'); end if;
  select * into goal from public.streaks where id = p_streak_id and user_id = owner_id for update;
  if goal.id is null then return jsonb_build_object('status','rejected','code','GOAL_UNAVAILABLE'); end if;
  received := clock_timestamp();
  select * into prior from public.activity_events where user_id = owner_id and event_uuid = p_event_uuid;
  if prior.id is not null then
    if prior.streak_id <> p_streak_id or prior.rule_version_id is distinct from p_rule_version_id or prior.activity_id is distinct from p_activity_id or prior.evidence is distinct from p_evidence then
      return jsonb_build_object('status','rejected','code','EVENT_CONFLICT');
    end if;
    return prior.result || jsonb_build_object('replayed',true);
  end if;
  insert into private.ingestion_limits values (owner_id, received, 1)
    on conflict (user_id) do update set
      attempts = case when private.ingestion_limits.window_start <= received - interval '1 minute' then 1 else least(61, private.ingestion_limits.attempts + 1) end,
      window_start = case when private.ingestion_limits.window_start <= received - interval '1 minute' then received else private.ingestion_limits.window_start end
    returning private.ingestion_limits.attempts into attempts;
  if attempts > 60 then return jsonb_build_object('status','rejected','code','RATE_LIMIT','retry_after_seconds',60); end if;
  if goal.status <> 'active' then return jsonb_build_object('status','rejected','code','GOAL_INACTIVE'); end if;
  if not exists(select 1 from public.provider_connections where user_id = owner_id and provider_id = 'geeksforgeeks' and status = 'connected') then
    return jsonb_build_object('status','rejected','code','DISCONNECTED');
  end if;
  select * into rule from public.streak_rule_versions where streak_id = goal.id and effective_at <= received order by effective_at desc limit 1;
  if rule.id is null or rule.id <> p_rule_version_id then return jsonb_build_object('status','rejected','code','STALE_RULE'); end if;
  select id into run_id from public.streak_runs where streak_id = goal.id and ended_at is null and started_at <= received;
  if run_id is null then return jsonb_build_object('status','rejected','code','RUN_MISSING'); end if;
  if p_activity_id is null or length(p_activity_id) > 512 or p_activity_id !~ '^/(python|dsa)/[a-z0-9-]+/$' or
    p_activity_id ~ 'tutorial|interview-questions|quiz|practice|examples|category' or p_activity_id = '/python/python/' then
    return jsonb_build_object('status','rejected','code','UNSUPPORTED_ACTIVITY');
  end if;
  if p_evidence is null or jsonb_typeof(p_evidence) <> 'object' or octet_length(p_evidence::text) > 16384 then
    return jsonb_build_object('status','rejected','code','INVALID_EVIDENCE');
  end if;
  if p_evidence - array['schema_version','fingerprint','weights','dwell','active_seconds'] <> '{}' or
    p_evidence->'schema_version' is distinct from '1'::jsonb or
    jsonb_typeof(p_evidence->'fingerprint') is distinct from 'string' or (p_evidence->>'fingerprint') !~ '^[a-f0-9]{64}$' or
    jsonb_typeof(p_evidence->'weights') is distinct from 'array' or jsonb_typeof(p_evidence->'dwell') is distinct from 'array' or
    jsonb_typeof(p_evidence->'active_seconds') is distinct from 'number' then
    return jsonb_build_object('status','rejected','code','INVALID_EVIDENCE');
  end if;
  seconds := (p_evidence->>'active_seconds')::numeric;
  if seconds < 60 or seconds > 86400 or jsonb_array_length(p_evidence->'weights') not between 1 and 500 or
    jsonb_array_length(p_evidence->'weights') <> jsonb_array_length(p_evidence->'dwell') then
    return jsonb_build_object('status','rejected','code','INVALID_EVIDENCE');
  end if;
  for i in 0..jsonb_array_length(p_evidence->'weights') - 1 loop
    if jsonb_typeof(p_evidence->'weights'->i) <> 'number' or jsonb_typeof(p_evidence->'dwell'->i) <> 'number' then
      return jsonb_build_object('status','rejected','code','INVALID_EVIDENCE');
    end if;
    weight := (p_evidence->'weights'->>i)::numeric; dwell := (p_evidence->'dwell'->>i)::numeric;
    if weight < 1 or weight > 40 or weight <> trunc(weight) or dwell < 0 or dwell > least(seconds, greatest(2, ceil(weight * .3))) then
      return jsonb_build_object('status','rejected','code','INVALID_EVIDENCE');
    end if;
    word_count := word_count + weight;
    if dwell >= greatest(2, ceil(weight * .3)) then covered := covered + weight; end if;
  end loop;
  if word_count < 100 or covered < word_count * .8 or seconds < greatest(60, ceil(word_count * .3)) then
    return jsonb_build_object('status','rejected','code','INSUFFICIENT_READING');
  end if;
  today := (received at time zone rule.timezone)::date;
  start_day := today::timestamp at time zone rule.timezone;
  end_day := (today + 1)::timestamp at time zone rule.timezone;
  if exists(select 1 from public.daily_completions where streak_id = goal.id and local_date = today) then
    return jsonb_build_object('status','already_complete','xp_awarded',0,'summary',private.streak_summary(owner_id,goal.id,received));
  end if;
  select d.local_date, d.created_at, v.timezone into last_day from public.daily_completions d
    join public.streak_rule_versions v on v.id = d.rule_version_id where d.streak_id = goal.id order by d.local_date desc limit 1;
  if found and (today <= last_day.local_date or received < ((last_day.local_date + 1)::timestamp at time zone last_day.timezone)) then
    return jsonb_build_object('status','rejected','code','OVERLAPPING_DAY');
  end if;
  if exists(select 1 from public.provider_activity_credits where user_id = owner_id and provider_id = 'geeksforgeeks' and activity_id = p_activity_id) then
    return jsonb_build_object('status','rejected','code','ACTIVITY_ALREADY_CREDITED');
  end if;
  if (select count(*) from public.activity_events where user_id = owner_id and received_at >= start_day and received_at < end_day) >= 2000 then
    return jsonb_build_object('status','rejected','code','DAILY_EVENT_LIMIT');
  end if;
  if seconds + (select coalesce(sum((evidence->>'active_seconds')::numeric),0) from public.activity_events
    where user_id = owner_id and status = 'accepted' and received_at > received - interval '24 hours') > 86400 then
    return jsonb_build_object('status','rejected','code','TIME_BUDGET_EXCEEDED');
  end if;
  insert into public.activity_events(user_id,streak_id,event_uuid,provider_id,activity_id,received_at,status,evidence,rule_version_id)
    values(owner_id,goal.id,p_event_uuid,'geeksforgeeks',p_activity_id,received,'accepted',p_evidence,rule.id) returning id into event_id;
  insert into public.provider_activity_credits values(owner_id,'geeksforgeeks',p_activity_id,event_id);
  select case when rule.unit = 'lessons' then count(*)::numeric else sum((evidence->>'active_seconds')::numeric)/60 end into amount
    from public.activity_events where user_id = owner_id and streak_id = goal.id and rule_version_id = rule.id and status = 'accepted' and received_at >= start_day and received_at < end_day;
  if amount >= rule.target then
    insert into public.daily_completions(user_id,streak_id,run_id,rule_version_id,event_id,local_date,created_at)
      values(owner_id,goal.id,run_id,rule.id,event_id,today,received) returning id into completion_id;
    insert into public.points_ledger(user_id,streak_id,completion_id,award_key,amount,reason)
      values(owner_id,goal.id,completion_id,'daily:'||goal.id||':'||today,25,'daily');
    awarded := 25;
    streak_length := (private.streak_summary(owner_id,goal.id,received)->>'current')::integer;
    select x.bonus into bonus from (values(3,20),(7,50),(14,100),(30,250),(100,1000)) x(days,bonus) where days = streak_length;
    if bonus is not null and not exists(select 1 from public.milestone_awards where streak_id = goal.id and milestone = streak_length) then
      insert into public.points_ledger(user_id,streak_id,completion_id,award_key,amount,reason)
        values(owner_id,goal.id,completion_id,'milestone:'||goal.id||':'||streak_length,bonus,'milestone') returning id into points_id;
      insert into public.milestone_awards values(goal.id,owner_id,streak_length,points_id);
      awarded := awarded + bonus;
    end if;
  end if;
  outcome := jsonb_build_object('status','accepted','event_id',event_id,'xp_awarded',awarded,'amount',amount,'summary',private.streak_summary(owner_id,goal.id,received));
  update public.activity_events set result = outcome where id = event_id;
  return outcome;
end;
$$;
revoke all on function public.submit_reading_event(uuid,uuid,uuid,text,jsonb) from public, anon;
grant execute on function public.submit_reading_event(uuid,uuid,uuid,text,jsonb) to authenticated;
commit;
