import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  clearToolHistory,
  deleteToolHistoryEntry,
  listToolHistory,
  type ToolHistoryEntry,
} from '../../shared/toolHistory';
import { formatRelativeTime } from '../../shared/cloudSync';
import { copyToClipboard } from '../../shared/clipboard';
import { saveWorkspaceItem } from '../../shared/workspace';
import { ToolIcon } from './ToolIcon';
import './ToolHistoryModal.css';

interface ToolHistoryModalProps {
  open: boolean;
  onClose: () => void;
  initialToolId?: string;
  activeToolId?: string;
  activeToolTitle?: string;
  onRestore: (entry: ToolHistoryEntry, customContent?: string, targetToolId?: string) => void;
  cloudSyncEnabled?: boolean;
}

export const ToolHistoryModal: React.FC<ToolHistoryModalProps> = ({
  open,
  onClose,
  initialToolId,
  activeToolId,
  activeToolTitle,
  onRestore,
  cloudSyncEnabled,
}) => {
  const [entries, setEntries] = useState<ToolHistoryEntry[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>(initialToolId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const refreshEntries = useCallback(async () => {
    const list = await listToolHistory(undefined, 200);
    setEntries(list);
  }, []);

  useEffect(() => {
    if (!open) return;
    void refreshEntries();
    if (initialToolId) {
      setSelectedToolId(initialToolId);
    }
    const listener = () => { void refreshEntries(); };
    globalThis.addEventListener('hckr-tool-history-changed', listener);
    return () => globalThis.removeEventListener('hckr-tool-history-changed', listener);
  }, [open, initialToolId, refreshEntries]);

  // Keyboard escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Unique tools and counts
  const toolCounts = useMemo(() => {
    const counts: Record<string, { title: string; count: number }> = {};
    for (const entry of entries) {
      if (!counts[entry.toolId]) {
        counts[entry.toolId] = { title: entry.toolTitle || entry.toolId, count: 0 };
      }
      counts[entry.toolId].count += 1;
    }
    return counts;
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (selectedToolId !== 'all') {
      result = result.filter((entry) => entry.toolId === selectedToolId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (entry) =>
          entry.action.toLowerCase().includes(q) ||
          entry.input.toLowerCase().includes(q) ||
          (entry.output && entry.output.toLowerCase().includes(q)) ||
          (entry.summary && entry.summary.toLowerCase().includes(q)) ||
          entry.toolTitle.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, selectedToolId, searchQuery]);

  const handleCopy = async (id: string, text: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    showToast('✓ Copied to clipboard');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSaveToWorkspace = async (entry: ToolHistoryEntry, content: string) => {
    try {
      await saveWorkspaceItem({
        type: 'text',
        title: `${entry.toolTitle}: ${entry.action}`,
        content,
      });
      showToast('✓ Saved snippet to Workspace');
    } catch (err) {
      console.error('Failed to save to workspace:', err);
      showToast('Failed to save to workspace');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    await deleteToolHistoryEntry(id);
    await refreshEntries();
  };

  const handleClear = async () => {
    const scopeName = selectedToolId === 'all' ? 'all tools' : (toolCounts[selectedToolId]?.title || selectedToolId);
    if (window.confirm(`Are you sure you want to clear history for ${scopeName}?`)) {
      await clearToolHistory(selectedToolId === 'all' ? undefined : selectedToolId);
      await refreshEntries();
    }
  };

  if (!open) return null;

  return (
    <div className="tool-history-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tool-history-modal" role="dialog" aria-modal="true" aria-label="Tool Usage History">
        {toastMessage && <div className="tool-history-toast" role="status">{toastMessage}</div>}
        {/* Header */}
        <header className="tool-history-header">
          <div className="tool-history-header-left">
            <h2 className="tool-history-title">
              <span className="tool-history-clock-icon" aria-hidden="true">🕒</span>
              Tool Usage History
            </h2>
            <div className="tool-history-status-pills">
              <span className="tool-history-badge count-badge">{entries.length} {entries.length === 1 ? 'item' : 'items'}</span>
              <span className={`tool-history-badge sync-badge ${cloudSyncEnabled ? 'synced' : 'local'}`}>
                <span className="history-sync-dot" />
                {cloudSyncEnabled ? 'Cloud Sync Active' : 'Local Only'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="tool-history-close-btn"
            onClick={onClose}
            aria-label="Close history modal"
            title="Close (Esc)"
          >
            ✕
          </button>
        </header>

        {/* Toolbar: Filters & Search */}
        <div className="tool-history-toolbar">
          <div className="tool-history-search-wrapper">
            <span className="tool-history-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              className="tool-history-search-input"
              placeholder="Search input, output, or action…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="tool-history-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="tool-history-actions-bar">
            {/* Filter pills */}
            <div className="tool-history-filters" role="tablist" aria-label="Filter by tool">
              <button
                type="button"
                role="tab"
                aria-selected={selectedToolId === 'all'}
                className={`tool-history-filter-pill ${selectedToolId === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedToolId('all')}
              >
                All ({entries.length})
              </button>
              {Object.entries(toolCounts).map(([toolId, info]) => (
                <button
                  key={toolId}
                  type="button"
                  role="tab"
                  aria-selected={selectedToolId === toolId}
                  className={`tool-history-filter-pill ${selectedToolId === toolId ? 'active' : ''}`}
                  onClick={() => setSelectedToolId(toolId)}
                >
                  <ToolIcon toolId={toolId} />
                  <span>{info.title}</span>
                  <span className="filter-pill-count">({info.count})</span>
                </button>
              ))}
            </div>

            {filteredEntries.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-danger tool-history-clear-btn"
                onClick={handleClear}
                title="Clear filtered history"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Entries list */}
        <div className="tool-history-body">
          {filteredEntries.length === 0 ? (
            <div className="tool-history-empty">
              <span className="tool-history-empty-icon">🕒</span>
              <p className="tool-history-empty-title">
                {entries.length === 0
                  ? 'No tool usage recorded yet'
                  : 'No matching history entries'}
              </p>
              <p className="tool-history-empty-desc">
                {entries.length === 0
                  ? 'Usage history is automatically recorded when you format JSON, convert YAML, encode Base64, and use developer tools.'
                  : `Try searching for different terms or clear the filter.`}
              </p>
            </div>
          ) : (
            <div className="tool-history-list">
              {filteredEntries.map((entry) => {
                const isExpanded = expandedIds.has(entry.id);
                const hasOutput = Boolean(entry.output && entry.output !== entry.input);
                const isCopied = copiedId === entry.id;

                return (
                  <article key={entry.id} className="tool-history-card">
                    <div className="tool-history-card-header">
                      <div className="tool-history-card-meta">
                        <span className="tool-history-card-icon" aria-hidden="true">
                          <ToolIcon toolId={entry.toolId} />
                        </span>
                        <span className="tool-history-card-tool-name">{entry.toolTitle}</span>
                        <span className="tool-history-card-action-badge">{entry.action}</span>
                        {entry.summary && (
                          <span className="tool-history-card-summary">{entry.summary}</span>
                        )}
                      </div>
                      <div className="tool-history-card-time-row">
                        <time
                          dateTime={entry.createdAt}
                          className="tool-history-card-time"
                          title={new Date(entry.createdAt).toLocaleString()}
                        >
                          {formatRelativeTime(entry.createdAt)}
                        </time>
                      </div>
                    </div>

                    {/* Preview snippets with quick reuse actions */}
                    <div className="tool-history-snippets">
                      <div className="tool-history-snippet-section">
                        <div className="tool-history-snippet-label-row">
                          <div className="tool-history-snippet-label-left">
                            <span className="tool-history-snippet-label">Input</span>
                            <span className="tool-history-char-count">{entry.input.length} chars</span>
                          </div>
                          <div className="tool-history-snippet-quick-actions">
                            <button
                              type="button"
                              className="btn-snippet-action"
                              onClick={() => {
                                onRestore(entry, entry.input, entry.toolId);
                                onClose();
                              }}
                              title={`Reuse this input in ${entry.toolTitle}`}
                            >
                              ↩ Use
                            </button>
                            <button
                              type="button"
                              className="btn-snippet-action"
                              onClick={() => void handleCopy(entry.id, entry.input)}
                              title="Copy input"
                            >
                              {isCopied ? '✓ Copied' : '📋 Copy'}
                            </button>
                          </div>
                        </div>
                        <pre className={`tool-history-snippet-pre ${isExpanded ? 'expanded' : ''}`}>
                          <code>{entry.input}</code>
                        </pre>
                      </div>

                      {hasOutput && entry.output && (
                        <div className="tool-history-snippet-section">
                          <div className="tool-history-snippet-label-row">
                            <div className="tool-history-snippet-label-left">
                              <span className="tool-history-snippet-label">Output</span>
                              <span className="tool-history-char-count">{entry.output.length} chars</span>
                            </div>
                            <div className="tool-history-snippet-quick-actions">
                              <button
                                type="button"
                                className="btn-snippet-action"
                                onClick={() => {
                                  onRestore(entry, entry.output!, entry.toolId);
                                  onClose();
                                }}
                                title={`Reuse this output in ${entry.toolTitle}`}
                              >
                                ↩ Use Output
                              </button>
                              <button
                                type="button"
                                className="btn-snippet-action"
                                onClick={() => void handleCopy(`${entry.id}-out`, entry.output!)}
                                title="Copy output"
                              >
                                {copiedId === `${entry.id}-out` ? '✓ Copied' : '📋 Copy'}
                              </button>
                            </div>
                          </div>
                          <pre className={`tool-history-snippet-pre ${isExpanded ? 'expanded' : ''}`}>
                            <code>{entry.output}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Full Card Actions */}
                    <div className="tool-history-card-footer">
                      <div className="tool-history-footer-left">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary tool-history-restore-btn"
                          onClick={() => {
                            onRestore(entry, entry.input, entry.toolId);
                            onClose();
                          }}
                          title={`Open ${entry.toolTitle} and load this input`}
                        >
                          ↩ Reuse in {entry.toolTitle}
                        </button>
                        {hasOutput && entry.output && (
                          <button
                            type="button"
                            className="btn btn-sm tool-history-restore-output-btn"
                            onClick={() => {
                              onRestore(entry, entry.output!, entry.toolId);
                              onClose();
                            }}
                            title={`Open ${entry.toolTitle} and load this output`}
                          >
                            ↩ Reuse Output
                          </button>
                        )}
                        {activeToolId && activeToolId !== entry.toolId && activeToolId !== 'workspace' && (
                          <button
                            type="button"
                            className="btn btn-sm tool-history-insert-btn"
                            onClick={() => {
                              onRestore(entry, entry.output || entry.input, activeToolId);
                              onClose();
                            }}
                            title={`Insert into currently open ${activeToolTitle || 'tool'}`}
                          >
                            ⤵ Insert into {activeToolTitle || 'Current Tool'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm tool-history-workspace-btn"
                          onClick={() => void handleSaveToWorkspace(entry, entry.output || entry.input)}
                          title="Save this snippet into active Workspace Context"
                        >
                          ⚡ Save to Workspace
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm tool-history-copy-btn"
                          onClick={() => void handleCopy(entry.id, entry.input)}
                          title="Copy input to clipboard"
                        >
                          {isCopied ? '✓ Copied' : '📋 Copy Input'}
                        </button>
                        {hasOutput && entry.output && (
                          <button
                            type="button"
                            className="btn btn-sm tool-history-copy-btn"
                            onClick={() => void handleCopy(`${entry.id}-out`, entry.output!)}
                            title="Copy output to clipboard"
                          >
                            {copiedId === `${entry.id}-out` ? '✓ Copied' : '📋 Copy Output'}
                          </button>
                        )}
                        {(entry.input.length > 200 || (entry.output && entry.output.length > 200)) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost tool-history-expand-btn"
                            onClick={() => toggleExpand(entry.id)}
                          >
                            {isExpanded ? 'Collapse' : 'Expand full'}
                          </button>
                        )}
                      </div>
                      <div className="tool-history-footer-right">
                        <button
                          type="button"
                          className="tool-history-delete-btn"
                          onClick={() => void handleDelete(entry.id)}
                          title="Delete this entry"
                          aria-label="Delete history entry"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolHistoryModal;
