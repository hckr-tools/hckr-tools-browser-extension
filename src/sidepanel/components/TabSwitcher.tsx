import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  closeDuplicateTabs,
  filterTabs,
  findDuplicateTabIds,
  jumpToTab,
  lastVisitedLabel,
  listHistoryTabs,
  listWindowTabs,
  openOrFocusUrl,
  type BrowserTab,
  type HistoryTab,
  type TabSearchResult,
} from '../../shared/browserTabs';
import TabFavicon from './TabFavicon';
import './TabSwitcher.css';

interface TabSwitcherProps {
  open: boolean;
  onClose: () => void;
  windowId?: number;
  standalone?: boolean;
}

const MAX_NUMBER_SHORTCUTS = 9;
const HISTORY_SEARCH_DEBOUNCE_MS = 150;

function shortcutIndexForKey(key: string): number | null {
  if (key >= '1' && key <= '9') {
    return Number(key) - 1;
  }
  if (key === '0') {
    return 9;
  }
  return null;
}

function shortcutLabelForIndex(index: number): string | null {
  if (index >= 0 && index < MAX_NUMBER_SHORTCUTS) {
    return String(index + 1);
  }
  if (index === 9) {
    return '0';
  }
  return null;
}

const TabSwitcher: React.FC<TabSwitcherProps> = ({
  open,
  onClose,
  windowId,
  standalone = false,
}) => {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [historyTabs, setHistoryTabs] = useState<HistoryTab[]>([]);
  const [historyLookupComplete, setHistoryLookupComplete] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isClosingDuplicates, setIsClosingDuplicates] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTabs = useCallback(async () => {
    try {
      setError(null);
      setTabs(await listWindowTabs(windowId));
    } catch (err) {
      console.error('Failed to load browser tabs:', err);
      setError('Unable to read open tabs.');
    }
  }, [windowId]);


  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    void loadTabs();
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(focusTimer);
  }, [loadTabs, open]);

  const hasQuery = Boolean(query.trim());
  const filteredOpenTabs = useMemo(() => filterTabs(tabs, query), [query, tabs]);
  const duplicateTabIds = useMemo(() => findDuplicateTabIds(tabs), [tabs]);
  const duplicateIdSet = useMemo(() => new Set(duplicateTabIds), [duplicateTabIds]);
  const searchResults = useMemo<TabSearchResult[]>(() => [
    ...filteredOpenTabs.map((tab) => ({ ...tab, source: 'open' as const })),
    ...(hasQuery ? historyTabs : []),
  ], [filteredOpenTabs, hasQuery, historyTabs]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timer = window.setTimeout(() => setStatusMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const handleCloseDuplicates = useCallback(async () => {
    if (duplicateTabIds.length === 0 || isClosingDuplicates) {
      return;
    }
    setIsClosingDuplicates(true);
    setStatusMessage(null);
    setError(null);

    try {
      const closed = await closeDuplicateTabs(duplicateTabIds);
      setStatusMessage(`Closed ${closed} duplicate ${closed === 1 ? 'tab' : 'tabs'}`);
      await loadTabs();
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to close duplicate tabs:', err);
      setError('Failed to close duplicate tabs.');
    } finally {
      setIsClosingDuplicates(false);
    }
  }, [duplicateTabIds, isClosingDuplicates, loadTabs]);


  useEffect(() => {
    if (!open || !hasQuery) {
      setHistoryTabs([]);
      setHistoryLookupComplete(false);
      return;
    }

    let cancelled = false;
    setHistoryTabs([]);
    setHistoryLookupComplete(false);
    const lookupTimer = window.setTimeout(() => {
      void listHistoryTabs(query)
        .then((results) => {
          if (!cancelled) {
            setHistoryTabs(results);
          }
        })
        .catch((err) => {
          console.error('Failed to search browser history:', err);
        })
        .finally(() => {
          if (!cancelled) {
            setHistoryLookupComplete(true);
          }
        });
    }, HISTORY_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(lookupTimer);
    };
  }, [hasQuery, open, query]);

  useEffect(() => {
    if (hasQuery) {
      setSelectedIndex(0);
      return;
    }

    const previousIndex = filteredOpenTabs.findIndex((tab) => !tab.active);
    setSelectedIndex(previousIndex >= 0 ? previousIndex : 0);
  }, [filteredOpenTabs, hasQuery]);

  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(Math.max(0, searchResults.length - 1));
    }
  }, [searchResults.length, selectedIndex]);

  useEffect(() => {
    const selected = document.querySelector('.tab-switcher-item.selected');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, searchResults]);

  const selectTab = useCallback(async (tabId: number) => {
    await jumpToTab(tabId);
    onClose();
  }, [onClose]);

  const selectResult = useCallback(async (result: TabSearchResult) => {
    if (result.source === 'open') {
      await selectTab(result.id);
      return;
    }

    await openOrFocusUrl(result.url, windowId);
    onClose();
  }, [onClose, selectTab, windowId]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, Math.max(searchResults.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const result = searchResults[selectedIndex];
      if (result) {
        void selectResult(result);
      }
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const shortcutIndex = shortcutIndexForKey(event.key);
    if (shortcutIndex === null || hasQuery) {
      return;
    }

    const result = searchResults[shortcutIndex];
    if (!result) {
      return;
    }

    event.preventDefault();
    void selectResult(result);
  }, [hasQuery, onClose, searchResults, selectResult, selectedIndex]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={`tab-switcher ${standalone ? 'standalone' : ''}`}
      onMouseDown={(event) => {
        if (!standalone && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="tab-switcher-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tab-switcher-title"
        onKeyDownCapture={handleKeyDown}
      >
        <div className="tab-switcher-brand-bar">
          <div className="tab-switcher-brand-left">
            <div className="tab-switcher-brand-tile" aria-hidden="true">
              <span className="tab-switcher-brand-icon">#</span>
            </div>
            <div className="tab-switcher-brand-text">
              <span className="tab-switcher-brand-title">hckr-tools</span>
              <span className="tab-switcher-brand-sep">/</span>
              <span className="tab-switcher-brand-subtitle">Quick Switcher</span>
            </div>
          </div>
          <div className="tab-switcher-brand-right">
            <span className="tab-switcher-tab-count">
              {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}
            </span>
            <button
              className="tab-switcher-close-btn"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close tab switcher"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="tab-switcher-header">
          <h2 id="tab-switcher-title" className="tab-switcher-sr-only">hckr-tools tab switcher</h2>
          <div className="tab-switcher-search-wrap">
            <span className="tab-switcher-search-icon" aria-hidden="true">⌕</span>
            <input
              ref={inputRef}
              className="tab-switcher-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search open tabs or history… (↑↓ to navigate)"
              aria-label="Search open tabs"
              autoComplete="off"
            />
            {duplicateTabIds.length > 0 && (
              <button
                className="tab-switcher-close-duplicates-btn"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleCloseDuplicates();
                }}
                disabled={isClosingDuplicates}
                title={`Close ${duplicateTabIds.length} duplicate ${duplicateTabIds.length === 1 ? 'tab' : 'tabs'}`}
                aria-label={`Close ${duplicateTabIds.length} duplicate tabs`}
              >
                {isClosingDuplicates ? 'Closing…' : `Close duplicates (${duplicateTabIds.length})`}
              </button>
            )}
            {query && (
              <button
                className="tab-switcher-clear-btn"
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {statusMessage && (
            <div className="tab-switcher-status-bar" role="status">
              <span>✓ {statusMessage}</span>
            </div>
          )}
        </div>

        {error && <p className="tab-switcher-empty" role="alert">{error}</p>}

        {!error && searchResults.length === 0 && (!hasQuery || historyLookupComplete) && (
          <p className="tab-switcher-empty">
            {hasQuery ? `No tabs or history match “${query.trim()}”.` : 'No open tabs in this window.'}
          </p>
        )}

        <div className="tab-switcher-list" role="listbox" aria-label="Open browser tabs">
          {!hasQuery && filteredOpenTabs.length > 0 && <p className="tab-switcher-section">Recent</p>}
          {hasQuery && filteredOpenTabs.length > 0 && <p className="tab-switcher-section">Open tabs</p>}
          {filteredOpenTabs.map((tab, index) => {
            const result: TabSearchResult = { ...tab, source: 'open' };
            const shortcut = hasQuery ? null : shortcutLabelForIndex(index);
            return (
            <button
              key={tab.id}
              role="option"
              aria-selected={index === selectedIndex}
              className={`tab-switcher-item ${index === selectedIndex ? 'selected' : ''} ${tab.active ? 'current' : ''}`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => void selectResult(result)}
              title={tab.url ? `${tab.title}\n${tab.url}` : tab.title}
            >
              <span className="tab-favicon">
                <TabFavicon tab={tab} />
              </span>
              <span className="tab-switcher-details">
                <span className="tab-switcher-title">{tab.title}</span>
                <span className="tab-switcher-url">{tab.location || tab.url}</span>
              </span>
              <span className="tab-switcher-actions">
                {duplicateIdSet.has(tab.id) && <span className="tab-switcher-badge duplicate">Duplicate</span>}
                {tab.active && <span className="tab-switcher-badge">Current</span>}
                {shortcut && <span className="tab-switcher-shortcut">{shortcut}</span>}
              </span>
            </button>
            );
          })}
          {hasQuery && historyTabs.length > 0 && <p className="tab-switcher-section">History</p>}
          {historyTabs.map((tab, index) => {
            const resultIndex = filteredOpenTabs.length + index;
            return (
            <button
              key={`history-${tab.url}`}
              role="option"
              aria-selected={resultIndex === selectedIndex}
              className={`tab-switcher-item history ${resultIndex === selectedIndex ? 'selected' : ''}`}
              onMouseEnter={() => setSelectedIndex(resultIndex)}
              onClick={() => void selectResult(tab)}
              title={`${tab.title}\n${tab.url}`}
            >
              <span className="tab-favicon">
                <TabFavicon tab={tab} />
              </span>
              <span className="tab-switcher-details">
                <span className="tab-switcher-title">{tab.title}</span>
                <span className="tab-switcher-url">{tab.url}</span>
                <span className="tab-switcher-visit-time">{lastVisitedLabel(tab.lastVisitTime)}</span>
              </span>
            </button>
            );
          })}
        </div>

        <div className="tab-switcher-hint">
          <div className="tab-switcher-hint-keys">
            <span><span className="tab-switcher-hint-key">1–9</span> Jump</span>
            <span><span className="tab-switcher-hint-key">↑↓</span> Select</span>
            <span><span className="tab-switcher-hint-key">↵</span> Open</span>
            <span><span className="tab-switcher-hint-key">esc</span> Close</span>
          </div>
          <span className="tab-switcher-hint-count">
            {searchResults.length} {searchResults.length === 1 ? 'tab' : 'tabs'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TabSwitcher;
