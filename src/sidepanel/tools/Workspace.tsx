import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  archiveCard, archiveWorkspace, createWorkspace, ensureWorkspace, generateWorkspaceKey, getCardTicketKey, moveCard, saveCard, saveWorkspaceItem,
  addColumn, renameColumn, deleteColumn, reorderColumns,
  type SavedItemType, type WorkspaceCard, type WorkspaceSnapshot, type WorkspaceColumn
} from '../../shared/workspace';
import { tabLocationLabel } from '../../shared/browserTabs';
import { WorkspaceCardDrawer } from '../components/WorkspaceCardDrawer';
import { WorkspaceSettingsModal } from '../components/WorkspaceSettingsModal';
import {
  getPriorityDef, getLabelDef, getDueStatus, formatDueDate, checklistProgress,
  type CardPriority, type CardLabel
} from '../../shared/cardLabels';
import './Workspace.css';

const EMPTY_SNAPSHOT: WorkspaceSnapshot = { workspaces: [], activeWorkspaceId: '', columns: [], cards: [], items: [] };
const ITEM_TYPES: Array<{ value: SavedItemType; label: string }> = [
  { value: 'text', label: 'Text note' },
  { value: 'curl', label: 'cURL snippet' },
];

const WorkspaceTool: React.FC = () => {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(EMPTY_SNAPSHOT);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceKey, setWorkspaceKey] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemContent, setItemContent] = useState('');
  const [itemType, setItemType] = useState<SavedItemType>('text');
  const [message, setMessage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Kanban & Drawer state
  const [activeView, setActiveView] = useState<'board' | 'context'>('board');
  const [selectedCard, setSelectedCard] = useState<WorkspaceCard | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerColumnId, setDrawerColumnId] = useState<string>('');

  // Drag-and-drop state
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<CardPriority | 'none' | ''>('');
  const [filterLabel, setFilterLabel] = useState<CardLabel | 'none' | ''>('');
  const [filterDue, setFilterDue] = useState<'overdue' | 'today' | 'this-week' | 'none' | ''>('');

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Column management state
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');

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

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!card.title.toLowerCase().includes(q) && !card.note.toLowerCase().includes(q) && !card.tags.some(t => t.toLowerCase().includes(q))) {
          return false;
        }
      }
      if (filterPriority) {
        if (filterPriority === 'none' && card.priority) return false;
        if (filterPriority !== 'none' && card.priority !== filterPriority) return false;
      }
      if (filterLabel) {
        if (filterLabel === 'none' && card.label) return false;
        if (filterLabel !== 'none' && card.label !== filterLabel) return false;
      }
      if (filterDue) {
        if (filterDue === 'none' && card.dueDate) return false;
        if (filterDue !== 'none' && getDueStatus(card.dueDate) !== filterDue) return false;
      }
      return true;
    });
  }, [cards, searchQuery, filterPriority, filterLabel, filterDue]);

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

  // Column Actions
  const handleAddColumn = () => run(async () => {
    if (!activeWorkspace || !newColumnName.trim()) return;
    await addColumn(activeWorkspace.id, newColumnName);
    setAddingColumn(false);
    setNewColumnName('');
  });

  const handleRenameColumn = (column: WorkspaceColumn) => run(async () => {
    if (editingColumnName.trim() && editingColumnName !== column.name) {
      await renameColumn(column, editingColumnName);
    }
    setEditingColumnId(null);
  });

  const handleDeleteColumn = (column: WorkspaceColumn) => {
    if (confirm(`Delete column "${column.name}"?`)) {
      void run(() => deleteColumn(column));
    }
  };

  const handleReorderColumn = (columnId: string, direction: 'left' | 'right') => run(async () => {
    if (!activeWorkspace) return;
    const idx = columns.findIndex(c => c.id === columnId);
    if (direction === 'left' && idx > 0) {
      const colIds = columns.map(c => c.id);
      [colIds[idx - 1], colIds[idx]] = [colIds[idx], colIds[idx - 1]];
      await reorderColumns(activeWorkspace.id, colIds);
    } else if (direction === 'right' && idx < columns.length - 1) {
      const colIds = columns.map(c => c.id);
      [colIds[idx], colIds[idx + 1]] = [colIds[idx + 1], colIds[idx]];
      await reorderColumns(activeWorkspace.id, colIds);
    }
  });

  // Bulk Actions
  const handleBulkMove = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const colId = e.target.value;
    if (!colId) return;
    void run(async () => {
      for (const id of selectedCardIds) {
        const card = cards.find(c => c.id === id);
        if (card) await moveCard(card, colId);
      }
      setSelectedCardIds(new Set());
      setSelectMode(false);
    });
  };

  const handleBulkLabel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const label = e.target.value as CardLabel | 'none' | '';
    if (!label) return;
    void run(async () => {
      for (const id of selectedCardIds) {
        const card = cards.find(c => c.id === id);
        if (card) {
          const newLabel = label === 'none' ? undefined : label as CardLabel;
          await saveCard({ ...card, label: newLabel });
        }
      }
      setSelectedCardIds(new Set());
      setSelectMode(false);
    });
  };

  const handleBulkPriority = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const priority = e.target.value as CardPriority | 'none' | '';
    if (!priority) return;
    void run(async () => {
      for (const id of selectedCardIds) {
        const card = cards.find(c => c.id === id);
        if (card) {
          const newPriority = priority === 'none' ? undefined : priority as CardPriority;
          await saveCard({ ...card, priority: newPriority });
        }
      }
      setSelectedCardIds(new Set());
      setSelectMode(false);
    });
  };

  const handleBulkArchive = () => {
    if (!confirm(`Archive ${selectedCardIds.size} cards?`)) return;
    void run(async () => {
      for (const id of selectedCardIds) {
        const card = cards.find(c => c.id === id);
        if (card) await archiveCard(card);
      }
      setSelectedCardIds(new Set());
      setSelectMode(false);
    });
  };

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
            className={`btn ${selectMode ? 'btn-primary' : ''}`}
            onClick={() => {
              setSelectMode(!selectMode);
              if (selectMode) setSelectedCardIds(new Set());
            }}
          >
            {selectMode ? 'Cancel Select' : 'Select'}
          </button>
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
          <button className="btn" onClick={() => { setWorkspaceName('New workspace'); setWorkspaceKey('NW'); }}>
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
          {snapshot.workspaces.filter((w) => w.archived).length > 0 && (
            <button
              className="btn btn-archived-workspaces"
              onClick={() => setSettingsOpen(true)}
              title="View and restore archived workspaces"
            >
              📦 Archived ({snapshot.workspaces.filter((w) => w.archived).length})
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
              const generatedKey = workspaceKey.trim() || generateWorkspaceKey(workspaceName);
              await createWorkspace(workspaceName, generatedKey.toUpperCase());
              setWorkspaceName('');
              setWorkspaceKey('');
            });
          }}
        >
          <input
            className="input"
            aria-label="Workspace name"
            placeholder="Workspace name (e.g. Backend Services)"
            value={workspaceName}
            onChange={(event) => {
              const val = event.target.value;
              setWorkspaceName(val);
              if (!workspaceKey || workspaceKey === generateWorkspaceKey(workspaceName)) {
                setWorkspaceKey(generateWorkspaceKey(val));
              }
            }}
            autoFocus
          />
          <input
            className="input workspace-key-input"
            aria-label="Workspace key"
            placeholder="Key (e.g. BCKD)"
            value={workspaceKey}
            maxLength={8}
            style={{ width: '100px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
            onChange={(event) => setWorkspaceKey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          />
          <button className="btn btn-primary">Create</button>
          <button className="btn" type="button" onClick={() => { setWorkspaceName(''); setWorkspaceKey(''); }}>
            Cancel
          </button>
        </form>
      )}

      {message && <p className="error-msg" role="alert">{message}</p>}

      {activeView === 'board' && (
        <div className="workspace-filter-bar">
          <input
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)}>
            <option value="">All Priorities</option>
            <option value="p0">P0</option>
            <option value="p1">P1</option>
            <option value="p2">P2</option>
            <option value="p3">P3</option>
            <option value="none">No priority</option>
          </select>
          <select value={filterLabel} onChange={(e) => setFilterLabel(e.target.value as any)}>
            <option value="">All Labels</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="tech-debt">Tech Debt</option>
            <option value="research">Research</option>
            <option value="improvement">Improvement</option>
            <option value="blocked">Blocked</option>
            <option value="none">No label</option>
          </select>
          <select value={filterDue} onChange={(e) => setFilterDue(e.target.value as any)}>
            <option value="">All Dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="this-week">Due this week</option>
            <option value="none">No due date</option>
          </select>
          {(searchQuery || filterPriority || filterLabel || filterDue) && (
            <button className="workspace-filter-clear" onClick={() => {
              setSearchQuery('');
              setFilterPriority('');
              setFilterLabel('');
              setFilterDue('');
            }}>Clear filters</button>
          )}
        </div>
      )}

      {activeView === 'board' ? (
        <div className="workspace-board" aria-label="Kanban board">
          {columns.map((column, colIdx) => {
            const columnCards = filteredCards.filter((card) => card.columnId === column.id);
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
                  {editingColumnId === column.id ? (
                    <input
                      className="column-rename-input"
                      value={editingColumnName}
                      onChange={(e) => setEditingColumnName(e.target.value)}
                      onBlur={() => handleRenameColumn(column)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameColumn(column);
                        if (e.key === 'Escape') setEditingColumnId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <h2 onDoubleClick={() => {
                      setEditingColumnId(column.id);
                      setEditingColumnName(column.name);
                    }}>
                      {column.name}
                      <span className="column-count">{columnCards.length}</span>
                    </h2>
                  )}
                  <div className="column-actions">
                    {colIdx > 0 && <button className="column-reorder-btn" onClick={() => handleReorderColumn(column.id, 'left')} title="Move left">◀</button>}
                    {colIdx < columns.length - 1 && <button className="column-reorder-btn" onClick={() => handleReorderColumn(column.id, 'right')} title="Move right">▶</button>}
                    {columnCards.length === 0 && <button className="column-delete-btn" onClick={() => handleDeleteColumn(column)} title="Delete column">×</button>}
                    <button
                      className="column-add-btn"
                      onClick={() => handleNewCard(column.id)}
                      title={`Add card to ${column.name}`}
                      aria-label={`Add card to ${column.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="workspace-cards">
                  {columnCards.map((card) => {
                    const isCardDragging = dragCardId === card.id;
                    const isCardOver = dragOverCardId === card.id;
                    const ticketKey = getCardTicketKey(activeWorkspace, card);
                    const priorityDef = getPriorityDef(card.priority);
                    const labelDef = getLabelDef(card.label);
                    const dueStatus = getDueStatus(card.dueDate);
                    const progress = checklistProgress(card.checklist);
                    const isSelected = selectedCardIds.has(card.id);

                    return (
                      <article
                        className={`workspace-card ${isCardDragging ? 'dragging' : ''} ${isCardOver ? 'card-over' : ''} ${isSelected ? 'selected' : ''}`}
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
                          if ((event.target as HTMLElement).closest('.card-open-link-btn') || (event.target as HTMLElement).closest('.workspace-card-checkbox')) return;
                          if (selectMode) {
                            const next = new Set(selectedCardIds);
                            if (next.has(card.id)) next.delete(card.id);
                            else next.add(card.id);
                            setSelectedCardIds(next);
                            return;
                          }
                          setSelectedCard(card);
                          setIsDrawerOpen(true);
                        }}
                      >
                        <div className="workspace-card-header">
                          <div className="workspace-card-header-left">
                            {selectMode && (
                              <input
                                type="checkbox"
                                className="workspace-card-checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const next = new Set(selectedCardIds);
                                  if (e.target.checked) next.add(card.id);
                                  else next.delete(card.id);
                                  setSelectedCardIds(next);
                                }}
                              />
                            )}
                            <span className="workspace-card-key">{ticketKey}</span>
                            {priorityDef && (
                              <span className="workspace-card-priority" title={priorityDef.name}>
                                <span className="workspace-card-priority-dot" style={{ backgroundColor: priorityDef.color }}></span>
                                {priorityDef.id.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="workspace-card-meta">
                            {card.comments && card.comments.length > 0 && (
                              <span className="workspace-card-comment-indicator" title={`${card.comments.length} comment${card.comments.length === 1 ? '' : 's'}`}>
                                💬 {card.comments.length}
                              </span>
                            )}
                            {card.url && (
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
                            )}
                          </div>
                        </div>

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

                        {card.note && <p className="workspace-card-note">{card.note}</p>}

                        <div className="workspace-card-footer">
                          <div className="workspace-card-footer-left">
                            {labelDef && (
                              <span className="workspace-card-label-pill" style={{ backgroundColor: labelDef.color }}>
                                {labelDef.name}
                              </span>
                            )}
                            {card.dueDate && (
                              <span className={`workspace-card-due due-${dueStatus || ''}`}>
                                {formatDueDate(card.dueDate)}
                              </span>
                            )}
                            {progress.total > 0 && (
                              <span className="workspace-card-checklist-progress">
                                {progress.done}/{progress.total} ✓
                              </span>
                            )}
                          </div>
                          
                          <div className="workspace-card-footer-right">
                            {card.tags.length > 0 && (
                              <div className="workspace-tags">
                                {card.tags.map((tag) => (
                                  <span key={tag}>{tag}</span>
                                ))}
                              </div>
                            )}
                            {card.url && card.tags.length === 0 && (
                              <span className="workspace-card-url">{tabLocationLabel(card.url)}</span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {addingColumn ? (
            <div className="column-add-form">
              <input
                autoFocus
                placeholder="Column name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                  if (e.key === 'Escape') setAddingColumn(false);
                }}
              />
              <button className="btn btn-primary" onClick={handleAddColumn}>Add</button>
              <button className="btn" onClick={() => setAddingColumn(false)}>Cancel</button>
            </div>
          ) : (
            <button className="workspace-add-column" onClick={() => setAddingColumn(true)}>
              + Add column
            </button>
          )}
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

      {selectMode && selectedCardIds.size > 0 && (
        <div className="workspace-bulk-bar">
          <span>{selectedCardIds.size} card{selectedCardIds.size !== 1 ? 's' : ''} selected</span>
          <select onChange={handleBulkMove} defaultValue="">
            <option value="" disabled>Move to...</option>
            {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select onChange={handleBulkLabel} defaultValue="">
            <option value="" disabled>Set label...</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="tech-debt">Tech Debt</option>
            <option value="research">Research</option>
            <option value="improvement">Improvement</option>
            <option value="blocked">Blocked</option>
            <option value="none">Clear label</option>
          </select>
          <select onChange={handleBulkPriority} defaultValue="">
            <option value="" disabled>Set priority...</option>
            <option value="p0">P0 Critical</option>
            <option value="p1">P1 High</option>
            <option value="p2">P2 Medium</option>
            <option value="p3">P3 Low</option>
            <option value="none">Clear priority</option>
          </select>
          <button className="btn" onClick={handleBulkArchive}>Archive</button>
          <button className="btn" onClick={() => setSelectedCardIds(new Set())}>Deselect all</button>
        </div>
      )}

      {/* Jira-style Card Detail Drawer */}
      <WorkspaceCardDrawer
        card={selectedCard}
        ticketKey={selectedCard ? getCardTicketKey(activeWorkspace, selectedCard) : undefined}
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
            ...data,
            workspaceId: activeWorkspace.id,
            favIconUrl: data.favIconUrl || '',
            priority: data.priority,
            dueDate: data.dueDate,
            label: data.label,
            checklist: data.checklist,
          });
          setSelectedCard(updated);
          await refresh();
        }}
        onArchive={async (card) => {
          await archiveCard(card);
          await refresh();
        }}
      />

      {settingsOpen && activeWorkspace && (
        <WorkspaceSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          activeWorkspace={activeWorkspace}
          snapshot={snapshot}
        />
      )}
    </section>
  );
};

export default WorkspaceTool;
