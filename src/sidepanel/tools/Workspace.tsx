import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flushCloudSync, getSyncStatus, signInWithGoogle, signOutCloudSync, type SyncStatus } from '../../shared/cloudSync';
import {
  archiveCard, archiveWorkspace, createWorkspace, ensureWorkspace, moveCard, saveCard, saveWorkspaceItem,
  setActiveWorkspace, type SavedItemType, type WorkspaceCard, type WorkspaceSnapshot,
} from '../../shared/workspace';
import { tabLocationLabel } from '../../shared/browserTabs';
import './Workspace.css';

const EMPTY_SNAPSHOT: WorkspaceSnapshot = { workspaces: [], activeWorkspaceId: '', columns: [], cards: [], items: [] };
const ITEM_TYPES: Array<{ value: SavedItemType; label: string }> = [{ value: 'text', label: 'Text note' }, { value: 'curl', label: 'cURL snippet' }];

function tags(value: string): string[] { return value.split(',').map((tag) => tag.trim()).filter(Boolean); }

const WorkspaceTool: React.FC = () => {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(EMPTY_SNAPSHOT);
  const [cloud, setCloud] = useState<SyncStatus>({ configured: false, signedIn: false });
  const [workspaceName, setWorkspaceName] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardUrl, setCardUrl] = useState('');
  const [cardNote, setCardNote] = useState('');
  const [cardTags, setCardTags] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemContent, setItemContent] = useState('');
  const [itemType, setItemType] = useState<SavedItemType>('text');
  const [message, setMessage] = useState<string | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [next, nextCloud] = await Promise.all([ensureWorkspace(), getSyncStatus()]);
    setSnapshot(next);
    setCloud(nextCloud);
  }, []);

  useEffect(() => {
    void refresh();
    const listener = () => { void refresh(); };
    globalThis.addEventListener('hckr-workspace-changed', listener);
    return () => globalThis.removeEventListener('hckr-workspace-changed', listener);
  }, [refresh]);

  const activeWorkspace = snapshot.workspaces.find((workspace) => workspace.id === snapshot.activeWorkspaceId);
  const columns = useMemo(() => snapshot.columns.filter((column) => column.workspaceId === snapshot.activeWorkspaceId).sort((a, b) => a.position - b.position), [snapshot]);
  const cards = useMemo(() => snapshot.cards.filter((card) => card.workspaceId === snapshot.activeWorkspaceId && !card.archived).sort((a, b) => a.position - b.position), [snapshot]);
  const items = useMemo(() => snapshot.items.filter((item) => item.workspaceId === snapshot.activeWorkspaceId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [snapshot]);

  const run = useCallback(async (work: () => Promise<void>) => {
    try { await work(); setMessage(null); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Workspace action failed.'); }
  }, [refresh]);

  const createCard = useCallback(() => run(async () => {
    const firstColumn = columns[0];
    if (!firstColumn || !activeWorkspace) return;
    await saveCard({ workspaceId: activeWorkspace.id, columnId: firstColumn.id, title: cardTitle, url: cardUrl, favIconUrl: '', note: cardNote, tags: tags(cardTags) });
    setCardTitle(''); setCardUrl(''); setCardNote(''); setCardTags('');
  }), [activeWorkspace, cardNote, cardTags, cardTitle, cardUrl, columns, run]);

  const captureCurrentTab = useCallback(() => run(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const firstColumn = columns[0];
    if (!tab?.url || tab.url.startsWith(chrome.runtime.getURL('')) || !firstColumn || !activeWorkspace) throw new Error('Choose a regular browser tab before capturing it.');
    await saveCard({ workspaceId: activeWorkspace.id, columnId: firstColumn.id, title: tab.title || tabLocationLabel(tab.url), url: tab.url, favIconUrl: tab.favIconUrl || '', note: '', tags: [] });
  }), [activeWorkspace, columns, run]);

  const saveManualItem = useCallback(() => run(async () => {
    if (!activeWorkspace) return;
    await saveWorkspaceItem({ workspaceId: activeWorkspace.id, type: itemType, title: itemTitle, content: itemContent });
    setItemTitle(''); setItemContent('');
  }), [activeWorkspace, itemContent, itemTitle, itemType, run]);

  const openCard = useCallback(async (card: WorkspaceCard) => {
    if (card.url) await chrome.tabs.create({ url: card.url, active: true });
  }, []);

  return (
    <section className="workspace-tool" aria-labelledby="workspace-heading">
      <header className="workspace-tool-header">
        <div><p className="tool-eyebrow">PRIVATE WORKSPACE</p><h1 id="workspace-heading">Keep an investigation together</h1><p>Only tabs and content you explicitly save appear here.</p></div>
        <div className="workspace-toolbar"><button className="btn" onClick={() => void captureCurrentTab()}>Capture current tab</button><button className="btn btn-primary" onClick={() => setWorkspaceName('New workspace')}>New workspace</button></div>
      </header>

      {workspaceName && <form className="workspace-create" onSubmit={(event) => { event.preventDefault(); void run(async () => { await createWorkspace(workspaceName); setWorkspaceName(''); }); }}><input className="input" aria-label="Workspace name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} autoFocus /><button className="btn btn-primary">Create</button><button className="btn" type="button" onClick={() => setWorkspaceName('')}>Cancel</button></form>}
      {message && <p className="error-msg" role="alert">{message}</p>}

      <div className="workspace-select-row">
        <label className="label" htmlFor="workspace-select">Workspace</label>
        <select id="workspace-select" className="input" value={snapshot.activeWorkspaceId} onChange={(event) => void run(() => setActiveWorkspace(event.target.value))}>
          {snapshot.workspaces.filter((workspace) => !workspace.archived).map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
        </select>
        {activeWorkspace && <button className="btn btn-sm" onClick={() => void run(() => archiveWorkspace(activeWorkspace))}>Archive workspace</button>}
      </div>

      <div className="workspace-board" aria-label="Kanban board">
        {columns.map((column) => <section className="workspace-column" key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { const card = cards.find((candidate) => candidate.id === dragCardId); if (card) void run(() => moveCard(card, column.id)); setDragCardId(null); }}>
          <h2>{column.name}<span>{cards.filter((card) => card.columnId === column.id).length}</span></h2>
          <div className="workspace-cards">
            {cards.filter((card) => card.columnId === column.id).map((card) => <article className="workspace-card" key={card.id} draggable onDragStart={() => setDragCardId(card.id)}>
              <div className="workspace-card-title"><img src={card.favIconUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /><button onClick={() => void openCard(card)} title={card.url || card.title}>{card.title}</button></div>
              {card.url && <p>{tabLocationLabel(card.url)}</p>}
              {card.note && <p className="workspace-card-note">{card.note}</p>}
              {card.tags.length > 0 && <div className="workspace-tags">{card.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
              <div className="workspace-card-actions"><button className="btn btn-sm" disabled={columns.findIndex((candidate) => candidate.id === column.id) === 0} onClick={() => { const previous = columns[columns.findIndex((candidate) => candidate.id === column.id) - 1]; if (previous) void run(() => moveCard(card, previous.id)); }}>←</button><button className="btn btn-sm" disabled={columns.findIndex((candidate) => candidate.id === column.id) === columns.length - 1} onClick={() => { const next = columns[columns.findIndex((candidate) => candidate.id === column.id) + 1]; if (next) void run(() => moveCard(card, next.id)); }}>→</button><button className="btn btn-sm" onClick={() => void run(() => archiveCard(card))}>Archive</button></div>
            </article>)}
          </div>
        </section>)}
      </div>

      <div className="workspace-bottom-grid">
        <section className="section"><h2>Add a card</h2><input className="input" placeholder="Title" value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} /><input className="input" placeholder="URL (optional)" value={cardUrl} onChange={(event) => setCardUrl(event.target.value)} /><textarea className="textarea" placeholder="Why does this matter?" value={cardNote} onChange={(event) => setCardNote(event.target.value)} /><input className="input" placeholder="Tags, comma separated" value={cardTags} onChange={(event) => setCardTags(event.target.value)} /><button className="btn btn-primary" onClick={() => void createCard()}>Add to Inbox</button></section>
        <section className="section"><h2>Saved context</h2><div className="workspace-item-form"><select className="input" value={itemType} onChange={(event) => setItemType(event.target.value as SavedItemType)}>{ITEM_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><input className="input" placeholder="Snippet title" value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} /><textarea className="textarea" placeholder="Only explicitly saved content can sync." value={itemContent} onChange={(event) => setItemContent(event.target.value)} /><button className="btn btn-primary" onClick={() => void saveManualItem()} disabled={!itemContent}>Save context</button></div><div className="workspace-items">{items.map((item) => <details key={item.id}><summary>{item.title} <span>{item.type}</span></summary><pre>{item.content}</pre></details>)}{items.length === 0 && <p className="workspace-empty">No saved snippets yet.</p>}</div></section>
      </div>

      <section className="workspace-sync section" aria-label="Cloud Sync"><div><h2>Cloud Sync</h2><p>{cloud.configured ? (cloud.signedIn ? `Signed in${cloud.email ? ` as ${cloud.email}` : ''}. Only explicit workspace content is synced.` : 'Optional private backup and cross-device sync.') : 'Cloud Sync is not configured in this build. Local workspaces remain fully available.'}</p>{cloud.lastSyncAt && <p>Last synced {new Date(cloud.lastSyncAt).toLocaleString()}</p>}{cloud.error && <p className="error-msg">{cloud.error}</p>}</div><div className="workspace-toolbar">{cloud.signedIn ? <><button className="btn" onClick={() => void run(async () => { await flushCloudSync(); })}>Sync now</button><button className="btn" onClick={() => void run(signOutCloudSync)}>Sign out</button></> : <button className="btn btn-primary" disabled={!cloud.configured} onClick={() => void run(async () => { await signInWithGoogle(); })}>Sign in with Google</button>}</div></section>
    </section>
  );
};

export default WorkspaceTool;
