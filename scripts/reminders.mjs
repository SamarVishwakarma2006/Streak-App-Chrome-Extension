import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

await mkdir('test-results', { recursive: true });
const root = await mkdtemp(path.resolve('test-results/reminders-'));
const extension = path.join(root, 'extension');
await cp('.output/chrome-mv3', extension, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
assert.ok(manifest.optional_permissions.includes('notifications'));
assert.ok(!manifest.permissions.includes('notifications'), 'Production permission stays optional');
manifest.permissions.push('notifications'); manifest.optional_permissions = [];
manifest.host_permissions = [...(manifest.host_permissions ?? []), 'https://www.geeksforgeeks.org/*'];
await writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
// Isolated copy only: deterministic clock and captured notification APIs. Never show OS notifications.
const fixture = `
globalThis.__now = Date.parse('2026-10-26T12:00:00Z');
globalThis.__RealDate = Date;
globalThis.Date = class extends globalThis.__RealDate {
  constructor(...args) { super(...(args.length ? args : [globalThis.__now])); }
  static now() { return globalThis.__now; }
};
globalThis.__notices = []; globalThis.__events = {}; globalThis.__permission = 'granted'; globalThis.__attempts = 0;
for (const [name, event] of Object.entries({ alarm: chrome.alarms.onAlarm, click: chrome.notifications.onClicked, button: chrome.notifications.onButtonClicked, closed: chrome.notifications.onClosed })) {
  globalThis.__events[name] = []; const original = event.addListener.bind(event);
  event.addListener = callback => { globalThis.__events[name].push(callback); original(callback); };
}
chrome.notifications.getPermissionLevel = async () => globalThis.__permission;
chrome.notifications.create = async (id, options) => { globalThis.__attempts++; if (globalThis.__failNotification) throw new Error('Fixture delivery failed'); globalThis.__notices.push({ id, options }); return id; };
chrome.notifications.clear = async () => true;
`;
const background = path.join(extension, manifest.background.service_worker);
await writeFile(background, fixture + '\n' + await readFile(background, 'utf8'));
const launch = () => chromium.launchPersistentContext(path.join(root, 'profile'), { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
let context = await launch(), worker, page;
const url = 'https://www.geeksforgeeks.org/python/reminder-fixture/';
async function open() {
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  await context.route('https://www.geeksforgeeks.org/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Continue destination</h1>' }));
  page = await context.newPage(); await page.goto(`chrome-extension://${new URL(worker.url()).hostname}/dashboard.html#settings`);
}
const request = (type, action, payload) => page.evaluate(message => chrome.runtime.sendMessage(message), { type, action, payload });
const state = async () => (await request('reminders', 'read')).state;
const notices = () => worker.evaluate(() => globalThis.__notices);
async function emit(event, ...args) {
  await worker.evaluate(({ event, args }) => { for (const callback of globalThis.__events[event]) callback(...args); }, { event, args });
  await request('reminders', 'read'); // Barrier through the worker's serialized reminder queue.
}
const tick = () => emit('alarm', { name: 'streak-reminders' });
const at = iso => worker.evaluate(value => { globalThis.__now = Date.parse(value); }, iso);
const advance = ms => worker.evaluate(ms => { globalThis.__now += ms; }, ms);
async function until(check) {
  for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
  throw new Error('Timed out waiting for reminder state.');
}
const session = () => page.evaluate(async () => (await chrome.storage.session.get('reminderSession')).reminderSession);
let goalId;
const preference = { daily: true, time: '12:00', nudge: false, motivation: 'Prepare for my coding interview.', articleTarget: 30 };
async function configure(overrides = {}, quiet = false) {
  await page.evaluate(async () => {
    const value = (await chrome.storage.local.get('reminderSettings')).reminderSettings;
    if (value) { value.sent = {}; delete value.notice; delete value.snooze; await chrome.storage.local.set({ reminderSettings: value }); }
    await chrome.storage.session.remove('reminderSession');
  });
  const result = await request('reminders', 'save', { goalId, preference: { ...preference, ...overrides }, quiet, quietStart: '22:00', quietEnd: '08:00' });
  assert.equal(result.ok, true, result.error);
}
try {
  await open();
  assert.equal((await notices()).length, 0);
  goalId = (await request('goals', 'create', { name: 'Interview practice', target: 20, unit: 'minutes', location: { url, origin: 'https://www.geeksforgeeks.org', title: 'Practice article' } })).store.goals[0].id;
  assert.equal((await request('gfg', 'connect', { goalId })).ok, true);
  await page.evaluate(async ({ goalId, url }) => {
    const reading = (await chrome.storage.local.get('gfgReading')).gfgReading;
    reading.timezone = 'UTC'; reading.ledger.goals[goalId].rules[0].timezone = 'UTC';
    reading.articles['geeksforgeeks:' + url] = { url, title: 'Practice article', fingerprint: 'a'.repeat(64), weights: [40,40,20], dwell: [0,0,0], seconds: 300, byDate: { '2026-10-26': 300 }, goalId, completed: false, chunk: 0 };
    await chrome.storage.local.set({ gfgReading: reading });
  }, { goalId, url });
  await configure(); await tick();
  assert.equal((await notices()).length, 1);
  const first = (await notices())[0];
  assert.match(first.options.message, /5\/20 minutes today; 15 left/);
  assert.match(first.options.message, /coding interview/);
  assert.match(first.options.message, /0\/30 qualified articles/);
  assert.equal(first.options.buttons.length, 2);
  await tick(); assert.equal((await notices()).length, 1, 'One automatic reminder per goal/day');
  await context.close(); context = await launch(); await open(); await tick();
  assert.equal((await notices()).length, 0, 'Browser restart preserves the sent day and does not replay');
  const destination = context.waitForEvent('page');
  await emit('click', first.id);
  await (await destination).waitForURL(url);
  const opened = await worker.evaluate(async url => (await chrome.tabs.query({})).filter(tab => tab.url === url || tab.pendingUrl === url), url);
  assert.equal(opened.length, 1, 'Continue opens the saved destination');

  await at('2026-10-27T12:00:00Z'); await tick();
  assert.equal((await notices()).length, 1, 'New local day can remind again');
  await emit('button', (await state()).notice.id, 1);
  assert.ok((await state()).snooze); await advance(9 * 60000); await tick();
  assert.equal((await notices()).length, 1);
  await advance(60000); await tick(); assert.equal((await notices()).length, 2, 'Explicit snooze permits one follow-up');
  await emit('closed', (await state()).notice.id, true); await tick();
  assert.equal((await state()).notice, undefined); assert.equal((await notices()).length, 2);

  const noNotification = async (message, callback) => { const before = (await notices()).length; await callback(); await tick(); assert.equal((await notices()).length, before, message); };
  await at('2026-10-28T23:00:00Z'); await configure({ time: '23:00' }, true);
  await noNotification('Quiet hours span midnight', async () => {});
  await at('2026-10-29T00:30:00Z'); await configure({ time: '00:30' }, true);
  await noNotification('Early morning remains quiet', async () => {});
  await at('2026-10-29T14:00:00Z'); await configure();
  await noNotification('Delayed reminders older than an hour are dropped', async () => {});
  await at('2026-10-29T12:00:00Z'); await configure();
  await worker.evaluate(() => { globalThis.__permission = 'denied'; });
  await noNotification('Permission denial prevents delivery', async () => {});
  assert.equal((await request('reminders', 'save', { goalId, preference, quiet: false, quietStart: '22:00', quietEnd: '08:00' })).ok, false);
  await worker.evaluate(() => { globalThis.__permission = 'granted'; });
  await noNotification('Archived goal is suppressed', () => request('goals', 'archive', { id: goalId }));
  await at('2026-10-29T10:00:00Z'); await request('goals', 'restore', { id: goalId });
  await at('2026-10-29T12:00:00Z'); await configure();
  await noNotification('Disconnected goal is suppressed', () => request('gfg', 'disconnect'));
  await request('gfg', 'connect', { goalId });
  await page.evaluate(async goalId => {
    const reading = (await chrome.storage.local.get('gfgReading')).gfgReading;
    reading.ledger.goals[goalId].completions.push({ date: '2026-10-29', at: Date.parse('2026-10-29T12:00:00Z'), run: 1, version: 1, xp: 25, activity: 'fixture' });
    await chrome.storage.local.set({ gfgReading: reading });
  }, goalId);
  await noNotification('Completed local goal is suppressed', async () => {});
  await page.evaluate(async goalId => {
    const reading = (await chrome.storage.local.get('gfgReading')).gfgReading; reading.ledger.goals[goalId].completions = [];
    await chrome.storage.local.set({ gfgReading: reading, 'cloud:unconfigured': { owner: 'fixture', generation: 'fixture', enabled: false, goals: [{ local_goal_id: goalId, summary: { completed_today: true, local_date: '2026-10-29', timezone: 'UTC' } }], events: [], refreshedAt: 0, retryAt: 0 } });
  }, goalId);
  await noNotification('Cached cloud completion suppresses the local reminder', async () => {});
  await page.evaluate(() => chrome.storage.local.remove('cloud:unconfigured'));
  await configure();
  await worker.evaluate(() => { globalThis.__failNotification = true; });
  await tick(); assert.match((await state()).error, /could not show/);
  const attempts = await worker.evaluate(() => globalThis.__attempts);
  await tick(); assert.equal(await worker.evaluate(() => globalThis.__attempts), attempts, 'Failed delivery does not retry-spam');
  await worker.evaluate(() => { globalThis.__failNotification = false; });

  // Repeated DST hour must not send twice; date keys are calculated in the learning timezone.
  await page.evaluate(async goalId => { const r = (await chrome.storage.local.get('gfgReading')).gfgReading; r.timezone = 'America/New_York'; r.ledger.goals[goalId].rules[0].timezone = r.timezone; await chrome.storage.local.set({ gfgReading: r }); }, goalId);
  await at('2026-11-01T05:30:00Z'); await configure({ time: '01:30' }); await tick();
  const dstCount = (await notices()).length;
  await at('2026-11-01T06:30:00Z'); await tick(); assert.equal((await notices()).length, dstCount);

  await configure({ daily: false, nudge: true });
  const learningURL = 'https://www.geeksforgeeks.org/python/nudge-session/';
  await context.route(learningURL, route => route.fulfill({ contentType: 'text/html', body: `<link rel="canonical" href="${learningURL}"><h1>Nudge session</h1><div class="article--viewer_content"><div class="text">${'Learning content '.repeat(60)}</div></div>` }));
  const learning = await context.newPage(); await learning.goto(learningURL); await learning.locator('.text').click();
  await until(async () => !!await session());
  await page.evaluate(async () => { const s = (await chrome.storage.session.get('reminderSession')).reminderSession; s.seconds = 30; await chrome.storage.session.set({ reminderSession: s }); });
  const beforeNudge = (await notices()).length;
  await context.route('https://distraction.invalid/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Unrelated website</h1>' }));
  const elsewhere = await context.newPage(); await elsewhere.goto('https://distraction.invalid/private?secret=do-not-store'); await elsewhere.bringToFront();
  await until(async () => !!(await session())?.awayAt);
  await advance(30000); await learning.bringToFront(); await request('reminders', 'read');
  await advance(61000); await tick(); assert.equal((await notices()).length, beforeNudge, 'Returning during grace cancels the nudge');
  await learning.locator('.text').click(); await page.waitForTimeout(1100);
  await elsewhere.bringToFront(); await until(async () => !!(await session())?.awayAt);
  await advance(59000); await tick(); assert.equal((await notices()).length, beforeNudge);
  await advance(1000); await tick(); assert.equal((await notices()).length, beforeNudge + 1, 'Nudge after sixty seconds away');
  const stored = await page.evaluate(async () => ({ local: (await chrome.storage.local.get('reminderSettings')).reminderSettings, session: (await chrome.storage.session.get('reminderSession')).reminderSession }));
  assert.ok(!JSON.stringify(stored).includes('distraction.invalid')); assert.ok(!JSON.stringify(stored).includes('do-not-store'));
  await emit('button', (await state()).notice.id, 1); assert.ok((await state()).snooze);
  await learning.bringToFront(); await learning.locator('.text').click(); await page.waitForTimeout(1100);
  assert.equal((await state()).snooze, undefined, 'Resuming reading cancels snooze');
  await elsewhere.bringToFront(); await advance(61000); await tick();
  assert.equal((await notices()).length, beforeNudge + 1, 'Session and daily caps prevent another automatic nudge');
  const denied = await worker.evaluate(async url => {
    const [tab] = await chrome.tabs.query({ url }); const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: async () => {
      try { return !(await chrome.runtime.sendMessage({ type: 'reminders', action: 'read' }))?.ok; } catch { return true; }
    } }); return result.result;
  }, learningURL);
  assert.equal(denied, true, 'Website code cannot read reminder goals/settings');
  await learning.close(); await elsewhere.close();
  await page.reload();
  await page.getByRole('combobox', { name: /^Goal/ }).selectOption(goalId);
  await page.getByLabel('What are you working toward? (optional)').waitFor();
  await page.locator('section[aria-label="Reminders"]').screenshot({ path: 'test-results/reminders.png' });
  await page.setViewportSize({ width: 380, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Reminder settings fit a narrow viewport');
  await page.locator('section[aria-label="Reminders"]').screenshot({ path: 'test-results/reminders-narrow.png' });
  // Permission prompt rejection is handled in the actual settings UI without saving.
  await page.evaluate(() => { chrome.permissions.request = async () => false; });
  await page.getByRole('button', { name: 'Save reminders' }).click();
  await page.getByRole('alert').filter({ hasText: 'permission was declined' }).waitFor();
  console.log('PASS: opt-in, progress/motivation, daily dedup/restart, Continue, snooze/dismiss, quiet hours, delayed expiry, permission denial, archived/disconnected/completed suppression, DST, real-session binding, tab-switch grace, privacy, per-session cap and website rejection. OS notifications intercepted in isolated fixture only.');
} finally { await context.close(); }
