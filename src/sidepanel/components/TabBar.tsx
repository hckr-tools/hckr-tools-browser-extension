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
    <header className="tab-bar">
      <div className="tab-bar-brand">
        <div className="brand-logo">
          <span className="brand-icon">⚡</span>
          <span className="brand-title">hckr</span>
        </div>
        <span className="brand-tag">DEV TOOLKIT</span>
      </div>

      <nav className="tab-bar-scroll" aria-label="Developer utilities navigation">
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
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          <span className="theme-toggle-icon">
            {theme === 'dark' ? '☀️' : '🌙'}
          </span>
          <span className="theme-toggle-label">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </span>
        </button>

        <span className="status-indicator" title="Fully local, 100% offline">
          <span className="status-dot" />
          <span className="status-text">OFFLINE</span>
        </span>
      </div>
    </header>
  );
};

export default TabBar;
