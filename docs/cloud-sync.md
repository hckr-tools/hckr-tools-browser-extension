# Cloud Sync setup

Cloud Sync is optional. hckr-tools remains usable with no Supabase configuration.

1. Create a Supabase project and apply `supabase/migrations/20260908000000_workspace_sync.sql`.
2. Enable Google under Supabase Auth and configure Google with Supabase's provider callback URL.
3. After loading the production extension, add `chrome.identity.getRedirectURL('supabase-auth')` to Supabase Auth Redirect URLs.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in release CI, then set `CLOUD_SYNC_REQUIRED=true`.

The resulting package grants network access to that exact configured Supabase origin. Use only the publishable key. Never expose a Supabase secret/service key in extension code, the manifest, or CI build logs.
