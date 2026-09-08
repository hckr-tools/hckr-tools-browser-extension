import React, { useState, useEffect, useRef } from 'react';
import { getSyncStatus, signInWithGitHub, signOutCloudSync, flushCloudSync, formatRelativeTime, type SyncStatus } from '../../shared/cloudSync';
import { GitHubIcon, ToolIcon } from './ToolIcon';
import './TabBar.css';

export type ToolCategory = 'Workspace' | 'Transform' | 'Create' | 'View' | 'Inspect' | 'Browser';

export interface ToolTab {
  id: string;
  label: string;
  icon: string;
  category: ToolCategory;
  description: string;
  shortcutHint?: string;
}

interface TabBarProps {
  tools: ToolTab[];
  activeToolId: string;
  onSelectTool: (id: string) => void;
  onOpenCommandPalette: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  cloudSyncEnabled?: boolean;
}

const CATEGORIES: ToolCategory[] = ['Workspace', 'Transform', 'Create', 'View', 'Inspect', 'Browser'];

const TabBar: React.FC<TabBarProps> = ({
  tools,
  activeToolId,
  onSelectTool,
  onOpenCommandPalette,
  theme,
  onToggleTheme,
  cloudSyncEnabled = false,
}) => {
  const [showProfile, setShowProfile] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ configured: false, signedIn: false });
  const [signInError, setSignInError] = useState<string>();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getSyncStatus().then(setSyncStatus);
    const handler = () => {
      void getSyncStatus().then(setSyncStatus);
    };
    globalThis.addEventListener('hckr-cloud-sync-changed', handler);
    return () => globalThis.removeEventListener('hckr-cloud-sync-changed', handler);
  }, []);

  useEffect(() => {
    if (!showProfile) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfile]);

  return (
    <aside className="tab-bar">
      <div className="tab-bar-brand">
        <div className="brand-logo">
          <div className="brand-tile" aria-hidden="true">
            <span className="brand-tile-icon">#</span>
          </div>
          <div className="brand-info">
            <div className="brand-title-row">
              <span className="brand-title">hckr-tools</span>
              <span className="brand-caret" aria-hidden="true">▾</span>
            </div>
            <span className="brand-tag">DEVELOPER WORKSPACE</span>
          </div>
        </div>
      </div>
      <div className="tab-bar-search-wrap">
        <button
          className="tool-search-trigger"
          onClick={onOpenCommandPalette}
          aria-label="Search tools"
          title="Search tools (Cmd/Ctrl+Shift+K)"
        >
          <span className="tool-search-icon" aria-hidden="true">⌕</span>
          <span className="tool-search-label">Search tools</span>
          <kbd className="tool-search-kbd">⇧⌘K</kbd>
        </button>
      </div>
      <nav className="tab-bar-nav" aria-label="Developer utilities navigation">
        {CATEGORIES.map((category) => {
          const categoryTools = tools.filter((tool) => tool.category === category);
          return (
            <div className="tool-nav-group" key={category}>
              <p className="tool-nav-heading">{category}</p>
              {categoryTools.map((tool) => {
                const isActive = tool.id === activeToolId;
                return (
                  <button
                    key={tool.id}
                    className={`tab-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectTool(tool.id)}
                    title={`${tool.label} — ${tool.description}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="tab-icon" aria-hidden="true">
                      <ToolIcon toolId={tool.id} fallback={tool.icon} />
                    </span>
                    <span className="tab-label">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="tab-bar-actions">
        <div className="profile-container" ref={profileRef}>
          <button
            className="profile-avatar-btn"
            onClick={() => setShowProfile((v) => !v)}
            title={
              syncStatus.signedIn
                ? `Signed in as ${syncStatus.displayName || syncStatus.userName || syncStatus.email}`
                : 'Profile & Cloud Sync'
            }
            aria-label="Profile & Cloud Sync"
            aria-expanded={showProfile}
          >
            {syncStatus.signedIn && syncStatus.avatarUrl ? (
              <img
                src={syncStatus.avatarUrl}
                alt=""
                className="profile-avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="profile-avatar-glyph">
                {syncStatus.signedIn
                  ? (syncStatus.displayName || syncStatus.userName || syncStatus.email || 'A')[0].toUpperCase()
                  : '⚡'}
              </span>
            )}
            <span className={`profile-status-dot ${syncStatus.signedIn ? 'signed-in' : ''}`} />
          </button>

          {showProfile && (
            <div className="profile-popover" role="dialog" aria-label="Profile and Cloud Sync">
              <div className="profile-popover-header">
                <div className="profile-popover-avatar">
                  {syncStatus.signedIn && syncStatus.avatarUrl ? (
                    <img
                      src={syncStatus.avatarUrl}
                      alt=""
                      className="profile-popover-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>
                      {syncStatus.signedIn
                        ? (syncStatus.displayName || syncStatus.userName || syncStatus.email || 'A')[0].toUpperCase()
                        : '⚡'}
                    </span>
                  )}
                </div>
                <div className="profile-popover-user">
                  <div className="profile-user-name-row">
                    <span className="profile-popover-name">
                      {syncStatus.signedIn
                        ? syncStatus.displayName || syncStatus.userName || syncStatus.email
                        : 'Developer Account'}
                    </span>
                    {syncStatus.signedIn && syncStatus.userName && (
                      <a
                        href={`https://github.com/${syncStatus.userName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="profile-github-link"
                        title={`View @${syncStatus.userName} on GitHub`}
                        aria-label={`View @${syncStatus.userName} on GitHub`}
                      >
                        @{syncStatus.userName} ↗
                      </a>
                    )}
                  </div>
                  <span className={`profile-popover-badge ${syncStatus.signedIn ? 'signed-in' : ''}`}>
                    {syncStatus.signedIn ? (
                      <>
                        <GitHubIcon size={11} /> Cloud Sync Active
                      </>
                    ) : (
                      'Local Only'
                    )}
                  </span>
                </div>
                <button
                  className="profile-popover-close"
                  onClick={() => setShowProfile(false)}
                  aria-label="Close profile menu"
                >
                  ✕
                </button>
              </div>

              <div className="profile-popover-body">
                <p className="profile-popover-desc">
                  {syncStatus.configured
                    ? syncStatus.signedIn
                      ? 'Only explicitly saved cards and notes sync to your private cloud storage.'
                      : 'Sign in with GitHub to enable optional private backup and cross-device sync.'
                    : 'Cloud Sync is not configured in this build. Local workspaces remain fully active.'}
                </p>

                <div className="profile-sync-card">
                  <div className="profile-sync-row">
                    <span className="profile-sync-dot-label">
                      <span className={`sync-dot ${syncStatus.signedIn ? 'active' : ''}`} />
                      <span>{syncStatus.signedIn ? 'GitHub Cloud Sync' : 'Local Storage Only'}</span>
                    </span>
                    {syncStatus.signedIn && (
                      <span className="profile-sync-auth-tag">
                        <GitHubIcon size={11} /> OAuth
                      </span>
                    )}
                  </div>
                  <div className="profile-sync-time-row">
                    <span className="profile-sync-label">Last cloud sync:</span>
                    <span className="profile-sync-time">
                      {syncStatus.signedIn
                        ? syncStatus.lastSyncAt
                          ? `Synced ${formatRelativeTime(syncStatus.lastSyncAt)} (${new Date(syncStatus.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                          : 'Not synced yet'
                        : 'Local only'}
                    </span>
                  </div>
                </div>

                {(signInError ?? syncStatus.error) && (
                  <div className="profile-popover-error error-msg">
                    <span>{signInError ?? syncStatus.error}</span>
                  </div>
                )}
              </div>

              <div className="profile-popover-actions">
                {syncStatus.signedIn ? (
                  <>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={isSyncing}
                      onClick={async () => {
                        setIsSyncing(true);
                        setSignInError(undefined);
                        try {
                          await flushCloudSync();
                        } finally {
                          const status = await getSyncStatus();
                          setSyncStatus(status);
                          setIsSyncing(false);
                        }
                      }}
                    >
                      {isSyncing ? 'Syncing…' : 'Sync now'}
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={async () => {
                        setSignInError(undefined);
                        await signOutCloudSync();
                        const status = await getSyncStatus();
                        setSyncStatus(status);
                      }}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-sm btn-primary btn-github"
                    disabled={!syncStatus.configured || isSigningIn}
                    onClick={async () => {
                      setSignInError(undefined);
                      setIsSigningIn(true);
                      try {
                        await signInWithGitHub();
                        setSyncStatus(await getSyncStatus());
                      } catch (error) {
                        setSignInError(error instanceof Error ? error.message : 'Could not sign in with GitHub.');
                      } finally {
                        setIsSigningIn(false);
                      }
                    }}
                  >
                    <GitHubIcon size={15} />
                    <span>{isSigningIn ? 'Opening GitHub…' : 'Sign in with GitHub'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <span
          className="status-indicator"
          title={
            cloudSyncEnabled || syncStatus.signedIn
              ? syncStatus.error
                ? `Sync error: ${syncStatus.error}`
                : syncStatus.lastSyncAt
                  ? `Last cloud sync: ${new Date(syncStatus.lastSyncAt).toLocaleString()}`
                  : 'Cloud Sync active · Private storage'
              : 'Runs fully locally. No data leaves this browser.'
          }
        >
          <span
            className={`status-dot ${
              syncStatus.error
                ? 'error'
                : cloudSyncEnabled || syncStatus.signedIn
                  ? 'active'
                  : ''
            }`}
          />
          <span className="status-label">
            {cloudSyncEnabled || syncStatus.signedIn
              ? syncStatus.error
                ? 'Sync error'
                : syncStatus.lastSyncAt
                  ? `Synced ${formatRelativeTime(syncStatus.lastSyncAt)}`
                  : 'Not synced yet'
              : 'Local only'}
          </span>
        </span>
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
        </button>
      </div>
    </aside>
  );
};

export default TabBar;
