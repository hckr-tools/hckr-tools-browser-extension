/**
 * Typed wrappers around chrome.storage.local for the hckr extension.
 */

export interface ToolState {
  input?: string;
  secondaryInput?: string;
  options?: Record<string, unknown>;
}

export interface HckrPreferences {
  activeToolId: string;
  pinnedTools: string[];
  toolHistory: Record<string, ToolState>;
  theme: 'dark' | 'light';
}

const PREFS_KEY = 'hckr_prefs';

/**
 * Load all preferences from storage.
 */
export async function loadPreferences(): Promise<HckrPreferences> {
  const result = await chrome.storage.local.get(PREFS_KEY);
  return (
    result[PREFS_KEY] ?? {
      activeToolId: 'json-formatter',
      pinnedTools: [],
      toolHistory: {},
      theme: 'dark',
    }
  );
}

/**
 * Save preferences to storage.
 */
export async function savePreferences(prefs: Partial<HckrPreferences>): Promise<void> {
  const current = await loadPreferences();
  await chrome.storage.local.set({
    [PREFS_KEY]: { ...current, ...prefs },
  });
}

/**
 * Save tool-specific state.
 */
export async function saveToolState(toolId: string, state: ToolState): Promise<void> {
  const prefs = await loadPreferences();
  prefs.toolHistory[toolId] = state;
  await chrome.storage.local.set({ [PREFS_KEY]: prefs });
}

/**
 * Load tool-specific state.
 */
export async function loadToolState(toolId: string): Promise<ToolState | null> {
  const prefs = await loadPreferences();
  return prefs.toolHistory[toolId] ?? null;
}

/**
 * Get pending input from context menu or content script.
 */
export interface PendingInput {
  toolId: string;
  text: string;
  timestamp: number;
}

export async function getPendingInput(): Promise<PendingInput | null> {
  const result = await chrome.storage.local.get('pendingInput');
  if (result.pendingInput) {
    // Clear it after reading
    await chrome.storage.local.remove('pendingInput');
    return result.pendingInput;
  }
  return null;
}
