import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import TabBar, { ToolTab } from './components/TabBar';
import { loadPreferences, savePreferences, getPendingInput } from '../shared/storage';
import './App.css';

// Lazy-load all tools for better initial load
const JsonFormatter = lazy(() => import('./tools/JsonFormatter'));
const Base64Tool = lazy(() => import('./tools/Base64Tool'));
const UuidGenerator = lazy(() => import('./tools/UuidGenerator'));
const TimestampConverter = lazy(() => import('./tools/TimestampConverter'));
const UrlEncoder = lazy(() => import('./tools/UrlEncoder'));
const JwtDecoder = lazy(() => import('./tools/JwtDecoder'));
const HashGenerator = lazy(() => import('./tools/HashGenerator'));
const RegexTester = lazy(() => import('./tools/RegexTester'));
const DummyDataGenerator = lazy(() => import('./tools/DummyDataGenerator'));
const DiffChecker = lazy(() => import('./tools/DiffChecker'));
const MarkdownPreview = lazy(() => import('./tools/MarkdownPreview'));

const TOOLS: ToolTab[] = [
  { id: 'json-formatter', label: 'JSON', icon: '{ }' },
  { id: 'base64', label: 'Base64', icon: '🔤' },
  { id: 'uuid-generator', label: 'UUID', icon: '🆔' },
  { id: 'timestamp', label: 'Time', icon: '⏰' },
  { id: 'url-encoder', label: 'URL', icon: '🔗' },
  { id: 'jwt-decoder', label: 'JWT', icon: '🔐' },
  { id: 'hash-generator', label: 'Hash', icon: '#️⃣' },
  { id: 'regex-tester', label: 'Regex', icon: '🔍' },
  { id: 'dummy-data', label: 'Data', icon: '📋' },
  { id: 'diff-checker', label: 'Diff', icon: '📊' },
  { id: 'markdown', label: 'MD', icon: '📝' },
];

const TOOL_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<{ initialInput?: string }>>> = {
  'json-formatter': JsonFormatter,
  'base64': Base64Tool,
  'uuid-generator': UuidGenerator,
  'timestamp': TimestampConverter,
  'url-encoder': UrlEncoder,
  'jwt-decoder': JwtDecoder,
  'hash-generator': HashGenerator,
  'regex-tester': RegexTester,
  'dummy-data': DummyDataGenerator,
  'diff-checker': DiffChecker,
  'markdown': MarkdownPreview,
};

const App: React.FC = () => {
  const [activeToolId, setActiveToolId] = useState('json-formatter');
  const [initialInput, setInitialInput] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved active tool on mount
  useEffect(() => {
    (async () => {
      const prefs = await loadPreferences();
      setActiveToolId(prefs.activeToolId);
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

    // Also listen for storage changes (when new pending input arrives while panel is open)
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
    setInitialInput(undefined); // Clear initial input when switching manually
    await savePreferences({ activeToolId: toolId });
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
      />
      <div className="tool-content">
        <Suspense fallback={<div className="tool-loading">Loading...</div>}>
          {ActiveComponent && <ActiveComponent initialInput={initialInput} />}
        </Suspense>
      </div>
    </div>
  );
};

export default App;
