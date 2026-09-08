import React, { useEffect, useState } from 'react';
import type { ToolTab } from './TabBar';
import {
  createWorkspace,
  ensureWorkspace,
  generateWorkspaceKey,
  setActiveWorkspace,
  type WorkspaceSnapshot,
} from '../../shared/workspace';
import { getSyncStatus } from '../../shared/cloudSync';
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal';
import './WorkspaceHeader.css';

interface WorkspaceHeaderProps {
  activeTool?: ToolTab;
  onOpenCommandPalette: () => void;
  cloudSyncEnabled?: boolean;
}

function formatSyncShort(isoString?: string): string {
  if (!isoString) return 'explicit saves only';
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return 'Synced just now';
  if (diffSec < 3600) return `Synced ${Math.floor(diffSec / 60)}m ago`;
  return `Synced ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ activeTool, onOpenCommandPalette, cloudSyncEnabled = false }) => {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const next = await ensureWorkspace();
        if (mounted) setSnapshot(next);
      } catch {
        // Ignore initialization errors
      }
    };
    void refresh();
    const listener = () => { void refresh(); };
    globalThis.addEventListener('hckr-workspace-changed', listener);
    return () => {
      mounted = false;
      globalThis.removeEventListener('hckr-workspace-changed', listener);
    };
  }, []);

  useEffect(() => {
    const updateSync = () => {
      void getSyncStatus().then((status) => {
        setLastSyncAt(status.lastSyncAt);
      });
    };
    updateSync();
    globalThis.addEventListener('hckr-cloud-sync-changed', updateSync);
    return () => globalThis.removeEventListener('hckr-cloud-sync-changed', updateSync);
  }, []);

  const activeWorkspaces = snapshot?.workspaces.filter((ws) => !ws.archived) ?? [];
  const currentWorkspace = activeWorkspaces.find((ws) => ws.id === snapshot?.activeWorkspaceId);

  const handleWorkspaceChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === '__new__') {
      const name = window.prompt('Enter new workspace name (e.g. Backend):');
      if (name && name.trim()) {
        const defaultKey = generateWorkspaceKey(name.trim());
        const key = window.prompt(
          `Enter workspace key / ticket prefix (e.g. ${defaultKey}):`,
          defaultKey
        );
        try {
          const created = await createWorkspace(name.trim(), (key?.trim() || defaultKey).toUpperCase());
          await setActiveWorkspace(created.id);
        } catch (error) {
          console.error('Failed to create workspace:', error);
        }
      }
      event.target.value = snapshot?.activeWorkspaceId ?? '';
      return;
    }
    if (value && value !== snapshot?.activeWorkspaceId) {
      await setActiveWorkspace(value);
    }
  };

  const isWorkspaceTool = activeTool?.id === 'workspace';

  return (
    <header className="workspace-header">
      <div className="workspace-context">
        <span className="workspace-context-label">Workspace</span>
        <span className="workspace-context-separator" aria-hidden="true">/</span>
        <span className="workspace-channel-prefix" aria-hidden="true">
          {activeTool?.category === 'Workspace' ? '⚡' : '#'}
        </span>
        {isWorkspaceTool && activeWorkspaces.length > 0 ? (
          <h1 className="workspace-header-h1">
            <div className="workspace-header-select-wrapper">
              <select
                id="workspace-select"
                className="workspace-header-select"
                value={snapshot?.activeWorkspaceId ?? ''}
                onChange={(e) => void handleWorkspaceChange(e)}
                aria-label="Select workspace"
              >
                {activeWorkspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
                <option disabled value="">──────────</option>
                <option value="__new__">+ New workspace…</option>
              </select>
              <span className="workspace-header-select-chevron" aria-hidden="true">▾</span>
            </div>
            <button
              className="workspace-settings-btn"
              onClick={() => setSettingsOpen(true)}
              title="Workspace settings & archive"
              aria-label="Workspace settings"
              type="button"
            >
              ⚙
            </button>
          </h1>
        ) : (
          <h1>{activeTool?.label ?? 'Buffer'}</h1>
        )}
        {activeTool && (
          <>
            <span className="workspace-topic-divider" aria-hidden="true">|</span>
            <span className="workspace-tool-description">{activeTool.description}</span>
          </>
        )}
      </div>
      <div className="workspace-header-actions">
        <span
          className="workspace-privacy"
          title={lastSyncAt ? `Last cloud sync: ${new Date(lastSyncAt).toLocaleString()}` : undefined}
        >
          <span className="workspace-privacy-dot" aria-hidden="true" />
          {cloudSyncEnabled ? `Cloud Sync · ${formatSyncShort(lastSyncAt)}` : '100% local · zero telemetry'}
        </span>
        <button
          className="workspace-command-trigger"
          onClick={onOpenCommandPalette}
          aria-label="Search tools"
          title="Search tools (Cmd/Ctrl+Shift+K)"
        >
          <span aria-hidden="true">⌕</span>
          <span>Search</span>
          <kbd>⇧⌘K</kbd>
        </button>
      </div>

      {snapshot && currentWorkspace && (
        <WorkspaceSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          activeWorkspace={currentWorkspace}
          snapshot={snapshot}
        />
      )}
    </header>
  );
};

export default WorkspaceHeader;
