/// <reference types="chrome" />

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
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

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const toolId = menuToTool[info.menuItemId as string];
  if (!toolId || !info.selectionText) return;

  // Store the selected text and target tool for the side panel to pick up
  await chrome.storage.local.set({
    pendingInput: {
      toolId,
      text: info.selectionText,
      timestamp: Date.now(),
    },
  });

  // Open side panel
  if (tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SEND_TO_TOOL') {
    (async () => {
      await chrome.storage.local.set({
        pendingInput: {
          toolId: message.toolId,
          text: message.text,
          timestamp: Date.now(),
        },
      });

      const window = await chrome.windows.getLastFocused();
      if (window.id) {
        await chrome.sidePanel.open({ windowId: window.id });
      }

      sendResponse({ success: true });
    })();
    return true; // keeps channel open for async response
  }
});
