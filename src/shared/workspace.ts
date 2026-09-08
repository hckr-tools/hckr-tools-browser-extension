export const MAX_SAVED_ITEM_CHARS = 250_000;
export const MAX_ITEM_VERSIONS = 20;

export type SavedItemType = 'json' | 'regex' | 'diff' | 'markdown' | 'text' | 'curl';

export interface Workspace {
  id: string;
  name: string;
  key?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface WorkspaceColumn {
  id: string;
  workspaceId: string;
  name: string;
  position: number;
}

export interface CardComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface WorkspaceCard {
  id: string;
  workspaceId: string;
  columnId: string;
  ticketNumber?: number;
  title: string;
  url: string;
  favIconUrl: string;
  note: string;
  tags: string[];
  comments?: CardComment[];
  position: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface SavedItem {
  id: string;
  workspaceId: string;
  type: SavedItemType;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface SavedItemVersion {
  id: string;
  itemId: string;
  content: string;
  createdAt: string;
  revision: number;
}

export interface WorkspaceSnapshot {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  columns: WorkspaceColumn[];
  cards: WorkspaceCard[];
  items: SavedItem[];
}

export interface CloudOutboxRecord {
  id: string;
  entity: 'workspace' | 'board_columns' | 'board_cards' | 'saved_items' | 'saved_item_versions';
  operation: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  createdAt: string;
}

type StoreName = 'workspaces' | 'columns' | 'cards' | 'items' | 'versions' | 'outbox' | 'settings';
const DB_NAME = 'hckr-workspaces-v1';
const DB_VERSION = 1;
const DEFAULT_COLUMNS = ['Inbox', 'Working', 'Review', 'Done'];

function now(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error('Workspace storage request failed'));
  });
}

function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Workspace storage transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Workspace storage transaction aborted'));
  });
}

let databasePromise: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  databasePromise ??= new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      for (const store of ['workspaces', 'columns', 'cards', 'items', 'versions', 'outbox', 'settings'] as StoreName[]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('Could not open workspace storage'));
  });
  return databasePromise;
}

async function values<T>(store: StoreName): Promise<T[]> {
  const db = await database();
  const transaction = db.transaction(store, 'readonly');
  const result = await request(transaction.objectStore(store).getAll() as IDBRequest<T[]>);
  await complete(transaction);
  return result;
}

async function put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
  const db = await database();
  const transaction = db.transaction(store, 'readwrite');
  transaction.objectStore(store).put(value);
  await complete(transaction);
}

async function remove(store: StoreName, key: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction(store, 'readwrite');
  transaction.objectStore(store).delete(key);
  await complete(transaction);
}

async function setting<T>(key: string): Promise<T | null> {
  const db = await database();
  const transaction = db.transaction('settings', 'readonly');
  const record = await request(transaction.objectStore('settings').get(key) as IDBRequest<{ id: string; value: T } | undefined>);
  await complete(transaction);
  return record?.value ?? null;
}

async function saveSetting<T>(key: string, value: T): Promise<void> {
  await put('settings', { id: key, value });
}

async function enqueue(entity: CloudOutboxRecord['entity'], operation: CloudOutboxRecord['operation'], payload: Record<string, unknown>): Promise<void> {
  await put('outbox', { id: id('outbox'), entity, operation, payload, createdAt: now() });
  globalThis.dispatchEvent(new CustomEvent('hckr-workspace-changed'));
  void chrome.runtime.sendMessage({ type: 'FLUSH_CLOUD_SYNC' }).catch(() => undefined);
}

export function generateWorkspaceKey(name: string): string {
  const words = name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'WS';

  if (words.length >= 2) {
    const initials = words.map((w) => w[0]?.toUpperCase()).join('').slice(0, 4);
    if (initials.length >= 2) return initials;
  }

  const single = words[0].toUpperCase();
  if (single.length <= 4) return single;

  // Single word: e.g. "BACKEND" -> strip vowels except first letter -> "BCKD"
  const stripped = single[0] + single.slice(1).replace(/[AEIOU]/g, '');
  if (stripped.length >= 3) {
    return stripped.slice(0, 4);
  }
  return single.slice(0, 4);
}

export function getCardTicketKey(workspace: Workspace | undefined, card: WorkspaceCard): string {
  const key = (workspace?.key || generateWorkspaceKey(workspace?.name || 'HCKR')).toUpperCase();
  return `${key}-${card.ticketNumber ?? 1}`;
}

