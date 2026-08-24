import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import { loadToolState, saveToolState } from '../../shared/storage';
import './JsonFormatter.css';

interface JsonFormatterProps {
  initialInput?: string;
}

interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

const TOOL_ID = 'json-formatter';

const SAMPLE_JSON = `{
  "name": "hckr extension",
  "version": "1.0.0",
  "developer": {
    "name": "Ashish",
    "active": true,
    "skills": ["TypeScript", "React", "Rust"]
  },
  "stats": {
    "downloads": 15420,
    "rating": 4.9,
    "verified": null
  }
}`;

/**
 * Tokenize a line of JSON for syntax highlighting
 */
function tokenizeJsonLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?)|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)|([{}[\],:])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      tokens.push(line.slice(lastIndex, start));
    }

    const token = match[0];
    if (match[1]) {
      // String or key
      if (token.trimEnd().endsWith(':')) {
        const colonIdx = token.lastIndexOf(':');
        const keyText = token.slice(0, colonIdx);
        const wsColon = token.slice(colonIdx);
        tokens.push(<span key={match.index} className="json-tok-key">{keyText}</span>);
        tokens.push(<span key={`${match.index}-c`} className="json-tok-colon">{wsColon}</span>);
      } else {
        tokens.push(<span key={match.index} className="json-tok-string">{token}</span>);
      }
    } else if (match[2]) {
      // Boolean or null
      if (token === 'null') {
        tokens.push(<span key={match.index} className="json-tok-null">{token}</span>);
      } else {
        tokens.push(<span key={match.index} className="json-tok-boolean">{token}</span>);
      }
    } else if (match[3]) {
      // Number
      tokens.push(<span key={match.index} className="json-tok-number">{token}</span>);
    } else if (match[4]) {
      // Punctuation
      tokens.push(<span key={match.index} className="json-tok-punct">{token}</span>);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push(line.slice(lastIndex));
  }

  return tokens;
}

/**
 * Extract error line and column from JSON.parse error
 */
function parseJsonError(err: unknown, text: string): ParseError {
  const message = err instanceof Error ? err.message : String(err);

  const posMatch = message.match(/position\s+(\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const lines = text.slice(0, pos).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return { message, line, column };
  }

  const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColMatch) {
    return {
      message,
      line: parseInt(lineColMatch[1], 10),
      column: parseInt(lineColMatch[2], 10),
    };
  }

  const lineMatch = message.match(/line\s+(\d+)/i);
  if (lineMatch) {
    return {
      message,
      line: parseInt(lineMatch[1], 10),
    };
  }

  return { message };
}

/**
 * Collect all collapsible paths in a JSON structure
 */
function collectCollapsiblePaths(data: unknown, currentPath = 'root'): string[] {
  const paths: string[] = [];
  if (data && typeof data === 'object') {
    paths.push(currentPath);
    if (Array.isArray(data)) {
      data.forEach((item, idx) => {
        paths.push(...collectCollapsiblePaths(item, `${currentPath}[${idx}]`));
      });
    } else {
      Object.entries(data).forEach(([key, val]) => {
        paths.push(...collectCollapsiblePaths(val, `${currentPath}.${key}`));
      });
    }
  }
  return paths;
}

/**
 * Recursive Tree Node Component
 */
