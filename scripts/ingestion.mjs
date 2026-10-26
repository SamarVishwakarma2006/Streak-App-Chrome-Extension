import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const owner = randomUUID(), other = randomUUID();
const evidence = { schema_version: 1, fingerprint: 'a'.repeat(64), weights: [40,40,20], dwell: [12,12,6], active_seconds: 60 };
const sql = async (text, args = []) => (await db.query(text, args)).rows;
const submit = async (goal, options = {}) => (await sql('select public.submit_reading_event($1,$2,$3,$4,$5) as result', [options.id ?? randomUUID(), goal.id, options.rule ?? goal.rule, options.activity ?? `/python/article-${randomUUID()}/`, options.evidence ?? evidence]))[0].result;
const as = async user => { await db.exec('set role authenticated'); await sql("select set_config('request.jwt.claim.sub',$1,false)", [user]); };
const admin = async statement => { await db.exec('reset role'); await db.exec(statement); await as(owner); };
async function goal(target = 1, unit = 'lessons') {
  const local = randomUUID();
  await sql('select public.copy_goal_definitions($1,$2)', [[{local_id:local,name:'Reading',target,unit}], 'UTC']);
  return (await sql('select s.id,v.id as rule from public.streaks s join public.streak_rule_versions v on v.streak_id=s.id where local_goal_id=$1',[local]))[0];
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    insert into auth.users values('${owner}'),('${other}');`);
  const folder = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(folder)).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file,folder),'utf8'));
  await as(owner);
  const first = await goal();
  assert.equal((await submit(first)).code, 'DISCONNECTED');
  await db.exec('select public.set_reading_connection(true)');
  await as(other);
  assert.equal((await submit(first)).code,'PROFILE_MISSING');
  await goal();
  assert.equal((await submit(first)).code,'GOAL_UNAVAILABLE');
  await assert.rejects(()=>sql('select public.get_streak_summary($1)',[first.id]),e=>e.code==='42501');
  await as(owner);
  for (const bad of [ {...evidence,user_id:other}, {...evidence,xp:1000}, {...evidence,observed_at:'2000-01-01'}, {...evidence,evidence_level:'platform_verified'}, {...evidence,weights:[100]}, {...evidence,dwell:[12,0,0]}, {...evidence,active_seconds:59}, {...evidence,active_seconds:86401}, {...evidence,dwell:[99,12,6]}, {...evidence,weights:[40,40,null]}, {...evidence,fingerprint:'invalid'}, {...evidence,html:'x'.repeat(17000)} ]) {
    assert.equal((await submit(first,{evidence:bad})).status,'rejected');
  }
  assert.equal((await submit(first,{rule:randomUUID()})).code,'STALE_RULE');
  assert.equal((await submit(first,{activity:'https://example.com/private?token=x'})).code,'UNSUPPORTED_ACTIVITY');
  const event = randomUUID(), activity = '/python/first-article/';
  const accepted = await submit(first,{id:event,activity});
  assert.equal(accepted.status,'accepted'); assert.equal(accepted.xp_awarded,25);
  assert.equal(accepted.summary.current,1); assert.equal(accepted.summary.best,1); assert.equal(accepted.summary.xp,25);
  assert.equal(accepted.summary.local_date,(await sql('select current_date::text as date'))[0].date);
  assert.deepEqual(await submit(first,{id:event,activity}),{...accepted,replayed:true});
  await assert.rejects(()=>db.exec('update private.adapter_status set enabled=false'),e=>e.code==='42501');
  await admin("update private.adapter_status set enabled=false where provider_id='geeksforgeeks'");
  assert.deepEqual(await submit(first,{id:event,activity}),{...accepted,replayed:true},'A pause preserves old accepted receipts');
  const pausedId=randomUUID(),pausedActivity='/python/paused-article/';
  assert.deepEqual(await submit(first,{id:pausedId,activity:pausedActivity}),{status:'pending',code:'PROVIDER_PAUSED',retry_after_seconds:300});
  assert.equal((await sql('select * from public.activity_events where event_uuid=$1',[pausedId])).length,0);
  await admin("update private.adapter_status set enabled=true where provider_id='geeksforgeeks'");
  assert.equal((await submit(first,{id:pausedId,activity:pausedActivity})).status,'already_complete','The saved ID retries after resuming without extra daily XP');

  assert.equal((await submit(first,{id:event,activity:'/python/changed/'})).code,'EVENT_CONFLICT');
  assert.equal((await submit(first)).status,'already_complete');
  const second = await goal(2);
  assert.equal((await submit(second,{activity})).code,'ACTIVITY_ALREADY_CREDITED');
  assert.equal((await submit(second)).xp_awarded,0);
  assert.equal((await submit(second)).xp_awarded,25);
  const minutes = await goal(2,'minutes');
  assert.equal((await submit(minutes)).xp_awarded,0);
  assert.equal((await submit(minutes)).xp_awarded,25);
  await admin(`update public.streaks set status='archived' where id='${minutes.id}'`);
  assert.equal((await submit(minutes)).code,'GOAL_INACTIVE');
  await db.exec('select public.set_reading_connection(false)');
  assert.equal((await submit(second)).code,'DISCONNECTED');
  await db.exec('select public.set_reading_connection(true)');
  // Seed historical days only as the migration owner. No production clock override exists.
  const milestone = await goal();
  await admin(`update public.streak_rule_versions set effective_at=now()-interval '200 days' where id='${milestone.rule}';
    update public.streak_runs set started_at=now()-interval '200 days' where streak_id='${milestone.id}';
    do $$ declare n integer; e uuid; r uuid; begin
      select id into r from public.streak_runs where streak_id='${milestone.id}';
      for n in 1..2 loop
        insert into public.activity_events(user_id,streak_id,event_uuid,provider_id,activity_id,status,received_at)
          values('${owner}','${milestone.id}',gen_random_uuid(),'geeksforgeeks','history-'||n,'accepted',now()-n*interval '1 day') returning id into e;
        insert into public.daily_completions(user_id,streak_id,run_id,rule_version_id,event_id,local_date,created_at)
          values('${owner}','${milestone.id}',r,'${milestone.rule}',e,current_date-n,now()-n*interval '1 day');
      end loop;
    end $$;`);
  const third = await submit(milestone);
  assert.equal(third.xp_awarded,45); assert.equal(third.summary.current,3);
  assert.equal((await sql(`select * from public.milestone_awards where streak_id=$1`,[milestone.id])).length,1);
  // A previously awarded milestone must not be paid again at the same length.
  await admin(`delete from public.daily_completions where streak_id='${milestone.id}' and local_date=current_date`);
  // Cascade removed the associated points/milestone; reseed a prior legitimate award.
  await admin(`do $$ declare p uuid; c uuid; begin
    select id into c from public.daily_completions where streak_id='${milestone.id}' order by local_date limit 1;
    insert into public.points_ledger(user_id,streak_id,completion_id,award_key,amount,reason) values('${owner}','${milestone.id}',c,'prior-milestone',20,'milestone') returning id into p;
    insert into public.milestone_awards values('${milestone.id}','${owner}',3,p);
  end $$;`);
  assert.equal((await submit(milestone)).xp_awarded,25);
  // Missed day resets current but preserves best.
  await admin(`update public.daily_completions set local_date=local_date-10 where streak_id='${milestone.id}';
    update public.points_ledger set award_key='history:'||id where streak_id='${milestone.id}'`);
  const missed = (await sql('select public.get_streak_summary($1) as result',[milestone.id]))[0].result;
  assert.equal(missed.current,0); assert.equal(missed.best,3);
  assert.equal((await submit(milestone)).summary.current,1);
  for (const [days,bonus] of [[7,50],[14,100],[30,250],[100,1000]]) {
    const g = await goal();
    await admin(`delete from private.ingestion_limits where user_id='${owner}';
      update public.streak_rule_versions set effective_at=now()-interval '200 days' where id='${g.rule}';
      update public.streak_runs set started_at=now()-interval '200 days' where streak_id='${g.id}';
      do $$ declare n integer; e uuid; r uuid; begin
        select id into r from public.streak_runs where streak_id='${g.id}';
        for n in 1..${days-1} loop
          insert into public.activity_events(user_id,streak_id,event_uuid,provider_id,activity_id,status,received_at)
            values('${owner}','${g.id}',gen_random_uuid(),'geeksforgeeks','seed-'||n,'accepted',now()-n*interval '1 day') returning id into e;
          insert into public.daily_completions(user_id,streak_id,run_id,rule_version_id,event_id,local_date,created_at)
            values('${owner}','${g.id}',r,'${g.rule}',e,current_date-n,now()-n*interval '1 day');
        end loop;
      end $$;`);
    const earned = await submit(g);
    assert.equal(earned.xp_awarded,25+bonus); assert.equal(earned.summary.current,days);
  }
  const rollback = await goal();
  await admin(`create function private.fail_reward_fixture() returns trigger language plpgsql as $$ begin
    if new.streak_id='${rollback.id}' then raise exception 'fixture write failure'; end if; return new; end $$;
    create trigger fail_reward_fixture before insert on public.points_ledger for each row execute function private.fail_reward_fixture();`);
  await assert.rejects(()=>submit(rollback),e=>e.message.includes('fixture write failure'));
  assert.equal((await sql('select * from public.activity_events where streak_id=$1',[rollback.id])).length,0);
  assert.equal((await sql('select * from public.daily_completions where streak_id=$1',[rollback.id])).length,0);
  await admin('drop trigger fail_reward_fixture on public.points_ledger; drop function private.fail_reward_fixture()');
  assert.equal((await submit(rollback)).xp_awarded,25);
  const future = await goal();
  const futureRule = randomUUID();
  await admin(`insert into public.streak_rule_versions(id,user_id,streak_id,version,target,unit,timezone,effective_at)
    values('${futureRule}','${owner}','${future.id}',2,10,'lessons','UTC',now()+interval '1 day')`);
  assert.equal((await submit(future,{rule:futureRule})).code,'STALE_RULE');
  assert.equal((await submit(future)).xp_awarded,25);
  const limited = await goal(1440);
  await admin(`delete from private.ingestion_limits where user_id='${owner}'`);
  for(let n=0;n<60;n++) assert.equal((await submit(limited,{evidence:{}})).code,'INVALID_EVIDENCE');
  assert.equal((await submit(limited)).code,'RATE_LIMIT');
  await admin(`delete from private.ingestion_limits where user_id='${owner}'`);
  const budget = await goal();
  const used = Number((await sql("select coalesce(sum((evidence->>'active_seconds')::numeric),0) as used from public.activity_events where status='accepted' and received_at>clock_timestamp()-interval '24 hours'"))[0].used);
  assert.equal((await submit(budget,{evidence:{...evidence,active_seconds:86400-used}})).status,'accepted');
  assert.equal((await submit(limited)).code,'TIME_BUDGET_EXCEEDED');
  await db.exec("select set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(()=>submit(first),e=>e.code==='42501');
  await db.exec('set role anon');
  await assert.rejects(()=>submit(first),e=>e.code==='42501');
  await as(owner);
  await assert.rejects(()=>db.exec('insert into public.points_ledger default values'),e=>e.code==='42501');
  assert.equal((await sql('select count(*)::int as n from public.activity_events where status=\'pending\''))[0].n,0);
  console.log('PASS: ingestion ownership, evidence rejection, receipt date, replay/conflict, article/day deduplication, lesson/minute targets, archive/disconnect, every milestone, milestone deduplication, missed day, future rule, transaction rollback, rate limit, and denied reward writes.');
} catch (error) { console.error(error.message, error.where ?? '', error.stack?.split('\n').find(line => line.includes('scripts/ingestion')) ?? ''); process.exitCode = 1; }
finally { await db.close(); }
