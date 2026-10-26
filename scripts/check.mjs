import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Run sequentially: account/cloud tests temporarily rebuild the shared output directory.
const checks = ['typecheck', 'test:config', 'test:reading', 'test:streaks', 'test:database', 'test:ingestion', 'build', 'test:smoke', 'test:reading:browser', 'test:recovery', 'test:account', 'test:cloud', 'test:reminders', 'test:history', 'test:privacy', 'zip', 'test:release'];
if (!process.env.npm_execpath) throw new Error('Run this with npm run check.');
const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
const dirty = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
const report = { startedAt: new Date().toISOString(), revision: git.status === 0 ? git.stdout.trim() : null, dirty: !!dirty.stdout?.trim(), node: process.version, checks: [], passed: false };
await mkdir('test-results', { recursive: true });
const destination = path.resolve('test-results/release-checks.json');
for (const name of checks) {
  console.log(`\nChecking ${name}`);
  const start = Date.now();
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', name], {
    stdio: 'inherit', timeout: 600000,
    env: { ...process.env, STREAK_RELEASE: '0', WXT_SUPABASE_URL: '', WXT_SUPABASE_PUBLISHABLE_KEY: '' },
  });
  report.checks.push({ name, passed: result.status === 0, milliseconds: Date.now() - start });
  report.finishedAt = new Date().toISOString();
  await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  if (result.status !== 0) { console.error(`Check failed: ${name}. Report: test-results/release-checks.json`); process.exit(result.status || 1); }
}
report.passed = true;
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log('All local checks passed. This does not approve a production launch; see RELEASE_CHECKLIST.md.');
