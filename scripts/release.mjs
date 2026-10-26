import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const zip = path.resolve(`.output/${pkg.name}-${pkg.version}-chrome.zip`);
await mkdir('test-results', { recursive: true });
const root = await mkdtemp(path.resolve('test-results/release-'));
const extension = path.join(root, 'extension');
if (process.platform === 'win32') {
  const literal = value => `'${value.replaceAll("'", "''")}'`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop\n[System.IO.Compression.ZipFile]::ExtractToDirectory(${literal(zip)}, ${literal(extension)})`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
} else {
  const result = spawnSync('unzip', ['-q', zip, '-d', extension], { encoding: 'utf8' });
  assert.equal(result.status, 0, 'ZIP extraction failed; install unzip for this check.');
}
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, pkg.version);
assert.deepEqual(manifest.permissions, ['storage', 'tabs', 'scripting', 'alarms']);
assert.deepEqual(manifest.optional_permissions, ['notifications']);
assert.deepEqual(manifest.optional_host_permissions, ['https://www.geeksforgeeks.org/*']);
assert.ok((manifest.host_permissions ?? []).length <= 1);
for (const host of manifest.host_permissions ?? []) assert.match(host, /^https:\/\/[a-z0-9]+\.supabase\.co\/\*$/);
const policy = manifest.content_security_policy?.extension_pages ?? "script-src 'self'; object-src 'self'";
assert.ok(!/unsafe-eval|https?:|\*/.test(policy), 'Extension page CSP must keep scripts local');
const files = [];
async function inspect(folder) {
  for (const file of await readdir(folder, { withFileTypes: true })) {
    const full = path.join(folder, file.name), relative = path.relative(extension, full).replaceAll('\\', '/');
    assert.ok(!file.isSymbolicLink());
    if (file.isDirectory()) { assert.ok(['assets', 'chunks', 'icon'].includes(relative)); await inspect(full); continue; }
    assert.ok(/\.(js|html|json|css|png|svg)$/.test(relative), `Unexpected packaged file: ${relative}`);
    files.push(relative);
    if (/\.(js|html|json|css|svg)$/.test(relative)) {
      const text = await readFile(full, 'utf8');
      assert.ok(!/sb_secret_[A-Za-z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text), 'Secret-shaped material detected; inspect the package locally');
      for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
        let claims; try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); } catch { continue; }
        assert.notEqual(claims.role, 'service_role', 'Server-role JWT detected in package');
      }
    }
  }
}
await inspect(extension);
for (const file of ['dashboard.html', 'popup.html', 'gfg.js', manifest.background.service_worker, ...Object.values(manifest.icons)]) assert.ok(files.includes(file.replace(/^\//, '')), `Missing package entry: ${file}`);

// Use the extracted ZIP, not the build directory. Preserve its path and profile across a version change.
const profile = path.join(root, 'profile');
const launch = () => chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
let context = await launch(), identity;
try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  identity = new URL(worker.url()).hostname;
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  await page.goto(`chrome-extension://${identity}/dashboard.html`);
  await page.getByRole('heading', { name: 'Your next chapter starts here.' }).waitFor();
  assert.equal(await page.evaluate(() => chrome.permissions.contains({ origins: ['https://www.geeksforgeeks.org/*'] })), false);
  assert.deepEqual(await page.evaluate(() => chrome.scripting.getRegisteredContentScripts()), []);
  await page.evaluate(async () => {
    const result = await chrome.runtime.sendMessage({ type: 'goals', action: 'create', payload: { name: 'Update survival check', target: 1, unit: 'lessons', location: null } });
    if (!result?.ok) throw new Error('Fixture goal could not be saved');
    // Existing schema migration is also exercised at the version-change boundary.
    const goal = result.store.goals[0]; delete goal.location;
    await chrome.storage.local.set({ goalStore: { version: 1, goals: [goal] } });
  });
} finally { await context.close(); }
const next = manifest.version.split('.').map(Number); next[next.length - 1]++;
await writeFile(path.join(extension, 'manifest.json'), JSON.stringify({ ...manifest, version: next.join('.') }));
context = await launch();
try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  assert.equal(new URL(worker.url()).hostname, identity);
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  await page.goto(`chrome-extension://${identity}/dashboard.html`);
  await page.getByRole('heading', { name: 'Update survival check' }).waitFor();
  const result = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'goals', action: 'read' }));
  assert.equal(result.store.version, 2); assert.equal(result.store.goals[0].location, null);
  const popup = await context.newPage(); await popup.goto(`chrome-extension://${identity}/popup.html`);
  await popup.getByRole('heading', { name: 'Update survival check' }).waitFor();
  assert.deepEqual(await page.evaluate(() => chrome.scripting.getRegisteredContentScripts()), []);
} finally { await context.close(); }
const hash = createHash('sha256').update(await readFile(zip)).digest('hex');
await writeFile('.output/release-sha256.txt', `${hash}  ${path.basename(zip)}\n`);
console.log(`Release package: ${files.length} allowed files, scoped permissions/CSP, secret-pattern checks, ZIP install, version-change/schema persistence and popup passed. SHA-256 written to .output/release-sha256.txt.`);
