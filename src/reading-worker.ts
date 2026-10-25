import { browser, type Browser } from 'wxt/browser';
import { GFG_KEY, GFG_ORIGIN, GFG_SCRIPT, articleURL, readingResult, applyReading, type ReadingState, type Article } from './reading';
import { newLedger, addGoal, archiveGoal, changeRule, complete, localDate, progress } from './streaks';
import type { GoalStore } from './goals';
import { bindCloudArticle } from './cloud';
const baselines = new Map<number, { at: number; url: string; fingerprint: string; goalId: string }>();

export async function readingState(): Promise<ReadingState> {
  const value = (await browser.storage.local.get(GFG_KEY))[GFG_KEY] as ReadingState | undefined;
  if (value === undefined) return { version: 1, goalId: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, articles: {}, ledger: newLedger() };
  if (value.version !== 1 || !value.articles || !value.ledger?.goals || !Array.isArray(value.ledger.activities)) throw new Error('Reading storage has an unsupported format; data was preserved.');
  return value;
}
export async function registerReader() {
  await browser.scripting.unregisterContentScripts({ ids: [GFG_SCRIPT] }).catch(() => {});
  await browser.scripting.registerContentScripts([{ id: GFG_SCRIPT, matches: ['https://www.geeksforgeeks.org/python/*', 'https://www.geeksforgeeks.org/dsa/*'], js: ['gfg.js'], runAt: 'document_idle', persistAcrossSessions: true }]);
}
export async function requestResume(tabId: number, url: string, fingerprint: string, chunk: number) {
  // Session storage survives worker suspension without reusing tab IDs after browser restart.
  await browser.storage.session.set({ [`gfg-resume:${tabId}`]: { url, fingerprint, chunk, expires: Date.now() + 60000 } });
}
export async function recoverAwards() {
  const state = await readingState();
  if (!state.pending?.length || state.pending[0]!.retryAt > Date.now()) return state;
  const updated = structuredClone(state);
  try {
    for (const event of updated.pending!) {
      if (!updated.ledger.activities.includes(event.activity)) complete(updated.ledger, event.goalId, event.activity, event.amount, event.unit, event.at);
    }
    updated.pending = [];
    // Award and queue removal share one persisted value.
    await browser.storage.local.set({ [GFG_KEY]: updated });
    return updated;
  } catch (error) {
    const first = state.pending[0]!;
    first.attempts++;
    first.retryAt = Date.now() + Math.min(300000, 1000 * 2 ** Math.min(first.attempts, 9));
    first.error = error instanceof Error ? error.message : 'Could not save local rewards.';
    await browser.storage.local.set({ [GFG_KEY]: state });
    return state;
  }
}
export async function handleReading(action: string, payload: any, sender: Browser.runtime.MessageSender, goals: GoalStore) {
  const extensionPage = sender.id === browser.runtime.id && sender.url?.startsWith(browser.runtime.getURL('/'));
  const state = await recoverAwards();
  const allowed = await browser.permissions.contains({ origins: [GFG_ORIGIN] });
  const now = Date.now();
  if (['read', 'connect', 'disconnect'].includes(action)) {
    if (!extensionPage) throw new Error('Only extension pages can change connections.');
    if (action === 'connect') {
      if (state.pending?.length) throw new Error('Local reward recovery is pending. Try again after recovery.');
      if (!allowed) throw new Error('Allow GeeksforGeeks access to connect.');
      const goal = goals.goals.find(g => g.id === payload?.goalId && !g.archived);
      if (!goal) throw new Error('Choose an active goal.');
      state.goalId = goal.id; baselines.clear();
      if (!state.ledger.goals[goal.id]) addGoal(state.ledger, goal.id, { timezone: state.timezone, target: goal.target, unit: goal.unit }, now);
      await registerReader();
      await browser.storage.local.set({ [GFG_KEY]: state });
      const tabs = await browser.tabs.query({ url: GFG_ORIGIN });
      await Promise.allSettled(tabs.filter(t => t.id).map(t => browser.scripting.executeScript({ target: { tabId: t.id! }, files: ['/gfg.js'] })));
    } else if (action === 'disconnect') {
      state.goalId = null; baselines.clear();
      await browser.storage.local.set({ [GFG_KEY]: state });
      await browser.scripting.unregisterContentScripts({ ids: [GFG_SCRIPT] }).catch(() => {});
      // Stop the adapter even if Chrome retains a grant (for example, a managed policy).
      await browser.permissions.remove({ origins: [GFG_ORIGIN] }).catch(() => false);
    }
    return { state, allowed: await browser.permissions.contains({ origins: [GFG_ORIGIN] }) };
  }
  if (action !== 'sample' || sender.id !== browser.runtime.id || sender.frameId !== 0 || sender.tab?.id === undefined || !sender.url?.startsWith('https://www.geeksforgeeks.org/')) throw new Error('Invalid reader message.');
  const tabId = sender.tab.id;
  if (state.pending?.length) { baselines.clear(); return { status: 'Recovering saved progress. Reading pauses until local rewards are saved.' }; }
  if (!allowed || !state.goalId) { baselines.delete(tabId); return { status: 'Disconnected. Connect a goal in the dashboard.', stopped: true }; }
  const goal = goals.goals.find(g => g.id === state.goalId && !g.archived);
  if (!goal) { baselines.delete(tabId); return { status: 'Paused: selected goal is archived or deleted.' }; }
  const url = articleURL(sender.url);
  if (articleURL(payload?.url) !== url || typeof payload.title !== 'string' || payload.title.length > 120 ||
    !/^[a-f0-9]{64}$/.test(payload.fingerprint) || !Array.isArray(payload.weights) || payload.weights.length < 1 || payload.weights.length > 500 ||
    payload.weights.some((w: unknown) => !Number.isInteger(w) || (w as number) < 1 || (w as number) > 100) ||
    payload.weights.reduce((a: number, b: number) => a + b, 0) < 100 || !Array.isArray(payload.visible) || payload.visible.length > 500 ||
    payload.visible.some((i: unknown) => !Number.isInteger(i) || (i as number) < 0 || (i as number) >= payload.weights.length) ||
    !Number.isInteger(payload.chunk) || payload.chunk < 0 || payload.chunk >= payload.weights.length) throw new Error('Unsupported article evidence.');
  const key = `geeksforgeeks:${url}`;
  let article = state.articles[key];
  if (article && article.goalId !== goal.id) return { status: 'This article belongs to another goal. Choose a new article.' };
  if (!article || (!article.completed && article.fingerprint !== payload.fingerprint)) {
    if (!article && Object.keys(state.articles).length >= 200) throw new Error('Local article limit reached. Data management will be added before release.');
    article = { url, title: payload.title, fingerprint: payload.fingerprint, weights: payload.weights, dwell: payload.weights.map(() => 0), seconds: 0, byDate: {}, goalId: goal.id, completed: false, chunk: 0 } as Article;
    article.cloud = await bindCloudArticle(goal.id);
    state.articles[key] = article; baselines.delete(tabId);
  }
  const tab = await browser.tabs.get(tabId), window = await browser.windows.get(tab.windowId);
  const active = tab.active && window.focused && payload.eligible === true && payload.visible.length > 0;
  const previous = baselines.get(tabId);
  const elapsed = previous && previous.url === url && previous.fingerprint === payload.fingerprint && previous.goalId === goal.id ? (now - previous.at) / 1000 : 0;
  // One focused tab contributes; switching tabs always starts a new baseline.
  if (active) for (const other of baselines.keys()) if (other !== tabId) baselines.delete(other);
  if (active) baselines.set(tabId, { at: now, url, fingerprint: payload.fingerprint, goalId: goal.id }); else baselines.delete(tabId);
  const resumeKey = `gfg-resume:${tabId}`;
  const savedResume = (await browser.storage.session.get(resumeKey))[resumeKey] as { url: string; fingerprint: string; chunk: number; expires: number } | undefined;
  const resume = savedResume?.url === url && savedResume.fingerprint === article.fingerprint && savedResume.expires > now ? savedResume.chunk : undefined;
  if (savedResume) await browser.storage.session.remove(resumeKey);
  if (active && !article.completed && elapsed > 0 && elapsed <= 2 && localDate(previous!.at, state.timezone) === localDate(now, state.timezone)) applyReading(article, payload.visible, Math.min(1, elapsed), localDate(now, state.timezone));
  if (active) article.chunk = payload.chunk;
  const result = readingResult(article);
  const qualifiedNow = !article.completed && result.qualified;
  if (qualifiedNow) { article.completed = true; article.completedAt = now; }
  const daily = Object.entries(state.articles).filter(([, a]) => a.goalId === goal.id && a.completed && (a.byDate[localDate(now, state.timezone)] ?? 0) > 0);
  // Record qualification day separately: earlier partial time never backfills credit.
  if (article.completed && !article.qualifiedOn) article.qualifiedOn = localDate(now, state.timezone);
  const qualified = daily.filter(([, a]) => a.qualifiedOn === localDate(now, state.timezone));
  const rule = progress(state.ledger, goal.id, Math.max(now, state.ledger.clock)).rule;
  const amount = rule.unit === 'lessons' ? qualified.length : Object.values(state.articles).filter(a => a.goalId === goal.id).reduce((n, a) => n + (a.byDate[localDate(now, state.timezone)] ?? 0), 0) / 60;
  const activity = `gfg-day:${goal.id}:${localDate(now, state.timezone)}`;
  if (qualified.length && amount >= rule.target && !state.ledger.activities.includes(activity)) {
    state.pending ??= [];
    if (state.pending.length >= 1000) throw new Error('Local recovery queue is full. Tracking is paused; saved progress is preserved.');
    if (!state.pending.some(event => event.activity === activity)) state.pending.push({ id: crypto.randomUUID(), goalId: goal.id, activity, amount, unit: rule.unit, at: now, attempts: 0, retryAt: 0 });
  }
  const changed = { ...goal, location: { url, origin: 'https://www.geeksforgeeks.org', title: article.title } };
  const saveLocation = active && (goal.location?.url !== url || goal.location?.title !== article.title);
  if (saveLocation) { goals.goals[goals.goals.findIndex(g => g.id === goal.id)] = changed; }
  await browser.storage.local.set({ [GFG_KEY]: state, ...(saveLocation ? { goalStore: goals } : {}) });
  const recovered = state.pending?.length ? await recoverAwards() : state;
  return { status: recovered.pending?.length ? 'Article saved · local reward recovery pending' : article.completed ? 'Article qualified · Browser tracked · Local progress saved' : active ? 'Reading · Browser tracked' : 'Paused: focus this page and interact to resume.', ...result, qualifiedNow, seconds: Math.floor(article.seconds), resume, fingerprint: article.fingerprint };
}
export async function syncReadingGoal(action: string, id: string, goals: GoalStore) {
  const state = await recoverAwards();
  if (state.pending?.length) throw new Error('Wait for saved local rewards to recover before editing this goal.');
  if (!state.ledger.goals[id]) return state;
  const now = Math.max(Date.now(), state.ledger.clock), goal = goals.goals.find(g => g.id === id);
  if (action === 'edit' && goal) changeRule(state.ledger, id, { timezone: state.timezone, target: goal.target, unit: goal.unit }, now);
  if (action === 'archive' || action === 'restore') archiveGoal(state.ledger, id, action === 'archive', now);
  if (action === 'delete') { archiveGoal(state.ledger, id, true, now); if (state.goalId === id) state.goalId = null; }
  baselines.clear();
  return state;
}
