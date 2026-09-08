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
