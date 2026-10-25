import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { browser } from 'wxt/browser';
import type { GoalStore } from './goals';

const url = import.meta.env.WXT_SUPABASE_URL as string | undefined;
const key = import.meta.env.WXT_SUPABASE_PUBLISHABLE_KEY as string | undefined;
let client: SupabaseClient | undefined;
const storageKey = url ? `auth:${new URL(url).host}` : 'auth:unconfigured';
const cachePrefix = url ? `account:${new URL(url).host}:` : 'account:unconfigured:';
async function clearCaches() {
  const saved = await browser.storage.local.get(null);
  await browser.storage.local.remove(Object.keys(saved).filter(k => k.startsWith(cachePrefix)));
}
async function authClient() {
  if (!url || !key) throw new Error('Cloud setup is not configured in this build.');
  // Content scripts must never be able to read persisted refresh tokens.
  await browser.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  client ??= createClient(url, key, { auth: {
    persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storageKey,
    storage: {
      getItem: async name => (await browser.storage.local.get(name))[name] as string | null ?? null,
      setItem: async (name, value) => { await browser.storage.local.set({ [name]: value }); },
      removeItem: async name => { await browser.storage.local.remove(name); },
    },
  }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
  return client;
}
export async function handleAccount(action: string, payload: any, goals: GoalStore) {
  if (!['read', 'send', 'verify', 'signout', 'copy'].includes(action)) throw new Error('Unknown account action.');
  if (!url || !key) return { configured: false, user: null };
  const supabase = await authClient();
  if (action === 'signout') {
    let revoked = false;
    try { revoked = !(await supabase.auth.signOut({ scope: 'local' })).error; } catch { revoked = false; }
    finally {
      await browser.storage.local.remove(storageKey);
      await clearCaches();
      client = undefined;
    }
    return { configured: true, user: null, message: revoked ? 'Signed out. Device-only goals remain on this browser.' : 'Signed out on this device. Server revocation could not be confirmed while offline; existing access tokens may remain valid until expiry.' };
  }
  if (action === 'send' || action === 'verify') {
    if (typeof payload?.email !== 'string' || payload.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) throw new Error('Enter a valid email address.');
    const email = payload.email.trim();
    if (action === 'send') {
      const sentAt = (await browser.storage.session.get('account-code-sent'))['account-code-sent'];
      if (typeof sentAt === 'number' && Date.now() - sentAt < 60000) throw new Error('Wait one minute before requesting another code.');
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw new Error('Could not send a code. Check your email address or try again later.');
      await browser.storage.session.set({ 'account-code-sent': Date.now() });
      return { configured: true, user: null, message: 'Check your email for the sign-in code.' };
    }
    if (typeof payload.code !== 'string' || !/^\d{6,10}$/.test(payload.code.trim())) throw new Error('Enter the numeric code from your email.');
    const { error } = await supabase.auth.verifyOtp({ email, token: payload.code.trim(), type: 'email' });
    if (error) throw new Error('That code is invalid or expired. Request a new code and try again.');
    await clearCaches();
  }
  // getSession refreshes expired sessions; getUser verifies the identity remotely.
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error('Session refresh failed. Retry when online or sign out to start again.');
  if (!session.session) { await clearCaches(); return { configured: true, user: null }; }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Could not verify your account. Reconnect and retry, or sign out.');
  const user = { id: data.user.id, email: data.user.email ?? '' };
  const accountKey = cachePrefix + user.id;
  const saved = await browser.storage.local.get(null);
  await browser.storage.local.remove(Object.keys(saved).filter(k => k.startsWith(cachePrefix) && k !== accountKey));
  if (action === 'copy') {
    const definitions = goals.goals.filter(g => !g.archived).map(g => ({ local_id: g.id, name: g.name, target: g.target, unit: g.unit }));
    const { error: copyError } = await supabase.rpc('copy_goal_definitions', { definitions, timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (copyError) throw new Error('Could not copy goals. Apply the account migration in your development project, then retry.');
  }
  const { data: cloudGoals, error: goalsError } = await supabase.from('streaks').select('id,name,status').order('created_at');
  if (goalsError) return { configured: true, user, goals: [], message: 'Signed in. Cloud goals are unavailable; check the database setup.' };
  await browser.storage.local.set({ [accountKey]: { goals: cloudGoals } });
  return { configured: true, user, goals: cloudGoals, message: action === 'copy' ? 'Goal definitions copied. Reading history, links and prototype XP stayed on this device.' : undefined };
}
