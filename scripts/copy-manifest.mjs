import fs from 'node:fs';
import { loadEnv } from 'vite';

const source = JSON.parse(fs.readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'));
const env = loadEnv(process.env.MODE ?? 'production', process.cwd(), '');

function environmentValue(name) {
  return process.env[name]?.trim() || env[name]?.trim();
}

const syncUrl = environmentValue('VITE_SUPABASE_URL');
const cloudSyncRequired = environmentValue('CLOUD_SYNC_REQUIRED') === 'true';

if (cloudSyncRequired && !syncUrl) {
  throw new Error('CLOUD_SYNC_REQUIRED=true needs VITE_SUPABASE_URL so the manifest can allow one exact Supabase project host.');
}

if (syncUrl) {
  const origin = new URL(syncUrl).origin;
  source.host_permissions = [`${origin}/*`];
  source.content_security_policy.extension_pages = `${source.content_security_policy.extension_pages}; connect-src ${origin}`;
}

fs.writeFileSync(new URL('../dist/manifest.json', import.meta.url), `${JSON.stringify(source, null, 2)}\n`);