export async function ensureWorkspace(): Promise<WorkspaceSnapshot> {
  const all = await values<Workspace>('workspaces');
  if (all.length === 0) {
    const createdAt = now();
    const workspace: Workspace = {
      id: id('workspace'),
      name: 'My workspace',
      key: 'HCKR',
      archived: false,
      createdAt,
      updatedAt: createdAt,
      revision: 1,
    };
    const db = await database();
    const transaction = db.transaction(['workspaces', 'columns', 'settings'], 'readwrite');
    transaction.objectStore('workspaces').put(workspace);
    DEFAULT_COLUMNS.forEach((name, position) => transaction.objectStore('columns').put({ id: id('column'), workspaceId: workspace.id, name, position } satisfies WorkspaceColumn));
    transaction.objectStore('settings').put({ id: 'active-workspace', value: workspace.id });
    await complete(transaction);
    await enqueue('workspace', 'upsert', workspace as unknown as Record<string, unknown>);
    const createdColumns = (await values<WorkspaceColumn>('columns')).filter((column) => column.workspaceId === workspace.id);
    await Promise.all(createdColumns.map((column) => enqueue('board_columns', 'upsert', column as unknown as Record<string, unknown>)));
  }
  return loadWorkspaceSnapshot();
}

export async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const [workspaces, columns, cards, items, activeId] = await Promise.all([
    values<Workspace>('workspaces'), values<WorkspaceColumn>('columns'), values<WorkspaceCard>('cards'), values<SavedItem>('items'), setting<string>('active-workspace'),
  ]);
  const activeWorkspaceId = activeId && workspaces.some((workspace) => workspace.id === activeId)
    ? activeId
    : workspaces.find((workspace) => !workspace.archived)?.id ?? workspaces[0]?.id ?? '';

  // Backfill ticketNumber on cards in memory if missing (for legacy or upgraded cards)
  const cardsByWorkspace = new Map<string, WorkspaceCard[]>();
  for (const card of cards) {
    const list = cardsByWorkspace.get(card.workspaceId) ?? [];
    list.push(card);
    cardsByWorkspace.set(card.workspaceId, list);
  }
  for (const [, wsCards] of cardsByWorkspace) {
    wsCards.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let nextNum = 1;
    for (const card of wsCards) {
      if (!card.ticketNumber) {
        card.ticketNumber = nextNum;
      }
      nextNum = Math.max(nextNum, card.ticketNumber) + 1;
    }
  }

  return { workspaces: [...workspaces].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)), activeWorkspaceId, columns, cards, items };
}

export async function setActiveWorkspace(workspaceId: string): Promise<void> {
  await saveSetting('active-workspace', workspaceId);
  globalThis.dispatchEvent(new CustomEvent('hckr-workspace-changed'));
}

export async function createWorkspace(name: string, key?: string): Promise<Workspace> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Workspace name is required');
  const assignedKey = (key?.trim() || generateWorkspaceKey(trimmed)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'WS';
  const createdAt = now();
  const workspace: Workspace = {
    id: id('workspace'),
    name: trimmed.slice(0, 100),
    key: assignedKey,
    archived: false,
    createdAt,
    updatedAt: createdAt,
    revision: 1,
  };
  const db = await database();
  const transaction = db.transaction(['workspaces', 'columns', 'settings'], 'readwrite');
  transaction.objectStore('workspaces').put(workspace);
  DEFAULT_COLUMNS.forEach((columnName, position) => transaction.objectStore('columns').put({ id: id('column'), workspaceId: workspace.id, name: columnName, position } satisfies WorkspaceColumn));
  transaction.objectStore('settings').put({ id: 'active-workspace', value: workspace.id });
  await complete(transaction);
  await enqueue('workspace', 'upsert', workspace as unknown as Record<string, unknown>);
  const createdColumns = (await values<WorkspaceColumn>('columns')).filter((column) => column.workspaceId === workspace.id);
  await Promise.all(createdColumns.map((column) => enqueue('board_columns', 'upsert', column as unknown as Record<string, unknown>)));
  return workspace;
}

export async function archiveWorkspace(workspace: Workspace): Promise<void> {
  const activeWorkspaces = (await values<Workspace>('workspaces')).filter((candidate) => !candidate.archived);
  if (activeWorkspaces.length <= 1) throw new Error('Create another workspace before archiving this one.');
  const next = { ...workspace, archived: true, updatedAt: now(), revision: workspace.revision + 1 };
  await put('workspaces', next);
  const nextActive = activeWorkspaces.find((candidate) => candidate.id !== workspace.id);
  if (nextActive) await saveSetting('active-workspace', nextActive.id);
  await enqueue('workspace', 'upsert', next as unknown as Record<string, unknown>);
}

