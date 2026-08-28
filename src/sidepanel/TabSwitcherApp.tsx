import React, { useEffect, useMemo, useState } from 'react';
import TabSwitcher from './components/TabSwitcher';
import { loadPreferences } from '../shared/storage';
import './App.css';

const TabSwitcherApp: React.FC = () => {
  const [ready, setReady] = useState(false);
  const windowId = useMemo(() => {
    const value = Number(new URLSearchParams(window.location.search).get('windowId'));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }, []);

  useEffect(() => {
    (async () => {
      const prefs = await loadPreferences();
      document.documentElement.setAttribute('data-theme', prefs.theme || 'dark');
      document.title = 'hckr-tools tab switcher';
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="app-loading">
        <span className="loading-icon">⚡</span>
      </div>
    );
  }

  return (
    <TabSwitcher
      open
      standalone
      windowId={windowId}
      onClose={() => window.close()}
    />
  );
};

export default TabSwitcherApp;
