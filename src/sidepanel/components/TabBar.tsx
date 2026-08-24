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
}

const TabBar: React.FC<TabBarProps> = ({ tools, activeToolId, onSelectTool }) => {
  return (
    <div className="tab-bar">
      <div className="tab-bar-scroll">
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
      </div>
    </div>
  );
};

export default TabBar;
