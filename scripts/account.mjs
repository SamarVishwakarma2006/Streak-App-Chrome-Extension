import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
await mkdir('test-results', { recursive: true });
const root = await mkdtemp(path.resolve('test-results/account-'));
const extension = path.join(root, 'extension');
const build = env => execSync('npm run build', { env, stdio: 'pipe' });
try {
  build({ ...process.env, WXT_SUPABASE_URL: 'https://fixture.supabase.co', WXT_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' });
  await cp('.output/chrome-mv3', extension, { recursive: true });
} finally { build(process.env); }
const launch = () => chromium.launchPersistentContext(path.join(root, 'profile'), { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
let context = await launch();
async function mock() {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  await worker.evaluate(() => {
    const user = email => ({ id: email.startsWith('two') ? '22222222-2222-4222-8222-222222222222' : '11111111-1111-4111-8111-111111111111', email, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() });
    const token = email => btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ sub: user(email).id, exp: Math.floor(Date.now() / 1000) + 3600 })) + '.fixture';
    globalThis.requests = []; globalThis.failAccount = false;
    globalThis.fetch = async (input, init) => {
      const url = String(input); const body = init?.body ? JSON.parse(init.body) : {};
      globalThis.requests.push({ url, body });
      if (!url.startsWith('https://fixture.supabase.co/')) throw new Error('Unexpected network destination');
      if (globalThis.failAccount) throw new TypeError('Offline fixture');
      let result = {}, status = 200;
      if (url.includes('/verify') && body.token === '000000') { status = 403; result = { msg: 'Expired code' }; }
      else if (url.includes('/verify') || url.includes('/token')) {
        const email = body.email ?? 'one@example.com';
        result = { access_token: token(email), refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user: user(email) };
      } else if (url.includes('/user')) {
        const bearer = new Headers(init?.headers).get('authorization') ?? '';
        // Resolve identity from the fixture token's sub, never a request-body user ID.
        const payload = JSON.parse(atob(bearer.split('.')[1]));
        result = user(payload.sub.startsWith('222') ? 'two@example.com' : 'one@example.com');
      } else if (url.includes('/streaks')) result = [];
      return new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } });
    };
  });
  return worker;
}
try {
  let worker = await mock();
  const base = `chrome-extension://${new URL(worker.url()).hostname}`;
  let page = await context.newPage(); await page.goto(`${base}/dashboard.html#settings`);
  await page.getByLabel('Email address').fill('one@example.com');
  await page.getByRole('button', { name: 'Send sign-in code' }).click();
  await page.getByRole('status').filter({ hasText: 'Check your email' }).waitFor();
  await page.getByLabel('Email code').fill('000000'); await page.getByRole('button', { name: 'Verify code' }).click();
  await page.getByRole('alert').filter({ hasText: 'invalid or expired' }).waitFor();
  await page.getByLabel('Email code').fill('123456'); await page.getByRole('button', { name: 'Verify code' }).click();
  await page.getByText('one@example.com', { exact: true }).waitFor();
  const summary = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'account', action: 'read' }));
  assert.ok(!JSON.stringify(summary).includes('refresh_token'));
  await page.evaluate(() => chrome.runtime.sendMessage({ type: 'goals', action: 'create', payload: { name: 'Device goal', target: 1, unit: 'lessons', location: { url: 'https://example.com/private', origin: 'https://example.com', title: 'Private' } } }));
  await page.getByRole('button', { name: 'Copy goal definitions to my account' }).click();
  await page.getByRole('status').filter({ hasText: 'Goal definitions copied' }).waitFor();
  const requests = await worker.evaluate(() => globalThis.requests);
  const copy = requests.find(r => r.url.includes('/rpc/'));
  assert.deepEqual(Object.keys(copy.body.definitions[0]).sort(), ['local_id', 'name', 'target', 'unit']);
  await page.screenshot({ path: 'test-results/account.png', fullPage: true });
  await context.route('https://fixture.supabase.co/permission-check', route => route.fulfill({ contentType: 'text/html', body: '<h1>Isolated content script check</h1>' }));
  const website = await context.newPage(); await website.goto('https://fixture.supabase.co/permission-check');
  const isolated = await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: 'https://fixture.supabase.co/permission-check' });
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: async () => {
      let blocked = false, response;
      try { await chrome.storage.local.get('auth:fixture.supabase.co'); } catch { blocked = true; }
      try { response = await chrome.runtime.sendMessage({ type: 'account', action: 'read' }); } catch { /* denied */ }
      return { blocked, accountDenied: !response?.ok };
    } });
    return result.result;
  });
  assert.deepEqual(isolated, { blocked: true, accountDenied: true });
  await website.close();
  await context.close(); context = await launch(); worker = await mock();
  page = await context.newPage(); await page.goto(`${base}/dashboard.html#settings`);
  await page.getByText('one@example.com', { exact: true }).waitFor();
  await page.evaluate(async () => {
    const key = 'auth:fixture.supabase.co'; const value = JSON.parse((await chrome.storage.local.get(key))[key]);
    value.expires_at = 1; await chrome.storage.local.set({ [key]: JSON.stringify(value) });
  });
  await page.getByRole('button', { name: 'Refresh account' }).click();
  await page.getByRole('button', { name: 'Refresh account' }).waitFor();
  await page.waitForTimeout(1000);
  assert.ok((await worker.evaluate(() => globalThis.requests)).some(r => r.url.includes('/token')));
  await page.getByRole('button', { name: 'Sign out on this device' }).click();
  await page.getByLabel('Email address').waitFor();
  const after = await page.evaluate(() => chrome.storage.local.get(null));
  assert.ok(!Object.keys(after).some(k => k.startsWith('auth:') || k.startsWith('account:')));
  assert.equal(after.goalStore.goals.length, 1);
  await page.getByLabel('Email address').fill('two@example.com'); await page.getByLabel('Email code').fill('123456');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await page.getByText('two@example.com', { exact: true }).waitFor();
  const switched = await page.evaluate(() => chrome.storage.local.get(null));
  assert.ok(!Object.keys(switched).some(k => k.includes('11111111-1111')));
  await worker.evaluate(() => { globalThis.failAccount = true; });
  await page.getByRole('button', { name: 'Sign out on this device' }).click();
  await page.getByLabel('Email address').waitFor();
  assert.ok(!Object.keys(await page.evaluate(() => chrome.storage.local.get(null))).some(k => k.startsWith('auth:') || k.startsWith('account:')));
  console.log('PASS: mocked email-code UI, invalid code, restart, refresh, account switch, sign-out/offline cleanup, token-free replies, and explicit definition-only copy. No real emails sent.');
} finally { await context.close(); }
