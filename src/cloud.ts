import { browser } from 'wxt/browser';
import { authClient, forgetAccount } from './account';
import { GFG_KEY, GFG_ORIGIN, type ReadingState } from './reading';
import { STORE_KEY, type GoalStore } from './goals';
import { monthDays, type CloudHistory } from './history';

const project = import.meta.env.WXT_SUPABASE_URL as string | undefined;
export const CLOUD_KEY = `cloud:${project ?? 'unconfigured'}`;
const WEEK = 7 * 86400000;
export type CloudBinding = { generation: string; eventId: string; streakId: string; ruleId: string };
type Summary = { current: number; best: number; xp: number; completed_today: boolean; local_date: string; target: number; unit: string; rule_version_id: string; server_time: string; timezone?: string };
type CloudGoal = { id: string; local_goal_id: string; name: string; summary: Summary };
type Event = { id: string; streakId: string; localGoalId: string; at: number; retryAt: number; attempts: number; status: 'pending' | 'accepted' | 'already_complete' | 'rejected' | 'expired'; detail?: string; payload?: { p_event_uuid: string; p_streak_id: string; p_rule_version_id: string; p_activity_id: string; p_evidence: { schema_version: number; fingerprint: string; weights: number[]; dwell: number[]; active_seconds: number } } };
export type CloudState = { owner: string; generation: string; enabled: boolean; goals: CloudGoal[]; events: Event[]; refreshedAt: number; retryAt: number; error?: string };

