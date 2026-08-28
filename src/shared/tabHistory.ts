export const TAB_HISTORY_KEY = 'hckr_tab_history';
export const MAX_HISTORY_PER_WINDOW = 200;

type TabHistoryMap = Record<number, number[]>;

function historyStore(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

export async function getTabHistory(): Promise<TabHistoryMap> {
  try {
    const result = await historyStore().get(TAB_HISTORY_KEY);
    return (result[TAB_HISTORY_KEY] as TabHistoryMap) || {};
  } catch {
    return {};
  }
}

export async function saveTabHistory(history: TabHistoryMap): Promise<void> {
  try {
    await historyStore().set({ [TAB_HISTORY_KEY]: history });
  } catch (err) {
    console.error('Failed to save tab history:', err);
  }
}

export function tabLastAccessed(tab: chrome.tabs.Tab): number {
  const value = (tab as chrome.tabs.Tab & { lastAccessed?: number }).lastAccessed;
  return typeof value === 'number' ? value : 0;
}

export function sortTabsByLastUsed(tabs: chrome.tabs.Tab[], mruIds: number[]): chrome.tabs.Tab[] {
  const rank = new Map(mruIds.map((id, index) => [id, index]));

  return [...tabs].sort((left, right) => {
    const accessedDelta = tabLastAccessed(right) - tabLastAccessed(left);
    if (accessedDelta !== 0) {
      return accessedDelta;
    }

    const leftRank = rank.get(left.id ?? -1) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = rank.get(right.id ?? -1) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return (left.index ?? 0) - (right.index ?? 0);
  });
}
