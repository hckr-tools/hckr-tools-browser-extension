import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ToolTab } from './TabBar';
import './ToolCommandPalette.css';

interface ToolCommandPaletteProps {
  open: boolean;
  tools: ToolTab[];
  activeToolId: string;
  onClose: () => void;
  onSelectTool: (id: string) => void;
}

const ToolCommandPalette: React.FC<ToolCommandPaletteProps> = ({ open, tools, activeToolId, onClose, onSelectTool }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tools;
    return tools.filter((tool) => [tool.label, tool.description, tool.category].some((value) => value.toLowerCase().includes(needle)));
  }, [query, tools]);

  useEffect(() => {
    if (!open) { setQuery(''); setSelectedIndex(0); triggerRef.current?.focus(); return; }
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => { if (selectedIndex >= matches.length) setSelectedIndex(Math.max(0, matches.length - 1)); }, [matches.length, selectedIndex]);
  if (!open) return null;
  const choose = (id: string) => { onSelectTool(id); onClose(); };
  return <div className="tool-command-palette" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="tool-command-dialog" role="dialog" aria-modal="true" aria-label="Search developer tools" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedIndex((value) => Math.min(value + 1, matches.length - 1)); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedIndex((value) => Math.max(value - 1, 0)); }
      if (event.key === 'Enter' && matches[selectedIndex]) { event.preventDefault(); choose(matches[selectedIndex].id); }
    }}>
      <div className="tool-command-search"><span aria-hidden="true">⌕</span><input ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools…" aria-label="Search tools" autoComplete="off" /></div>
      <p className="tool-command-heading">{query ? 'Matches' : 'All tools'}</p>
      <div className="tool-command-list" role="listbox" aria-label="Developer tools">
        {matches.map((tool, index) => <button key={tool.id} className={`tool-command-item ${index === selectedIndex ? 'selected' : ''}`} role="option" aria-selected={index === selectedIndex} onMouseEnter={() => setSelectedIndex(index)} onClick={() => choose(tool.id)}>
          <span className="tool-command-icon" aria-hidden="true">{tool.icon}</span><span className="tool-command-copy"><span>{tool.label}</span><small>{tool.description}</small></span><span className="tool-command-meta">{tool.id === activeToolId ? 'Open' : tool.category}</span>
        </button>)}
        {matches.length === 0 && <p className="tool-command-empty">No tools match “{query}”.</p>}
      </div>
      <footer className="tool-command-footer"><span><kbd>↑↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>esc</kbd> Close</span></footer>
    </section>
  </div>;
};

export default ToolCommandPalette;
