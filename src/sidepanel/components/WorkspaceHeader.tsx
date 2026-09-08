import React, { useEffect, useState } from 'react';
import type { ToolTab } from './TabBar';
import {
  createWorkspace,
  ensureWorkspace,
  generateWorkspaceKey,
  setActiveWorkspace,
  type WorkspaceSnapshot,
} from '../../shared/workspace';
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal';
import './WorkspaceHeader.css';

interface WorkspaceHeaderProps {
  activeTool?: ToolTab;
  onOpenCommandPalette?: () => void;
  cloudSyncEnabled?: boolean;
  toolTabMode?: 'tool' | 'history';
  onSelectToolTabMode?: (mode: 'tool' | 'history') => void;
  historyCount?: number;
  onOpenHistoryModal?: () => void;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  activeTool,
  toolTabMode = 'tool',
  onSelectToolTabMode,
  historyCount,
  onOpenHistoryModal,
}) => {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
          <div className="workspace-tool-title-group">
            <h1>{activeTool?.label ?? 'Buffer'}</h1>
            <div className="tool-view-toggle" role="tablist" aria-label="Tool view">
              <button
                type="button"
                role="tab"
                aria-selected={toolTabMode === 'tool'}
                className={`tool-view-tab ${toolTabMode === 'tool' ? 'active' : ''}`}
                onClick={() => onSelectToolTabMode?.('tool')}
              >
                {activeTool?.label ?? 'Tool'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={toolTabMode === 'history'}
                className={`tool-view-tab ${toolTabMode === 'history' ? 'active' : ''}`}
                onClick={() => onSelectToolTabMode?.('history')}
              >
                🕒 History {historyCount !== undefined && historyCount > 0 ? `(${historyCount})` : ''}
              </button>
            </div>
          </div>
        )}
        {activeTool && (
          <>
            <span className="workspace-topic-divider" aria-hidden="true">|</span>
            <span className="workspace-tool-description">{activeTool.description}</span>
          </>
        )}
      </div>

      <div className="workspace-header-actions">
        {onOpenHistoryModal && (
          <button
            type="button"
            className="workspace-history-shortcut-btn"
            onClick={onOpenHistoryModal}
            title="View all tools usage history"
            aria-label="All tools history"
          >
            🕒 All History
          </button>
        )}
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
