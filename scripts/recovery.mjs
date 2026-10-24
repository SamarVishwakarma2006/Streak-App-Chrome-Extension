import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

await mkdir('test-results', { recursive: true });
const root = await mkdtemp(path.resolve('test-results/recovery-'));
const extension = path.join(root, 'extension');
await cp('.output/chrome-mv3', extension, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
manifest.host_permissions = manifest.optional_host_permissions;
await writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
const launch = () => chromium.launchPersistentContext(path.join(root, 'profile'), { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
let context = await launch();
const url = 'https://www.geeksforgeeks.org/python/recovery-fixture/';
const fixture = `<link rel="canonical" href="${url}"><h1>Recovery article</h1><div class="article--viewer_content"><div class="text">${'Reading content '.repeat(50)}</div></div>`;
const read = page => page.evaluate(async () => (await chrome.storage.local.get('gfgReading')).gfgReading);
try {
  await context.route('https://www.geeksforgeeks.org/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const base = `chrome-extension://${new URL(worker.url()).hostname}`;
  let dashboard = await context.newPage();
  await dashboard.goto(`${base}/dashboard.html`);
  const goal = await dashboard.evaluate(async () => {
    const created = await chrome.runtime.sendMessage({ type: 'goals', action: 'create', payload: { name: 'Recovery', target: 1, unit: 'lessons', location: null } });
    const id = created.store.goals[0].id;
    const connected = await chrome.runtime.sendMessage({ type: 'gfg', action: 'connect', payload: { goalId: id } });
    if (!connected.ok) throw new Error(connected.error);
    return id;
  });
  const one = await context.newPage(); await one.goto(url);
  const two = await context.newPage(); await two.goto(url);
  await one.bringToFront(); await one.locator('.text').click();
  await one.waitForTimeout(2500);
  const before = Object.values((await read(dashboard)).articles)[0].seconds;
  const started = Date.now();
  await one.waitForTimeout(5000);
  const after = Object.values((await read(dashboard)).articles)[0].seconds;
  assert.ok(after - before >= 2, 'Hidden duplicate must not starve active reading');
  assert.ok(after - before <= (Date.now() - started) / 1000 + 1, 'Duplicate tabs must not multiply time');
  await context.setOffline(true);
  await one.waitForTimeout(3000);
  assert.ok(Object.values((await read(dashboard)).articles)[0].seconds > after, 'Loaded article keeps tracking offline');
  await dashboard.bringToFront();
  await one.close(); await two.close();
  const checkpoint = await read(dashboard);
  // Simulate the durable state immediately after a qualification checkpoint,
  // before its local award is committed. This is a test fixture, not a completion API.
  const event = { id: 'recovery-fixture-id', goalId: goal, activity: 'recovery-fixture-activity', amount: 1, unit: 'lessons', at: Date.now(), attempts: 0, retryAt: Date.now() + 60000 };
  checkpoint.pending = [event];
  await dashboard.evaluate(state => chrome.storage.local.set({ gfgReading: state }), checkpoint);
  const cdp = await context.newCDPSession(dashboard);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  const deferred = await dashboard.evaluate(() => chrome.runtime.sendMessage({ type: 'gfg', action: 'read' }));
  assert.equal(deferred.state.pending[0].id, event.id, 'Worker restart retains submission ID and retry deadline');
  assert.equal(deferred.state.ledger.lifetimeXP, 0);
  assert.deepEqual(deferred.state.articles, checkpoint.articles);
  await context.close();
  context = await launch();
  dashboard = await context.newPage(); await dashboard.goto(`${base}/dashboard.html`);
  const restored = await read(dashboard);
  assert.deepEqual(restored.articles, checkpoint.articles, 'Browser restart preserves saved checkpoint');
  assert.equal(restored.pending[0].id, event.id);
  restored.pending[0].retryAt = 0;
  await dashboard.evaluate(state => chrome.storage.local.set({ gfgReading: state }), restored);
  const recovered = await dashboard.evaluate(() => chrome.runtime.sendMessage({ type: 'gfg', action: 'read' }));
  assert.equal(recovered.state.ledger.lifetimeXP, 25);
  assert.equal(recovered.state.pending.length, 0);
  // Replay an already applied event, modeling an interrupted acknowledgement.
  recovered.state.pending = [{ ...event, retryAt: 0 }];
  await dashboard.evaluate(state => chrome.storage.local.set({ gfgReading: state }), recovered.state);
  const replay = await dashboard.evaluate(() => chrome.runtime.sendMessage({ type: 'gfg', action: 'read' }));
  assert.equal(replay.state.ledger.lifetimeXP, 25);
  assert.equal(replay.state.pending.length, 0);
  // Invalid local data must retain the event and back off without deleting it.
  replay.state.pending = [{ ...event, activity: 'invalid-fixture', goalId: 'missing', retryAt: 0 }];
  await dashboard.evaluate(state => chrome.storage.local.set({ gfgReading: state }), replay.state);
  const failed = await dashboard.evaluate(() => chrome.runtime.sendMessage({ type: 'gfg', action: 'read' }));
  assert.equal(failed.state.pending[0].id, event.id);
  assert.equal(failed.state.pending[0].attempts, 1);
  assert.ok(failed.state.pending[0].retryAt > Date.now());
  assert.match(failed.state.pending[0].error, /Unknown goal/);
  console.log('PASS: duplicate tabs, offline reading, worker stop, browser restart, durable event IDs, recovery, replay deduplication, and retained errors with backoff.');
} finally { await context.close(); }
