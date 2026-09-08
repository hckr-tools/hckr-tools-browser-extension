import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  clearToolHistory,
  deleteToolHistoryEntry,
  listToolHistory,
  type ToolHistoryEntry,
} from '../../shared/toolHistory';
import { formatRelativeTime } from '../../shared/cloudSync';
import { copyToClipboard } from '../../shared/clipboard';
import { ToolIcon } from './ToolIcon';
import './ToolHistoryTab.css';

interface ToolHistoryTabProps {
  toolId: string;
  toolTitle: string;
  onRestore: (entry: ToolHistoryEntry) => void;
  cloudSyncEnabled?: boolean;
}

export const ToolHistoryTab: React.FC<ToolHistoryTabProps> = ({
  toolId,
  toolTitle,
  onRestore,
  cloudSyncEnabled,
}) => {
  const [entries, setEntries] = useState<ToolHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const list = await listToolHistory(toolId, 100);
    setEntries(list);
  }, [toolId]);

  useEffect(() => {
    void refresh();
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<{ toolId?: string }>;
      if (!customEvent.detail?.toolId || customEvent.detail.toolId === toolId) {
        void refresh();
      }
    };
    globalThis.addEventListener('hckr-tool-history-changed', listener);
    return () => globalThis.removeEventListener('hckr-tool-history-changed', listener);
  }, [toolId, refresh]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter(
      (entry) =>
        entry.action.toLowerCase().includes(q) ||
        entry.input.toLowerCase().includes(q) ||
        (entry.output && entry.output.toLowerCase().includes(q)) ||
        (entry.summary && entry.summary.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  const handleCopy = async (id: string, text: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
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
    await refresh();
  };

  const handleClear = async () => {
    if (window.confirm(`Clear all history for ${toolTitle}?`)) {
      await clearToolHistory(toolId);
      await refresh();
    }
  };

  return (
    <div className="tool-history-tab">
      {/* Sub-toolbar */}
      <div className="tool-history-tab-toolbar">
        <div className="tool-history-tab-search">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder={`Search ${toolTitle} history…`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tool-history-tab-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="tool-history-tab-actions">
          <span className={`tool-history-tab-sync-pill ${cloudSyncEnabled ? 'synced' : 'local'}`}>
            <span className="sync-dot" />
            {cloudSyncEnabled ? 'Cloud synced' : 'Local'}
          </span>
          {entries.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-danger tool-history-tab-clear-btn"
              onClick={handleClear}
              title={`Clear ${toolTitle} history`}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="tool-history-tab-content">
        {filteredEntries.length === 0 ? (
          <div className="tool-history-tab-empty">
            <span className="empty-icon">🕒</span>
            <h3 className="empty-title">
              {entries.length === 0
                ? `No ${toolTitle} history yet`
                : `No history matching “${searchQuery}”`}
            </h3>
            <p className="empty-description">
              {entries.length === 0
                ? `Actions in ${toolTitle} (such as formatting, converting, or generating) are automatically recorded here and synced to the cloud if enabled.`
                : 'Try clearing the search query to see past history entries.'}
            </p>
          </div>
        ) : (
          <div className="tool-history-tab-list">
            {filteredEntries.map((entry) => {
              const isExpanded = expandedIds.has(entry.id);
              const hasOutput = Boolean(entry.output && entry.output !== entry.input);
              const isCopiedInput = copiedId === entry.id;
              const isCopiedOutput = copiedId === `${entry.id}-out`;

              return (
                <article key={entry.id} className="tool-history-tab-card">
                  {/* Card Header */}
                  <div className="tab-card-header">
                    <div className="tab-card-meta">
                      <span className="tab-card-icon" aria-hidden="true">
                        <ToolIcon toolId={entry.toolId} />
                      </span>
                      <span className="tab-card-action">{entry.action}</span>
                      {entry.summary && (
                        <span className="tab-card-summary">{entry.summary}</span>
                      )}
                    </div>
                    <time
                      dateTime={entry.createdAt}
                      className="tab-card-time"
                      title={new Date(entry.createdAt).toLocaleString()}
                    >
                      {formatRelativeTime(entry.createdAt)}
                    </time>
                  </div>

                  {/* Card Snippets */}
                  <div className="tab-card-snippets">
                    <div className="tab-card-snippet">
                      <div className="tab-card-snippet-header">
                        <span className="tab-card-snippet-label">Input</span>
                        <span className="tab-card-snippet-len">{entry.input.length} chars</span>
                      </div>
                      <pre className={`tab-card-snippet-code ${isExpanded ? 'expanded' : ''}`}>
                        <code>{entry.input}</code>
                      </pre>
                    </div>

                    {hasOutput && entry.output && (
                      <div className="tab-card-snippet">
                        <div className="tab-card-snippet-header">
                          <span className="tab-card-snippet-label">Output</span>
                          <span className="tab-card-snippet-len">{entry.output.length} chars</span>
                        </div>
                        <pre className={`tab-card-snippet-code ${isExpanded ? 'expanded' : ''}`}>
                          <code>{entry.output}</code>
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="tab-card-footer">
                    <div className="tab-card-footer-left">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary tab-card-restore-btn"
                        onClick={() => onRestore(entry)}
                        title={`Load this into ${toolTitle}`}
                      >
                        ↩ Load into {toolTitle}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm tab-card-copy-btn"
                        onClick={() => void handleCopy(entry.id, entry.input)}
                        title="Copy input to clipboard"
                      >
                        {isCopiedInput ? '✓ Copied' : '📋 Copy Input'}
                      </button>
                      {hasOutput && entry.output && (
                        <button
                          type="button"
                          className="btn btn-sm tab-card-copy-btn"
                          onClick={() => void handleCopy(`${entry.id}-out`, entry.output!)}
                          title="Copy output to clipboard"
                        >
                          {isCopiedOutput ? '✓ Copied' : '📋 Copy Output'}
                        </button>
                      )}
                      {(entry.input.length > 180 || (entry.output && entry.output.length > 180)) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost tab-card-expand-btn"
                          onClick={() => toggleExpand(entry.id)}
                        >
                          {isExpanded ? 'Collapse' : 'Expand full'}
                        </button>
                      )}
                    </div>
                    <div className="tab-card-footer-right">
                      <button
                        type="button"
                        className="tab-card-delete-btn"
                        onClick={() => void handleDelete(entry.id)}
                        title="Delete this history entry"
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
  );
};

export default ToolHistoryTab;
