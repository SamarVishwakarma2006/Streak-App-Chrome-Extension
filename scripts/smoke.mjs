import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { newLedger, addGoal, complete } from '../src/streaks.ts';
const extensionPath = path.resolve('.output/chrome-mv3');
const manifest = JSON.parse(await readFile(path.join(extensionPath, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage', 'tabs', 'scripting', 'alarms']);
assert.deepEqual(manifest.optional_host_permissions, ['https://www.geeksforgeeks.org/*']);
assert.equal(manifest.host_permissions?.length ?? 0, 0);
for (const icon of Object.values(manifest.icons)) await access(path.join(extensionPath, icon.replace(/^\//, '')));
await mkdir('test-results', { recursive: true });
const profile = await mkdtemp(path.resolve('test-results/profile-'));
const launch = () => chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`] });
let context = await launch();
const errors = [];
const watch = () => context.on('page', page => page.on('pageerror', e => errors.push(e.message)));
watch();
try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const base = `chrome-extension://${new URL(worker.url()).hostname}`;
  const page = await context.newPage();
  await page.goto(`${base}/dashboard.html`);
  await page.getByRole('heading', { name: 'Your next chapter starts here.' }).waitFor();
  await page.getByRole('button', { name: 'Create your first goal →' }).click();
  await page.getByLabel('Goal name').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  async function create(name) {
    await page.getByRole('button', { name: 'New goal', exact: true }).click();
    await page.getByLabel('Goal name').fill(name);
    await page.getByRole('button', { name: 'Save goal', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('heading', { name, exact: true }).waitFor();
  }
  for (const name of ['JavaScript', 'Spanish', 'Reading']) await create(name);
  const denied = await page.evaluate(async()=>chrome.runtime.sendMessage({type:'gfg',action:'connect',payload:{goalId:(await chrome.storage.local.get('goalStore')).goalStore.goals[0].id}}));
  assert.equal(denied.ok,false,'A connection must require the optional site grant');
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 380, height: 600 });
  await popup.goto(`${base}/popup.html`);
  await popup.getByRole('heading', { name: 'Reading', exact: true }).waitFor();
  assert.equal(await popup.locator('.goal-card').count(), 3);
  await page.getByRole('button', { name: 'Edit JavaScript', exact: true }).click();
  await page.getByLabel('Goal name').fill('Learn TypeScript');
  await page.getByLabel('Daily target').fill('2');
  await page.getByRole('combobox', { name: /^Unit/ }).selectOption('lessons');
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await popup.getByRole('heading', { name: 'Learn TypeScript' }).waitFor();
  await popup.getByText('2 lessons per day').waitFor();
  await page.getByRole('button', { name: 'Archive Spanish', exact: true }).click();
  await popup.getByRole('heading', { name: 'Spanish', exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Show archived', exact: true }).click();
  await page.getByRole('button', { name: 'Restore Spanish', exact: true }).click();
  await popup.getByRole('heading', { name: 'Spanish', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Show active', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Reading', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('heading', { name: 'Reading', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Delete Reading', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await popup.getByRole('heading', { name: 'Reading', exact: true }).waitFor({ state: 'hidden' });
  await create('Reading');
  await page.getByRole('button', { name: 'Archive Spanish', exact: true }).click();
  await popup.getByRole('heading', { name: 'Spanish', exact: true }).waitFor({ state: 'hidden' });
  // Validate the worker boundary even when native form checks are bypassed.
  const invalid = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'goals', action: 'create', payload: { name: ' ', target: -1, unit: 'minutes' } }));
  assert.equal(invalid.ok, false);
  for (const name of ['History', 'Rewards', 'Connections', 'Settings', 'Today']) {
    await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
    await page.getByRole('heading', { name, exact: true }).waitFor();
  }
  await page.getByRole('link', { name: 'Connect a website →' }).click();
  await page.getByRole('heading', { name: 'Read with GeeksforGeeks.' }).waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
  await page.getByRole('navigation').getByRole('link', { name: 'Today', exact: true }).click();
  await page.getByRole('progressbar', { name: 'Daily goals completed' }).waitFor();
  assert.equal(await page.getByRole('progressbar', { name: 'Daily goals completed' }).getAttribute('value'), '0');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.button').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  // Save a manual bookmark, approving its site separately from tracking.
  await page.getByRole('button', { name: 'Edit Reading', exact: true }).click();
  await page.getByLabel('Lesson URL (optional)', { exact: true }).fill('https://learning.example.com/lesson/one?token=discard#private');
  await page.getByLabel('Lesson title (optional)', { exact: true }).fill('First lesson');
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await page.getByRole('alert').getByText('Approve this site', { exact: false }).waitFor();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const savedLocation = await page.evaluate(async () => (await chrome.storage.local.get('goalStore')).goalStore.goals.find(g => g.name === 'Reading').location);
  assert.deepEqual(savedLocation, { url: 'https://learning.example.com/lesson/one', origin: 'https://learning.example.com', title: 'First lesson' });
  // Serve a local fixture through routing: no real external service or account required.
  await context.route('https://learning.example.com/**', route => route.fulfill({ status: 404, contentType: 'text/html', body: '<h1>Lesson moved — sign in or update your link</h1>' }));
  const opened = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Continue Reading', exact: true }).click();
  const lesson = await opened;
  await lesson.waitForURL(savedLocation.url);
  const tabCount = context.pages().length;
  await popup.getByRole('button', { name: 'Continue Reading', exact: true }).click();
  await popup.getByRole('status').getByText('Lesson opened.', { exact: false }).waitFor();
  assert.equal(context.pages().length, tabCount, 'Continue must reuse the existing tab');
  await lesson.close();
  const reopened = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Continue Reading', exact: true }).click();
  await (await reopened).waitForURL(savedLocation.url);
  const invalidLocations = [
    { url: 'javascript:alert(1)', origin: 'null', title: '' },
    { url: 'http://learning.example.com/lesson', origin: 'http://learning.example.com', title: '' },
    { url: 'https://user:secret@learning.example.com/lesson', origin: 'https://learning.example.com', title: '' },
    { url: 'https://evil.example.com/lesson', origin: 'https://learning.example.com', title: '' },
    { url: 'https://127.0.0.1/lesson', origin: 'https://127.0.0.1', title: '' },
  ];
  for (const location of invalidLocations) {
    const result = await page.evaluate(location => chrome.runtime.sendMessage({ type: 'goals', action: 'create', payload: { name: 'Invalid', target: 1, unit: 'lessons', location } }), location);
    assert.equal(result.ok, false);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
  for (const width of [1200, 768, 360]) {
    await page.setViewportSize({ width, height: 800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.screenshot({ path: 'test-results/dashboard-narrow.png', fullPage: true });
  await popup.screenshot({ path: 'test-results/popup.png', fullPage: true });
  assert.ok(await popup.locator('body').evaluate(body => body.scrollHeight <= 600));
  const before = await page.evaluate(() => chrome.storage.local.get('goalStore'));
  await context.close();
  context = await launch(); watch();
  const restored = await context.newPage();
  await restored.goto(`${base}/dashboard.html`);
  await restored.getByRole('heading', { name: 'Learn TypeScript' }).waitFor();
  assert.deepEqual(await restored.evaluate(() => chrome.storage.local.get('goalStore')), before);
  await restored.getByRole('button', { name: 'Show archived', exact: true }).click();
  await restored.getByRole('heading', { name: 'Spanish', exact: true }).waitFor();
  // A real ledger completion updates Today; an archived completion must not inflate its total.
  const goals = before.goalStore.goals, ledger = newLedger(), at = Date.now();
  for (const goal of goals) addGoal(ledger, goal.id, { timezone: 'UTC', target: goal.target, unit: goal.unit }, at);
  for (const goal of goals.filter(g => g.archived || g.name === 'Learn TypeScript')) complete(ledger, goal.id, goal.id, goal.target, goal.unit, at);
  await restored.evaluate(async ledger => {
    const reading = (await chrome.runtime.sendMessage({ type: 'gfg', action: 'read' })).state;
    reading.ledger = ledger;
    await chrome.storage.local.set({ gfgReading: reading });
  }, ledger);
  await restored.getByRole('button', { name: 'Show active', exact: true }).click();
  await restored.getByText('Completed today', { exact: true }).waitFor();
  const total = restored.getByRole('progressbar', { name: 'Daily goals completed' });
  assert.equal(await total.getAttribute('value'), '1'); assert.equal(await total.getAttribute('max'), '2');
  await restored.screenshot({ path: 'test-results/today-progress.png', fullPage: true });
  // Upgrade a real schema-1 record without losing its fields.
  const migrated = await restored.evaluate(async () => {
    await chrome.storage.local.set({ goalStore: { version: 1, goals: [{ id: 'legacy', name: 'Old goal', target: 15, unit: 'minutes', archived: true }] } });
    return chrome.runtime.sendMessage({ type: 'goals', action: 'read' });
  });
  assert.equal(migrated.store.version, 2);
  assert.deepEqual(migrated.store.goals, [{ id: 'legacy', name: 'Old goal', target: 15, unit: 'minutes', archived: true, location: null }]);
  // An unknown future schema must be preserved, never silently cleared.
  await restored.evaluate(() => chrome.storage.local.set({ goalStore: { version: 99, goals: [] } }));
  await restored.getByRole('alert').waitFor();
  const rejected = await restored.evaluate(() => chrome.runtime.sendMessage({ type: 'goals', action: 'create', payload: { name: 'Unsafe', target: 1, unit: 'lessons' } }));
  assert.equal(rejected.ok, false);
  assert.equal((await restored.evaluate(() => chrome.storage.local.get('goalStore'))).goalStore.version, 99);
  assert.deepEqual(errors, []);
  console.log('PASS: create/edit/archive/restore/delete, popup synchronization, validation, browser restart persistence, schema migration/preservation, sanitized bookmarks, site approval, tab reuse/reopen, unsafe URL rejection, first-goal setup, actual completion totals excluding archived goals, navigation focus, reduced motion, responsive layouts and no page errors.');
} finally { await context.close(); }