interface TreeNodeProps {
  data: unknown;
  nodeKey?: string;
  path: string;
  isLast: boolean;
  collapsedPaths: Set<string>;
  onToggleCollapse: (path: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  data,
  nodeKey,
  path,
  isLast,
  collapsedPaths,
  onToggleCollapse,
}) => {
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const isCollapsed = collapsedPaths.has(path);

  const handleCopyValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(JSON.stringify(data, null, 2));
  };

  if (!isObject) {
    let valueDisplay: React.ReactNode;
    if (typeof data === 'string') {
      valueDisplay = <span className="json-tok-string">"{data}"</span>;
    } else if (typeof data === 'number') {
      valueDisplay = <span className="json-tok-number">{String(data)}</span>;
    } else if (typeof data === 'boolean') {
      valueDisplay = <span className="json-tok-boolean">{String(data)}</span>;
    } else if (data === null) {
      valueDisplay = <span className="json-tok-null">null</span>;
    } else {
      valueDisplay = <span>{String(data)}</span>;
    }

    return (
      <div className="json-tree-row">
        <span className="json-tree-toggle empty-toggle" />
        {nodeKey !== undefined && (
          <>
            <span className="json-tree-key">"{nodeKey}"</span>
            <span className="json-tree-colon">: </span>
          </>
        )}
        {valueDisplay}
        {!isLast && <span className="json-tok-punct">,</span>}
        <div className="json-tree-actions">
          <button
            className="json-tree-action-btn"
            onClick={handleCopyValue}
            title="Copy value"
          >
            📋
          </button>
        </div>
      </div>
    );
  }

  const entries = isArray
    ? (data as unknown[]).map((item, idx) => ({ key: String(idx), value: item, isArrItem: true }))
    : Object.entries(data as Record<string, unknown>).map(([k, v]) => ({ key: k, value: v, isArrItem: false }));

  const count = entries.length;
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div className="json-tree-node">
      <div className="json-tree-row" onClick={() => onToggleCollapse(path)}>
        <button
          className="json-tree-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(path);
          }}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
        {nodeKey !== undefined && (
          <>
            <span className="json-tree-key">"{nodeKey}"</span>
            <span className="json-tree-colon">: </span>
          </>
        )}
        <span className="json-tok-punct">{openBracket}</span>
        {isCollapsed ? (
          <>
            <span className="json-tree-count-badge">
              {count} {isArray ? (count === 1 ? 'item' : 'items') : (count === 1 ? 'key' : 'keys')}
            </span>
            <span className="json-tok-punct">{closeBracket}</span>
          </>
        ) : null}
        {!isCollapsed && count === 0 && <span className="json-tok-punct">{closeBracket}</span>}
        {!isLast && <span className="json-tok-punct">,</span>}
        <div className="json-tree-actions">
          <button
            className="json-tree-action-btn"
            onClick={handleCopyValue}
            title="Copy JSON"
          >
            📋
          </button>
        </div>
      </div>

      {!isCollapsed && count > 0 && (
        <div className="json-tree-children">
          {entries.map((entry, idx) => (
            <TreeNode
              key={entry.key}
              data={entry.value}
              nodeKey={entry.isArrItem ? undefined : entry.key}
              path={entry.isArrItem ? `${path}[${entry.key}]` : `${path}.${entry.key}`}
              isLast={idx === entries.length - 1}
              collapsedPaths={collapsedPaths}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
          <div className="json-tree-row">
            <span className="json-tree-toggle empty-toggle" />
            <span className="json-tok-punct">{closeBracket}</span>
            {!isLast && <span className="json-tok-punct">,</span>}
          </div>
        </div>
      )}
    </div>
  );
};

const JsonFormatter: React.FC<JsonFormatterProps> = ({ initialInput }) => {
  const [input, setInput] = useState<string>('');
  const [parsedData, setParsedData] = useState<unknown | null>(null);
  const [error, setError] = useState<ParseError | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'tree' | 'minified'>('code');
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse JSON helper
  const processJson = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setParsedData(null);
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      setParsedData(parsed);
      setError(null);
    } catch (err) {
      setParsedData(null);
      setError(parseJsonError(err, trimmed));
    }
  }, []);

  // Handle initialInput prop or load saved state
  useEffect(() => {
    if (initialInput !== undefined && initialInput !== '') {
      setInput(initialInput);
      processJson(initialInput);
    } else {
      (async () => {
        const saved = await loadToolState(TOOL_ID);
        if (saved?.input) {
          setInput(saved.input);
          processJson(saved.input);
        }
      })();
    }
  }, [initialInput, processJson]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      processJson(val);
      saveToolState(TOOL_ID, { input: val });
    }, 250);
  };

  // Formatted string (2-space indent)
  const formattedJson = useMemo(() => {
    if (parsedData === null) return '';
    return JSON.stringify(parsedData, null, 2);
  }, [parsedData]);

  // Minified string
  const minifiedJson = useMemo(() => {
    if (parsedData === null) return '';
    return JSON.stringify(parsedData);
  }, [parsedData]);

  // Lines for code view
  const codeLines = useMemo(() => {
    if (viewMode === 'minified') {
      return [minifiedJson];
    }
    if (!formattedJson) return [];
    return formattedJson.split('\n');
  }, [viewMode, formattedJson, minifiedJson]);

  // Tree collapse handlers
  const handleToggleCollapse = useCallback((path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setCollapsedPaths(new Set());
  }, []);

  const handleCollapseAll = useCallback(() => {
    if (parsedData !== null) {
      const allPaths = collectCollapsiblePaths(parsedData);
      setCollapsedPaths(new Set(allPaths));
    }
  }, [parsedData]);

  // Action buttons
  const handleFormat = () => {
    if (parsedData !== null) {
      const formatted = JSON.stringify(parsedData, null, 2);
      setInput(formatted);
      setViewMode('code');
      saveToolState(TOOL_ID, { input: formatted });
    }
  };

  const handleMinify = () => {
    if (parsedData !== null) {
      const minified = JSON.stringify(parsedData);
      setInput(minified);
      setViewMode('minified');
      saveToolState(TOOL_ID, { input: minified });
    }
  };

  const handleCopyOutput = async () => {
    const textToCopy = viewMode === 'minified' ? minifiedJson : formattedJson;
    if (textToCopy) {
      await copyToClipboard(textToCopy);
    }
  };

  const handleClear = () => {
    setInput('');
    setParsedData(null);
    setError(null);
    setCollapsedPaths(new Set());
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    saveToolState(TOOL_ID, { input: '' });
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_JSON);
    processJson(SAMPLE_JSON);
    saveToolState(TOOL_ID, { input: SAMPLE_JSON });
  };

  // Stats
  const rawBytes = new TextEncoder().encode(input).length;
  const formattedBytes = new TextEncoder().encode(formattedJson).length;
  const minifiedBytes = new TextEncoder().encode(minifiedJson).length;

  return (
    <div className="tool-container json-formatter">
      {/* Input Section */}
      <div className="section">
        <div className="json-section-header">
          <div className="json-section-title">
            <span>JSON Input</span>
            {input.trim().length === 0 ? (
              <span className="json-status-badge empty">Empty</span>
            ) : error ? (
              <span className="json-status-badge invalid">Invalid JSON</span>
            ) : (
              <span className="json-status-badge valid">Valid JSON</span>
            )}
          </div>
          <div className="toolbar">
            {input.trim().length === 0 && (
              <button className="btn btn-sm" onClick={handleLoadSample}>
                Sample
              </button>
            )}
            <button className="btn btn-sm btn-danger" onClick={handleClear} disabled={!input}>
              Clear
            </button>
          </div>
        </div>

        <div className="json-input-wrapper">
          <textarea
            className="textarea json-textarea"
            placeholder="Paste or type JSON here..."
            value={input}
            onChange={handleInputChange}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Error Message Banner */}
      {error && (
        <div className="json-error-banner">
          <span className="json-error-icon">⚠️</span>
          <div className="json-error-body">
            <div>
              <strong>Syntax Error:</strong>{' '}
              {error.line !== undefined && (
                <span className="json-error-line-badge">
                  Line {error.line}
                  {error.column !== undefined ? `, Col ${error.column}` : ''}:
                </span>
              )}{' '}
              {error.message}
            </div>
          </div>
        </div>
      )}

      {/* Output Section */}
      <div className="section flex-1 flex flex-col" style={{ minHeight: '260px' }}>
        <div className="json-section-header">
          <div className="toolbar">
            <span className="label" style={{ margin: 0 }}>View:</span>
            <div className="toggle-group">
              <button
                className={`toggle-btn ${viewMode === 'code' ? 'active' : ''}`}
                onClick={() => setViewMode('code')}
                disabled={parsedData === null}
              >
                Code
              </button>
              <button
                className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
                onClick={() => setViewMode('tree')}
                disabled={parsedData === null}
              >
                Tree View
              </button>
              <button
                className={`toggle-btn ${viewMode === 'minified' ? 'active' : ''}`}
                onClick={() => setViewMode('minified')}
                disabled={parsedData === null}
              >
                Minified
              </button>
            </div>
          </div>

          <div className="toolbar">
            {viewMode === 'tree' && parsedData !== null && (
              <>
                <button className="btn btn-sm" onClick={handleExpandAll} title="Expand all nodes">
                  Expand All
                </button>
                <button className="btn btn-sm" onClick={handleCollapseAll} title="Collapse all nodes">
                  Collapse All
                </button>
              </>
            )}
            <button
              className="btn btn-sm"
              onClick={handleFormat}
              disabled={parsedData === null}
              title="Prettify with 2-space indentation"
            >
              Format
            </button>
            <button
              className="btn btn-sm"
              onClick={handleMinify}
              disabled={parsedData === null}
              title="Compact JSON to 1 line"
            >
              Minify
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleCopyOutput}
              disabled={parsedData === null}
              title="Copy formatted output to clipboard"
            >
              Copy Output
            </button>
          </div>
        </div>

        {/* Output Container */}
        <div className="json-output-container flex-1">
          {parsedData !== null && (
            <div className="json-output-header">
              <div className="json-output-stats">
                <span>Raw: {rawBytes.toLocaleString()} B</span>
                <span>Formatted: {formattedBytes.toLocaleString()} B ({codeLines.length} lines)</span>
                <span>Minified: {minifiedBytes.toLocaleString()} B</span>
              </div>
              <span className="badge">2 Spaces</span>
            </div>
          )}

          <div className="json-output-content">
            {parsedData === null ? (
              <div className="json-empty-output">
                <span>{error ? 'Fix the syntax error above to view formatted output' : 'Enter valid JSON to view formatted output'}</span>
              </div>
            ) : viewMode === 'tree' ? (
              <div className="json-tree-view">
                <TreeNode
                  data={parsedData}
                  path="root"
                  isLast={true}
                  collapsedPaths={collapsedPaths}
                  onToggleCollapse={handleToggleCollapse}
                />
              </div>
            ) : (
              <pre className="json-code-view">
                {codeLines.map((line, idx) => (
                  <div key={idx} className="json-code-line">
                    <span className="json-line-number">{idx + 1}</span>
                    <span className="json-line-text">{tokenizeJsonLine(line)}</span>
                  </div>
                ))}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JsonFormatter;
