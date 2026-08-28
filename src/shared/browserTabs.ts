import { getTabHistory, sortTabsByLastUsed } from './tabHistory';

export interface BrowserTab {
  id: number;
  title: string;
  url: string;
  location: string;
  favIconUrl: string;
  active: boolean;
}

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

export function filterTabs(tabs: BrowserTab[], query: string): BrowserTab[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return tabs;
  }

  return tabs.filter((tab) =>
    [tab.title, tab.url, tab.location].some((value) => value.toLowerCase().includes(needle))
  );
}
