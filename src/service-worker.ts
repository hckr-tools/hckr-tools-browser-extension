/// <reference types="chrome" />

const APP_PATH = 'src/sidepanel/index.html';

/**
 * Open or focus the hckr full-page tab.
 */
async function openOrFocusAppTab(targetToolId?: string, text?: string): Promise<void> {
  if (targetToolId && text) {
    await chrome.storage.local.set({
      pendingInput: {
        toolId: targetToolId,
        text,
        timestamp: Date.now(),
      },
    });
  }

  const appUrl = chrome.runtime.getURL(APP_PATH);
  const allTabs = await chrome.tabs.query({});
  const existingTab = allTabs.find((t) => t.url && t.url.startsWith(appUrl));

  if (existingTab && existingTab.id) {
    await chrome.tabs.update(existingTab.id, { active: true });
    if (existingTab.windowId) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: appUrl });
  }
}

// Open full-page tab when extension icon is clicked
chrome.action.onClicked.addListener(async () => {
  await openOrFocusAppTab();
});

// Register context menu items on install
chrome.runtime.onInstalled.addListener(() => {
  const menuItems = [
    { id: 'hckr-format-json', title: 'hckr: Format JSON' },
    { id: 'hckr-decode-base64', title: 'hckr: Decode Base64' },
    { id: 'hckr-decode-jwt', title: 'hckr: Decode JWT' },
    { id: 'hckr-encode-url', title: 'hckr: URL Encode/Decode' },
    { id: 'hckr-generate-uuid', title: 'hckr: Generate UUID' },
    { id: 'hckr-convert-timestamp', title: 'hckr: Convert Timestamp' },
    { id: 'hckr-generate-hash', title: 'hckr: Generate Hash' },
    { id: 'hckr-test-regex', title: 'hckr: Test Regex' },
  ];

  for (const item of menuItems) {
    chrome.contextMenus.create({
      ...item,
      contexts: ['selection'],
    });
  }
});

// Map context menu IDs to tool IDs
const menuToTool: Record<string, string> = {
  'hckr-format-json': 'json-formatter',
  'hckr-decode-base64': 'base64',
  'hckr-decode-jwt': 'jwt-decoder',
  'hckr-encode-url': 'url-encoder',
  'hckr-generate-uuid': 'uuid-generator',
  'hckr-convert-timestamp': 'timestamp',
  'hckr-generate-hash': 'hash-generator',
  'hckr-test-regex': 'regex-tester',
};

// Handle context menu clicks -> open/focus full tab with data
chrome.contextMenus.onClicked.addListener(async (info) => {
  const toolId = menuToTool[info.menuItemId as string];
  if (!toolId || !info.selectionText) return;

  await openOrFocusAppTab(toolId, info.selectionText);
});

// Handle messages from content script widget -> open/focus full tab with data
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SEND_TO_TOOL') {
    (async () => {
      await openOrFocusAppTab(message.toolId, message.text);
      sendResponse({ success: true });
    })();
    return true; // keeps channel open for async response
  }
});

/* ==========================================================================
   Tab Switcher (Previous Active Tab Toggle)
   ========================================================================== */

const sessionStorageArea = chrome.storage?.session ?? chrome.storage?.local;
const TAB_HISTORY_KEY = 'hckr_tab_history';
const MAX_HISTORY_PER_WINDOW = 10;

/**
 * Load tab history map (windowId -> tabId[]) from session storage.
 */
async function getTabHistory(): Promise<Record<number, number[]>> {
  try {
    const result = await sessionStorageArea.get(TAB_HISTORY_KEY);
    return (result[TAB_HISTORY_KEY] as Record<number, number[]>) || {};
  } catch {
    return {};
  }
}

/**
 * Save tab history map to session storage.
 */
async function saveTabHistory(history: Record<number, number[]>): Promise<void> {
  try {
    await sessionStorageArea.set({ [TAB_HISTORY_KEY]: history });
  } catch (err) {
    console.error('Failed to save tab history:', err);
  }
}

/**
 * Record a tab activation event into the window's MRU stack.
 */
async function recordTabActivation(windowId: number, tabId: number): Promise<void> {
  const history = await getTabHistory();
  const currentStack = history[windowId] || [];
  const updatedStack = [tabId, ...currentStack.filter((id) => id !== tabId)].slice(
    0,
    MAX_HISTORY_PER_WINDOW
  );
  history[windowId] = updatedStack;
  await saveTabHistory(history);
}

/**
 * Remove a closed or replaced tab from history.
 */
async function removeTabFromHistory(tabId: number, windowId?: number): Promise<void> {
  const history = await getTabHistory();
  if (windowId && history[windowId]) {
    history[windowId] = history[windowId].filter((id) => id !== tabId);
  } else {
    for (const winId of Object.keys(history)) {
      const numericWinId = Number(winId);
      history[numericWinId] = history[numericWinId].filter((id) => id !== tabId);
    }
  }
  await saveTabHistory(history);
}

/**
 * Switch to the previously active tab in the current window.
 */
async function switchToPreviousTab(): Promise<void> {
  try {
    const currentWindow = await chrome.windows.getLastFocused({ populate: false });
    if (!currentWindow.id) return;

    const windowId = currentWindow.id;
    const history = await getTabHistory();
    const stack = history[windowId] || [];

    // stack[0] is the current tab; find the first valid previous tab in stack[1..]
    let targetTabId: number | null = null;
    const invalidTabIds: number[] = [];

    for (let i = 1; i < stack.length; i++) {
      const candidateId = stack[i];
      try {
        const tab = await chrome.tabs.get(candidateId);
        if (tab && tab.windowId === windowId) {
          targetTabId = candidateId;
          break;
        } else {
          invalidTabIds.push(candidateId);
        }
      } catch {
        invalidTabIds.push(candidateId);
      }
    }

    // Clean up any stale tab IDs found
    if (invalidTabIds.length > 0) {
      history[windowId] = stack.filter((id) => !invalidTabIds.includes(id));
      await saveTabHistory(history);
    }

    if (targetTabId !== null) {
      await chrome.tabs.update(targetTabId, { active: true });
    }
  } catch (err) {
    console.error('Error switching to previous tab:', err);
  }
}

// Track tab activations
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  recordTabActivation(windowId, tabId);
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId, { windowId }) => {
  removeTabFromHistory(tabId, windowId);
});

// Clean up when tabs are replaced (e.g. prerendering)
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  (async () => {
    const history = await getTabHistory();
    for (const winId of Object.keys(history)) {
      const numericWinId = Number(winId);
      history[numericWinId] = history[numericWinId].map((id) =>
        id === removedTabId ? addedTabId : id
      );
    }
    await saveTabHistory(history);
  })();
});

// Clean up history when a window is closed
chrome.windows.onRemoved.addListener(async (windowId) => {
  const history = await getTabHistory();
  if (history[windowId]) {
    delete history[windowId];
    await saveTabHistory(history);
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'switch-to-previous-tab') {
    switchToPreviousTab();
  }
});

