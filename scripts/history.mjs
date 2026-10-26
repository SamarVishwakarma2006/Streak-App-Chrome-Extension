import assert from 'node:assert/strict';
import { mkdtemp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { monthDays } from '../src/history.ts';
import { newLedger, addGoal, complete } from '../src/streaks.ts';
assert.equal(monthDays('2024-02').flat().filter(Boolean).length, 29);
assert.equal(monthDays('2025-02').flat().filter(Boolean).length, 28);
assert.equal(monthDays('2026-11')[0][6], '2026-11-01');
assert.equal(monthDays('2026-12').flat().filter(Boolean).at(-1), '2026-12-31');
assert.throws(() => monthDays('2026-13'));
await mkdir('test-results', { recursive: true });
const profile = await mkdtemp(path.resolve('test-results/history-'));
const extension = path.resolve('.output/chrome-mv3');
const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  const base = `chrome-extension://${new URL(worker.url()).hostname}/dashboard.html`;
  await page.goto(`${base}#history`);
  await page.getByRole('heading', { name: 'Your story starts with a goal.' }).waitFor();
  const ledger = newLedger();
  const at = d => Date.UTC(2024, 1, d, 12);
  addGoal(ledger, 'fixture', { timezone: 'UTC', target: 1, unit: 'lessons' }, at(1));
  for (let d = 1; d <= 3; d++) complete(ledger, 'fixture', `article-${d}`, 1, 'lessons', at(d));
  await page.evaluate(async ledger => {
    const reading = (await chrome.runtime.sendMessage({ type: 'gfg', action: 'read' })).state;
    reading.ledger = ledger;
    await chrome.storage.local.set({ gfgReading: reading, goalStore: { version: 2, goals: [
      { id: 'fixture', name: 'A very long learning goal '.repeat(3), target: 1, unit: 'lessons', archived: false, location: null },
      { id: 'second', name: 'Archived goal', target: 1, unit: 'lessons', archived: true, location: null },
    ] } });
  }, ledger);
  await page.getByLabel('Calendar month').fill('2024-02');
  await page.getByText('2024-02 · 3 completed days', { exact: true }).waitFor();
  assert.equal(await page.locator('.completed-day').count(), 3);
  await page.getByText('Your next completion starts a new streak.', { exact: false }).waitFor();
  assert.match(await page.locator('.progress-stats').innerText(), /95/);
  await page.getByLabel('Goal', { exact: true }).selectOption('second');
  await page.getByText('Archived · History preserved', { exact: false }).waitFor();
  assert.equal(await page.locator('.completed-day').count(), 0);
  await page.getByLabel('Goal', { exact: true }).selectOption('fixture');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'test-results/history-mobile.png', fullPage: true });
  await page.getByRole('navigation').getByRole('link', { name: 'Rewards' }).click();
  assert.equal(await page.locator('.reward-card.earned').count(), 1);
  await page.locator('.reward-card.earned').getByRole('heading', { name: '3 days' }).waitFor();
  await page.getByLabel('Progress source').selectOption('cloud');
  await page.getByRole('alert').filter({ hasText: 'Cloud setup is not configured' }).waitFor();
  await page.getByRole('button', { name: 'Refresh history' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('alert').waitFor();
  assert.deepEqual(errors, []);
  console.log('History: leap/month boundaries, empty/populated/multiple/archived goals, reset, earned rewards, narrow layout, keyboard retry and unconfigured cloud passed.');
} catch(e) { for (const p of context.pages()) console.log((await p.locator('body').innerText()).slice(0,5000)); throw e; } finally { await context.close(); }
