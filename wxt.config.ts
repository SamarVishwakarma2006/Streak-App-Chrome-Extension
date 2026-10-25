import { defineConfig } from 'wxt';
import { loadEnv } from 'vite';
import process from 'node:process';
const env = { ...loadEnv('production', process.cwd(), 'WXT_'), ...process.env };
const cloudURL = env.WXT_SUPABASE_URL;
const cloudKey = env.WXT_SUPABASE_PUBLISHABLE_KEY;
if (cloudURL || cloudKey) {
  if (!cloudURL || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(cloudURL) || !cloudKey?.startsWith('sb_publishable_')) throw new Error('Use a Supabase project HTTPS origin (no trailing slash) and public sb_publishable_ key. Never use a secret key.');
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: 'Streak Maintaining App',
    permissions: ['storage', 'tabs', 'scripting', 'alarms'],
    ...(cloudURL ? { host_permissions: [cloudURL + '/*'] } : {}),
    optional_host_permissions: ['https://www.geeksforgeeks.org/*'],
    description: 'Development preview of your daily learning companion.',
    action: { default_title: 'Open Streak Maintaining App' },
    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      128: '/icon/128.png',
    },
  },
});
