import { applyCloudSnapshot, listOutbox, loadCloudMetadata, removeOutbox, saveCloudMetadata, type CloudOutboxRecord, type CloudWorkspaceSnapshot } from './workspace';

interface CloudConfig {
  url: string;
  publishableKey: string;
}

export interface CloudSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email?: string;
  avatarUrl?: string;
  userName?: string;
  displayName?: string;
  expiresAt: number;
}

export interface SyncStatus {
  configured: boolean;
  signedIn: boolean;
  email?: string;
  avatarUrl?: string;
  userName?: string;
  displayName?: string;
  lastSyncAt?: string;
  error?: string;
}

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'never';
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 0 || diffSec < 45) return 'just now';
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m}m ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h}h ago`;
  }
  if (diffSec < 604800) {
    const d = Math.floor(diffSec / 86400);
    return `${d}d ago`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

let refreshPromise: Promise<CloudSession | null> | null = null;

export async function refreshSession(session?: CloudSession | null): Promise<CloudSession | null> {
  const cloud = config();
  const currentSession = session ?? await getSession();
  if (!cloud || !currentSession?.refreshToken) {
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const exchange = await fetch(`${cloud.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: cloud.publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentSession.refreshToken }),
      });

      const payload = await exchange.json() as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        user?: {
          id?: string;
          email?: string;
          user_metadata?: {
            avatar_url?: string;
            user_name?: string;
            preferred_username?: string;
            full_name?: string;
            name?: string;
          };
        };
        error_description?: string;
        message?: string;
      };

      if (!exchange.ok || !payload.access_token || !payload.refresh_token) {
        const errorText = (payload.error_description || payload.message || '').toLowerCase();
        if (exchange.status === 400 && (errorText.includes('grant') || errorText.includes('token'))) {
          await setSession(null);
          await saveCloudMetadata({ error: 'Session expired. Please sign in again with GitHub.' });
        }
        return null;
      }

      const metadata = payload.user?.user_metadata;
      const avatarUrl = metadata?.avatar_url || currentSession.avatarUrl;
      const userName = metadata?.user_name || metadata?.preferred_username || currentSession.userName;
      const displayName = metadata?.full_name || metadata?.name || userName || payload.user?.email || currentSession.displayName;

      const nextSession: CloudSession = {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        userId: payload.user?.id || currentSession.userId,
        email: payload.user?.email || currentSession.email,
        avatarUrl,
        userName,
        displayName,
        expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
      };

      await setSession(nextSession);
      return nextSession;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const cloud = config();
  let session = await getSession();
  if (!cloud || !session) throw new Error('Cloud Sync is not configured or signed in.');

  if (session.refreshToken && (!session.expiresAt || Date.now() >= session.expiresAt - 60000)) {
    const refreshed = await refreshSession(session);
    if (refreshed) {
      session = refreshed;
    }
  }

  let response = await fetch(`${cloud.url}${path}`, {
    ...init,
    headers: { apikey: cloud.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });

  if (response.status === 401 && session.refreshToken) {
    const refreshed = await refreshSession(session);
    if (refreshed) {
      session = refreshed;
      response = await fetch(`${cloud.url}${path}`, {
        ...init,
        headers: { apikey: cloud.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      });
    }
  }

  return response;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const cloud = config();
  const [session, metadata] = await Promise.all([getSession(), loadCloudMetadata()]);

  return {
    configured: Boolean(cloud),
    signedIn: Boolean(cloud && session),
    email: session?.email,
    avatarUrl: session?.avatarUrl,
    userName: session?.userName,
    displayName: session?.displayName,
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
  const payload = await exchange.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: {
      id?: string;
      email?: string;
      user_metadata?: {
        avatar_url?: string;
        user_name?: string;
        preferred_username?: string;
        full_name?: string;
        name?: string;
      };
    };
    error_description?: string;
  };
  await chrome.storage.local.remove(VERIFIER_KEY);
  if (!exchange.ok || !payload.access_token || !payload.refresh_token || !payload.user?.id) throw new Error(payload.error_description ?? 'Could not complete GitHub sign-in.');
  const metadata = payload.user.user_metadata;
  const avatarUrl = metadata?.avatar_url;
  const userName = metadata?.user_name || metadata?.preferred_username;
  const displayName = metadata?.full_name || metadata?.name || userName || payload.user.email;
  await setSession({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    userId: payload.user.id,
    email: payload.user.email,
    avatarUrl,
    userName,
    displayName,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  });
  await saveCloudMetadata({ lastSyncAt: undefined, error: undefined });
  return requestCloudSync();
}

export async function signOutCloudSync(): Promise<void> {
  try { await authenticatedFetch('/auth/v1/logout', { method: 'POST' }); } catch { /* A local sign-out must still work offline. */ }
  await setSession(null);
  await saveCloudMetadata({});
}

const SYNC_DEPENDENCY_ORDER: Record<CloudOutboxRecord['entity'], number> = {
  workspace: 0,
  board_columns: 1,
  board_cards: 2,
  saved_items: 2,
  saved_item_versions: 3,
  tool_history: 2,
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

function toCloudPayload(record: CloudOutboxRecord): Record<string, unknown> {
  const payload = record.payload;
  const base = { id: payload.id };
  if (record.entity === 'workspace') return { ...base, name: payload.name, key: payload.key, archived: payload.archived, revision: payload.revision, created_at: payload.createdAt, updated_at: payload.updatedAt };
  if (record.entity === 'board_columns') return { ...base, workspace_id: payload.workspaceId, name: payload.name, position: payload.position, revision: payload.revision ?? 1, created_at: payload.createdAt ?? record.createdAt, updated_at: payload.updatedAt ?? record.createdAt };
  if (record.entity === 'board_cards') return { ...base, workspace_id: payload.workspaceId, column_id: payload.columnId, ticket_number: payload.ticketNumber, title: payload.title, url: payload.url, fav_icon_url: payload.favIconUrl, note: payload.note, tags: payload.tags, comments: payload.comments, position: payload.position, archived: payload.archived, revision: payload.revision, created_at: payload.createdAt, updated_at: payload.updatedAt };
  if (record.entity === 'saved_items') return { ...base, workspace_id: payload.workspaceId, type: payload.type, title: payload.title, content: payload.content, revision: payload.revision, created_at: payload.createdAt, updated_at: payload.updatedAt };
  if (record.entity === 'tool_history') return { ...base, tool_id: payload.toolId, tool_title: payload.toolTitle, action: payload.action, input: payload.input, output: payload.output ?? '', options: payload.options ?? {}, summary: payload.summary ?? '', revision: payload.revision ?? 1, created_at: payload.createdAt ?? record.createdAt, updated_at: payload.updatedAt ?? record.createdAt };
  return { ...base, item_id: payload.itemId, content: payload.content, revision: payload.revision, created_at: payload.createdAt };
}

function snapshotFromCloud(payload: unknown): CloudWorkspaceSnapshot {
  const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const array = (key: string): Record<string, unknown>[] => Array.isArray(data[key]) ? data[key] as Record<string, unknown>[] : [];
  return {
    workspaces: array('workspaces').map((row) => ({ id: String(row.id), name: String(row.name), key: typeof row.key === 'string' ? row.key : undefined, archived: Boolean(row.archived), revision: Number(row.revision), createdAt: String(row.created_at), updatedAt: String(row.updated_at) })),
    columns: array('columns').map((row) => ({ id: String(row.id), workspaceId: String(row.workspace_id), name: String(row.name), position: Number(row.position), revision: Number(row.revision), createdAt: String(row.created_at), updatedAt: String(row.updated_at) })),
    cards: array('cards').map((row) => ({ id: String(row.id), workspaceId: String(row.workspace_id), columnId: String(row.column_id), ticketNumber: typeof row.ticket_number === 'number' ? row.ticket_number : undefined, title: String(row.title), url: String(row.url), favIconUrl: String(row.fav_icon_url), note: String(row.note), tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [], comments: Array.isArray(row.comments) ? row.comments as CloudWorkspaceSnapshot['cards'][number]['comments'] : [], position: Number(row.position), archived: Boolean(row.archived), revision: Number(row.revision), createdAt: String(row.created_at), updatedAt: String(row.updated_at) })),
    items: array('items').map((row) => ({ id: String(row.id), workspaceId: String(row.workspace_id), type: String(row.type) as CloudWorkspaceSnapshot['items'][number]['type'], title: String(row.title), content: String(row.content), revision: Number(row.revision), createdAt: String(row.created_at), updatedAt: String(row.updated_at) })),
    versions: array('versions').map((row) => ({ id: String(row.id), itemId: String(row.item_id), content: String(row.content), revision: Number(row.revision), createdAt: String(row.created_at) })),
    tool_history: array('tool_history').map((row) => ({
      id: String(row.id),
      toolId: String(row.tool_id || row.toolId),
      toolTitle: String(row.tool_title || row.toolTitle || ''),
      action: String(row.action),
      input: String(row.input || ''),
      output: typeof row.output === 'string' ? row.output : undefined,
      options: (row.options && typeof row.options === 'object') ? row.options as Record<string, unknown> : undefined,
      summary: typeof row.summary === 'string' ? row.summary : undefined,
      revision: Number(row.revision ?? 1),
      createdAt: String(row.created_at || row.createdAt),
      updatedAt: String(row.updated_at || row.updatedAt || row.created_at || row.createdAt),
    })),
  };
}

function cleanErrorMessage(status: number, responseText: string): string {
  try {
    const parsed = JSON.parse(responseText) as { message?: string; error_description?: string; hint?: string };
    if (parsed.message === 'JWT expired' || parsed.error_description === 'JWT expired') {
      return 'Session expired. Please sign in again with GitHub.';
    }
    if (parsed.message) return parsed.message;
    if (parsed.error_description) return parsed.error_description;
  } catch {
    // responseText is not JSON
  }
  if (status === 401) {
    return 'Authentication expired. Please sign in again with GitHub.';
  }
  return responseText.slice(0, 180);
}

async function pullCloudSnapshot(): Promise<void> {
  const response = await authenticatedFetch('/rest/v1/rpc/hckr_sync_snapshot', { method: 'POST', body: '{}' });
  if (!response.ok) throw new Error(`Could not pull cloud changes: ${cleanErrorMessage(response.status, await response.text())}`);
  await applyCloudSnapshot(snapshotFromCloud(await response.json()));
}

async function uploadOutbox(records: CloudOutboxRecord[]): Promise<void> {
  if (records.length === 0) return;
  const response = await authenticatedFetch('/rest/v1/rpc/hckr_apply_sync_batch', {
    method: 'POST',
    body: JSON.stringify({ p_changes: records.map((record) => ({ entity: record.entity, operation: record.operation, payload: toCloudPayload(record) })) }),
  });
  if (!response.ok) throw new Error(`Could not upload cloud changes: ${cleanErrorMessage(response.status, await response.text())}`);
  await Promise.all(records.map((record) => removeOutbox(record.id)));
}

/** Invoked exclusively by the service worker to serialize manual, sign-in, and alarm syncs. */
export async function flushCloudSync(): Promise<SyncStatus> {
  const status = await getSyncStatus();
  if (!status.configured || !status.signedIn) return status;
  try {
    await pullCloudSnapshot();
    await uploadOutbox(orderedOutbox(await listOutbox()));
    await pullCloudSnapshot();
    await saveCloudMetadata({ lastSyncAt: new Date().toISOString(), error: undefined });
  } catch (error) {
    await saveCloudMetadata({ error: error instanceof Error ? error.message : 'Sync failed.' });
  }
  return getSyncStatus();
}

export async function requestCloudSync(): Promise<SyncStatus> {
  const response = await chrome.runtime.sendMessage({ type: 'FLUSH_CLOUD_SYNC' }) as { success?: boolean; status?: SyncStatus; error?: string };
  if (!response?.success || !response.status) throw new Error(response?.error ?? 'Cloud Sync could not start.');
  return response.status;
}
