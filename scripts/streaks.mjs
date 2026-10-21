import assert from 'node:assert/strict';
import { newLedger, addGoal, complete, progress, changeRule, archiveGoal, deleteGoal, nextBoundary, localDate } from '../src/streaks.ts';
const rule = { timezone: 'UTC', target: 1, unit: 'lessons' };
const time = day => Date.UTC(2026, 0, day, 12);
const ledger = newLedger();
addGoal(ledger, 'a', rule, time(1));
addGoal(ledger, 'b', rule, time(1));
for (let day = 1; day <= 100; day++) {
  assert.equal(complete(ledger, 'a', `lesson-${day}`, 1, 'lessons', time(day)), true);
  assert.equal(complete(ledger, 'a', `duplicate-${day}`, 1, 'lessons', time(day)), false);
}
assert.equal(ledger.lifetimeXP, 3920);
assert.equal(progress(ledger, 'a', time(101)).current, 100);
assert.equal(progress(ledger, 'a', time(102)).current, 0);
assert.equal(progress(ledger, 'a', time(102)).best, 100);
for (let day = 102; day <= 108; day++) complete(ledger, 'a', `new-${day}`, 1, 'lessons', time(day));
assert.equal(ledger.lifetimeXP, 4095); // Milestone bonuses cannot be farmed after a reset.
assert.equal(complete(ledger, 'b', 'lesson-1', 1, 'lessons', time(108)), false);
archiveGoal(ledger, 'a', true, time(108));
assert.equal(complete(ledger, 'a', 'archived', 1, 'lessons', time(109)), false);
archiveGoal(ledger, 'a', false, time(109));
complete(ledger, 'a', 'restored', 1, 'lessons', time(109));
assert.equal(progress(ledger, 'a', time(109)).current, 1);
const xp = ledger.lifetimeXP;
deleteGoal(ledger, 'a', time(109));
assert.equal(ledger.lifetimeXP, xp);
assert.equal(complete(ledger, 'b', 'restored', 1, 'lessons', time(109)), false);
assert.throws(() => complete(ledger, 'b', 'past', 1, 'lessons', time(108)), /Backdating/);
for (const [date, hours] of [['2026-03-08T05:00:00Z', 23], ['2026-11-01T04:00:00Z', 25]]) {
  const start = Date.parse(date);
  assert.equal(nextBoundary(start, 'America/New_York') - start, hours * 3600000);
}
assert.equal(localDate(Date.parse('2026-01-01T18:29:59Z'), 'Asia/Kolkata'), '2026-01-01');
assert.equal(localDate(Date.parse('2026-01-01T18:30:00Z'), 'Asia/Kolkata'), '2026-01-02');
const changes = newLedger();
addGoal(changes, 'a', rule, time(1));
changeRule(changes, 'a', { ...rule, target: 2, timezone: 'America/Los_Angeles' }, time(1));
assert.equal(complete(changes, 'a', 'one', 1, 'lessons', time(1)), true);
assert.equal(progress(changes, 'a', time(1)).rule.target, 1);
assert.equal(complete(changes, 'a', 'overlap', 2, 'lessons', Date.UTC(2026, 0, 2, 1)), false);
assert.equal(progress(changes, 'a', time(2)).rule.target, 2);
assert.equal(complete(changes, 'a', 'small', 1, 'lessons', time(2)), false);
assert.equal(complete(changes, 'a', 'wrong-unit', 20, 'minutes', time(2)), false);
assert.equal(complete(changes, 'a', 'two', 2, 'lessons', time(2)), true);
assert.equal(changes.goals.a.completions[0].version, 1);
assert.equal(changes.goals.a.completions[1].version, 2);
assert.deepEqual(progress(JSON.parse(JSON.stringify(changes)), 'a', time(2)), progress(changes, 'a', time(2)));
assert.throws(() => changeRule(changes, 'a', { ...rule, timezone: 'Invalid/Zone' }, time(2)));
console.log('PASS: rewards, every milestone, deduplication, missed days, best streak, archive/delete, midnight, DST, scheduled rule/timezone changes, and JSON roundtrip.');
// Exact midnight reset and consecutive local dates across both DST transitions.
for (const dates of [
  ['2026-03-07T17:00:00Z', '2026-03-08T16:00:00Z', '2026-03-09T16:00:00Z'],
  ['2026-10-31T16:00:00Z', '2026-11-01T17:00:00Z', '2026-11-02T17:00:00Z'],
]) {
  const dst = newLedger();
  addGoal(dst, 'dst', { ...rule, timezone: 'America/New_York' }, Date.parse(dates[0]));
  dates.forEach((date, i) => complete(dst, 'dst', `dst-${i}`, 1, 'lessons', Date.parse(date)));
  assert.equal(progress(dst, 'dst', Date.parse(dates[2])).current, 3);
  assert.equal(dst.lifetimeXP, 95);
}
const midnight = newLedger();
addGoal(midnight, 'a', rule, time(1));
complete(midnight, 'a', 'midnight', 1, 'lessons', time(1));
assert.equal(progress(midnight, 'a', Date.UTC(2026, 0, 3) - 1).current, 1);
assert.equal(progress(midnight, 'a', Date.UTC(2026, 0, 3)).current, 0);
console.log('PASS: exact midnight expiration and consecutive DST dates.');
