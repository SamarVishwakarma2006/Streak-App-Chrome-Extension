import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function prepareBeta(root = process.cwd()) {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const report = JSON.parse(await readFile(path.join(root, 'test-results/release-checks.json'), 'utf8'));
  assert.equal(report.passed, true, 'Run npm run check successfully before packaging a beta.');
  assert.ok(Array.isArray(report.checks) && report.checks.every(c => c.passed === true));
  for (const name of ['test:beta', 'test:privacy', 'test:release']) assert.ok(report.checks.some(c => c.name === name), `Missing check: ${name}`);
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  assert.equal(head.status, 0, 'A Git revision is required to label the candidate.');
  assert.equal(report.revision, head.stdout.trim(), 'The checked revision changed. Re-run npm run check.');
  const filename = `${pkg.name}-${pkg.version}-chrome.zip`;
  const zip = path.join(root, '.output', filename);
  const hash = createHash('sha256').update(await readFile(zip)).digest('hex');
  const checksum = (await readFile(path.join(root, '.output/release-sha256.txt'), 'utf8')).trim();
  assert.equal(checksum, `${hash}  ${filename}`, 'ZIP differs from the checked package. Re-run npm run check.');
  const manifest = JSON.parse(await readFile(path.join(root, '.output/chrome-mv3/manifest.json'), 'utf8'));
  assert.equal(manifest.version, pkg.version);
  const folder = path.join(root, '.output', `beta-${pkg.version}-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`);
  await mkdir(folder);
  await cp(zip, path.join(folder, 'extension.zip'));
  for (const file of ['BETA_START_HERE.md', 'BETA_LIMITATIONS.md', 'BETA_FEEDBACK.md']) await cp(path.join(root, file), path.join(folder, file));
  await writeFile(path.join(folder, 'CHECKSUMS.sha256'), `${hash}  extension.zip\n`);
  await writeFile(path.join(folder, 'BUILD_INFO.json'), JSON.stringify({
    schemaVersion: 1, version: pkg.version, candidateType: 'private-beta-preparation',
    revision: report.revision, uncommittedChanges: report.dirty === true,
    checkedAt: report.finishedAt, packagedAt: new Date().toISOString(),
    extensionSHA256: hash, cloudConfigured: (manifest.host_permissions ?? []).some(h => /^https:\/\/[a-z0-9]+\.supabase\.co\/\*$/.test(h)),
    localChecksPassed: true, participantTesting: 'not-recorded', publicLaunchApproved: false,
  }, null, 2) + '\n');
  return folder;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Beta bundle prepared: ${await prepareBeta()}`);
  console.log('Share only after the beta prerequisites are met. Participant testing is not recorded by packaging.');
}
