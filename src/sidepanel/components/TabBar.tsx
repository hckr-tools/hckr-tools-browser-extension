import React from 'react';
import './TabBar.css';

export interface ToolTab {
  id: string;
  label: string;
  icon: string;
}

interface TabBarProps {
  tools: ToolTab[];
  activeToolId: string;
  onSelectTool: (id: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const TabBar: React.FC<TabBarProps> = ({
  tools,
  activeToolId,
  onSelectTool,
  theme,
  onToggleTheme,
}) => {
  return (
    <aside className="tab-bar">
      <div className="tab-bar-brand">
        <div className="brand-logo">
          <span className="brand-icon">⚡</span>
          <span className="brand-title">hckr-tools</span>
        </div>
        <span className="brand-tag">DEV TOOLKIT</span>
      </div>

      <nav className="tab-bar-nav" aria-label="Developer utilities navigation">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tab-item ${tool.id === activeToolId ? 'active' : ''}`}
            onClick={() => onSelectTool(tool.id)}
            title={tool.label}
          >
            <span className="tab-icon">{tool.icon}</span>
            <span className="tab-label">{tool.label}</span>
          </button>
        ))}
      </nav>

      <div className="tab-bar-actions">
        <span className="status-indicator" title="Runs fully locally. No data leaves this browser.">
          Local
        </span>
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === 'dark' ? '☀️' : '🌙'}
          </span>
        </button>
      </div>
    </aside>
  );
};

export default TabBar;
