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
