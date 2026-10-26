import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { chromium } from 'playwright';
import { prepareBeta } from './beta.mjs';
import { addGoal, complete, localDate, newLedger } from '../src/streaks.ts';

const beta = await prepareBeta();
const info = JSON.parse(await readFile(path.join(beta, 'BUILD_INFO.json'), 'utf8'));
const status = JSON.parse(await readFile('store/STATUS.json', 'utf8'));
const listing = await readFile('store/LISTING.md', 'utf8');
const summary = listing.split('## Short description')[1]?.split('## Detailed description')[0]?.trim();
assert.ok(summary && summary.length <= 132, 'Short description must fit the store field');
assert.equal(status.submitted, false); assert.equal(status.approved, false); assert.equal(status.published, false);
assert.ok(status.blockers.length > 0);
const folder = path.resolve('.output', `store-draft-${info.version}-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`);
await mkdir(path.join(folder, 'screenshots'), { recursive: true });
for (const file of ['README.md', 'LISTING.md', 'PRIVACY_POLICY_DRAFT.md', 'DISCLOSURES.md', 'REVIEWER_GUIDE.md', 'RELEASE_NOTES.md', 'STATUS.json']) await cp(path.join('store', file), path.join(folder, file));
for (const file of ['extension.zip', 'BUILD_INFO.json', 'CHECKSUMS.sha256', 'BETA_START_HERE.md', 'BETA_LIMITATIONS.md', 'BETA_FEEDBACK.md']) await cp(path.join(beta, file), path.join(folder, file));
for (const file of ['RELEASE_CHECKLIST.md', 'OPERATIONS.md']) await cp(file, path.join(folder, file));
await cp('public/icon/128.png', path.join(folder, 'icon-128.png'));
const icon = await readFile(path.join(folder, 'icon-128.png'));
assert.equal(icon.readUInt32BE(16), 128); assert.equal(icon.readUInt32BE(20), 128);

// Isolated fixture: no user profile/account or third-party article content is captured.
await mkdir('test-results', { recursive: true });
const root = await mkdtemp(path.resolve('test-results/store-capture-'));
const extension = path.join(root, 'extension');
await cp('.output/chrome-mv3', extension, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
manifest.host_permissions = [...(manifest.host_permissions ?? []), 'https://www.geeksforgeeks.org/*'];
await writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
const context = await chromium.launchPersistentContext(path.join(root, 'profile'), { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
const assets = [];
try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 800 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const base = `chrome-extension://${new URL(worker.url()).hostname}/dashboard.html`;
  await page.goto(base);
  const ids = [randomUUID(), randomUUID(), randomUUID()], ledger = newLedger();
  const today = new Date(), date = day => Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - day, 12);
  for (const i of [0, 1]) {
    addGoal(ledger, ids[i], { timezone: 'UTC', target: 1, unit: 'lessons' }, date(8));
  }
  for (let day = 7; day >= 1; day--) for (const i of [0, 1]) if (i === 0 || day <= 3) complete(ledger, ids[i], `sample-${i}-${day}`, 1, 'lessons', date(day));
  await page.evaluate(async ({ ids, ledger }) => {
    const reading = (await chrome.runtime.sendMessage({ type: 'gfg', action: 'read' })).state;
    reading.ledger = ledger; reading.goalId = ids[0]; reading.timezone = 'UTC';
    await chrome.storage.local.set({ gfgReading: reading, goalStore: { version: 2, goals: [
      { id: ids[0], name: 'Learn Python', target: 1, unit: 'lessons', archived: false, location: { url: 'https://www.geeksforgeeks.org/python/python-variables/', origin: 'https://www.geeksforgeeks.org', title: 'Python Variables · example bookmark' } },
      { id: ids[1], name: 'Practice data structures', target: 1, unit: 'lessons', archived: false, location: null },
      { id: ids[2], name: 'Read something new', target: 15, unit: 'minutes', archived: false, location: null },
    ] } });
    const caption = document.createElement('div'); caption.id = 'store-sample-caption'; caption.textContent = 'Sample data · development candidate';
    caption.style.cssText = 'position:fixed;right:18px;bottom:14px;z-index:9999;padding:6px 12px;border:1px solid #b4c6ad;border-radius:6px;background:#fff;color:#203e35;font:12px system-ui';
    document.body.append(caption);
  }, { ids, ledger });
  for (const [section, filename] of [['today','01-today.png'], ['history','02-history.png'], ['rewards','03-rewards.png']]) {
    if (section !== 'today') await page.getByRole('navigation').getByRole('link', { name: section === 'history' ? 'History' : 'Rewards', exact: true }).click();
    await page.getByRole('heading', { name: 'Learn Python', exact: true }).waitFor();
    if (section === 'history') { await page.getByLabel('Calendar month').fill(localDate(Date.now(), 'UTC').slice(0, 7)); await page.locator('.history-calendar table').waitFor(); }
    if (section === 'rewards') await page.locator('.reward-card.earned').getByRole('heading', { name: '7 days', exact: true }).waitFor();
    await page.locator('#store-sample-caption').waitFor();
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    // Capture the feature at its natural scroll position so the calendar/rewards aren't clipped below the viewport.
    await page.locator(section === 'today' ? '.saved-goals' : section === 'history' ? '.history-calendar' : '.reward-grid').scrollIntoViewIfNeeded();
    const file = path.join(folder, 'screenshots', filename);
    await page.screenshot({ path: file, fullPage: false });
    const png = await readFile(file); assert.equal(png.readUInt32BE(16),1280); assert.equal(png.readUInt32BE(20),800);
    assets.push({ filename: `screenshots/${filename}`, width:1280, height:800, sha256:createHash('sha256').update(png).digest('hex'), sampleData:true });
  }
  assert.deepEqual(errors, []);
} finally { await context.close(); }
await writeFile(path.join(folder, 'RELEASE_INFO.json'), JSON.stringify({ ...info, candidateType:'store-draft', assets,
  submitted:false, approved:false, published:false, publicLaunchApproved:false, blockers:status.blockers,
  screenshotNote:'Actual extension UI with labeled synthetic records; development badges retained. Recapture from the final release package before submission.',
}, null, 2) + '\n');
console.log(`Store draft prepared: ${folder}`);
console.log('Three 1280×800 screenshots and 128px icon verified. No submission, approval or publication performed.');
