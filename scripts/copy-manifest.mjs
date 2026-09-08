import fs from 'node:fs';

const source = JSON.parse(fs.readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'));
const syncUrl = process.env.VITE_SUPABASE_URL?.trim();

if (process.env.CLOUD_SYNC_REQUIRED === 'true' && !syncUrl) {
  throw new Error('CLOUD_SYNC_REQUIRED=true needs VITE_SUPABASE_URL so the manifest can allow one exact Supabase project host.');
}

if (syncUrl) {
  const origin = new URL(syncUrl).origin;
  source.host_permissions = [`${origin}/*`];
  source.content_security_policy.extension_pages = `${source.content_security_policy.extension_pages}; connect-src ${origin}`;
}

fs.copyFileSync(new URL('../src/content/widget.css', import.meta.url), new URL('../dist/content/widget.css', import.meta.url));
fs.writeFileSync(new URL('../dist/manifest.json', import.meta.url), `${JSON.stringify(source, null, 2)}\n`);
