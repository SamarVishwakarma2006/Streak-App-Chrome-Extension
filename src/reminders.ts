import { browser } from 'wxt/browser';
import { STORE_KEY, migrateGoals } from './goals';
import { readingState, continueGoal } from './reading-worker';
import { GFG_ORIGIN } from './reading';
import { cloudState } from './cloud';
import { localDate, progress } from './streaks';

export const REMINDER_KEY = 'reminderSettings';
const SESSION_KEY = 'reminderSession';
export const REMINDER_ALARM = 'streak-reminders';
export type Preference = { daily: boolean; time: string; nudge: boolean; motivation: string; articleTarget: number | null };
type Notice = { id: string; goalId: string; day: string; kind: 'daily' | 'nudge'; expires: number };
type Snooze = Omit<Notice, 'id' | 'expires'> & { until: number };
export type ReminderState = { version: 1; quiet: boolean; quietStart: string; quietEnd: string; goals: Record<string, Preference>; sent: Record<string, string>; notice?: Notice; snooze?: Snooze; error?: string };
type Session = { id: string; tabId: number; goalId: string; lastActive: number; seconds: number; awayAt?: number; nudged?: boolean };
const newState = (): ReminderState => ({ version: 1, quiet: true, quietStart: '22:00', quietEnd: '08:00', goals: {}, sent: {} });
const validTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
function minuteAt(now: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  return Number(parts.find(p => p.type === 'hour')!.value) * 60 + Number(parts.find(p => p.type === 'minute')!.value);
}
function quietAt(state: ReminderState, minute: number) {
  if (!state.quiet) return false;
  const start = minutes(state.quietStart), end = minutes(state.quietEnd);
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}
async function readState(): Promise<ReminderState> {
  const value = (await browser.storage.local.get(REMINDER_KEY))[REMINDER_KEY] as ReminderState | undefined;
  if (value && (value.version !== 1 || !value.goals || !value.sent)) throw new Error('Unsupported reminder settings. Saved data was preserved.');
  return value ?? newState();
}
async function save(state: ReminderState) { await browser.storage.local.set({ [REMINDER_KEY]: state }); }
async function session(): Promise<Session | undefined> { return (await browser.storage.session.get(SESSION_KEY))[SESSION_KEY] as Session | undefined; }
async function permitted() {
  try { return await browser.permissions.contains({ permissions: ['notifications'] }) && await browser.notifications?.getPermissionLevel() === 'granted'; }
  catch { return false; }
}
export async function ensureReminderAlarm() {
  const state = await readState();
  const goals = migrateGoals((await browser.storage.local.get(STORE_KEY))[STORE_KEY]).goals;
  let changed = false;
  for (const id of Object.keys(state.goals)) if (!goals.some(g => g.id === id)) { delete state.goals[id]; delete state.sent[id]; changed = true; }
  if (changed) await save(state);
  if (goals.some(g => !g.archived && (state.goals[g.id]?.daily || state.goals[g.id]?.nudge)) && await permitted()) {
    if (!await browser.alarms.get(REMINDER_ALARM)) await browser.alarms.create(REMINDER_ALARM, { periodInMinutes: 1 });
  } else { await browser.alarms.clear(REMINDER_ALARM); await browser.storage.session.remove(SESSION_KEY); }
}
async function eligible(state: ReminderState, goalId: string, now: number) {
  const store = migrateGoals((await browser.storage.local.get(STORE_KEY))[STORE_KEY]);
  const goal = store.goals.find(g => g.id === goalId && !g.archived);
  const preference = state.goals[goalId];
  if (!goal?.location || !preference || (!preference.daily && !preference.nudge) || !await permitted()) return null;
  const reading = await readingState();
  if (reading.goalId !== goalId || !reading.ledger.goals[goalId] || reading.ledger.clock > now || !await browser.permissions.contains({ origins: [GFG_ORIGIN] })) return null;
  const result = progress(reading.ledger, goalId, now), day = localDate(now, result.rule.timezone);
  const cloud = (await cloudState())?.goals.find(g => g.local_goal_id === goalId)?.summary;
  if (result.completedToday || (cloud?.completed_today && cloud.local_date === localDate(now, cloud.timezone ?? result.rule.timezone))) return null;
  const articles = Object.values(reading.articles).filter(a => a.goalId === goalId);
  const qualified = articles.filter(a => a.completed && a.qualifiedOn === day).length;
  const amount = result.rule.unit === 'lessons' ? qualified : articles.reduce((sum, a) => sum + (a.byDate[day] ?? 0), 0) / 60;
  if (qualified && amount >= result.rule.target) return null; // Also covers a pending local reward write.
  const minute = minuteAt(now, result.rule.timezone);
  return { goal, preference, day, amount, rule: result.rule, minute, quiet: quietAt(state, minute), totalArticles: articles.filter(a => a.completed).length };
}
async function clearNotice(state: ReminderState) {
  if (state.notice) {
    const id = state.notice.id; delete state.notice; await save(state);
    await browser.notifications?.clear(id).catch(() => {});
  }
}
export async function observeReading(tabId: number, goalId: string) {
  const state = await readState(), pref = state.goals[goalId];
  if (!pref || (!pref.daily && !pref.nudge) || !await permitted()) return;
  const now = Date.now();
  let current = await session();
  if (!current || current.goalId !== goalId || now - current.lastActive > 30 * 60000 || now < current.lastActive) current = { id: crypto.randomUUID(), tabId, goalId, lastActive: now, seconds: 0 };
  const gap = (now - current.lastActive) / 1000;
  if (gap > 0 && gap <= 2) current.seconds += Math.min(1, gap);
  current.tabId = tabId; current.lastActive = now; delete current.awayAt;
  await browser.storage.session.set({ [SESSION_KEY]: current });
  if (state.snooze?.goalId === goalId || state.notice?.goalId === goalId) {
    delete state.snooze; await clearNotice(state); await save(state);
  }
}
export async function leftReading(tabId: number, leavingSource = false) {
  const current = await session();
  if (current && !leavingSource && tabId === current.tabId) {
    delete current.awayAt; await browser.storage.session.set({ [SESSION_KEY]: current }); return;
  }
  if (!current || current.awayAt || current.nudged || current.seconds < 30 || Date.now() - current.lastActive > 30 * 60000) return;
  if (leavingSource ? tabId !== current.tabId : tabId === current.tabId) return;
  const state = await readState();
  if (!state.goals[current.goalId]?.nudge) return;
  current.awayAt = Date.now();
  await browser.storage.session.set({ [SESSION_KEY]: current });
}
async function notify(state: ReminderState, item: NonNullable<Awaited<ReturnType<typeof eligible>>>, kind: Notice['kind'], snoozed: boolean) {
  const now = Date.now();
  if (item.quiet || (!snoozed && state.sent[item.goal.id] === item.day)) return;
  const active = await session();
  if (active?.goalId === item.goal.id && now - active.lastActive < 5000) return;
  await clearNotice(state);
  const id = `streak-reminder:${crypto.randomUUID()}`;
  // Reserve before delivery: a worker interruption may lose a reminder, never send it twice.
  state.sent[item.goal.id] = item.day;
  state.notice = { id, goalId: item.goal.id, day: item.day, kind, expires: now + 15 * 60000 };
  delete state.snooze; state.error = undefined;
  if (kind === 'nudge' && active) { active.nudged = true; await browser.storage.session.set({ [SESSION_KEY]: active }); }
  await save(state);
  const amount = Math.floor(item.amount * 10) / 10;
  const remaining = Math.max(0, Math.ceil((item.rule.target - item.amount) * 10) / 10);
  const milestone = item.preference.articleTarget ? ` ${item.totalArticles}/${item.preference.articleTarget} qualified articles toward your milestone.` : '';
  const message = `${amount}/${item.rule.target} ${item.rule.unit} today; ${remaining > 0 ? `${remaining} left` : 'finish a qualifying article'}. ${item.preference.motivation || 'One small step keeps your learning moving.'}${milestone}`;
  try {
    await browser.notifications.create(id, { type: 'basic', iconUrl: browser.runtime.getURL('/icon/128.png'), title: item.goal.name,
      message, contextMessage: 'Device progress · Close to dismiss', buttons: [{ title: 'Continue' }, { title: 'Snooze 10 minutes' }], priority: 0, silent: true });
  } catch {
    state.error = 'Chrome could not show the reminder. Check notification permissions and your system settings. Today’s reminder will not be retried automatically.';
    delete state.notice; await save(state);
  }
}
export async function reminderTick() {
  const state = await readState(), now = Date.now();
  if (state.notice) {
    const item = await eligible(state, state.notice.goalId, now);
    if (!item || item.quiet || state.notice.day !== item.day || state.notice.expires <= now || !item.preference[state.notice.kind === 'daily' ? 'daily' : 'nudge']) await clearNotice(state);
  }
  if (state.snooze) {
    const item = await eligible(state, state.snooze.goalId, now), snooze = state.snooze;
    if (!item || item.day !== snooze.day || now > snooze.until + 15 * 60000 || !item.preference[snooze.kind === 'daily' ? 'daily' : 'nudge']) { delete state.snooze; await save(state); }
    else if (now >= snooze.until) {
      delete state.snooze; await save(state);
      if (!item.quiet) await notify(state, item, snooze.kind, true);
      return;
    } else return;
  }
  const current = await session();
  if (current?.awayAt && !current.nudged && now - current.awayAt >= 60000 && now - current.awayAt <= 15 * 60000) {
    const item = await eligible(state, current.goalId, now);
    const focused = await browser.windows.getLastFocused().then(window => window.focused).catch(() => false);
    if (item?.preference.nudge && focused) await notify(state, item, 'nudge', false);
  }
  const reading = await readingState();
  if (!reading.goalId) return;
  const item = await eligible(state, reading.goalId, now);
  if (item?.preference.daily && item.minute >= minutes(item.preference.time) && item.minute - minutes(item.preference.time) < 60) await notify(state, item, 'daily', false);
}
export async function notificationAction(id: string, action: 'continue' | 'snooze' | 'dismiss') {
  const state = await readState(), notice = state.notice;
  if (!notice || notice.id !== id) return;
  const item = await eligible(state, notice.goalId, Date.now());
  await clearNotice(state);
  if (action === 'dismiss' || !item || notice.expires < Date.now() || notice.day !== item.day) return;
  if (action === 'snooze') {
    state.snooze = { goalId: notice.goalId, day: notice.day, kind: notice.kind, until: Date.now() + 10 * 60000 }; await save(state);
  } else {
    try { await continueGoal(item.goal); }
    catch { state.error = 'Could not open your saved activity. Use Continue in the dashboard to try again.'; await save(state); }
  }
}
export async function handleReminders(action: string, payload: any) {
  const state = await readState();
  if (action === 'save') {
    const store = migrateGoals((await browser.storage.local.get(STORE_KEY))[STORE_KEY]);
    if (!store.goals.some(g => g.id === payload?.goalId && !g.archived)) throw new Error('Choose an active saved goal.');
    const p = payload?.preference;
    if (!p || typeof p.daily !== 'boolean' || typeof p.nudge !== 'boolean' || !validTime(p.time) || typeof p.motivation !== 'string' || p.motivation.length > 100 ||
      !(p.articleTarget === null || Number.isInteger(p.articleTarget) && p.articleTarget >= 1 && p.articleTarget <= 10000) ||
      typeof payload.quiet !== 'boolean' || !validTime(payload.quietStart) || !validTime(payload.quietEnd) || payload.quiet && payload.quietStart === payload.quietEnd) throw new Error('Use valid times, different quiet-hour boundaries, and an optional article target between 1 and 10,000.');
    if ((p.daily || p.nudge) && !await permitted()) throw new Error('Allow Chrome notifications before enabling reminders.');
    state.goals[payload.goalId] = { daily: p.daily, time: p.time, nudge: p.nudge, motivation: p.motivation.trim(), articleTarget: p.articleTarget };
    state.quiet = payload.quiet; state.quietStart = payload.quietStart; state.quietEnd = payload.quietEnd;
    state.error = undefined; delete state.snooze;
    await clearNotice(state); await save(state); await browser.storage.session.remove(SESSION_KEY);
    await ensureReminderAlarm();
  } else if (action !== 'read') throw new Error('Unknown reminder action.');
  return { state, allowed: await permitted(), timezone: (await readingState()).timezone };
}
