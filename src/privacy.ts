import { browser } from 'wxt/browser';
import { authClient, forgetAccount } from './account';
import { CLOUD_KEY } from './cloud';
import { GFG_KEY, GFG_ORIGIN, GFG_SCRIPT } from './reading';
import { resetReadingBaselines } from './reading-worker';
import { STORE_KEY, migrateGoals } from './goals';
import { REMINDER_KEY, REMINDER_ALARM } from './reminders';

// Export only named fields. Credentials, cloud evidence queues and unknown keys never enter a download.
function pick(value: any, keys: string[]) {
  return Object.fromEntries(keys.filter(k => value && Object.hasOwn(value, k)).map(k => [k, value[k]]));
}
export function deviceExport(saved: Record<string, any>) {
  const goals = migrateGoals(saved[STORE_KEY]).goals.map(g => ({ ...pick(g, ['id', 'name', 'target', 'unit', 'archived']),
    location: g.location ? pick(g.location, ['url', 'origin', 'title']) : null }));
  const reading = saved[GFG_KEY];
  const ledger = reading?.ledger;
  const reminders = saved[REMINDER_KEY];
  return { schemaVersion: 1, source: 'device-prototype', exportedAt: new Date().toISOString(), goals,
    reading: { ...pick(reading, ['goalId', 'timezone']),
      articles: Object.values(reading?.articles ?? {}).map(a => pick(a, ['url', 'title', 'goalId', 'seconds', 'byDate', 'completed', 'qualifiedOn', 'completedAt', 'chunk'])),
      ledger: { ...pick(ledger, ['lifetimeXP', 'clock']), goals: Object.fromEntries(Object.entries(ledger?.goals ?? {}).map(([id, value]: [string, any]) => [id, {
        ...pick(value, ['milestones', 'run', 'archived']),
        rules: (value.rules ?? []).map((r: unknown) => pick(r, ['version', 'effectiveAt', 'timezone', 'target', 'unit'])),
        completions: (value.completions ?? []).map((c: unknown) => pick(c, ['date', 'at', 'activity', 'version', 'run', 'xp'])),
      }])) } },
    reminders: { ...pick(reminders, ['quiet', 'quietStart', 'quietEnd']), goals: Object.fromEntries(Object.entries(reminders?.goals ?? {}).map(([id, value]) => [id, pick(value, ['daily', 'time', 'nudge', 'motivation', 'articleTarget'])])) },
  };
}
async function clearDevice(deleteGoals = false) {
  // Called inside both worker queues: no reading/sync operation can restore erased data.
  const saved = await browser.storage.local.get([STORE_KEY, REMINDER_KEY]);
  const notice = (saved[REMINDER_KEY] as { notice?: { id: string } } | undefined)?.notice;
  resetReadingBaselines();
  // Disconnect first, even if permission revocation is blocked by managed Chrome policy.
  await browser.storage.local.set({ [GFG_KEY]: { version: 1, goalId: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, articles: {}, ledger: { goals: {}, activities: [], lifetimeXP: 0, clock: 0 } } });
  await browser.scripting.unregisterContentScripts({ ids: [GFG_SCRIPT] }).catch(() => {});
  await browser.permissions.remove({ origins: [GFG_ORIGIN] }).catch(() => false);
  if (notice) await browser.notifications?.clear(notice.id).catch(() => {});
  await browser.alarms.clear(REMINDER_ALARM);
  const goals = (saved[STORE_KEY] as { goals?: any[] } | undefined)?.goals;
  // Preserve goal definitions; erase every resume bookmark along with activity.
  if (deleteGoals) await browser.storage.local.set({ [STORE_KEY]: { version: 2, goals: [] } });
  else if (Array.isArray(goals)) await browser.storage.local.set({ [STORE_KEY]: { version: 2, goals: goals.map(g => ({ ...pick(g, ['id', 'name', 'target', 'unit', 'archived']), location: null })) } });
  await browser.storage.local.remove([REMINDER_KEY, CLOUD_KEY]);
  const session = await browser.storage.session.get(null);
  await browser.storage.session.remove(Object.keys(session).filter(k => k === 'reminderSession' || k.startsWith('gfg-resume:')));
}
export async function handlePrivacy(action: string, payload: any) {
  if (action === 'export-diagnostics') {
    const saved = await browser.storage.local.get([STORE_KEY, GFG_KEY, REMINDER_KEY, CLOUD_KEY]);
    const store = saved[STORE_KEY] as { goals?: { archived?: boolean }[] } | undefined;
    const reading = saved[GFG_KEY] as { goalId?: string; articles?: Record<string, { completed?: boolean }>; pending?: unknown[] } | undefined;
    const cloud = saved[CLOUD_KEY] as { enabled?: boolean; events?: { status?: string }[] } | undefined;
    const reminders = saved[REMINDER_KEY] as { goals?: Record<string, { daily?: boolean; nudge?: boolean }> } | undefined;
    const goals = Array.isArray(store?.goals) ? store.goals : [];
    const articles = Object.values(reading?.articles ?? {});
    const events = Array.isArray(cloud?.events) ? cloud.events : [];
    return { document: { schemaVersion: 1, reportType: 'beta-technical-summary', appVersion: browser.runtime.getManifest().version,
      cloudConfigured: !!import.meta.env.WXT_SUPABASE_URL,
      permissions: { site: await browser.permissions.contains({ origins: [GFG_ORIGIN] }), notifications: await browser.permissions.contains({ permissions: ['notifications'] }) },
      goals: { active: goals.filter(g => g?.archived === false).length, archived: goals.filter(g => g?.archived === true).length },
      reading: { connected: typeof reading?.goalId === 'string' && !!reading.goalId, trackedArticles: articles.length, qualifiedArticles: articles.filter(a => a?.completed === true).length, pendingAwards: Array.isArray(reading?.pending) ? reading.pending.length : 0 },
      cloud: { enabled: cloud?.enabled === true, pending: events.filter(e => e?.status === 'pending').length, rejected: events.filter(e => e?.status === 'rejected').length, expired: events.filter(e => e?.status === 'expired').length },
      reminders: { enabledGoals: Object.values(reminders?.goals ?? {}).filter(p => p?.daily === true || p?.nudge === true).length },
    } };
  }
  if (action === 'export-device') return { document: deviceExport(await browser.storage.local.get([STORE_KEY, GFG_KEY, REMINDER_KEY])) };
  if (action === 'clear-device') {
    if (payload?.confirmation !== 'CLEAR') throw new Error('Type CLEAR to erase device activity.');
    await clearDevice();
    return { message: 'Device activity, XP, bookmarks, reminders and unsynced submissions cleared. Goal definitions remain. Tracking is disconnected. Cloud records remain in your account.' };
  }
  if (!['export-account', 'delete-account', 'disconnect-account'].includes(action)) throw new Error('Unknown privacy action.');
  const client = await authClient();
  const { data: session, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session.session) {
    if (!sessionError || [400, 401, 403].includes(sessionError.status ?? 0)) await forgetAccount();
    throw new Error('Sign in before managing account data.');
  }
  if (action === 'delete-account') {
    if (payload?.confirmation !== 'DELETE') throw new Error('Type DELETE to permanently delete your account.');
    // JWT identity is enforced by the RPC. Skipping getUser here allows a lost-response retry
    // after the identity was already deleted; the SQL operation is idempotent.
    const { data, error } = await client.rpc('delete_my_account', { confirmation: 'DELETE' });
    if (error || data?.deleted !== true) throw new Error('Account deletion could not be confirmed. Keep this page open and retry. Local data is retained until the server confirms deletion.');
    await clearDevice(true);
    await forgetAccount();
    return { message: 'Account deleted. Device goals, activity, bookmarks, reminders and credentials cleared. Previously downloaded exports are yours to remove.' };
  }
  const { data: identity, error: identityError } = await client.auth.getUser();
  if (identityError || !identity.user) {
    if ([401, 403].includes(identityError?.status ?? 0)) await forgetAccount();
    throw new Error('Account could not be verified. Retry when online.');
  }
  if (action === 'disconnect-account') {
    const { error } = await client.rpc('set_reading_connection', { p_connected: false });
    if (error) throw new Error('Cloud disconnection could not be confirmed. Retry when online.');
    const saved = (await browser.storage.local.get(CLOUD_KEY))[CLOUD_KEY] as { enabled: boolean } | undefined;
    if (saved) { saved.enabled = false; await browser.storage.local.set({ [CLOUD_KEY]: saved }); }
    return { message: 'Account GeeksforGeeks connection disabled. New cloud submissions are rejected until you enable it again. Device tracking can be disconnected in Connections.' };
  }
  // ponytail: exports fit in memory; use a streamed server export when histories approach browser message limits.
  const { data, error } = await client.rpc('export_my_account');
  if (error || !data || typeof data !== 'object' || !Array.isArray(data.streaks)) throw new Error('Account export is unavailable. Check the database migrations and retry when online.');
  return { document: { schemaVersion: 1, source: 'cloud-account', exportedAt: new Date().toISOString(), account: { id: identity.user.id, email: identity.user.email ?? '' }, records: data } };
}
