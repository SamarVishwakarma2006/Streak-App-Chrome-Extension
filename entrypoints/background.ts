import { handleReading, syncReadingGoal, continueGoal, recoverAwards } from '../src/reading-worker';
import { handleReminders, ensureReminderAlarm, reminderTick, observeReading, leftReading, notificationAction, REMINDER_ALARM } from '../src/reminders';
import { handleAccount } from '../src/account';
import { handleCloud, syncCloud, withCloudLock } from '../src/cloud';
import { handlePrivacy } from '../src/privacy';
import { GFG_KEY } from '../src/reading';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { migrateGoals, STORE_KEY, validateGoal } from '../src/goals';
export default defineBackground(() => {
  // Serialize writes so separate dashboard windows cannot overwrite other goals.
  let queue: Promise<unknown> = Promise.resolve();
  const reminderJob = (work: () => Promise<unknown>) => { queue = queue.then(work).catch(() => {}); };
  const recover = () => { queue = queue.then(() => recoverAwards()).catch(() => {}); };
  browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'gfg-recovery') { recover(); void syncCloud(); }
    if (alarm.name === REMINDER_ALARM) reminderJob(reminderTick);
  });
  void browser.alarms.create('gfg-recovery', { periodInMinutes: 1 });
  recover();
  void syncCloud();
  reminderJob(async () => { await ensureReminderAlarm(); await reminderTick(); });
  const clicked = (id: string) => reminderJob(() => notificationAction(id, 'continue'));
  const buttonClicked = (id: string, index: number) => { if (index === 0 || index === 1) reminderJob(() => notificationAction(id, index === 0 ? 'continue' : 'snooze')); };
  const closed = (id: string, byUser: boolean) => { if (byUser) reminderJob(() => notificationAction(id, 'dismiss')); };
  function registerNotificationEvents() {
    // Chrome omits this API until its optional permission has been granted.
    const api = browser.notifications;
    if (!api) return;
    if (!api.onClicked.hasListener(clicked)) api.onClicked.addListener(clicked);
    if (!api.onButtonClicked.hasListener(buttonClicked)) api.onButtonClicked.addListener(buttonClicked);
    if (!api.onClosed.hasListener(closed)) api.onClosed.addListener(closed);
  }
  registerNotificationEvents();
  const permissionsChanged = () => { registerNotificationEvents(); reminderJob(async () => { await ensureReminderAlarm(); await reminderTick(); }); };
  browser.permissions.onAdded.addListener(permissionsChanged); browser.permissions.onRemoved.addListener(permissionsChanged);
  browser.tabs.onActivated.addListener(info => reminderJob(async () => { if ((await browser.windows.get(info.windowId)).focused) await leftReading(info.tabId); }));
  browser.tabs.onUpdated.addListener((id, change) => { if (change.status === 'loading') reminderJob(() => leftReading(id, true)); });
  browser.windows.onFocusChanged.addListener(id => { if (id !== browser.windows.WINDOW_ID_NONE) reminderJob(async () => {
    const [tab] = await browser.tabs.query({ active: true, windowId: id }); if (tab?.id !== undefined) await leftReading(tab.id);
  }); });
  browser.tabs.onRemoved.addListener(id => { void browser.storage.session.remove(`gfg-resume:${id}`); reminderJob(() => leftReading(id, true)); });
  browser.runtime.onMessage.addListener((message, sender) => {
    if (!['goals', 'gfg', 'account', 'cloud', 'reminders', 'privacy'].includes(message?.type)) return;
    if (sender.id !== browser.runtime.id) return;
    if (['goals', 'account', 'cloud', 'reminders', 'privacy'].includes(message.type) && !sender.url?.startsWith(browser.runtime.getURL('/'))) return;
    // Cloud networking must not hold up one-second reading checkpoints.
    if (message.type === 'cloud') return withCloudLock(async () => ({ ok: true, state: await handleCloud(message.action, message.payload) })).catch(e => ({ ok: false, error: e instanceof Error ? e.message : 'Cloud sync unavailable.' }));
    const operation = queue.then(async () => {
      if (message.type === 'privacy') return withCloudLock(async () => ({ ok: true, ...await handlePrivacy(message.action, message.payload) }));
      const saved = await browser.storage.local.get(STORE_KEY);
      const store = migrateGoals(saved[STORE_KEY]);
      const { action, payload } = message;
      if (message.type === 'reminders') { registerNotificationEvents(); return { ok: true, ...await handleReminders(action, payload) }; }
      if (message.type === 'account') return { ok: true, ...await withCloudLock(() => handleAccount(action, payload, store)) };
      if (message.type === 'gfg') {
        const result = await handleReading(action, payload, sender, store);
        if ('activelyReading' in result && result.activelyReading && sender.tab?.id !== undefined) await observeReading(sender.tab.id, result.goalId).catch(() => {});
        if (action === 'disconnect') await reminderTick().catch(() => {});
        if ('qualifiedNow' in result && result.qualifiedNow) void syncCloud();
        return { ok: true, ...result };
      }
      if (action === 'create') store.goals.push(validateGoal({ ...payload, id: crypto.randomUUID(), archived: false }));
      else if (['edit', 'archive', 'restore', 'delete', 'continue'].includes(action)) {
        const index = store.goals.findIndex(g => g.id === payload?.id);
        if (index < 0) throw new Error('This goal no longer exists. Reopen the dashboard to refresh.');
        const goal = store.goals[index]!;
        if (action === 'continue') {
          await continueGoal(goal);
        } else if (action === 'delete') store.goals.splice(index, 1);
        else if (action === 'edit') store.goals[index] = validateGoal({ ...goal, name: payload.name, target: payload.target, unit: payload.unit, location: payload.location });
        else store.goals[index]!.archived = action === 'archive';
      } else if (action !== 'read') throw new Error('Unknown goal action.');
      const reading = ['edit', 'archive', 'restore', 'delete'].includes(action) ? await syncReadingGoal(action, payload.id, store) : undefined;
      if (!['read', 'continue'].includes(action) || (saved[STORE_KEY] as { version?: unknown } | undefined)?.version !== 2) await browser.storage.local.set({ [STORE_KEY]: store, ...(reading ? { [GFG_KEY]: reading } : {}) });
      if (['edit', 'archive', 'restore', 'delete'].includes(action)) reminderJob(async () => { await ensureReminderAlarm(); await reminderTick(); });
      return { ok: true, store };
    });
    queue = operation.catch(() => {});
    return operation.catch(e => ({ ok: false, error: e instanceof Error ? e.message : 'Could not save goals. Please try again.' }));
  });
});
