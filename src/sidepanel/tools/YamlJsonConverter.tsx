import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dump, loadAll, YAMLException } from 'js-yaml';
import { copyToClipboard } from '../../shared/clipboard';
import { exceedsLiveTextLimit, MAX_LIVE_TEXT_CHARS } from '../../shared/inputLimits';
import { loadToolState, saveToolState } from '../../shared/storage';
import './YamlJsonConverter.css';

interface YamlJsonConverterProps {
  initialInput?: string;
}

type Mode = 'yaml-to-json' | 'json-to-yaml';

interface ConvertError {
  message: string;
  line?: number;
  column?: number;
}

const TOOL_ID = 'yaml-json';

const SAMPLE_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: hckr-api
  labels:
    app: hckr
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hckr
  template:
    metadata:
      labels:
        app: hckr
    spec:
      containers:
        - name: api
          image: hckr/api:1.0.0
          ports:
            - containerPort: 8080
`;

const SAMPLE_JSON = `{
  "name": "hckr-api",
  "replicas": 3,
  "env": {
    "NODE_ENV": "production",
    "PORT": 8080
  }
}`;

function yamlError(err: unknown): ConvertError {
  if (err instanceof YAMLException) {
    const mark = err.mark;
    return {
      message: err.reason || err.message,
      line: mark ? mark.line + 1 : undefined,
      column: mark ? mark.column + 1 : undefined,
    };
  }
  return { message: err instanceof Error ? err.message : 'Invalid YAML' };
}

function jsonError(err: unknown, text: string): ConvertError {
  const message = err instanceof Error ? err.message : String(err);
  const posMatch = message.match(/position\s+(\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const lines = text.slice(0, pos).split('\n');
    return { message, line: lines.length, column: lines[lines.length - 1].length + 1 };
  }
  const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColMatch) {
    return { message, line: parseInt(lineColMatch[1], 10), column: parseInt(lineColMatch[2], 10) };
  }
  return { message };
}

function convert(input: string, mode: Mode): { output: string; error: ConvertError | null; docs: number } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { output: '', error: null, docs: 0 };
  }
  if (exceedsLiveTextLimit(input)) {
    return {
      output: '',
      error: { message: `Live conversion is limited to ${MAX_LIVE_TEXT_CHARS.toLocaleString()} characters.` },
      docs: 0,
    };
  }

  try {
    if (mode === 'yaml-to-json') {
      const docs = loadAll(input, null, { json: true }).filter((doc) => doc !== undefined);
      if (docs.length === 0) {
        return { output: '', error: null, docs: 0 };
      }
      const value = docs.length === 1 ? docs[0] : docs;
      return { output: JSON.stringify(value, null, 2), error: null, docs: docs.length };
    }

    const parsed: unknown = JSON.parse(input);
    return {
      output: dump(parsed, { indent: 2, lineWidth: 120, noRefs: true }),
      error: null,
      docs: 1,
    };
  } catch (err) {
    return {
      output: '',
      error: mode === 'yaml-to-json' ? yamlError(err) : jsonError(err, input),
      docs: 0,
    };
  }
}

const YamlJsonConverter: React.FC<YamlJsonConverterProps> = ({ initialInput }) => {
  const [mode, setMode] = useState<Mode>('yaml-to-json');
  const [input, setInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialInput !== undefined && initialInput !== '') {
      const trimmed = initialInput.trim();
      const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
      setMode(looksJson ? 'json-to-yaml' : 'yaml-to-json');
      setInput(initialInput);
      return;
    }
    (async () => {
      const saved = await loadToolState(TOOL_ID);
      if (saved?.input) setInput(saved.input);
      if (saved?.options?.mode === 'json-to-yaml' || saved?.options?.mode === 'yaml-to-json') {
        setMode(saved.options.mode);
      }
    })();
  }, [initialInput]);

  const persist = useCallback((nextInput: string, nextMode: Mode) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToolState(TOOL_ID, { input: nextInput, options: { mode: nextMode } }).catch(console.error);
    }, 250);
  }, []);

  const { output, error, docs } = useMemo(() => convert(input, mode), [input, mode]);

  const handleInputChange = (value: string) => {
    setInput(value);
    persist(value, mode);
  };

  const handleModeChange = (next: Mode) => {
    setMode(next);
    persist(input, next);
  };

  const handleSwap = () => {
    if (!output) return;
    const nextMode: Mode = mode === 'yaml-to-json' ? 'json-to-yaml' : 'yaml-to-json';
    setInput(output);
    setMode(nextMode);
    persist(output, nextMode);
  };

  const handleClear = () => {
    setInput('');
    persist('', mode);
  };

  const handleSample = () => {
    const sample = mode === 'yaml-to-json' ? SAMPLE_YAML : SAMPLE_JSON;
    setInput(sample);
    persist(sample, mode);
  };

  const sourceLabel = mode === 'yaml-to-json' ? 'YAML' : 'JSON';
  const targetLabel = mode === 'yaml-to-json' ? 'JSON' : 'YAML';
  const empty = input.trim().length === 0;

  return (
    <div className="tool-container yaml-json-converter">
      <div className="section yaml-json-toolbar">
        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-btn ${mode === 'yaml-to-json' ? 'active' : ''}`}
            onClick={() => handleModeChange('yaml-to-json')}
          >
            YAML → JSON
          </button>
          <button
            type="button"
            className={`toggle-btn ${mode === 'json-to-yaml' ? 'active' : ''}`}
            onClick={() => handleModeChange('json-to-yaml')}
          >
            JSON → YAML
          </button>
        </div>
        <div className="toolbar">
          <button type="button" className="yaml-json-swap-btn" onClick={handleSwap} disabled={!output} title="Swap input and output">
            ⇄
          </button>
          {empty && (
            <button type="button" className="btn btn-sm" onClick={handleSample}>
              Sample
            </button>
          )}
          <button type="button" className="btn btn-sm btn-danger" onClick={handleClear} disabled={!input}>
            Clear
          </button>
        </div>
      </div>

      <div className="tool-split">
        <div className="section yaml-json-pane">
          <div className="yaml-json-pane-header">
            <div className="yaml-json-pane-title">
              <span>{sourceLabel} input</span>
              {empty ? (
                <span className="yaml-json-badge empty">Empty</span>
              ) : error ? (
                <span className="yaml-json-badge invalid">Invalid {sourceLabel}</span>
              ) : (
                <span className="yaml-json-badge valid">Valid {sourceLabel}</span>
              )}
            </div>
          </div>
          {exceedsLiveTextLimit(input) && (
            <p className="yaml-json-limit">Live conversion paused above {MAX_LIVE_TEXT_CHARS.toLocaleString()} characters.</p>
          )}
          <textarea
            className="textarea yaml-json-textarea"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={mode === 'yaml-to-json' ? 'Paste YAML (K8s, CI, Compose)…' : 'Paste JSON…'}
            spellCheck={false}
          />
          {error && (
            <div className="yaml-json-error">
              <strong>Syntax error:</strong>{' '}
              {error.line !== undefined && (
                <span>
                  Line {error.line}
                  {error.column !== undefined ? `, Col ${error.column}` : ''}:{' '}
                </span>
              )}
              {error.message}
            </div>
          )}
        </div>

        <div className="section yaml-json-pane">
          <div className="yaml-json-pane-header">
            <div className="yaml-json-pane-title">
              <span>{targetLabel} output</span>
              {docs > 1 && <span className="badge">{docs} documents</span>}
            </div>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => copyToClipboard(output)} disabled={!output}>
              Copy Output
            </button>
          </div>
          <pre className="yaml-json-output">
            {output || (empty ? `${targetLabel} will appear here` : error ? 'Fix the syntax error to see output' : '')}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default YamlJsonConverter;
