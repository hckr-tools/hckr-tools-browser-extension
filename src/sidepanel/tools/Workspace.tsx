import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  archiveCard, archiveWorkspace, createWorkspace, ensureWorkspace, moveCard, saveCard, saveWorkspaceItem,
  type SavedItemType, type WorkspaceCard, type WorkspaceSnapshot,
} from '../../shared/workspace';
import { tabLocationLabel } from '../../shared/browserTabs';
import { WorkspaceCardDrawer } from '../components/WorkspaceCardDrawer';
import './Workspace.css';

const EMPTY_SNAPSHOT: WorkspaceSnapshot = { workspaces: [], activeWorkspaceId: '', columns: [], cards: [], items: [] };
const ITEM_TYPES: Array<{ value: SavedItemType; label: string }> = [
  { value: 'text', label: 'Text note' },
  { value: 'curl', label: 'cURL snippet' },
];

const WorkspaceTool: React.FC = () => {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(EMPTY_SNAPSHOT);
  const [workspaceName, setWorkspaceName] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemContent, setItemContent] = useState('');
  const [itemType, setItemType] = useState<SavedItemType>('text');
  const [message, setMessage] = useState<string | null>(null);

  // Kanban & Drawer state
  const [activeView, setActiveView] = useState<'board' | 'context'>('board');
  const [selectedCard, setSelectedCard] = useState<WorkspaceCard | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerColumnId, setDrawerColumnId] = useState<string>('');

  // Drag-and-drop state
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await ensureWorkspace();
    setSnapshot(next);
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
    try {
      await work();
      setMessage(null);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Workspace action failed.');
    }
  }, [refresh]);

  const handleNewCard = useCallback((columnId?: string) => {
    setSelectedCard(null);
    setDrawerColumnId(columnId || columns[0]?.id || '');
    setIsDrawerOpen(true);
  }, [columns]);

  const captureCurrentTab = useCallback(() => run(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const firstColumn = columns[0];
    if (!tab?.url || tab.url.startsWith(chrome.runtime.getURL('')) || !firstColumn || !activeWorkspace) {
      throw new Error('Choose a regular browser tab before capturing it.');
    }
    await saveCard({
      workspaceId: activeWorkspace.id,
      columnId: firstColumn.id,
      title: tab.title || tabLocationLabel(tab.url),
      url: tab.url,
      favIconUrl: tab.favIconUrl || '',
      note: '',
      tags: [],
    });
  }), [activeWorkspace, columns, run]);

  const saveManualItem = useCallback(() => run(async () => {
    if (!activeWorkspace) return;
    await saveWorkspaceItem({
      workspaceId: activeWorkspace.id,
      type: itemType,
      title: itemTitle,
      content: itemContent,
    });
    setItemTitle('');
    setItemContent('');
  }), [activeWorkspace, itemContent, itemTitle, itemType, run]);

  const openCard = useCallback(async (card: WorkspaceCard) => {
    if (card.url) await chrome.tabs.create({ url: card.url, active: true });
  }, []);

  return (
    <section className="workspace-tool" aria-labelledby="workspace-heading">
      <header className="workspace-tool-header">
        <div>
          <p className="tool-eyebrow">PRIVATE WORKSPACE</p>
          <h1 id="workspace-heading">{activeWorkspace?.name || 'Workspace'}</h1>
          <p>Only tabs and content you explicitly save appear here.</p>
        </div>
        <div className="workspace-toolbar">
          <div className="workspace-view-tabs" role="tablist">
            <button
              className={`view-tab-btn ${activeView === 'board' ? 'active' : ''}`}
              onClick={() => setActiveView('board')}
              role="tab"
              aria-selected={activeView === 'board'}
            >
              Board
            </button>
            <button
              className={`view-tab-btn ${activeView === 'context' ? 'active' : ''}`}
              onClick={() => setActiveView('context')}
              role="tab"
              aria-selected={activeView === 'context'}
            >
              Saved Context {items.length > 0 && <span className="view-tab-badge">{items.length}</span>}
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => handleNewCard()}
            title="Create new card in Inbox"
          >
            + New card
          </button>
          <button className="btn" onClick={() => void captureCurrentTab()}>
            Capture current tab
          </button>
          <button className="btn" onClick={() => setWorkspaceName('New workspace')}>
            New workspace
          </button>
          {snapshot.workspaces.filter((w) => !w.archived).length > 1 && activeWorkspace && (
            <button
              className="btn"
              onClick={() => void run(() => archiveWorkspace(activeWorkspace))}
              title={`Archive ${activeWorkspace.name}`}
            >
              Archive workspace
            </button>
          )}
        </div>
      </header>

      {workspaceName && (
        <form
          className="workspace-create"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await createWorkspace(workspaceName);
              setWorkspaceName('');
            });
          }}
        >
          <input
            className="input"
            aria-label="Workspace name"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            autoFocus
          />
          <button className="btn btn-primary">Create</button>
          <button className="btn" type="button" onClick={() => setWorkspaceName('')}>
            Cancel
          </button>
        </form>
      )}

      {message && <p className="error-msg" role="alert">{message}</p>}

      {activeView === 'board' ? (
        <div className="workspace-board" aria-label="Kanban board">
          {columns.map((column) => {
            const columnCards = cards.filter((card) => card.columnId === column.id);
            const isColumnOver = dragOverColumnId === column.id;
            return (
              <section
                className={`workspace-column ${isColumnOver ? 'drag-over' : ''}`}
                key={column.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverColumnId(column.id);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                  setDragOverColumnId((prev) => (prev === column.id ? null : prev));
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const card = cards.find((candidate) => candidate.id === dragCardId);
                  if (card) {
                    void run(() => moveCard(card, column.id));
                  }
                  setDragCardId(null);
                  setDragOverColumnId(null);
                  setDragOverCardId(null);
                }}
              >
                <div className="workspace-column-header">
                  <h2>
                    {column.name}
                    <span className="column-count">{columnCards.length}</span>
                  </h2>
                  <button
                    className="column-add-btn"
                    onClick={() => handleNewCard(column.id)}
                    title={`Add card to ${column.name}`}
                    aria-label={`Add card to ${column.name}`}
                  >
                    +
                  </button>
                </div>

                <div className="workspace-cards">
                  {columnCards.map((card) => {
                    const isCardDragging = dragCardId === card.id;
                    const isCardOver = dragOverCardId === card.id;
                    return (
                      <article
                        className={`workspace-card ${isCardDragging ? 'dragging' : ''} ${isCardOver ? 'card-over' : ''}`}
                        key={card.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', card.id);
                          setDragCardId(card.id);
                        }}
                        onDragEnd={() => {
                          setDragCardId(null);
                          setDragOverColumnId(null);
                          setDragOverCardId(null);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setDragOverCardId(card.id);
                        }}
                        onDragLeave={(event) => {
                          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                          setDragOverCardId((prev) => (prev === card.id ? null : prev));
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const droppedCard = cards.find((c) => c.id === dragCardId);
                          if (droppedCard && droppedCard.id !== card.id) {
                            void run(async () => {
                              await saveCard({
                                ...droppedCard,
                                id: droppedCard.id,
                                columnId: column.id,
                                position: card.position - 512,
                              });
                            });
                          }
                          setDragCardId(null);
                          setDragOverColumnId(null);
                          setDragOverCardId(null);
                        }}
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest('button, a')) return;
                          setSelectedCard(card);
                          setIsDrawerOpen(true);
                        }}
                      >
                        <div className="workspace-card-title">
                          {card.favIconUrl && (
                            <img
                              src={card.favIconUrl}
                              alt=""
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <button
                            className="workspace-card-title-btn"
                            onClick={() => {
                              setSelectedCard(card);
                              setIsDrawerOpen(true);
                            }}
                            title="Click to view and edit details"
                          >
                            {card.title}
                          </button>
                        </div>

                        {card.url && (
                          <div className="workspace-card-url-row">
                            <span className="workspace-card-url">{tabLocationLabel(card.url)}</span>
                            <button
                              className="card-open-link-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openCard(card);
                              }}
                              title={`Open ${card.url}`}
                              aria-label="Open URL in new tab"
                            >
                              ↗
                            </button>
                          </div>
                        )}

                        {card.note && <p className="workspace-card-note">{card.note}</p>}

                        {card.tags.length > 0 && (
                          <div className="workspace-tags">
                            {card.tags.map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        )}

                        {card.comments && card.comments.length > 0 && (
                          <div className="workspace-card-comment-indicator" title={`${card.comments.length} comment${card.comments.length === 1 ? '' : 's'}`}>
                            💬 {card.comments.length}
                          </div>
                        )}

                        <div className="workspace-card-actions">
                          <button
                            className="btn btn-sm"
                            disabled={columns.findIndex((candidate) => candidate.id === column.id) === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              const previous = columns[columns.findIndex((candidate) => candidate.id === column.id) - 1];
                              if (previous) void run(() => moveCard(card, previous.id));
                            }}
                            title="Move left"
                          >
                            ←
                          </button>
                          <button
                            className="btn btn-sm"
                            disabled={columns.findIndex((candidate) => candidate.id === column.id) === columns.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = columns[columns.findIndex((candidate) => candidate.id === column.id) + 1];
                              if (next) void run(() => moveCard(card, next.id));
                            }}
                            title="Move right"
                          >
                            →
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              void run(() => archiveCard(card));
                            }}
                            title="Archive card"
                            aria-label="Archive card"
                          >
                            Archive
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="section workspace-saved-context-view">
          <div className="context-view-header">
            <h2>Saved Context</h2>
            <p className="context-desc">Notes and code snippets saved explicitly across developer tools.</p>
          </div>
          <div className="workspace-item-form">
            <select
              className="input"
              value={itemType}
              onChange={(event) => setItemType(event.target.value as SavedItemType)}
            >
              {ITEM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Snippet title"
              value={itemTitle}
              onChange={(event) => setItemTitle(event.target.value)}
            />
            <textarea
              className="textarea"
              placeholder="Only explicitly saved content can sync."
              value={itemContent}
              onChange={(event) => setItemContent(event.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={() => void saveManualItem()}
              disabled={!itemContent}
            >
              Save context
            </button>
          </div>

          <div className="workspace-items">
            {items.map((item) => (
              <details key={item.id} open>
                <summary>
                  {item.title} <span>{item.type}</span>
                </summary>
                <pre>{item.content}</pre>
              </details>
            ))}
            {items.length === 0 && <p className="workspace-empty">No saved snippets yet.</p>}
          </div>
        </section>
      )}

      {/* Jira-style Card Detail Drawer */}
      <WorkspaceCardDrawer
        card={selectedCard}
        initialColumnId={drawerColumnId}
        columns={columns}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedCard(null);
        }}
        onSave={async (data) => {
          if (!activeWorkspace) return;
          const updated = await saveCard({
            id: data.id,
            workspaceId: activeWorkspace.id,
            columnId: data.columnId,
            title: data.title,
            url: data.url,
            favIconUrl: data.favIconUrl || '',
            note: data.note,
            tags: data.tags,
            comments: data.comments,
          });
          setSelectedCard(updated);
          await refresh();
        }}
        onArchive={async (card) => {
          await archiveCard(card);
          await refresh();
        }}
      />
    </section>
  );
};

export default WorkspaceTool;
