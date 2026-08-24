/**
 * Typed message passing between content script ↔ service worker ↔ side panel.
 */

export type MessageType =
  | 'SEND_TO_TOOL'
  | 'TOOL_OPENED'
  | 'PING';

export interface HckrMessage {
  type: MessageType;
  toolId?: string;
  text?: string;
}

/**
 * Send a message from content script or side panel to the service worker.
 */
export async function sendToBackground(message: HckrMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}
