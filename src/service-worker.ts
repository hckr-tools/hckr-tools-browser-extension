/// <reference types="chrome" />

import {
  getTabHistory,
  MAX_HISTORY_PER_WINDOW,
  saveTabHistory,
} from './shared/tabHistory';

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

const SWITCHER_POPUP_WIDTH = 640;
const SWITCHER_POPUP_HEIGHT = 540;
let switcherOpenInFlight = false;

/**
 * Open or focus the Cmd+K tab jump palette over the last used browser window.
 */
async function openTabSwitcher(): Promise<void> {
  if (switcherOpenInFlight) {
    return;
  }
  switcherOpenInFlight = true;

  try {
    const focusedWindow = await chrome.windows.getLastFocused();
    const appUrl = chrome.runtime.getURL(APP_PATH);
    const switcherMarker = 'switcher=1';

    if (focusedWindow.type !== 'popup') {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        windowId: focusedWindow.id,
      });
      if (activeTab?.url?.startsWith(appUrl) && !activeTab.url.includes(switcherMarker)) {
        return;
      }
    }

    const allTabs = await chrome.tabs.query({});
    const existingSwitcher = allTabs.find((tab) => tab.url?.startsWith(appUrl) && tab.url.includes(switcherMarker));

    if (existingSwitcher?.windowId) {
      await chrome.windows.update(existingSwitcher.windowId, { focused: true });
      return;
    }

    const sourceWindow = focusedWindow.type === 'normal'
      ? focusedWindow
      : await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    const windowId = sourceWindow.id;
    const left = Math.round((sourceWindow.left ?? 0) + ((sourceWindow.width ?? SWITCHER_POPUP_WIDTH) - SWITCHER_POPUP_WIDTH) / 2);
    const top = Math.round((sourceWindow.top ?? 0) + 96);
    const switcherUrl = `${appUrl}?${switcherMarker}${windowId ? `&windowId=${windowId}` : ''}`;

    await chrome.windows.create({
      url: switcherUrl,
      type: 'popup',
      width: SWITCHER_POPUP_WIDTH,
      height: SWITCHER_POPUP_HEIGHT,
      focused: true,
      left: Math.max(left, sourceWindow.left ?? 0),
      top: Math.max(top, sourceWindow.top ?? 0),
    });
  } catch (err) {
    console.error('Failed to open tab switcher:', err);
  } finally {
    switcherOpenInFlight = false;
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

  if (message.type === 'OPEN_TAB_SWITCHER') {
    (async () => {
      await openTabSwitcher();
      sendResponse({ success: true });
    })();
    return true;
  }
});

/* ==========================================================================
   Tab Switcher (Previous Active Tab Toggle)
   ========================================================================== */

/**
 * Record a tab activation event into the window's MRU stack.
 */
let historyCache: Record<number, number[]> | null = null;
let historyLoading: Promise<Record<number, number[]>> | null = null;
let historyWriteTimer: ReturnType<typeof setTimeout> | null = null;

async function history(): Promise<Record<number, number[]>> {
  if (historyCache) return historyCache;
  historyLoading ??= getTabHistory().then((stored) => (historyCache = stored));
  return historyLoading;
}

function scheduleHistorySave(): void {
  if (historyWriteTimer) clearTimeout(historyWriteTimer);
  historyWriteTimer = setTimeout(() => {
    historyWriteTimer = null;
    if (historyCache) void saveTabHistory(historyCache);
  }, 250);
}

async function recordTabActivation(windowId: number, tabId: number): Promise<void> {
  const stored = await history();
  const currentStack = stored[windowId] || [];
  stored[windowId] = [tabId, ...currentStack.filter((id) => id !== tabId)].slice(0, MAX_HISTORY_PER_WINDOW);
  scheduleHistorySave();
}

async function removeTabFromHistory(tabId: number, windowId?: number): Promise<void> {
  const stored = await history();
  if (windowId && stored[windowId]) {
    stored[windowId] = stored[windowId].filter((id) => id !== tabId);
  } else {
    for (const winId of Object.keys(stored)) stored[Number(winId)] = stored[Number(winId)].filter((id) => id !== tabId);
  }
  scheduleHistorySave();
}

/**
 * Switch to the previously active tab in the current window.
 */
async function switchToPreviousTab(): Promise<void> {
  try {
    const currentWindow = await chrome.windows.getLastFocused({ populate: false });
    if (!currentWindow.id) return;

    const windowId = currentWindow.id;
    const stored = await history();
    const stack = stored[windowId] || [];

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
      stored[windowId] = stack.filter((id) => !invalidTabIds.includes(id));
      scheduleHistorySave();
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
    const stored = await history();
    for (const winId of Object.keys(stored)) {
      const numericWinId = Number(winId);
      stored[numericWinId] = stored[numericWinId].map((id) =>
        id === removedTabId ? addedTabId : id
      );
    }
    scheduleHistorySave();
  })();
});

// Clean up history when a window is closed
chrome.windows.onRemoved.addListener(async (windowId) => {
  const stored = await history();
  if (stored[windowId]) {
    delete stored[windowId];
    scheduleHistorySave();
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'switch-to-previous-tab') {
    void switchToPreviousTab();
  }
  if (command === 'open-tab-switcher') {
    void openTabSwitcher();
  }
});
