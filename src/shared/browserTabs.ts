import { getTabHistory, sortTabsByLastUsed } from './tabHistory';

export interface BrowserTab {
  id: number;
  title: string;
  url: string;
  location: string;
  favIconUrl: string;
  active: boolean;
}

export interface HistoryTab {
  source: 'history';
  title: string;
  url: string;
  location: string;
  favIconUrl: string;
  lastVisitTime: number;
}

export type TabSearchResult =
  | (BrowserTab & { source: 'open' })
  | HistoryTab;

const HISTORY_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HISTORY_RESULTS = 8;

export function isOpenTabSwitcherHotkey(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.altKey && !event.shiftKey;
}

export function tabLocationLabel(url: string): string {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'about:') {
      return parsed.href.replace(/\/$/, '');
    }
    if (parsed.protocol === 'file:') {
      return parsed.pathname;
    }
    if (parsed.protocol === 'chrome:' || parsed.protocol === 'chrome-extension:') {
      const path = parsed.pathname === '/' ? '' : parsed.pathname;
      return `${parsed.hostname || parsed.protocol.replace(':', '')}${path}`;
    }

    const host = parsed.host.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    return `${host}${path}`;
  } catch {
    return url;
  }
}

export function tabTitle(title: string | undefined, url: string, location: string): string {
  const trimmed = title?.trim();
  if (trimmed && trimmed !== url) {
    return trimmed;
  }
  return location || 'Untitled tab';
}

export function tabMonogram(title: string, location: string): string {
  const fromTitle = title.match(/[A-Za-z]/);
  if (fromTitle) {
    return fromTitle[0].toUpperCase();
  }
  const fromLocation = location.replace(/^www\./, '').charAt(0);
  return fromLocation ? fromLocation.toUpperCase() : '•';
}

export function mapChromeTab(tab: chrome.tabs.Tab): BrowserTab | null {
  if (tab.id === undefined) {
    return null;
  }

  const url = tab.url || '';
  const location = tabLocationLabel(url);
  return {
    id: tab.id,
    title: tabTitle(tab.title, url, location),
    url,
    location,
    favIconUrl: tab.favIconUrl || '',
    active: Boolean(tab.active),
  };
}

export function isTabSwitcherUrl(url: string | undefined): boolean {
  return Boolean(url?.includes('switcher=1'));
}

export async function listWindowTabs(windowId?: number): Promise<BrowserTab[]> {
  const queried = windowId === undefined
    ? await chrome.tabs.query({ currentWindow: true })
    : await chrome.tabs.query({ windowId });

  const targetWindowId = windowId ?? queried.find((tab) => tab.windowId !== undefined)?.windowId;
  const history = await getTabHistory();
  const mruIds = targetWindowId === undefined ? [] : (history[targetWindowId] || []);

  return sortTabsByLastUsed(
    queried.filter((tab) => tab.id !== undefined && !isTabSwitcherUrl(tab.url)),
    mruIds
  )
    .map(mapChromeTab)
    .filter((tab): tab is BrowserTab => tab !== null);
}

export async function jumpToTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.update(tabId, { active: true });
  if (tab.windowId === undefined) {
    return;
  }
  try {
    await chrome.windows.update(tab.windowId, { focused: true });
  } catch {
    // Focusing the window is best-effort; switching the tab still succeeded.
  }
}

export async function listHistoryTabs(query: string): Promise<HistoryTab[]> {
  const searchText = query.trim();
  if (!searchText) {
    return [];
  }

  const [historyItems, openTabs] = await Promise.all([
    chrome.history.search({
      text: searchText,
      startTime: Date.now() - HISTORY_LOOKBACK_MS,
      maxResults: MAX_HISTORY_RESULTS,
    }),
    chrome.tabs.query({}),
  ]);
  const openUrls = new Set(openTabs.flatMap((tab) => tab.url ? [tab.url] : []));
  const seenUrls = new Set<string>();

  return historyItems
    .filter((item) => Boolean(item.url) && !openUrls.has(item.url!))
    .sort((left, right) => (right.lastVisitTime ?? 0) - (left.lastVisitTime ?? 0))
    .filter((item) => {
      const url = item.url!;
      if (seenUrls.has(url)) {
        return false;
      }
      seenUrls.add(url);
      return true;
    })
    .map((item) => {
      const url = item.url!;
      const location = tabLocationLabel(url);
      return {
        source: 'history' as const,
        title: tabTitle(item.title, url, location),
        url,
        location,
        favIconUrl: '',
        lastVisitTime: item.lastVisitTime ?? 0,
      };
    });
}

