import React from 'react';
import './TabBar.css';

export type ToolCategory = 'Transform' | 'Create' | 'View' | 'Inspect' | 'Browser';

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
}

const CATEGORIES: ToolCategory[] = ['Transform', 'Create', 'View', 'Inspect', 'Browser'];

const TabBar: React.FC<TabBarProps> = ({ tools, activeToolId, onSelectTool, onOpenCommandPalette, theme, onToggleTheme }) => (
  <aside className="tab-bar">
    <div className="tab-bar-brand">
      <div className="brand-logo"><span className="brand-icon">↯</span><span className="brand-title">hckr-tools</span></div>
      <span className="brand-tag">DEVELOPER WORKSPACE</span>
    </div>
    <button className="tool-search-trigger" onClick={onOpenCommandPalette} aria-label="Search tools" title="Search tools (Cmd/Ctrl+Shift+K)">
      <span aria-hidden="true">⌕</span><span className="tool-search-label">Search tools</span><kbd>⇧⌘K</kbd>
    </button>
    <nav className="tab-bar-nav" aria-label="Developer utilities navigation">
      {CATEGORIES.map((category) => {
        const categoryTools = tools.filter((tool) => tool.category === category);
        return <div className="tool-nav-group" key={category}>
          <p className="tool-nav-heading">{category}</p>
          {categoryTools.map((tool) => <button key={tool.id} className={`tab-item ${tool.id === activeToolId ? 'active' : ''}`} onClick={() => onSelectTool(tool.id)} title={`${tool.label} — ${tool.description}`} aria-current={tool.id === activeToolId ? 'page' : undefined}>
            <span className="tab-icon" aria-hidden="true">{tool.icon}</span><span className="tab-label">{tool.label}</span>
          </button>)}
        </div>;
      })}
    </nav>
    <div className="tab-bar-actions">
      <span className="status-indicator" title="Runs fully locally. No data leaves this browser."><span className="status-dot" /> <span className="status-label">Local only</span></span>
      <button className="theme-toggle-btn" onClick={onToggleTheme} title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`} aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}><span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span></button>
    </div>
  </aside>
);

export default TabBar;