// One cloud writer; network work runs separately from the reading checkpoint queue.
let operations: Promise<unknown> = Promise.resolve();
export function withCloudLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation);
  operations = result.catch(() => {});
  return result;
}
export async function cloudState(): Promise<CloudState | undefined> {
  return (await browser.storage.local.get(CLOUD_KEY))[CLOUD_KEY] as CloudState | undefined;
}
async function save(state: CloudState) { await browser.storage.local.set({ [CLOUD_KEY]: state }); }
export async function bindCloudArticle(localGoalId: string): Promise<CloudBinding | undefined> {
  const state = await cloudState();
  const goal = state?.enabled && state.goals.find(g => g.local_goal_id === localGoalId);
  return goal ? { generation: state!.generation, eventId: crypto.randomUUID(), streakId: goal.id, ruleId: goal.summary.rule_version_id } : undefined;
}
async function verifiedClient(owner?: string) {
  const client = await authClient();
  const { data: session, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session.session) {
    if (!sessionError || [400, 401, 403].includes(sessionError.status ?? 0)) await forgetAccount();
    throw new Error('Sign in again to resume cloud sync.');
  }
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    if ([401, 403].includes(error?.status ?? 0)) await forgetAccount();
    throw new Error('Account could not be verified. Retry when online.');
  }
  if (owner && data.user.id !== owner) throw new Error('This queue belongs to another account. Sign in to the original account.');
  return { client, owner: data.user.id };
}
async function refreshGoals(state: CloudState, client: Awaited<ReturnType<typeof authClient>>) {
  const { data, error } = await client.from('streaks').select('id,name,status,local_goal_id').order('created_at');
  if (error || !Array.isArray(data)) throw new Error('Cloud goals could not be refreshed. Check your connection and database setup.');
  const goals: CloudGoal[] = [];
  for (const goal of data.filter(g => g.status === 'active')) {
    const { data: summary, error: summaryError } = await client.rpc('get_streak_summary', { p_streak_id: goal.id });
    if (summaryError || !summary?.rule_version_id) throw new Error('Cloud totals could not be refreshed. Previously fetched totals are shown.');
    goals.push({ id: goal.id, name: goal.name, local_goal_id: goal.local_goal_id, summary });
  }
  state.goals = goals;
  state.refreshedAt = Date.now();
}
function capture(state: CloudState, reading: ReadingState | undefined) {
  for (const article of Object.values(reading?.articles ?? {})) {
    const binding = article.cloud;
    if (!article.completed || !article.completedAt || binding?.generation !== state.generation || state.events.some(e => e.id === binding.eventId)) continue;
    if (state.events.length >= 1000) throw new Error('Cloud queue limit reached. New cloud submissions are paused; saved reading remains on this device.');
    state.events.push({ id: binding.eventId, streakId: binding.streakId, localGoalId: article.goalId, at: article.completedAt, retryAt: 0, attempts: 0, status: 'pending', payload: {
      p_event_uuid: binding.eventId, p_streak_id: binding.streakId, p_rule_version_id: binding.ruleId,
      p_activity_id: new URL(article.url).pathname,
      p_evidence: { schema_version: 1, fingerprint: article.fingerprint, weights: [...article.weights], dwell: [...article.dwell], active_seconds: article.seconds },
    } });
  }
  for (const event of state.events) if (event.status === 'pending' && Date.now() - event.at > WEEK) {
    event.status = 'expired'; delete event.payload;
    event.detail = 'Expired after seven days without confirmation. An earlier attempt may have arrived; refresh server totals.';
  }
}
const explanations: Record<string, string> = {
  STALE_RULE: 'The cloud goal rule changed. This submission was not accepted; start a new article under the refreshed rule.',
  ACTIVITY_ALREADY_CREDITED: 'This article already received cloud credit on this account, possibly on another device.',
  DISCONNECTED: 'The account connection was disabled. Enable sync again before reading a new article.',
  GOAL_INACTIVE: 'The cloud goal is archived.', GOAL_UNAVAILABLE: 'The cloud goal is no longer available.',
  EVENT_CONFLICT: 'This submission ID was already used with different evidence. It was not resubmitted under a new ID.',
  INVALID_EVIDENCE: 'The saved evidence did not meet the server format. Start a new supported article.',
  INSUFFICIENT_READING: 'The article did not meet the server reading requirements.',
};
async function synchronize(force = false) {
  const state = await cloudState();
  if (!state) return;
  const saved = await browser.storage.local.get([GFG_KEY, STORE_KEY]);
  const reading = saved[GFG_KEY] as ReadingState | undefined;
  try { capture(state, reading); }
  catch (error) { state.error = error instanceof Error ? error.message : 'Could not prepare saved submissions.'; await save(state); return; }
  // Capture before networking so a worker shutdown cannot lose an event UUID or payload.
  await save(state);
  if ((!state.enabled && !force) || (!force && state.retryAt > Date.now())) return;
  if (!force && !state.events.some(e => e.status === 'pending' && e.retryAt <= Date.now()) && Date.now() - state.refreshedAt < 60000) return;
  try {
    if (state.enabled && (!reading?.goalId || !await browser.permissions.contains({ origins: [GFG_ORIGIN] }))) throw new Error('Cloud sync is paused until GeeksforGeeks is connected on this device.');
    const { client } = await verifiedClient(state.owner);
    const goals = (saved[STORE_KEY] as GoalStore | undefined)?.goals ?? [];
    // Bound each wake; remaining events are picked up by the next alarm or manual retry.
    for (const event of state.events.filter(e => state.enabled && e.status === 'pending' && e.retryAt <= Date.now()).slice(0, 10)) {
      if (!goals.some(g => g.id === event.localGoalId && !g.archived)) {
        event.status = 'rejected'; event.detail = 'The local goal was archived or deleted before synchronization.'; delete event.payload; await save(state); continue;
      }
      event.attempts++;
      event.retryAt = Date.now() + Math.min(300000, 1000 * 2 ** Math.min(event.attempts, 9));
      await save(state);
      const { data, error } = await client.rpc('submit_reading_event', event.payload!);
      if (error) throw new Error('Submission could not be confirmed. Its original ID is saved for retry.');
      if (data?.code === 'RATE_LIMIT') {
        event.retryAt = Date.now() + 60000; event.detail = 'Server is busy. Retrying after one minute.'; await save(state); break;
      }
      if (!['accepted', 'already_complete', 'rejected'].includes(data?.status)) throw new Error('Unexpected server response. Submission remains pending.');
      event.status = data.status;
      event.detail = data.status === 'rejected' ? explanations[data.code] ?? `Server rejected this submission (${String(data.code ?? 'UNKNOWN')}). Start a new article after checking the connection and goal.` : data.status === 'already_complete' ? 'The server had already completed this day. No extra XP was awarded.' : 'Article accepted. Server receipt date determines the learning day.';
      delete event.payload;
      // Never add xp_awarded: replay responses can contain old awards and old totals.
      await save(state);
    }
    await refreshGoals(state, client);
    state.error = undefined; state.retryAt = 0;
  } catch (error) {
    if ((await cloudState())?.generation !== state.generation) return; // Invalidated identity must not recreate its erased queue.
    state.error = error instanceof Error ? error.message : 'Cloud sync is unavailable.';
    state.retryAt = Date.now() + 60000;
  }
  await save(state);
}
let syncing: Promise<unknown> | undefined;
export function syncCloud() {
  syncing ??= withCloudLock(() => synchronize()).catch(() => {}).finally(() => { syncing = undefined; });
  return syncing;
}
async function readHistory(payload: { month?: string; goalId?: string } = {}): Promise<CloudHistory> {
  const month = payload.month ?? '';
  const dates = monthDays(month).flat().filter((d): d is string => !!d);
  const { client, owner } = await verifiedClient();
  const goals = await client.from('streaks').select('id,name,status').eq('user_id', owner).order('created_at');
  if (goals.error || !goals.data) throw new Error('Could not load cloud goals. Retry when online.');
  const selected = goals.data.find(g => g.id === payload.goalId) ?? goals.data[0];
  if (!selected) return { goals: [], selectedId: null, record: null, fetchedAt: Date.now() };
  const [summary, days, awards] = await Promise.all([
    client.rpc('get_streak_summary', { p_streak_id: selected.id }),
    client.from('daily_completions').select('local_date').eq('user_id', owner).eq('streak_id', selected.id).gte('local_date', dates[0]).lte('local_date', dates.at(-1)!).order('local_date'),
    client.from('milestone_awards').select('milestone').eq('user_id', owner).eq('streak_id', selected.id),
  ]);
  if (summary.error || !summary.data?.rule_version_id || days.error || awards.error) throw new Error('History could not be loaded. Check your connection and retry.');
  const s = summary.data;
  return { goals: goals.data, selectedId: selected.id, fetchedAt: Date.now(), record: {
    current: s.current, best: s.best, xp: s.xp, today: s.local_date, timezone: s.timezone ?? 'Goal timezone',
    completedToday: s.completed_today, days: (days.data ?? []).map(d => d.local_date), milestones: (awards.data ?? []).map(a => a.milestone),
  } };
}
export async function handleCloud(action: string, payload?: { month?: string; goalId?: string }) {
  if (action === 'history') return readHistory(payload);
  if (action === 'read') {
    const state = await cloudState();
    // UI gets status and totals, never evidence payloads or credentials.
    return state ? { ...state, events: state.events.map(({ payload, ...event }) => event) } : null;
  }
  if (action === 'pause') {
    const state = await cloudState(); if (state) { state.enabled = false; await save(state); }
  } else if (action === 'enable') {
    const saved = (await browser.storage.local.get(GFG_KEY))[GFG_KEY] as ReadingState | undefined;
    if (!saved?.goalId || !await browser.permissions.contains({ origins: [GFG_ORIGIN] })) throw new Error('Connect a device goal to GeeksforGeeks first.');
    const { client, owner } = await verifiedClient();
    const previous = await cloudState();
    const state: CloudState = previous?.owner === owner ? previous : { owner, generation: crypto.randomUUID(), enabled: false, goals: [], events: [], refreshedAt: 0, retryAt: 0 };
    await refreshGoals(state, client);
    if (!state.goals.some(g => g.local_goal_id === saved.goalId)) throw new Error('Copy the connected goal to this account first.');
    const { error } = await client.rpc('set_reading_connection', { p_connected: true });
    if (error) throw new Error('Could not enable the cloud reading connection. Apply all database migrations and retry.');
    state.enabled = true; state.error = undefined; state.retryAt = 0; await save(state);
  } else if (action === 'retry') await synchronize(true);
  else throw new Error('Unknown cloud action.');
  return handleCloud('read');
}
