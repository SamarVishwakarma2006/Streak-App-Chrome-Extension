import { handleReading, syncReadingGoal, requestResume, readingState } from '../src/reading-worker';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { migrateGoals, STORE_KEY, validateGoal } from '../src/goals';
export default defineBackground(() => {
  // Serialize writes so separate dashboard windows cannot overwrite other goals.
  let queue: Promise<unknown> = Promise.resolve();
  browser.runtime.onMessage.addListener((message, sender) => {
    if (!['goals', 'gfg'].includes(message?.type)) return;
    if (sender.id !== browser.runtime.id) return;
    if (message.type === 'goals' && !sender.url?.startsWith(browser.runtime.getURL('/'))) return;
    const operation = queue.then(async () => {
      const saved = await browser.storage.local.get(STORE_KEY);
      const store = migrateGoals(saved[STORE_KEY]);
      const { action, payload } = message;
      if (message.type === 'gfg') return { ok: true, ...await handleReading(action, payload, sender, store) };
      if (action === 'create') store.goals.push(validateGoal({ ...payload, id: crypto.randomUUID(), archived: false }));
      else if (['edit', 'archive', 'restore', 'delete', 'continue'].includes(action)) {
        const index = store.goals.findIndex(g => g.id === payload?.id);
        if (index < 0) throw new Error('This goal no longer exists. Reopen the dashboard to refresh.');
        const goal = store.goals[index]!;
        if (action === 'continue') {
          if (goal.archived || !goal.location) throw new Error('Add a lesson link to an active goal in the dashboard first.');
          const { url } = goal.location;
          const tabs = await browser.tabs.query({});
          const existing = tabs.find(tab => tab.url === url || tab.pendingUrl === url);
          if (existing?.id !== undefined) {
            await browser.tabs.update(existing.id, { active: true });
            await browser.windows.update(existing.windowId, { focused: true });
            const state = await readingState();
            const article = state.articles['geeksforgeeks:' + url];
            if (article) await browser.tabs.sendMessage(existing.id, { type: 'gfg-resume', chunk: article.chunk }).catch(() => {});
          } else { const opened = await browser.tabs.create({ url }); if (opened.id !== undefined) requestResume(opened.id); }
        } else if (action === 'delete') store.goals.splice(index, 1);
        else if (action === 'edit') store.goals[index] = validateGoal({ ...goal, name: payload.name, target: payload.target, unit: payload.unit, location: payload.location });
        else store.goals[index]!.archived = action === 'archive';
      } else if (action !== 'read') throw new Error('Unknown goal action.');
      if (!['read', 'continue'].includes(action) || (saved[STORE_KEY] as { version?: unknown } | undefined)?.version !== 2) await browser.storage.local.set({ [STORE_KEY]: store });
      if (['edit', 'archive', 'restore', 'delete'].includes(action)) await syncReadingGoal(action, payload.id, store);
      return { ok: true, store };
    });
    queue = operation.catch(() => {});
    return operation.catch(e => ({ ok: false, error: e instanceof Error ? e.message : 'Could not save goals. Please try again.' }));
  });
});
