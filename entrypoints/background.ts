import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { migrateGoals, STORE_KEY, validateGoal } from '../src/goals';
export default defineBackground(() => {
  // Serialize writes so separate dashboard windows cannot overwrite other goals.
  let queue: Promise<unknown> = Promise.resolve();
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message?.type !== 'goals') return;
    if (sender.id !== browser.runtime.id || !sender.url?.startsWith(browser.runtime.getURL('/'))) return;
    const operation = queue.then(async () => {
      const saved = await browser.storage.local.get(STORE_KEY);
      const store = migrateGoals(saved[STORE_KEY]);
      const { action, payload } = message;
      if (action === 'create') store.goals.push(validateGoal({ ...payload, id: crypto.randomUUID(), archived: false }));
      else if (['edit', 'archive', 'restore', 'delete'].includes(action)) {
        const index = store.goals.findIndex(g => g.id === payload?.id);
        if (index < 0) throw new Error('This goal no longer exists. Reopen the dashboard to refresh.');
        if (action === 'delete') store.goals.splice(index, 1);
        else if (action === 'edit') store.goals[index] = validateGoal({ ...store.goals[index], name: payload.name, target: payload.target, unit: payload.unit });
        else store.goals[index]!.archived = action === 'archive';
      } else if (action !== 'read') throw new Error('Unknown goal action.');
      if (action !== 'read' || saved[STORE_KEY] === undefined) await browser.storage.local.set({ [STORE_KEY]: store });
      return { ok: true, store };
    });
    queue = operation.catch(() => {});
    return operation.catch(e => ({ ok: false, error: e instanceof Error ? e.message : 'Could not save goals. Please try again.' }));
  });
});
