import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  closeDuplicateTabs,
  filterTabs,
  findDuplicateTabIds,
  jumpToTab,
  listWindowTabs,
  type BrowserTab,
} from '../../shared/browserTabs';
import TabFavicon from '../components/TabFavicon';
import './TabsNavigator.css';

const TabsNavigator: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosingDuplicates, setIsClosingDuplicates] = useState(false);

  const loadTabs = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const extensionUrl = chrome.runtime.getURL('');
      const windowTabs = await listWindowTabs();
      setTabs(windowTabs.filter((tab) => !tab.url.startsWith(extensionUrl)));
    } catch (err) {
      console.error('Failed to load browser tabs:', err);
      setError('Unable to read the tabs in this window. Try refreshing this page.');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadTabs(true);

    let timeoutId: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void loadTabs(false);
      }, 200);
    };

    chrome.tabs.onCreated.addListener(scheduleRefresh);
    chrome.tabs.onRemoved.addListener(scheduleRefresh);
    const handleUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.title !== undefined || changeInfo.url !== undefined || changeInfo.favIconUrl !== undefined) {
        scheduleRefresh();
      }
    };
    chrome.tabs.onUpdated.addListener(handleUpdated);
    chrome.tabs.onActivated.addListener(scheduleRefresh);
    chrome.tabs.onMoved.addListener(scheduleRefresh);

    return () => {
      window.clearTimeout(timeoutId);
      chrome.tabs.onCreated.removeListener(scheduleRefresh);
      chrome.tabs.onRemoved.removeListener(scheduleRefresh);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      chrome.tabs.onActivated.removeListener(scheduleRefresh);
      chrome.tabs.onMoved.removeListener(scheduleRefresh);
    };
  }, [loadTabs]);

  const filteredTabs = useMemo(() => filterTabs(tabs, query), [query, tabs]);
  const duplicateTabIds = useMemo(() => findDuplicateTabIds(tabs), [tabs]);
  const duplicateIdSet = useMemo(() => new Set(duplicateTabIds), [duplicateTabIds]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timer = window.setTimeout(() => setStatusMessage(null), 4000);
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
      setStatusMessage(`Closed ${closed} duplicate ${closed === 1 ? 'tab' : 'tabs'}.`);
      await loadTabs(false);
    } catch (err) {
      console.error('Failed to close duplicate tabs:', err);
      setError('Failed to close duplicate tabs. Try refreshing.');
    } finally {
      setIsClosingDuplicates(false);
    }
  }, [duplicateTabIds, isClosingDuplicates, loadTabs]);

  return (
    <section className="tabs-navigator" aria-labelledby="tabs-heading">
      <div className="tabs-navigator-header">
        <p className="tool-eyebrow">BROWSER NAVIGATION</p>
        <h1 id="tabs-heading">Jump between tabs</h1>
        <p className="tabs-navigator-description">
          Choose an open tab below to switch to it. Tabs are listed by last used. Press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>K</kbd> for the hckr-tools tab switcher, or <kbd>⌥</kbd>/<kbd>Alt</kbd> + <kbd>Q</kbd> to return to the previously active tab.
        </p>
      </div>

      <div className="tabs-toolbar">
        <input
          className="input tabs-filter-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && query) {
              event.preventDefault();
              setQuery('');
            }
          }}
          placeholder="Filter by title or site"
          aria-label="Filter open tabs"
          autoFocus
        />
        <p className="tabs-count">
          {query.trim()
            ? `${filteredTabs.length} of ${tabs.length}`
            : `${tabs.length} ${tabs.length === 1 ? 'tab' : 'tabs'}`}
        </p>
        <button
          className="tabs-close-duplicates-button"
          onClick={() => void handleCloseDuplicates()}
          disabled={isLoading || isClosingDuplicates || duplicateTabIds.length === 0}
          title={
            duplicateTabIds.length > 0
              ? `Close ${duplicateTabIds.length} duplicate ${duplicateTabIds.length === 1 ? 'tab' : 'tabs'}`
              : 'No duplicate tabs found'
          }
        >
          {isClosingDuplicates
            ? 'Closing…'
            : `Close duplicates${duplicateTabIds.length > 0 ? ` (${duplicateTabIds.length})` : ''}`}
        </button>
        <button className="tabs-refresh-button" onClick={() => void loadTabs(true)} disabled={isLoading || isClosingDuplicates}>
          {isLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {statusMessage && <p className="tabs-message tabs-success" role="status">{statusMessage}</p>}
      {error && <p className="tabs-message tabs-error" role="alert">{error}</p>}

      {!error && !isLoading && tabs.length === 0 && (
        <p className="tabs-message">No other browser tabs are open in this window.</p>
      )}

      {!error && tabs.length > 0 && filteredTabs.length === 0 && (
        <p className="tabs-message">No tabs match “{query.trim()}”.</p>
      )}

      <div className="tabs-list" aria-label="Open browser tabs">
        {filteredTabs.map((tab) => (
          <button
            key={tab.id}
            className={`browser-tab ${tab.active ? 'active' : ''}`}
            onClick={() => void jumpToTab(tab.id)}
            title={tab.url ? `${tab.title}\n${tab.url}` : tab.title}
          >
            <span className="tab-favicon">
              <TabFavicon tab={tab} />
            </span>
            <span className="browser-tab-copy">
              <span className="browser-tab-title">{tab.title}</span>
              <span className="browser-tab-url">{tab.location || tab.url}</span>
            </span>
            {duplicateIdSet.has(tab.id) && <span className="browser-tab-duplicate">Duplicate</span>}
            {tab.active && <span className="browser-tab-current">Current</span>}
          </button>
        ))}
      </div>
    </section>
  );
};

export default TabsNavigator;

