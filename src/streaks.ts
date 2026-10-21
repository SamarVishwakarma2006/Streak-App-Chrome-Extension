// Local prototype only. Never use this ledger as evidence for cloud rewards.
export const MILESTONES = [[3, 20], [7, 50], [14, 100], [30, 250], [100, 1000]] as const;
export type Rule = { timezone: string; target: number; unit: 'minutes' | 'lessons' };
type Revision = Rule & { version: number; effectiveAt: number };
type Completion = { date: string; at: number; activity: string; version: number; run: number; xp: number };
type Progress = { rules: Revision[]; completions: Completion[]; milestones: number[]; run: number; archived: boolean };
export type PrototypeLedger = { goals: Record<string, Progress>; activities: string[]; lifetimeXP: number; clock: number };
export const newLedger = (): PrototypeLedger => ({ goals: {}, activities: [], lifetimeXP: 0, clock: 0 });
export function localDate(at: number, timezone: string): string {
  if (!Number.isFinite(at)) throw new Error('Invalid time.');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;
// Locate the actual next midnight rather than adding 24 hours (DST days vary).
export function nextBoundary(at: number, timezone: string): number {
  const date = localDate(at, timezone);
  let low = Math.floor(at), high = low + 48 * 3600000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (localDate(middle, timezone) === date) low = middle; else high = middle;
  }
  return high;
}
function checkRule(rule: Rule) {
  localDate(0, rule.timezone);
  if (!Number.isInteger(rule.target) || rule.target < 1 || rule.target > 1440 || !['minutes', 'lessons'].includes(rule.unit)) throw new Error('Invalid daily rule.');
}
function advance(ledger: PrototypeLedger, at: number) {
  if (!Number.isFinite(at) || at < ledger.clock) throw new Error('Backdating is not allowed.');
  ledger.clock = at;
}
function goalAt(ledger: PrototypeLedger, id: string) {
  if (!Object.hasOwn(ledger.goals, id)) throw new Error('Unknown goal.');
  return ledger.goals[id]!;
}
function ruleAt(goal: Progress, at: number) {
  const rule = goal.rules.findLast(rule => rule.effectiveAt <= at);
  if (!rule) throw new Error('Goal did not exist at this time.');
  return rule;
}
export function addGoal(ledger: PrototypeLedger, id: string, rule: Rule, at: number) {
  checkRule(rule);
  if (!id || ['__proto__', 'constructor', 'prototype'].includes(id) || Object.hasOwn(ledger.goals, id)) throw new Error('Use a unique goal ID.');
  advance(ledger, at);
  ledger.goals[id] = { rules: [{ ...rule, version: 1, effectiveAt: at }], completions: [], milestones: [], run: 0, archived: false };
}
export function changeRule(ledger: PrototypeLedger, id: string, rule: Rule, at: number) {
  checkRule(rule);
  const goal = goalAt(ledger, id), current = ruleAt(goal, at);
  advance(ledger, at);
  const version = goal.rules.at(-1)!.version + 1;
  goal.rules = goal.rules.filter(rule => rule.effectiveAt <= at);
  goal.rules.push({ ...rule, version, effectiveAt: nextBoundary(at, current.timezone) });
}
export function archiveGoal(ledger: PrototypeLedger, id: string, archived: boolean, at: number) {
  const goal = goalAt(ledger, id);
  advance(ledger, at);
  if (goal.archived && !archived) goal.run++;
  goal.archived = archived;
}
export function deleteGoal(ledger: PrototypeLedger, id: string, at: number) {
  goalAt(ledger, id); advance(ledger, at); delete ledger.goals[id];
  // Account-level XP and activity deduplication survive goal deletion.
}
export function progress(ledger: PrototypeLedger, id: string, at: number) {
  if (at < ledger.clock) throw new Error('Cannot inspect before the latest event.');
  const goal = goalAt(ledger, id), rule = ruleAt(goal, at);
  const today = localDate(at, rule.timezone);
  let streak = 0, best = 0;
  let previous: Completion | undefined;
  for (const completion of goal.completions) {
    streak = previous && completion.run === previous.run && dayNumber(completion.date) - dayNumber(previous.date) === 1 ? streak + 1 : 1;
    best = Math.max(best, streak); previous = completion;
  }
  const age = previous ? dayNumber(today) - dayNumber(previous.date) : Infinity;
  const current = !goal.archived && previous?.run === goal.run && age <= 1 ? streak : 0;
  return { current, best, completedToday: previous?.date === today, xp: goal.completions.reduce((sum, c) => sum + c.xp, 0), rule };
}
export function complete(ledger: PrototypeLedger, id: string, activity: string, amount: number, unit: Rule['unit'], at: number): boolean {
  const goal = goalAt(ledger, id), rule = ruleAt(goal, at);
  if (!activity.trim() || !Number.isFinite(amount) || amount < 0) throw new Error('Invalid completion.');
  advance(ledger, at);
  const date = localDate(at, rule.timezone), last = goal.completions.at(-1);
  // Prevent overlapping reward windows after timezone changes or reactivation.
  const lastRule = last && goal.rules.find(r => r.version === last.version)!;
  if (goal.archived || amount < rule.target || unit !== rule.unit || ledger.activities.includes(activity) ||
    (last && (date <= last.date || at < nextBoundary(last.at, lastRule!.timezone)))) return false;
  const current = progress(ledger, id, at).current + 1;
  let xp = 25;
  for (const [days, bonus] of MILESTONES) if (current === days && !goal.milestones.includes(days)) { goal.milestones.push(days); xp += bonus; }
  goal.completions.push({ date, at, activity, version: rule.version, run: goal.run, xp });
  ledger.activities.push(activity); ledger.lifetimeXP += xp;
  return true;
}