export async function openOrFocusUrl(url: string, windowId?: number): Promise<void> {
  const openTabs = await chrome.tabs.query({});
  const existingTab = openTabs.find((tab) => tab.url === url);

  if (existingTab?.id !== undefined) {
    await jumpToTab(existingTab.id);
    return;
  }

  await chrome.tabs.create({
    url,
    active: true,
    ...(windowId === undefined ? {} : { windowId }),
  });
}

export function lastVisitedLabel(lastVisitTime: number): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - lastVisitTime) / 60_000));
  if (elapsedMinutes < 1) {
    return 'Visited just now';
  }
  if (elapsedMinutes < 60) {
    return `Visited ${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `Visited ${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `Visited ${elapsedDays}d ago`;
}

export function filterTabs(tabs: BrowserTab[], query: string): BrowserTab[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return tabs;
  }

  return tabs.filter((tab) =>
    [tab.title, tab.url, tab.location].some((value) => value.toLowerCase().includes(needle))
  );
}

export function normalizeTabUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const pathname = parsed.pathname.length > 1 && parsed.pathname.endsWith('/')
        ? parsed.pathname.slice(0, -1)
        : parsed.pathname;
      return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.href.replace(/\/+$/, '');
  } catch {
    return trimmed.endsWith('/') && trimmed.length > 1
      ? trimmed.slice(0, -1)
      : trimmed;
  }
}

export function findDuplicateTabIds(tabs: BrowserTab[]): number[] {
  const extensionPrefix = typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('')
    : '';

  const groups = new Map<string, BrowserTab[]>();

  for (const tab of tabs) {
    if (!tab.url) {
      continue;
    }
    if (extensionPrefix && tab.url.startsWith(extensionPrefix)) {
      continue;
    }
    if (isTabSwitcherUrl(tab.url)) {
      continue;
    }

    const normalized = normalizeTabUrl(tab.url);
    if (!normalized) {
      continue;
    }

    const list = groups.get(normalized) || [];
    list.push(tab);
    groups.set(normalized, list);
  }

  const idsToClose: number[] = [];

  for (const group of groups.values()) {
    if (group.length <= 1) {
      continue;
    }

    const activeIndex = group.findIndex((tab) => tab.active);
    const keepIndex = activeIndex >= 0 ? activeIndex : 0;

    for (let i = 0; i < group.length; i++) {
      if (i !== keepIndex) {
        idsToClose.push(group[i].id);
      }
    }
  }

  return idsToClose;
}

export function getDuplicateTabIdSet(tabs: BrowserTab[]): Set<number> {
  return new Set(findDuplicateTabIds(tabs));
}

export async function closeDuplicateTabs(target?: BrowserTab[] | number[] | number): Promise<number> {
  let idsToClose: number[] = [];

  if (Array.isArray(target)) {
    if (target.length === 0) {
      return 0;
    }
    if (typeof target[0] === 'number') {
      idsToClose = target as number[];
    } else {
      idsToClose = findDuplicateTabIds(target as BrowserTab[]);
    }
  } else {
    const windowTabs = await listWindowTabs(target);
    idsToClose = findDuplicateTabIds(windowTabs);
  }

  if (idsToClose.length === 0) {
    return 0;
  }

  try {
    await chrome.tabs.remove(idsToClose);
  } catch (err) {
    console.warn('Failed to close some duplicate tabs:', err);
  }

  return idsToClose.length;
}

