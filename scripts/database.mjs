import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL SQL/RLS, with only Supabase's roles and Auth identity shimmed.
// Never apply this harness to a hosted project.
const db = new PGlite();
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const tables = ['profiles', 'streaks', 'streak_rule_versions', 'streak_runs', 'provider_connections', 'activity_events', 'provider_activity_credits', 'daily_completions', 'points_ledger', 'milestone_awards'];
const query = async sql => (await db.query(sql)).rows;
const denied = async (sql, code) => assert.rejects(() => db.exec(sql), error => error.code === code);
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    insert into auth.users values ('${a}'), ('${b}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610250001_initial_schema.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202610250002_account_goals.sql', import.meta.url), 'utf8'));
  await db.exec(`set role service_role; insert into public.profiles(user_id) values ('${a}'), ('${b}');`);
  const rows = {};
  for (const owner of [a, b]) {
    const [streak] = await query(`insert into public.streaks(user_id, provider_id, name) values ('${owner}', 'geeksforgeeks', 'Read') returning id`);
    const [rule] = await query(`insert into public.streak_rule_versions(user_id, streak_id, version, target, unit, timezone, effective_at) values ('${owner}', '${streak.id}', 1, 1, 'lessons', 'Asia/Calcutta', now()) returning id`);
    const [run] = await query(`insert into public.streak_runs(user_id, streak_id) values ('${owner}', '${streak.id}') returning id`);
    await db.exec(`insert into public.provider_connections(user_id, provider_id, status) values ('${owner}', 'geeksforgeeks', 'connected')`);
    const [event] = await query(`insert into public.activity_events(user_id, streak_id, event_uuid, provider_id, activity_id) values ('${owner}', '${streak.id}', '${owner}', 'geeksforgeeks', 'python/python-variables') returning id`);
    await db.exec(`insert into public.provider_activity_credits values ('${owner}', 'geeksforgeeks', 'python/python-variables', '${event.id}')`);
    const [completion] = await query(`insert into public.daily_completions(user_id, streak_id, run_id, rule_version_id, event_id, local_date) values ('${owner}', '${streak.id}', '${run.id}', '${rule.id}', '${event.id}', current_date) returning id`);
    const [points] = await query(`insert into public.points_ledger(user_id, streak_id, completion_id, award_key, amount, reason) values ('${owner}', '${streak.id}', '${completion.id}', 'milestone-3', 20, 'milestone') returning id`);
    await db.exec(`insert into public.milestone_awards values ('${streak.id}', '${owner}', 3, '${points.id}')`);
    rows[owner] = { streak, rule, run, event, completion, points };
  }
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${a}', false);`);
  for (const table of tables) {
    const visible = await query(`select user_id from public.${table}`);
    assert.deepEqual(visible, [{ user_id: a }], `${table} exposes only the signed-in owner`);
    for (const sql of [`insert into public.${table} default values`, `update public.${table} set user_id = '${b}'`, `delete from public.${table}`]) await denied(sql, '42501');
  }
  await db.exec(`select set_config('request.jwt.claim.sub', '${b}', false)`);
  for (const table of tables) assert.deepEqual(await query(`select user_id from public.${table}`), [{ user_id: b }]);
  await denied("select private.valid_timezone('UTC')", '42501');
  await db.exec("select set_config('request.jwt.claim.sub', '', false)");
  assert.equal((await query('select * from public.streaks')).length, 0);
  await db.exec('set role anon');
  for (const table of tables) await denied(`select * from public.${table}`, '42501');
  await db.exec('set role service_role');
  const { streak, run, rule, event, completion } = rows[a];
  await denied(`insert into public.streak_runs(user_id, streak_id, ended_at) values ('${b}', '${streak.id}', now())`, '23503');
  await denied(`insert into public.streak_runs(user_id, streak_id) values ('${a}', '${streak.id}')`, '23505');
  await denied(`insert into public.activity_events(user_id, streak_id, event_uuid, provider_id, activity_id) values ('${a}', '${streak.id}', '${a}', 'geeksforgeeks', 'duplicate')`, '23505');
  await denied(`insert into public.provider_activity_credits values ('${a}', 'geeksforgeeks', 'python/python-variables', '${event.id}')`, '23505');
  await denied(`insert into public.daily_completions(user_id, streak_id, run_id, rule_version_id, event_id, local_date) values ('${a}', '${streak.id}', '${run.id}', '${rule.id}', '${event.id}', current_date)`, '23505');
  const [anotherEvent] = await query(`insert into public.activity_events(user_id, streak_id, event_uuid, provider_id, activity_id) values ('${a}', '${streak.id}', gen_random_uuid(), 'geeksforgeeks', 'another-article') returning id`);
  await denied(`insert into public.daily_completions(user_id, streak_id, run_id, rule_version_id, event_id, local_date) values ('${a}', '${streak.id}', '${run.id}', '${rule.id}', '${anotherEvent.id}', current_date)`, '23505');
  await denied(`insert into public.streak_rule_versions(user_id, streak_id, version, target, unit, timezone, effective_at) values ('${b}', '${streak.id}', 2, 1, 'lessons', 'UTC', now() + interval '1 day')`, '23503');
  await denied(`insert into public.points_ledger(user_id, streak_id, completion_id, award_key, amount, reason) values ('${a}', '${streak.id}', '${completion.id}', 'milestone-3', 20, 'milestone')`, '23505');
  const [extraPoints] = await query(`insert into public.points_ledger(user_id, streak_id, completion_id, award_key, amount, reason) values ('${a}', '${streak.id}', '${completion.id}', 'duplicate-milestone-fixture', 20, 'milestone') returning id`);
  await denied(`insert into public.milestone_awards values ('${streak.id}', '${a}', 3, '${extraPoints.id}')`, '23505');
  await db.exec(`insert into public.points_ledger(user_id, streak_id, completion_id, award_key, amount, reason) values ('${a}', '${streak.id}', '${completion.id}', 'daily', 25, 'daily')`);
  await denied(`insert into public.points_ledger(user_id, streak_id, completion_id, award_key, amount, reason) values ('${a}', '${streak.id}', '${completion.id}', 'different-daily-key', 25, 'daily')`, '23505');
  await denied(`update public.streak_rule_versions set timezone = 'Invalid/Timezone' where id = '${rule.id}'`, '23514');
  await denied(`update public.streak_rule_versions set target = 0 where id = '${rule.id}'`, '23514');
  await denied(`update public.activity_events set evidence_level = 'platform_verified' where id = '${event.id}'`, '23514');
  await denied(`update public.activity_events set evidence = jsonb_build_object('oversized', repeat('x', 17000)) where id = '${event.id}'`, '23514');
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${a}', false)`);
  const definitions = JSON.stringify([{ local_id: a, name: 'Copied goal', target: 1, unit: 'lessons', user_id: b, xp: 100000, location: 'https://private.example/' }]);
  await db.query('select public.copy_goal_definitions($1::jsonb, $2)', [definitions, 'UTC']);
  await db.query('select public.copy_goal_definitions($1::jsonb, $2)', [definitions, 'UTC']);
  assert.equal((await query('select * from public.streaks')).length, 2, 'Copy retries do not duplicate goals');
  assert.equal((await query('select * from public.points_ledger')).length, 3, 'Copy does not import XP');
  assert.equal((await query(`select * from public.streaks where user_id = '${b}'`)).length, 0);
  await denied(`select public.copy_goal_definitions('[{"local_id":"${b}","name":"Invalid","target":0,"unit":"lessons"}]', 'UTC')`, '23514');
  assert.equal((await query('select * from public.streaks')).length, 2, 'Failed import rolls back all its inserts');
  await db.exec('set role anon');
  await denied("select public.copy_goal_definitions('[]', 'UTC')", '42501');
  await db.exec(`reset role; delete from auth.users where id = '${a}';`);
  for (const table of tables) assert.deepEqual(await query(`select user_id from public.${table}`), [{ user_id: b }], `${table} cascades deletion without removing another user's records`);
  console.log('PASS: migration, all 10 tables owner-only, client writes denied, anon denied, restricted helper, composite ownership, duplicate events/activity/day/XP, valid rules/evidence bounds, account deletion.');
} finally { await db.close(); }
