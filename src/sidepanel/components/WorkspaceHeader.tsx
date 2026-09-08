import React, { useEffect, useState } from 'react';
import type { ToolTab } from './TabBar';
import {
  createWorkspace,
  ensureWorkspace,
  setActiveWorkspace,
  type WorkspaceSnapshot,
} from '../../shared/workspace';
import './WorkspaceHeader.css';

interface WorkspaceHeaderProps {
  activeTool?: ToolTab;
  onOpenCommandPalette: () => void;
  cloudSyncEnabled?: boolean;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ activeTool, onOpenCommandPalette, cloudSyncEnabled = false }) => {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);

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

  const handleWorkspaceChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === '__new__') {
      const name = window.prompt('Enter new workspace name:');
      if (name && name.trim()) {
        try {
          const created = await createWorkspace(name.trim());
          await setActiveWorkspace(created.id);
        } catch (error) {
          console.error('Failed to create workspace:', error);
        }
      } else {
        event.target.value = snapshot?.activeWorkspaceId ?? '';
      }
      return;
    }
    if (value && value !== snapshot?.activeWorkspaceId) {
      await setActiveWorkspace(value);
    }
  };

  const isWorkspaceTool = activeTool?.id === 'workspace';
  const activeWorkspaces = snapshot?.workspaces.filter((ws) => !ws.archived) ?? [];

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
                <option value="__new__">+ New workspace…</option>
              </select>
              <span className="workspace-header-select-chevron" aria-hidden="true">▾</span>
            </div>
          </h1>
        ) : (
          <h1>{activeTool?.label ?? 'Buffer'}</h1>
        )}
        <button className="workspace-star-btn" aria-label="Star this tool" title="Star this tool" type="button">
          ★
        </button>
        {activeTool && (
          <>
            <span className="workspace-topic-divider" aria-hidden="true">|</span>
            <span className="workspace-tool-description">{activeTool.description}</span>
          </>
        )}
      </div>
      <div className="workspace-header-actions">
        <span className="workspace-privacy">
          <span className="workspace-privacy-dot" aria-hidden="true" />
          {cloudSyncEnabled ? 'Cloud Sync · explicit saves only' : '100% local · zero telemetry'}
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
    </header>
  );
};

export default WorkspaceHeader;
