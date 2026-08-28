import React, { useCallback, useEffect, useState } from 'react';
import './TabsNavigator.css';

interface BrowserTab {
  id: number;
  title: string;
  url: string;
  active: boolean;
}

const TabsNavigator: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTabs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const extensionUrl = chrome.runtime.getURL('');
      const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });
      setTabs(
        currentWindowTabs
          .filter((tab): tab is chrome.tabs.Tab & { id: number } =>
            tab.id !== undefined && !tab.url?.startsWith(extensionUrl)
          )
          .map((tab) => ({
            id: tab.id,
            title: tab.title || 'Untitled tab',
            url: tab.url || '',
            active: Boolean(tab.active),
          }))
      );
    } catch (err) {
      console.error('Failed to load browser tabs:', err);
      setError('Unable to read the tabs in this window. Try refreshing this page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  const jumpToTab = useCallback(async (tabId: number) => {
    await chrome.tabs.update(tabId, { active: true });
  }, []);

  return (
    <section className="tabs-navigator" aria-labelledby="tabs-heading">
      <div className="tabs-navigator-header">
        <div>
          <p className="tool-eyebrow">BROWSER NAVIGATION</p>
          <h1 id="tabs-heading">Jump between tabs</h1>
          <p className="tabs-navigator-description">
            Choose an open tab below to switch to it. Press <kbd>Alt</kbd> + <kbd>Q</kbd> to return to the previously active tab.
          </p>
        </div>
        <button className="tabs-refresh-button" onClick={loadTabs} disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="tabs-message tabs-error" role="alert">{error}</p>}

      {!error && !isLoading && tabs.length === 0 && (
        <p className="tabs-message">No other browser tabs are open in this window.</p>
      )}

      <div className="tabs-list" aria-label="Open browser tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`browser-tab ${tab.active ? 'active' : ''}`}
            onClick={() => jumpToTab(tab.id)}
            title={tab.title}
          >
            <span className="browser-tab-title">{tab.title}</span>
            <span className="browser-tab-url">{tab.url}</span>
            {tab.active && <span className="browser-tab-current">Current</span>}
          </button>
        ))}
      </div>
    </section>
  );
};

export default TabsNavigator;
