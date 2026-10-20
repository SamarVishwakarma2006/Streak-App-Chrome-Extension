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
  await popup.setViewportSize({ width: 360, height: 540 });
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByRole('heading', { name: 'Make room for a little progress.' }).waitFor();
  assert.equal(await popup.locator('img').evaluate((img) => img.naturalWidth > 0), true);
  assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await popup.screenshot({ path: 'test-results/popup.png', fullPage: true });

  const link = popup.getByRole('link', { name: 'Open dashboard' });
  await link.focus();
  const dashboardPromise = context.waitForEvent('page');
  await popup.keyboard.press('Enter');
  const dashboard = await dashboardPromise;
  await dashboard.waitForURL(`chrome-extension://${extensionId}/dashboard.html`);
  await dashboard.getByRole('heading', { name: 'Small steps. Lasting habits.' }).waitFor();
  await dashboard.setViewportSize({ width: 1200, height: 850 });
  await dashboard.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
  await dashboard.reload();
  await dashboard.getByText('Extension scaffold ready').waitFor();
  await dashboard.setViewportSize({ width: 360, height: 640 });
  assert.equal(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: MV3, packaged icons, no permissions, worker startup, popup, keyboard dashboard navigation, reload, narrow layout, and no page errors.');
  console.log('Screenshots: test-results/popup.png and test-results/dashboard.png');
} finally {
  await context.close();
}
