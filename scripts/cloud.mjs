import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

await mkdir('test-results', { recursive: true });
const root = await mkdtemp(path.resolve('test-results/cloud-'));
const extension = path.join(root, 'extension');
try {
  execSync('npm run build', { env: { ...process.env, WXT_SUPABASE_URL: 'https://fixture.supabase.co', WXT_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' }, stdio: 'pipe' });
  await cp('.output/chrome-mv3', extension, { recursive: true });
} finally { execSync('npm run build', { stdio: 'pipe' }); }
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
manifest.host_permissions.push('https://www.geeksforgeeks.org/*');
await writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
const launch = () => chromium.launchPersistentContext(path.join(root, 'profile'), { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
let context = await launch();
let worker, page;
const cloudKey = 'cloud:https://fixture.supabase.co';
const accountId = '11111111-1111-4111-8111-111111111111';
const goalId = '33333333-3333-4333-8333-333333333333';
const ruleId = '44444444-4444-4444-8444-444444444444';
async function mock() {
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  await worker.evaluate(({ accountId, goalId, ruleId }) => {
    const user = email => ({ id: email.startsWith('two') ? '22222222-2222-4222-8222-222222222222' : accountId, email, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() });
    globalThis.calls = []; globalThis.mode = 'normal'; globalThis.localId = ''; globalThis.receipts = {};
    globalThis.fetch = async (input, init) => {
      const url = String(input), body = init?.body ? JSON.parse(init.body) : {};
      if (!url.startsWith('https://fixture.supabase.co/')) throw new Error('Unexpected destination');
      globalThis.calls.push({ url, body });
      if (globalThis.mode === 'offline') throw new TypeError('Offline fixture');
      let result = {};
      const summary = { current: 2, best: 3, xp: 50, account_xp: 50, completed_today: true, local_date: '2026-10-26', target: 1, unit: 'lessons', timezone: 'UTC', rule_version_id: ruleId, server_time: '2026-10-26T12:00:00Z' };
      if (url.includes('/verify')) {
        const token = btoa('{}') + '.' + btoa(JSON.stringify({ sub: user(body.email).id, exp: Math.floor(Date.now() / 1000) + 3600 })) + '.fixture';
        result = { access_token: token, refresh_token: 'fixture', expires_in: 3600, token_type: 'bearer', user: user(body.email) };
      } else if (url.includes('/user')) {
        const sub = JSON.parse(atob(new Headers(init.headers).get('authorization').split('.')[1])).sub;
        result = user(sub === accountId ? 'one@example.com' : 'two@example.com');
      } else if (url.includes('/streaks')) result = [{ id: goalId, local_goal_id: globalThis.localId, name: 'Cloud reading', status: 'active' }];
      else if (url.includes('/get_streak_summary')) result = summary;
      else if (url.includes('/submit_reading_event')) {
        if (globalThis.mode === 'rate') result = { status: 'rejected', code: 'RATE_LIMIT', retry_after_seconds: 60 };
        else if (globalThis.mode === 'stale') result = { status: 'rejected', code: 'STALE_RULE' };
        else if (globalThis.mode === 'duplicate') result = { status: 'rejected', code: 'ACTIVITY_ALREADY_CREDITED' };
        else {
          result = { status: 'accepted', xp_awarded: 25, summary: { ...summary, xp: 25 }, replayed: !!globalThis.receipts[body.p_event_uuid] };
          globalThis.receipts[body.p_event_uuid] = body;
          if (globalThis.mode === 'lost') { globalThis.mode = 'normal'; throw new TypeError('Response lost after commit'); }
        }
      }
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    };
  }, { accountId, goalId, ruleId });
}
const request = (type, action, payload) => page.evaluate(message => chrome.runtime.sendMessage(message), { type, action, payload });
const read = () => page.evaluate(key => chrome.storage.local.get(key).then(s => s[key]), cloudKey);
const submissions = () => worker.evaluate(() => globalThis.calls.filter(c => c.url.includes('/submit_reading_event')));
async function readyRetries() {
  await page.evaluate(async key => { const state = (await chrome.storage.local.get(key))[key]; state.retryAt = 0; for (const event of state.events) event.retryAt = 0; await chrome.storage.local.set({ [key]: state }); }, cloudKey);
}
async function addArticle(name, age = 0, bind = true) {
  return page.evaluate(async ({ key, name, age, bind, goalId, ruleId }) => {
    const saved = await chrome.storage.local.get([key, 'gfgReading']);
    const state = saved[key], reading = saved.gfgReading, id = crypto.randomUUID();
    const url = `https://www.geeksforgeeks.org/python/${name}/`;
    reading.articles['geeksforgeeks:' + url] = { url, title: name, fingerprint: 'a'.repeat(64), weights: [40,40,20], dwell: [12,12,6], seconds: 60, byDate: {}, goalId: reading.goalId, completed: true, completedAt: Date.now() - age, chunk: 0,
      ...(bind ? { cloud: { generation: state.generation, eventId: id, streakId: goalId, ruleId } } : {}) };
    await chrome.storage.local.set({ gfgReading: reading }); return id;
  }, { key: cloudKey, name, age, bind, goalId, ruleId });
}
try {
  await mock();
  const base = `chrome-extension://${new URL(worker.url()).hostname}`;
  page = await context.newPage(); await page.goto(`${base}/dashboard.html#settings`);
  assert.equal((await request('account', 'verify', { email: 'one@example.com', code: '123456' })).ok, true);
  const created = await request('goals', 'create', { name: 'Cloud reading', target: 1, unit: 'lessons', location: null });
  const localId = created.store.goals[0].id;
  await worker.evaluate(id => { globalThis.localId = id; }, localId);
  assert.equal((await request('gfg', 'connect', { goalId: localId })).ok, true);
  assert.equal((await request('account', 'copy')).ok, true);
  assert.equal((await request('cloud', 'enable')).ok, true);
  await addArticle('existing-history', 0, false);
  await request('cloud', 'retry'); assert.equal((await submissions()).length, 0, 'Old local history is not uploaded');

  // Real adapter creates the binding on first observation; sample evidence is not uploaded until qualified.
  const articleURL = 'https://www.geeksforgeeks.org/python/cloud-binding-fixture/';
  await context.route('https://www.geeksforgeeks.org/**', route => route.fulfill({ contentType: 'text/html', body: `<link rel="canonical" href="${articleURL}"><h1>Cloud binding</h1><div class="article--viewer_content"><div class="text">${'Reading content '.repeat(50)}</div></div>` }));
  const website = await context.newPage(); await website.goto(articleURL);
  await website.locator('.text').click();
  await page.waitForFunction(async url => !!(await chrome.storage.local.get('gfgReading')).gfgReading.articles['geeksforgeeks:' + url]?.cloud, articleURL);
  const denied = await worker.evaluate(async url => {
    const [tab] = await chrome.tabs.query({ url });
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: async () => {
      try { return !(await chrome.runtime.sendMessage({ type: 'cloud', action: 'enable' }))?.ok; } catch { return true; }
    } });
    return result.result;
  }, articleURL);
  assert.equal(denied, true, 'Content scripts cannot read or enable cloud synchronization');
  await website.close();
  const offlineId = await addArticle('offline-article', 86400000);
  await worker.evaluate(() => { globalThis.mode = 'offline'; });
  await request('cloud', 'retry');
  assert.equal((await read()).events.find(e => e.id === offlineId).status, 'pending');
  // Prevent startup networking before installing the mock after a real browser restart.
  await page.evaluate(async key => { const state = (await chrome.storage.local.get(key))[key]; state.retryAt = Date.now() + 3600000; await chrome.storage.local.set({ [key]: state }); }, cloudKey);
  await context.close(); context = await launch(); await mock();
  await worker.evaluate(id => { globalThis.localId = id; }, localId);
  page = await context.newPage(); await page.goto(`${base}/dashboard.html#settings`);
  assert.equal((await read()).events.find(e => e.id === offlineId).status, 'pending');
  await readyRetries(); await request('cloud', 'retry');
  assert.equal((await read()).events.find(e => e.id === offlineId).status, 'accepted');
  const sent = (await submissions())[0].body;
  assert.equal(sent.p_event_uuid, offlineId);
  assert.deepEqual(Object.keys(sent).sort(), ['p_activity_id','p_event_uuid','p_evidence','p_rule_version_id','p_streak_id']);
  assert.equal((await read()).goals[0].summary.local_date, '2026-10-26', 'Use server receipt date, never local qualification date');
  assert.equal((await read()).goals[0].summary.xp, 50, 'Fresh summary wins over old ingestion snapshot');

  const lostId = await addArticle('lost-response');
  await worker.evaluate(() => { globalThis.mode = 'lost'; }); await request('cloud', 'retry');
  assert.equal((await read()).events.find(e => e.id === lostId).status, 'pending');
  await readyRetries(); await request('cloud', 'retry');
  const retries = (await submissions()).filter(c => c.body.p_event_uuid === lostId);
  assert.equal(retries.length, 2); assert.deepEqual(retries[0].body, retries[1].body);
  assert.equal((await read()).goals[0].summary.xp, 50, 'Replay must not add XP twice');
  const expired = await addArticle('expired', 8 * 86400000);
  await request('cloud', 'retry'); assert.equal((await read()).events.find(e => e.id === expired).status, 'expired');
  assert.ok(!(await submissions()).some(c => c.body.p_event_uuid === expired));
  for (const mode of ['stale', 'duplicate', 'rate']) {
    const id = await addArticle(`${mode}-article`);
    await worker.evaluate(mode => { globalThis.mode = mode; }, mode); await request('cloud', 'retry');
    const event = (await read()).events.find(e => e.id === id);
    assert.equal(event.status, mode === 'rate' ? 'pending' : 'rejected');
    if (mode === 'rate') { assert.ok(event.retryAt > Date.now() + 50000); await readyRetries(); }
    else assert.equal(event.payload, undefined);
  }
  await worker.evaluate(() => { globalThis.mode = 'normal'; }); await request('cloud', 'retry');
  const safe = await request('cloud', 'read');
  assert.ok(!JSON.stringify(safe).includes('p_evidence'));
  await page.reload(); await page.getByRole('heading', { name: 'Accepted learning.' }).waitFor();
  await page.screenshot({ path: 'test-results/cloud.png', fullPage: true });
  const popup = await context.newPage(); await popup.setViewportSize({ width: 380, height: 800 });
  await popup.goto(`${base}/popup.html`); await popup.getByRole('heading', { name: 'Accepted learning.' }).waitFor();
  assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Cloud totals fit the popup');
  await popup.screenshot({ path: 'test-results/cloud-popup.png', fullPage: true }); await popup.close();
  await request('cloud', 'pause'); await addArticle('paused-article');
  const count = (await submissions()).length; await request('cloud', 'retry');
  assert.equal((await submissions()).length, count, 'Pause never uploads queued data');
  await request('account', 'signout'); assert.equal(await read(), undefined);
  await request('account', 'verify', { email: 'two@example.com', code: '123456' });
  await request('cloud', 'enable'); await request('cloud', 'retry');
  assert.equal((await read()).events.length, 0, 'Another account cannot inherit old article bindings');
  assert.equal((await submissions()).length, count);
  console.log('PASS: cloud opt-in/binding, no history import, offline browser restart, receipt day, immutable replay, authoritative totals, expiry, rejection, rate delay, pause, sign-out and account isolation. Mocked service only.');
} finally { await context.close(); }
