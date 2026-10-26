import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
if (!process.env.npm_execpath) throw new Error('Run npm run test:config.');
const base = { ...process.env, STREAK_RELEASE: '0', WXT_SUPABASE_URL: '', WXT_SUPABASE_PUBLISHABLE_KEY: '' };
const build = env => spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'build'], { env: { ...base, ...env }, encoding: 'utf8', timeout: 120000 });
try {
  for (const [env, message] of [
    [{ STREAK_RELEASE: '1' }, 'Release candidate builds require'],
    [{ WXT_SUPABASE_URL: 'https://example.com', WXT_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' }, 'Use a Supabase project HTTPS origin'],
    [{ WXT_SUPABASE_URL: 'https://fixture.supabase.co', WXT_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_fixture' }, 'Use a Supabase project HTTPS origin'],
    [{ WXT_SERVICE_ROLE_KEY: 'fixture-secret' }, 'Secret-like WXT variables are forbidden'],
  ]) {
    const result = build(env);
    assert.notEqual(result.status, 0);
    assert.ok((result.stdout + result.stderr).includes(message), 'Expected configuration rejection');
  }
  const release = build({ STREAK_RELEASE: '1', WXT_SUPABASE_URL: 'https://fixture.supabase.co', WXT_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' });
  assert.equal(release.status, 0, release.stderr);
  const manifest = JSON.parse(await readFile('.output/chrome-mv3/manifest.json', 'utf8'));
  assert.deepEqual(manifest.host_permissions, ['https://fixture.supabase.co/*']);
  console.log('Build config: missing release values, non-Supabase origin, secret key/variables rejected; configured candidate scopes its host permission.');
} finally {
  const result = build({});
  assert.equal(result.status, 0, 'Could not restore device-only output');
}
