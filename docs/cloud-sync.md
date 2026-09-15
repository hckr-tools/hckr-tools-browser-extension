# Cloud Sync setup

Cloud Sync is optional. hckr-tools remains usable with no Supabase configuration or account.

## Hosted hckr project

The repository does not include a local Supabase/Docker workflow. The tracked migration under `supabase/migrations/` is applied directly to the hckr production project.

```sh
make sb-push-hckr CONFIRM=push
```

Create new migrations through the Supabase CLI instead of editing an applied migration:

```sh
make sb-migration-new NAME=add_workspace_index
```

To configure GitHub authentication, enable GitHub in Supabase Auth, register a GitHub OAuth App with Supabase's provider callback URL, and add `chrome.identity.getRedirectURL('supabase-auth')` to Supabase Auth Redirect URLs.

Build the Cloud Sync package with public values only:

   ```sh
   make cloud-build \
     VITE_SUPABASE_URL=https://your-project.supabase.co \
     VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example
   ```

The Cloud Sync build sets `CLOUD_SYNC_REQUIRED=true` and grants network access to that exact configured Supabase origin. Use only the publishable key. Never expose a Supabase secret/service key in extension code, the manifest, a Make command, or CI logs.

## Keepalive workflow (prevent inactivity pausing)

Free tier Supabase projects automatically pause after 7 days of inactivity. A scheduled GitHub Actions workflow (`.github/workflows/supabase-keepalive-prod.yml`) runs every 3 hours (and supports manual triggering via `workflow_dispatch`) to query a minimal database resource (`/rest/v1/workspaces?select=id&limit=1`) and keep the project active.

### Required Secrets

Configure the following secrets in GitHub (either under repository secrets **Settings > Secrets and variables > Actions** or inside an Environment named **prod**):

- `SUPABASE_URL`: The Supabase project URL (e.g. `https://tcufenzxkxlgawuwbcxl.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY`: The Supabase `service_role` secret key (from Supabase Dashboard > Project Settings > API). The service key is required because row level security (RLS) protects all user data tables from anonymous access.

