import React, { useState, useEffect } from 'react';
import {
  archiveWorkspace,
  generateWorkspaceKey,
  unarchiveWorkspace,
  updateWorkspace,
  type Workspace,
  type WorkspaceSnapshot,
} from '../../shared/workspace';
import { formatRelativeTime } from '../../shared/cloudSync';
import './WorkspaceSettingsModal.css';

interface WorkspaceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  activeWorkspace?: Workspace;
  snapshot: WorkspaceSnapshot;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  open,
  onClose,
  activeWorkspace,
  snapshot,
}) => {
  const [name, setName] = useState(activeWorkspace?.name ?? '');
  const [key, setKey] = useState(activeWorkspace?.key ?? generateWorkspaceKey(activeWorkspace?.name ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setKey(activeWorkspace.key ?? generateWorkspaceKey(activeWorkspace.name));
      setError(null);
      setSavedSuccess(false);
    }
  }, [activeWorkspace, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !activeWorkspace) return null;

  const activeWorkspaces = snapshot.workspaces.filter((w) => !w.archived);
  const archivedWorkspaces = snapshot.workspaces.filter((w) => w.archived);
  const canArchive = activeWorkspaces.length > 1;
  const cardsCount = snapshot.cards.filter(
    (c) => c.workspaceId === activeWorkspace.id && !c.archived
  ).length;
  const itemsCount = snapshot.items.filter(
    (i) => i.workspaceId === activeWorkspace.id
  ).length;

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name cannot be empty');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const sanitizedKey = key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || generateWorkspaceKey(name);
      await updateWorkspace(activeWorkspace.id, { name: name.trim(), key: sanitizedKey });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!canArchive) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await archiveWorkspace(activeWorkspace);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive workspace');
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const data = {
      workspace: activeWorkspace,
      columns: snapshot.columns.filter((c) => c.workspaceId === activeWorkspace.id),
      cards: snapshot.cards.filter((c) => c.workspaceId === activeWorkspace.id),
      items: snapshot.items.filter((i) => i.workspaceId === activeWorkspace.id),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWorkspace.name.toLowerCase().replace(/\s+/g, '-')}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="workspace-settings-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-heading">
      <div className="workspace-settings-modal" onClick={(e) => e.stopPropagation()}>
        <header className="workspace-settings-header">
          <div className="settings-header-title">
            <span className="settings-header-icon" aria-hidden="true">⚙</span>
            <h2 id="settings-heading">Workspace Settings</h2>
          </div>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </header>

        <div className="workspace-settings-body">
          {error && <div className="settings-error error-msg">{error}</div>}

          {/* Section 1: General Info & Rename */}
          <section className="settings-section">
            <h3 className="settings-section-title">General</h3>
            <form onSubmit={handleSaveGeneral} className="settings-form">
              <div className="settings-field-group">
                <label htmlFor="workspace-name-input" className="label">
                  Workspace Name
                </label>
                <input
                  id="workspace-name-input"
                  className="input"
                  value={name}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setName(nextVal);
                    if (!key || key === generateWorkspaceKey(name)) {
                      setKey(generateWorkspaceKey(nextVal));
                    }
                  }}
                  placeholder="e.g. Backend Services"
                  maxLength={100}
                />
              </div>

              <div className="settings-field-group">
                <label htmlFor="workspace-key-input" className="label">
                  Workspace Key / Ticket Prefix
                </label>
                <div className="settings-input-row">
                  <input
                    id="workspace-key-input"
                    className="input settings-key-input"
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    placeholder="e.g. BCKD"
                    maxLength={8}
                    style={{ width: '120px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      isSubmitting ||
                      (name.trim() === activeWorkspace.name && key.trim() === (activeWorkspace.key ?? ''))
                    }
                  >
                    {savedSuccess ? '✓ Saved' : 'Save changes'}
                  </button>
                </div>
                <span className="settings-field-hint">
                  Tickets in this workspace will be identified as <strong>{(key || 'WS').toUpperCase()}-1</strong>, <strong>{(key || 'WS').toUpperCase()}-2</strong>, etc.
                </span>
              </div>
            </form>
          </section>

          {/* Section 2: Stats & Overview */}
          <section className="settings-section">
            <h3 className="settings-section-title">Overview</h3>
            <div className="settings-stats-grid">
              <div className="settings-stat-card">
                <span className="stat-value">{cardsCount}</span>
                <span className="stat-label">Active Cards</span>
              </div>
              <div className="settings-stat-card">
                <span className="stat-value">{itemsCount}</span>
                <span className="stat-label">Saved Snippets</span>
              </div>
              <div className="settings-stat-card">
                <span className="stat-value">{activeWorkspaces.length}</span>
                <span className="stat-label">Active Workspaces</span>
              </div>
              <div className="settings-stat-card">
                <span className="stat-value">{archivedWorkspaces.length}</span>
                <span className="stat-label">Archived</span>
              </div>
            </div>
          </section>

          {/* Section 3: Archived Workspaces */}
          <section className="settings-section">
            <h3 className="settings-section-title">
              Archived Workspaces {archivedWorkspaces.length > 0 && `(${archivedWorkspaces.length})`}
            </h3>
            {archivedWorkspaces.length === 0 ? (
              <p className="settings-empty-hint">No archived workspaces.</p>
            ) : (
              <div className="archived-workspace-list">
                {archivedWorkspaces.map((ws) => {
                  const wsCards = snapshot.cards.filter((c) => c.workspaceId === ws.id && !c.archived).length;
                  const wsItems = snapshot.items.filter((i) => i.workspaceId === ws.id).length;
                  return (
                    <div key={ws.id} className="archived-workspace-item">
                      <div className="archived-workspace-info">
                        <div className="archived-workspace-title-row">
                          <span className="archived-workspace-name">{ws.name}</span>
                          {ws.key && <span className="archived-workspace-key">{ws.key}</span>}
                        </div>
                        <span className="archived-workspace-meta">
                          {wsCards} {wsCards === 1 ? 'card' : 'cards'} · {wsItems} {wsItems === 1 ? 'snippet' : 'snippets'} · Updated {formatRelativeTime(ws.updatedAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={isSubmitting}
                        onClick={async () => {
                          setIsSubmitting(true);
                          setError(null);
                          try {
                            await unarchiveWorkspace(ws.id, true);
                            setSavedSuccess(true);
                            setTimeout(() => setSavedSuccess(false), 2000);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to restore workspace');
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        title={`Restore ${ws.name} and make it active`}
                      >
                        ⎌ Restore to active
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 4: Data Export */}
          <section className="settings-section">
            <h3 className="settings-section-title">Backup & Export</h3>
            <div className="settings-action-row">
              <div className="settings-action-desc">
                <span className="settings-action-name">Export workspace data</span>
                <span className="settings-action-hint">Download a JSON file containing all tickets and saved context.</span>
              </div>
              <button type="button" className="btn btn-sm" onClick={handleExport}>
                Export JSON
              </button>
            </div>
          </section>

          {/* Section 5: Danger Zone - Archive */}
          <section className="settings-section settings-danger-zone">
            <h3 className="settings-section-title danger">Danger Zone</h3>
            <div className="settings-action-row">
              <div className="settings-action-desc">
                <span className="settings-action-name">Archive this workspace</span>
                <span className="settings-action-hint">
                  {canArchive
                    ? 'Hides this workspace from your switcher. All tickets and notes are preserved.'
                    : 'You must have at least one other active workspace before archiving this one.'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-danger-outline"
                onClick={handleArchive}
                disabled={!canArchive || isSubmitting}
                title={canArchive ? 'Archive workspace' : 'Create another workspace first'}
              >
                Archive workspace
              </button>
            </div>
          </section>
        </div>

        <footer className="workspace-settings-footer">
          <button className="btn" onClick={onClose} type="button">
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};
