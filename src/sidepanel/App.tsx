import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import TabBar, { ToolTab } from './components/TabBar';
import TabSwitcher from './components/TabSwitcher';
import ToolCommandPalette from './components/ToolCommandPalette';
import { loadPreferences, savePreferences, getPendingInput } from '../shared/storage';
import { isOpenTabSwitcherHotkey } from '../shared/browserTabs';
import './App.css';

// Lazy-load all tools for fast initial load
const JsonFormatter = lazy(() => import('./tools/JsonFormatter'));
const YamlJsonConverter = lazy(() => import('./tools/YamlJsonConverter'));
const Base64Tool = lazy(() => import('./tools/Base64Tool'));
const UuidGenerator = lazy(() => import('./tools/UuidGenerator'));
const TimestampConverter = lazy(() => import('./tools/TimestampConverter'));
const CronExplainer = lazy(() => import('./tools/CronExplainer'));
const UrlEncoder = lazy(() => import('./tools/UrlEncoder'));
const JwtDecoder = lazy(() => import('./tools/JwtDecoder'));
const HashGenerator = lazy(() => import('./tools/HashGenerator'));
const RegexTester = lazy(() => import('./tools/RegexTester'));
const DummyDataGenerator = lazy(() => import('./tools/DummyDataGenerator'));
const DataFileReader = lazy(async () => {
  const module = await import('./tools/DummyDataGenerator');
  return { default: module.DataFileReader };
});
const DiffChecker = lazy(() => import('./tools/DiffChecker'));
const MarkdownPreview = lazy(() => import('./tools/MarkdownPreview'));
const TabsNavigator = lazy(() => import('./tools/TabsNavigator'));

const TOOLS: ToolTab[] = [
  { id: 'json-formatter', label: 'JSON', icon: '{ }', category: 'Transform', description: 'Format, validate, and inspect JSON' },
  { id: 'yaml-json', label: 'YAML', icon: 'Y↦', category: 'Transform', description: 'Convert YAML and JSON locally' },
  { id: 'base64', label: 'Base64', icon: '↔', category: 'Transform', description: 'Encode and decode Base64 data' },
  { id: 'url-encoder', label: 'URL', icon: '⌁', category: 'Transform', description: 'Encode, decode, and inspect URLs' },
  { id: 'jwt-decoder', label: 'JWT', icon: '◇', category: 'Transform', description: 'Decode token claims locally' },
  { id: 'hash-generator', label: 'Hash', icon: '#', category: 'Transform', description: 'Generate and compare hashes' },
  { id: 'uuid-generator', label: 'UUID', icon: '◌', category: 'Create', description: 'Generate UUIDs and ULIDs' },
  { id: 'timestamp', label: 'Time', icon: '◷', category: 'Create', description: 'Convert timestamps and dates' },
  { id: 'cron-explainer', label: 'Cron', icon: '⟳', category: 'Create', description: 'Explain cron and list next run times' },
  { id: 'dummy-data', label: 'Data', icon: '▦', category: 'Create', description: 'Generate realistic sample data' },
  { id: 'data-file-reader', label: 'Read files', icon: '▤', category: 'View', description: 'Inspect Avro and Parquet files locally' },
  { id: 'regex-tester', label: 'Regex', icon: '.*', category: 'Inspect', description: 'Test expressions and matches' },
  { id: 'diff-checker', label: 'Diff', icon: '±', category: 'Inspect', description: 'Compare text and code changes' },
  { id: 'markdown', label: 'MD', icon: 'M↓', category: 'Inspect', description: 'Write and preview Markdown' },
  { id: 'tabs', label: 'Tabs', icon: '↔', category: 'Browser', description: 'Jump between browser tabs' },
];

const TOOL_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<{ initialInput?: string }>>> = {
  'json-formatter': JsonFormatter,
  'yaml-json': YamlJsonConverter,
  'base64': Base64Tool,
  'uuid-generator': UuidGenerator,
  'timestamp': TimestampConverter,
  'cron-explainer': CronExplainer,
  'url-encoder': UrlEncoder,
  'jwt-decoder': JwtDecoder,
  'hash-generator': HashGenerator,
  'regex-tester': RegexTester,
  'dummy-data': DummyDataGenerator,
  'data-file-reader': DataFileReader,
  'diff-checker': DiffChecker,
  'markdown': MarkdownPreview,
  tabs: TabsNavigator,
};

const App: React.FC = () => {
  const [activeToolId, setActiveToolId] = useState('json-formatter');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [initialInput, setInitialInput] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Load saved active tool and theme on mount
  useEffect(() => {
    (async () => {
      const prefs = await loadPreferences();
      const initialTheme = prefs.theme || 'dark';
      setActiveToolId(prefs.activeToolId);
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
      setIsLoaded(true);
    })();
  }, []);

  // Check for pending input from context menu or content script
  useEffect(() => {
    if (!isLoaded) return;

    const checkPending = async () => {
      const pending = await getPendingInput();
      if (pending) {
        setActiveToolId(pending.toolId);
        setInitialInput(pending.text);
        await savePreferences({ activeToolId: pending.toolId });
      }
    };

    checkPending();

    // Also listen for storage changes (when new pending input arrives while page is open)
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.pendingInput?.newValue) {
        checkPending();
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [isLoaded]);

  const handleSelectTool = useCallback(async (toolId: string) => {
    setActiveToolId(toolId);
    setInitialInput(undefined);
    await savePreferences({ activeToolId: toolId });
  }, []);

  const handleToggleTheme = useCallback(async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    await savePreferences({ theme: nextTheme });
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k' && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        setCommandPaletteOpen((open) => !open);
        return;
      }
      if (!isOpenTabSwitcherHotkey(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setTabSwitcherOpen((open) => !open);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const ActiveComponent = TOOL_COMPONENTS[activeToolId];

  if (!isLoaded) {
    return (
      <div className="app-loading">
        <span className="loading-icon">⚡</span>
      </div>
    );
  }

  return (
    <div className="app">
      <TabBar
        tools={TOOLS}
        activeToolId={activeToolId}
        onSelectTool={handleSelectTool}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      <main className="tool-content">
        <div className="tool-container-inner">
          <Suspense fallback={<div className="tool-loading">Loading tool...</div>}>
            {ActiveComponent && <ActiveComponent initialInput={initialInput} />}
          </Suspense>
        </div>
      </main>
      <TabSwitcher open={tabSwitcherOpen} onClose={() => setTabSwitcherOpen(false)} />
      <ToolCommandPalette open={commandPaletteOpen} tools={TOOLS} activeToolId={activeToolId} onClose={() => setCommandPaletteOpen(false)} onSelectTool={handleSelectTool} />
    </div>
  );
};

export default App;
