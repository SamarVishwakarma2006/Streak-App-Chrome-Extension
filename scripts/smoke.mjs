import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
const extensionPath = path.resolve('.output/chrome-mv3');
const manifest = JSON.parse(await readFile(path.join(extensionPath, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage']);
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
  async function create(name) {
    await page.getByRole('button', { name: 'New goal', exact: true }).click();
    await page.getByLabel('Goal name').fill(name);
    await page.getByRole('button', { name: 'Save goal', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('heading', { name, exact: true }).waitFor();
  }
  for (const name of ['JavaScript', 'Spanish', 'Reading']) await create(name);
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
  await page.getByRole('button', { name: 'Explore design demo' }).click();
  await page.getByRole('button', { name: 'Continue Learn JavaScript demo' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByLabel('Preview state').selectOption('empty');
  await page.getByRole('heading', { name: 'Your next chapter starts here.' }).waitFor();
  await page.getByLabel('Preview state').selectOption('loading');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.skeleton span').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.getByRole('button', { name: 'Back to saved goals' }).click();
  await page.getByRole('heading', { name: 'Learn TypeScript' }).waitFor();
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
  // An unknown future schema must be preserved, never silently cleared.
  await restored.evaluate(() => chrome.storage.local.set({ goalStore: { version: 99, goals: [] } }));
  await restored.getByRole('alert').waitFor();
  const rejected = await restored.evaluate(() => chrome.runtime.sendMessage({ type: 'goals', action: 'create', payload: { name: 'Unsafe', target: 1, unit: 'lessons' } }));
  assert.equal(rejected.ok, false);
  assert.equal((await restored.evaluate(() => chrome.storage.local.get('goalStore'))).goalStore.version, 99);
  assert.deepEqual(errors, []);
  console.log('PASS: create/edit/archive/restore/delete, popup synchronization, validation, browser restart persistence, schema preservation, demo navigation, responsive layouts and no page errors.');
} finally { await context.close(); }
