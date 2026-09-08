/**
 * Typed message passing between the extension UI and service worker.
 */

export type MessageType =
  | 'OPEN_TAB_SWITCHER'
  | 'TOOL_OPENED'
  | 'PING';

export interface HckrMessage {
  type: MessageType;
  toolId?: string;
  text?: string;
}

/**
 * Send a message from the extension UI to the service worker.
 */
export async function sendToBackground(message: HckrMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}
