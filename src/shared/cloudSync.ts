import { listOutbox, loadCloudMetadata, removeOutbox, saveCloudMetadata, type CloudOutboxRecord } from './workspace';

interface CloudConfig {
  url: string;
  publishableKey: string;
}

export interface CloudSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email?: string;
  expiresAt: number;
}

export interface SyncStatus {
  configured: boolean;
  signedIn: boolean;
  email?: string;
  lastSyncAt?: string;
  error?: string;
}

const SESSION_KEY = 'hckr_cloud_session';
const VERIFIER_KEY = 'hckr_cloud_pkce_verifier';

function config(): CloudConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && publishableKey ? { url: url.replace(/\/$/, ''), publishableKey } : null;
}

function base64Url(bytes: Uint8Array): string {
  let string = '';
  bytes.forEach((byte) => { string += String.fromCharCode(byte); });
  return btoa(string).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

async function getSession(): Promise<CloudSession | null> {
  const result = await chrome.storage.local.get(SESSION_KEY);
  return result[SESSION_KEY] as CloudSession | undefined ?? null;
}

async function setSession(session: CloudSession | null): Promise<void> {
  if (session) await chrome.storage.local.set({ [SESSION_KEY]: session });
  else await chrome.storage.local.remove(SESSION_KEY);
  globalThis.dispatchEvent(new CustomEvent('hckr-cloud-sync-changed'));
}

async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const cloud = config();
  const session = await getSession();
  if (!cloud || !session) throw new Error('Cloud Sync is not configured or signed in.');
  return fetch(`${cloud.url}${path}`, {
    ...init,
    headers: { apikey: cloud.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const cloud = config();
  const [session, metadata] = await Promise.all([getSession(), loadCloudMetadata()]);
  return {
    configured: Boolean(cloud), signedIn: Boolean(cloud && session), email: session?.email,
    lastSyncAt: typeof metadata?.lastSyncAt === 'string' ? metadata.lastSyncAt : undefined,
    error: typeof metadata?.error === 'string' ? metadata.error : undefined,
  };
}

export async function signInWithGitHub(): Promise<SyncStatus> {
  const cloud = config();
  if (!cloud) throw new Error('Cloud Sync is not configured in this build.');
  const redirectTo = chrome.identity.getRedirectURL('supabase-auth');
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  await chrome.storage.local.set({ [VERIFIER_KEY]: verifier });
  const authorize = new URL(`${cloud.url}/auth/v1/authorize`);
  authorize.searchParams.set('provider', 'github');
  authorize.searchParams.set('redirect_to', redirectTo);
  authorize.searchParams.set('code_challenge', await sha256(verifier));
  authorize.searchParams.set('code_challenge_method', 'S256');
  const callback = await chrome.identity.launchWebAuthFlow({ url: authorize.toString(), interactive: true });
  if (!callback) throw new Error('GitHub sign-in was cancelled.');
  const code = new URL(callback).searchParams.get('code');
  if (!code) throw new Error('GitHub sign-in did not return an authorization code.');
  const exchange = await fetch(`${cloud.url}/auth/v1/token?grant_type=pkce`, {
    method: 'POST', headers: { apikey: cloud.publishableKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  });
  const payload = await exchange.json() as { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id?: string; email?: string }; error_description?: string };
  await chrome.storage.local.remove(VERIFIER_KEY);
  if (!exchange.ok || !payload.access_token || !payload.refresh_token || !payload.user?.id) throw new Error(payload.error_description ?? 'Could not complete GitHub sign-in.');
  await setSession({ accessToken: payload.access_token, refreshToken: payload.refresh_token, userId: payload.user.id, email: payload.user.email, expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000 });
  await saveCloudMetadata({ lastSyncAt: undefined, error: undefined });
  return getSyncStatus();
}

export async function signOutCloudSync(): Promise<void> {
  try { await authenticatedFetch('/auth/v1/logout', { method: 'POST' }); } catch { /* A local sign-out must still work offline. */ }
  await setSession(null);
  await saveCloudMetadata({});
}

function tableFor(record: CloudOutboxRecord): string {
  return record.entity === 'workspace' ? 'workspaces' : record.entity;
}

const SYNC_DEPENDENCY_ORDER: Record<CloudOutboxRecord['entity'], number> = {
  workspace: 0,
  board_columns: 1,
  board_cards: 2,
  saved_items: 2,
  saved_item_versions: 3,
};

function orderedOutbox(records: CloudOutboxRecord[]): CloudOutboxRecord[] {
  return [...records].sort((left, right) => {
    if (left.operation !== right.operation) return left.operation === 'upsert' ? -1 : 1;
    const leftOrder = SYNC_DEPENDENCY_ORDER[left.entity];
    const rightOrder = SYNC_DEPENDENCY_ORDER[right.entity];
    const dependencyOrder = left.operation === 'delete' ? rightOrder - leftOrder : leftOrder - rightOrder;
    if (dependencyOrder !== 0) return dependencyOrder;
    return left.createdAt.localeCompare(right.createdAt);
  });
}

function toCloudPayload(record: CloudOutboxRecord, ownerId: string): Record<string, unknown> {
  const payload = record.payload;
  const base = { id: payload.id, owner_id: ownerId };
  if (record.entity === 'workspace') return { ...base, name: payload.name, archived: payload.archived, revision: payload.revision, created_at: payload.createdAt, updated_at: payload.updatedAt };
  if (record.entity === 'board_columns') return { ...base, workspace_id: payload.workspaceId, name: payload.name, position: payload.position };
  if (record.entity === 'board_cards') return { ...base, workspace_id: payload.workspaceId, column_id: payload.columnId, title: payload.title, url: payload.url, fav_icon_url: payload.favIconUrl, note: payload.note, tags: payload.tags, position: payload.position, archived: payload.archived, revision: payload.revision, created_at: payload.createdAt, updated_at: payload.updatedAt };
  if (record.entity === 'saved_items') return { ...base, workspace_id: payload.workspaceId, type: payload.type, title: payload.title, content: payload.content, revision: payload.revision, created_at: payload.createdAt, updated_at: payload.updatedAt };
  return { ...base, item_id: payload.itemId, content: payload.content, revision: payload.revision, created_at: payload.createdAt };
}

export async function flushCloudSync(): Promise<SyncStatus> {
  const status = await getSyncStatus();
  if (!status.configured || !status.signedIn) return status;
  const outbox = orderedOutbox(await listOutbox());
  try {
    for (const record of outbox) {
      const table = tableFor(record);
      const id = String(record.payload.id ?? '');
      const session = await getSession();
      const response = record.operation === 'delete'
        ? await authenticatedFetch(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
        : await authenticatedFetch(`/rest/v1/${table}?on_conflict=id`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(toCloudPayload(record, session?.userId ?? '')) });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Sync failed for ${table} (${response.status})${details ? `: ${details}` : '.'}`);
      }
      await removeOutbox(record.id);
    }
    await saveCloudMetadata({ lastSyncAt: new Date().toISOString() });
  } catch (error) {
    await saveCloudMetadata({ error: error instanceof Error ? error.message : 'Sync failed.' });
  }
  return getSyncStatus();
}
