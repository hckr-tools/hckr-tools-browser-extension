import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  filterTabs,
  jumpToTab,
  listWindowTabs,
  type BrowserTab,
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
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
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

  const filteredTabs = useMemo(() => filterTabs(tabs, query), [query, tabs]);

  useEffect(() => {
    if (query.trim()) {
      setSelectedIndex(0);
      return;
    }

    const previousIndex = filteredTabs.findIndex((tab) => !tab.active);
    setSelectedIndex(previousIndex >= 0 ? previousIndex : 0);
  }, [filteredTabs, query]);

  useEffect(() => {
    if (selectedIndex >= filteredTabs.length) {
      setSelectedIndex(Math.max(0, filteredTabs.length - 1));
    }
  }, [filteredTabs.length, selectedIndex]);

  useEffect(() => {
    const selected = document.querySelector('.tab-switcher-item.selected');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, filteredTabs]);

  const selectTab = useCallback(async (tabId: number) => {
    await jumpToTab(tabId);
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, Math.max(filteredTabs.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const tab = filteredTabs[selectedIndex];
      if (tab) {
        void selectTab(tab.id);
      }
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const shortcutIndex = shortcutIndexForKey(event.key);
    if (shortcutIndex === null || query.trim()) {
      return;
    }

    const tab = filteredTabs[shortcutIndex];
    if (!tab) {
      return;
    }

    event.preventDefault();
    void selectTab(tab.id);
  }, [filteredTabs, onClose, query, selectTab, selectedIndex]);

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
        <div className="tab-switcher-header">
          <h2 id="tab-switcher-title" className="tab-switcher-sr-only">hckr-tools tab switcher</h2>
          <input
            ref={inputRef}
            className="tab-switcher-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search open tabs…"
            aria-label="Search open tabs"
            autoComplete="off"
          />
        </div>

        {error && <p className="tab-switcher-empty" role="alert">{error}</p>}

        {!error && filteredTabs.length === 0 && (
          <p className="tab-switcher-empty">
            {tabs.length === 0 ? 'No open tabs in this window.' : `No tabs match “${query.trim()}”.`}
          </p>
        )}

        {filteredTabs.length > 0 && (
          <p className="tab-switcher-section">Recent</p>
        )}

        <div className="tab-switcher-list" role="listbox" aria-label="Open browser tabs">
          {filteredTabs.map((tab, index) => {
            const shortcut = query.trim() ? null : shortcutLabelForIndex(index);
            return (
            <button
              key={tab.id}
              role="option"
              aria-selected={index === selectedIndex}
              className={`tab-switcher-item ${index === selectedIndex ? 'selected' : ''} ${tab.active ? 'current' : ''}`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => void selectTab(tab.id)}
              title={tab.url ? `${tab.title}\n${tab.url}` : tab.title}
            >
              <span className="tab-favicon">
                <TabFavicon tab={tab} />
              </span>
              <span className="tab-switcher-title">{tab.title}</span>
              <span className="tab-switcher-meta">
                <span className="tab-switcher-url">{tab.location || tab.url}</span>
                {tab.active && <span className="tab-switcher-badge">Current</span>}
                {shortcut && <span className="tab-switcher-shortcut">{shortcut}</span>}
              </span>
            </button>
            );
          })}
        </div>

        <div className="tab-switcher-hint">
          <span><span className="tab-switcher-hint-key">1–9</span> Jump</span>
          <span><span className="tab-switcher-hint-key">↑↓</span> Select</span>
          <span><span className="tab-switcher-hint-key">↵</span> Open</span>
          <span><span className="tab-switcher-hint-key">esc</span> Close</span>
        </div>
      </div>
    </div>
  );
};

export default TabSwitcher;
