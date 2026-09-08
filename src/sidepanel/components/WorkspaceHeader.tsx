import React from 'react';
import type { ToolTab } from './TabBar';
import './WorkspaceHeader.css';

interface WorkspaceHeaderProps {
  activeTool?: ToolTab;
  onOpenCommandPalette: () => void;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ activeTool, onOpenCommandPalette }) => (
  <header className="workspace-header">
    <div className="workspace-context">
      <span className="workspace-context-label">Workspace</span>
      <span className="workspace-context-separator" aria-hidden="true">/</span>
      <h1>{activeTool?.label ?? 'Buffer'}</h1>
      {activeTool && <span className="workspace-tool-description">{activeTool.description}</span>}
    </div>
    <div className="workspace-header-actions">
      <span className="workspace-privacy"><span aria-hidden="true" />100% local · zero telemetry</span>
      <button className="workspace-command-trigger" onClick={onOpenCommandPalette} aria-label="Search tools" title="Search tools (Cmd/Ctrl+Shift+K)">
        <span aria-hidden="true">⌕</span><span>Search</span><kbd>⇧⌘K</kbd>
      </button>
    </div>
  </header>
);

export default WorkspaceHeader;