export async function updateWorkspace(workspaceId: string, updates: { name?: string; key?: string }): Promise<Workspace> {
  const all = await values<Workspace>('workspaces');
  const target = all.find((candidate) => candidate.id === workspaceId);
  if (!target) throw new Error('Workspace not found');
  const trimmedName = updates.name !== undefined ? updates.name.trim().slice(0, 100) : target.name;
  if (!trimmedName) throw new Error('Workspace name cannot be empty');
  const trimmedKey = updates.key !== undefined
    ? updates.key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || generateWorkspaceKey(trimmedName)
    : (target.key || generateWorkspaceKey(trimmedName));

  const next: Workspace = {
    ...target,
    name: trimmedName,
    key: trimmedKey,
    updatedAt: now(),
    revision: target.revision + 1,
  };
  await put('workspaces', next);
  await enqueue('workspace', 'upsert', next as unknown as Record<string, unknown>);
  return next;
}

export async function saveCard(input: Omit<WorkspaceCard, 'id' | 'createdAt' | 'updatedAt' | 'revision' | 'position' | 'archived'> & Partial<Pick<WorkspaceCard, 'id' | 'position' | 'archived' | 'ticketNumber'>>): Promise<WorkspaceCard> {
  const existing = input.id ? (await values<WorkspaceCard>('cards')).find((card) => card.id === input.id) : undefined;
  const cards = await values<WorkspaceCard>('cards');
  const createdAt = existing?.createdAt ?? now();

  // Assign auto-incrementing ticketNumber if missing
  let ticketNumber = existing?.ticketNumber ?? input.ticketNumber;
  if (!ticketNumber) {
    const workspaceCards = cards.filter((c) => c.workspaceId === input.workspaceId);
    const maxNum = workspaceCards.reduce((max, c) => Math.max(max, c.ticketNumber ?? 0), 0);
    ticketNumber = maxNum + 1;
  }

  const card: WorkspaceCard = {
    id: existing?.id ?? id('card'), workspaceId: input.workspaceId, columnId: input.columnId,
    ticketNumber,
    title: input.title.trim().slice(0, 240) || 'Untitled card', url: input.url.trim(), favIconUrl: input.favIconUrl,
    note: input.note.slice(0, MAX_SAVED_ITEM_CHARS), tags: input.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
    comments: input.comments ?? existing?.comments ?? [],
    position: input.position ?? (Math.max(-1024, ...cards.filter((candidate) => candidate.columnId === input.columnId).map((candidate) => candidate.position)) + 1024),
    archived: input.archived ?? false, createdAt, updatedAt: now(), revision: (existing?.revision ?? 0) + 1,
  };
  await put('cards', card);
  await enqueue('board_cards', 'upsert', card as unknown as Record<string, unknown>);
  return card;
}

export async function moveCard(card: WorkspaceCard, columnId: string): Promise<void> {
  await saveCard({ ...card, columnId, id: card.id, position: undefined });
}

export async function archiveCard(card: WorkspaceCard): Promise<void> {
  await saveCard({ ...card, id: card.id, archived: true });
}

export async function saveWorkspaceItem(input: { workspaceId?: string; type: SavedItemType; title: string; content: string }): Promise<SavedItem> {
  if (input.content.length > MAX_SAVED_ITEM_CHARS) throw new Error(`Saved items are limited to ${MAX_SAVED_ITEM_CHARS.toLocaleString()} characters.`);
  const snapshot = await ensureWorkspace();
  const workspaceId = input.workspaceId ?? snapshot.activeWorkspaceId;
  const timestamp = now();
  const item: SavedItem = { id: id('item'), workspaceId, type: input.type, title: input.title.trim().slice(0, 240) || `${input.type} snippet`, content: input.content, createdAt: timestamp, updatedAt: timestamp, revision: 1 };
  await put('items', item);
  const version: SavedItemVersion = { id: id('version'), itemId: item.id, content: item.content, createdAt: timestamp, revision: 1 };
  await put('versions', version);
  await enqueue('saved_items', 'upsert', item as unknown as Record<string, unknown>);
  await enqueue('saved_item_versions', 'upsert', version as unknown as Record<string, unknown>);
  return item;
}

export async function listOutbox(): Promise<CloudOutboxRecord[]> { return values<CloudOutboxRecord>('outbox'); }
export async function removeOutbox(id: string): Promise<void> { await remove('outbox', id); }
export async function saveCloudMetadata(value: Record<string, unknown>): Promise<void> { await saveSetting('cloud-sync', value); }
export async function loadCloudMetadata(): Promise<Record<string, unknown> | null> { return setting<Record<string, unknown>>('cloud-sync'); }
