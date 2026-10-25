begin;
alter table public.streaks add column local_goal_id uuid;
create unique index streak_local_goal on public.streaks(user_id, local_goal_id);

-- A narrow authenticated mutation. Ownership always comes from the verified JWT.
create function public.copy_goal_definitions(definitions jsonb, timezone_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  item jsonb;
  streak_id uuid;
begin
  if owner_id is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if definitions is null or jsonb_typeof(definitions) <> 'array' then raise exception 'Expected goal definitions'; end if;
  if jsonb_array_length(definitions) > 100 or octet_length(definitions::text) > 32768 then raise exception 'Too many goals'; end if;
  if timezone_name is null or not private.valid_timezone(timezone_name) then raise exception 'Invalid timezone'; end if;
  insert into public.profiles(user_id, timezone) values (owner_id, timezone_name) on conflict (user_id) do nothing;
  perform 1 from public.profiles where user_id = owner_id for update;
  for item in select value from jsonb_array_elements(definitions) loop
    if jsonb_typeof(item) <> 'object' or item->>'local_id' is null or
      jsonb_typeof(item->'name') is distinct from 'string' or
      jsonb_typeof(item->'target') is distinct from 'number' or
      item->>'unit' is null or (item->>'target') !~ '^[0-9]+$' then raise exception 'Invalid goal definition'; end if;
    if exists (select 1 from public.streaks where user_id = owner_id and local_goal_id = (item->>'local_id')::uuid) then continue; end if;
    if (select count(*) from public.streaks where user_id = owner_id) >= 100 then raise exception 'Account goal limit reached'; end if;
    insert into public.streaks(user_id, local_goal_id, provider_id, name)
      values (owner_id, (item->>'local_id')::uuid, 'geeksforgeeks', item->>'name') returning id into streak_id;
    insert into public.streak_rule_versions(user_id, streak_id, version, target, unit, timezone, effective_at)
      values (owner_id, streak_id, 1, (item->>'target')::integer, item->>'unit', timezone_name, now());
    insert into public.streak_runs(user_id, streak_id) values (owner_id, streak_id);
  end loop;
end;
$$;
revoke all on function public.copy_goal_definitions(jsonb, text) from public, anon;
grant execute on function public.copy_goal_definitions(jsonb, text) to authenticated;
commit;
