import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// Run after npm run build. Use a dedicated profile, never a personal Chrome profile.
const extensionPath = path.resolve('.output/chrome-mv3');
const manifest = JSON.parse(await readFile(path.join(extensionPath, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.action.default_popup, 'popup.html');
assert.equal(manifest.permissions?.length ?? 0, 0);
assert.equal(manifest.host_permissions?.length ?? 0, 0);
for (const iconPath of Object.values(manifest.icons)) {
  await access(path.join(extensionPath, iconPath.replace(/^\//, '')));
}

await mkdir('test-results', { recursive: true });
const profile = await mkdtemp(path.resolve('test-results/profile-'));
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  headless: true,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

try {
  const errors = [];
  context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  const worker = context.serviceWorkers()[0] ??
    await context.waitForEvent('serviceworker', { timeout: 15_000 });
  const extensionId = new URL(worker.url()).hostname;
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 380, height: 600 });
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByRole('heading', { name: 'Today', exact: true }).waitFor();
  assert.equal(await popup.locator('.goal-card').count(), 3);
  assert.ok(await popup.locator('body').evaluate((body) => body.scrollHeight <= 600));
  assert.equal(await popup.locator('img').evaluate((img) => img.naturalWidth > 0), true);
  assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await popup.screenshot({ path: 'test-results/popup.png', fullPage: true });
  const continueButton = popup.getByRole('button', { name: 'Continue Learn JavaScript demo' });
  await continueButton.focus();
  await popup.keyboard.press('Enter');
  await popup.getByRole('dialog', { name: 'Functions & scope' }).waitFor();
  await popup.keyboard.press('Escape');
  await popup.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await continueButton.evaluate((button) => button === document.activeElement), true);

  const link = popup.getByRole('link', { name: 'Open dashboard' });
  await link.focus();
  const dashboardPromise = context.waitForEvent('page');
  await popup.keyboard.press('Enter');
  const dashboard = await dashboardPromise;
  await dashboard.waitForURL(`chrome-extension://${extensionId}/dashboard.html`);
  await dashboard.getByRole('heading', { name: 'Today', exact: true }).waitFor();
  await dashboard.setViewportSize({ width: 1440, height: 1000 });
  await dashboard.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
  for (const name of ['History', 'Rewards', 'Connections', 'Settings', 'Today']) {
    const navigation = dashboard.getByRole('navigation').getByRole('link', { name, exact: true });
    await navigation.focus();
    await dashboard.keyboard.press('Enter');
    await dashboard.getByRole('heading', { name, exact: true }).waitFor();
    assert.equal(await navigation.getAttribute('aria-current'), 'page');
  }
  await dashboard.getByLabel('Preview state').selectOption('empty');
  await dashboard.getByRole('heading', { name: 'Your next chapter starts here.' }).waitFor();
  assert.equal(await dashboard.locator('.goal-card').count(), 0);
  await dashboard.screenshot({ path: 'test-results/empty.png', fullPage: true });
  await dashboard.getByLabel('Preview state').selectOption('loading');
  await dashboard.getByRole('status').waitFor();
  await dashboard.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await dashboard.locator('.skeleton span').first().evaluate((el) => getComputedStyle(el).animationName), 'none');
  await dashboard.screenshot({ path: 'test-results/loading.png', fullPage: true });
  await dashboard.getByLabel('Preview state').selectOption('sample');
  await dashboard.reload();
  await dashboard.getByRole('heading', { name: 'Your daily goals' }).waitFor();
  for (const width of [1200, 768, 360]) {
    await dashboard.setViewportSize({ width, height: 800 });
    assert.equal(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}px`);
  }
  await dashboard.screenshot({ path: 'test-results/dashboard-narrow.png', fullPage: true });
  // Ensure lengthy future goal names wrap instead of pushing the layout wider.
  await dashboard.locator('.goal-title-row h3').first().evaluate((el) => { el.textContent = 'A very long learning goal name that must wrap without hiding its progress or actions'; });
  assert.equal(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: MV3, icons, no permissions, worker, popup height, demo dialog/focus, keyboard navigation, preview states, reduced motion, reload, responsive layouts, long titles, and no page errors.');
  console.log('Screenshots: test-results/popup.png and test-results/dashboard.png');
} finally {
  await context.close();
}
