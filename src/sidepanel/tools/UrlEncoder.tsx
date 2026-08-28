import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import { loadToolState, saveToolState } from '../../shared/storage';
import './UrlEncoder.css';

interface UrlEncoderProps {
  initialInput?: string;
}

interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface ParsedUrlComponents {
  isUrl: boolean;
  protocol: string;
  host: string;
  pathname: string;
  hash: string;
  params: QueryParam[];
}

type Mode = 'encode' | 'decode';
type EncodeMethod = 'component' | 'full';

const SAMPLE_URLS = [
  {
    label: 'Search URL',
    url: 'https://www.google.com/search?q=developer+tools&hl=en&source=hckr#results',
  },
  {
    label: 'OAuth URL',
    url: 'https://auth.example.com/oauth/authorize?client_id=12345&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&response_type=code&scope=openid%20profile%20email&state=xyz987',
  },
  {
    label: 'Special Chars',
    url: 'Hello World! Special characters: &$+/:;=?@<>#%{}|\\^~[]`',
  },
];

const UrlEncoder: React.FC<UrlEncoderProps> = ({ initialInput }) => {
  const [input, setInput] = useState<string>('');
  const [mode, setMode] = useState<Mode>('decode');
  const [encodeMethod, setEncodeMethod] = useState<EncodeMethod>('component');
  const [activeTab, setActiveTab] = useState<'output' | 'params' | 'components'>('output');
  const [error, setError] = useState<string | null>(null);

  // URL components state for live editing
  const [parsedUrl, setParsedUrl] = useState<ParsedUrlComponents>({
    isUrl: false,
    protocol: '',
    host: '',
    pathname: '',
    hash: '',
    params: [],
  });

  // Load initial state or stored state
  useEffect(() => {
    if (initialInput !== undefined) {
      setInput(initialInput);
      // Auto-detect whether it is already encoded or a full URL
      if (initialInput.includes('%') || initialInput.startsWith('http://') || initialInput.startsWith('https://')) {
        setMode('decode');
      } else {
        setMode('encode');
      }
    } else {
      (async () => {
        const saved = await loadToolState('url-encoder');
        if (saved?.input) {
          setInput(saved.input);
          if (saved.options?.mode === 'encode' || saved.options?.mode === 'decode') {
            setMode(saved.options.mode);
          }
          if (saved.options?.encodeMethod === 'component' || saved.options?.encodeMethod === 'full') {
            setEncodeMethod(saved.options.encodeMethod);
          }
        }
      })();
    }
  }, [initialInput]);

  // Parse URL components from text safely
  const parseUrlString = useCallback((rawText: string): ParsedUrlComponents => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return {
        isUrl: false,
        protocol: '',
        host: '',
        pathname: '',
        hash: '',
        params: [],
      };
    }

    let urlObj: URL | null = null;
    let isFullUrl = false;

    // Try standard URL parse
    try {
      urlObj = new URL(trimmed);
      isFullUrl = true;
    } catch {
      // Try with dummy protocol if it has query/path format (e.g., example.com/path?a=1 or /search?q=1)
      if (trimmed.includes('?') || trimmed.includes('/') || trimmed.includes(':')) {
        try {
          const dummyBase = trimmed.startsWith('/') ? 'http://dummy.domain' : 'http://';
          urlObj = new URL(dummyBase + trimmed);
          // Only treat as full URL if it has a host or pathname
        } catch {
          urlObj = null;
        }
      }
    }

    if (urlObj) {
      const paramsList: QueryParam[] = [];
      let index = 0;
      urlObj.searchParams.forEach((value, key) => {
        paramsList.push({
          id: `param-${index++}-${key}`,
          key,
          value,
          enabled: true,
        });
      });

      return {
        isUrl: isFullUrl || paramsList.length > 0 || !!urlObj.pathname,
        protocol: isFullUrl ? urlObj.protocol : '',
        host: isFullUrl ? urlObj.host : '',
        pathname: isFullUrl ? urlObj.pathname : (trimmed.startsWith('/') ? urlObj.pathname : ''),
        hash: urlObj.hash,
        params: paramsList,
      };
    }

    // Try parsing as standalone query string e.g. "a=1&b=2"
    if (trimmed.includes('=') && !trimmed.includes(' ')) {
      try {
        const searchParams = new URLSearchParams(trimmed.startsWith('?') ? trimmed.slice(1) : trimmed);
        const paramsList: QueryParam[] = [];
        let index = 0;
        searchParams.forEach((value, key) => {
          paramsList.push({
            id: `param-${index++}-${key}`,
            key,
            value,
            enabled: true,
          });
        });

        if (paramsList.length > 0) {
          return {
            isUrl: true,
            protocol: '',
            host: '',
            pathname: '',
            hash: '',
            params: paramsList,
          };
        }
      } catch {
        // Not a query string
      }
    }

    return {
      isUrl: false,
      protocol: '',
      host: '',
      pathname: '',
      hash: '',
      params: [],
    };
  }, []);

  // Compute processed output
  const output = useMemo<string>(() => {
    setError(null);
    if (!input) return '';

    try {
      if (mode === 'encode') {
        return encodeMethod === 'component'
          ? encodeURIComponent(input)
          : encodeURI(input);
      } else {
        return encodeMethod === 'component'
          ? decodeURIComponent(input)
          : decodeURI(input);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid URI sequence';
      setError(message);
      return '';
    }
  }, [input, mode, encodeMethod]);

  // Update parsed components when input/mode changes (when not directly editing params)
  useEffect(() => {
    const textToParse = mode === 'decode' ? (output || input) : input;
    const parsed = parseUrlString(textToParse);
    setParsedUrl(parsed);

    // Save state
    saveToolState('url-encoder', {
      input,
      options: { mode, encodeMethod },
    });
  }, [input, output, mode, encodeMethod, parseUrlString]);

  // Rebuild URL and update input/output when components/params are edited in UI
  const handleParamsChange = (newParams: QueryParam[]) => {
    setParsedUrl((prev) => {
      const updated = { ...prev, params: newParams };

      // Reconstruct URL string
      const searchParams = new URLSearchParams();
      updated.params.forEach((p) => {
        if (p.enabled && p.key.trim() !== '') {
          searchParams.append(p.key, p.value);
        }
      });

      const searchStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
      let hashStr = updated.hash;
      if (hashStr && !hashStr.startsWith('#')) {
        hashStr = '#' + hashStr;
      }

      let rebuiltUrl = '';
      if (updated.protocol || updated.host) {
        let proto = updated.protocol;
        if (proto && !proto.endsWith(':')) proto += ':';
        let path = updated.pathname;
        if (path && !path.startsWith('/')) path = '/' + path;
        rebuiltUrl = `${proto}//${updated.host}${path}${searchStr}${hashStr}`;
      } else if (updated.pathname) {
        rebuiltUrl = `${updated.pathname}${searchStr}${hashStr}`;
      } else {
        rebuiltUrl = searchStr ? (searchStr.startsWith('?') ? searchStr.slice(1) : searchStr) : '';
      }

      if (mode === 'decode') {
        setInput(rebuiltUrl);
      } else {
        setInput(rebuiltUrl);
      }

      return updated;
    });
  };

  const handleComponentChange = (field: 'protocol' | 'host' | 'pathname' | 'hash', val: string) => {
    setParsedUrl((prev) => {
      const updated = { ...prev, [field]: val };
      const searchParams = new URLSearchParams();
      updated.params.forEach((p) => {
        if (p.enabled && p.key.trim() !== '') {
          searchParams.append(p.key, p.value);
        }
      });
      const searchStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
      let hashStr = updated.hash;
      if (hashStr && !hashStr.startsWith('#')) {
        hashStr = '#' + hashStr;
      }

      let proto = updated.protocol;
      if (proto && !proto.endsWith(':')) proto += ':';
      let path = updated.pathname;
      if (path && !path.startsWith('/') && updated.host) path = '/' + path;

      const rebuiltUrl = updated.host
        ? `${proto ? proto + '//' : 'https://'}${updated.host}${path}${searchStr}${hashStr}`
        : `${path}${searchStr}${hashStr}`;

      setInput(rebuiltUrl);
      return updated;
    });
  };

  const handleAddParam = () => {
    const newParam: QueryParam = {
      id: `param-${Date.now()}`,
      key: '',
      value: '',
      enabled: true,
    };
    handleParamsChange([...parsedUrl.params, newParam]);
  };

  const handleUpdateParam = (index: number, field: 'key' | 'value' | 'enabled', val: string | boolean) => {
    const updated = [...parsedUrl.params];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    handleParamsChange(updated);
  };

  const handleDeleteParam = (index: number) => {
    const updated = parsedUrl.params.filter((_, i) => i !== index);
    handleParamsChange(updated);
  };

  const handleClearAll = () => {
    setInput('');
    setError(null);
    setParsedUrl({
      isUrl: false,
      protocol: '',
      host: '',
      pathname: '',
      hash: '',
      params: [],
    });
    saveToolState('url-encoder', { input: '', options: { mode, encodeMethod } });
  };

  const handleCopyOutput = () => {
    if (output) {
      copyToClipboard(output);
    }
  };

  const handleCopyParamsJson = () => {
    const obj: Record<string, string> = {};
    parsedUrl.params.forEach((p) => {
      if (p.enabled && p.key) {
        obj[p.key] = p.value;
      }
    });
    copyToClipboard(JSON.stringify(obj, null, 2));
  };

  return (
    <div className="url-encoder">
      {/* Top Toolbar */}
      <div className="url-toolbar">
        <div className="url-mode-toggle">
          <button
            className={`url-mode-btn ${mode === 'decode' ? 'active' : ''}`}
            onClick={() => setMode('decode')}
          >
            Decode
          </button>
          <button
            className={`url-mode-btn ${mode === 'encode' ? 'active' : ''}`}
            onClick={() => setMode('encode')}
          >
            Encode
          </button>
        </div>

        <div className="url-options-row">
          <label className="url-radio-label" title="Encodes/decodes all special characters including :, /, ?, &, #">
            <input
              type="radio"
              name="encodeMethod"
              checked={encodeMethod === 'component'}
              onChange={() => setEncodeMethod('component')}
            />
            {mode === 'encode' ? 'encodeURIComponent' : 'decodeURIComponent'}
          </label>
          <label className="url-radio-label" title="Preserves URL delimiters like :, /, ?, &, #">
            <input
              type="radio"
              name="encodeMethod"
              checked={encodeMethod === 'full'}
              onChange={() => setEncodeMethod('full')}
            />
            {mode === 'encode' ? 'encodeURI' : 'decodeURI'}
          </label>
        </div>
      </div>

      <div className="tool-split">
      <div className="tool-split-col">
      {/* Input Section */}
      <div className="url-section">
        <div className="url-section-header">
          <span className="url-section-title">
            {mode === 'encode' ? 'Input Text / URL' : 'Encoded URL / Text'}
          </span>
          <div className="url-section-actions">
            {input && (
              <button className="btn btn-sm" onClick={() => copyToClipboard(input)}>
                Copy
              </button>
            )}
            <button className="btn btn-sm btn-danger" onClick={handleClearAll}>
              Clear
            </button>
          </div>
        </div>

        <textarea
          className="url-textarea"
          placeholder={
            mode === 'encode'
              ? 'Paste raw text or URL to encode...'
              : 'Paste encoded URL (e.g., https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world)...'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
        />

        {/* Quick Samples */}
        <div className="url-samples">
          <span className="url-samples-label">Samples:</span>
          {SAMPLE_URLS.map((sample) => (
            <button
              key={sample.label}
              className="url-sample-chip"
              onClick={() => {
                setInput(sample.url);
                if (sample.url.includes('%') || sample.url.startsWith('http')) {
                  setMode('decode');
                } else {
                  setMode('encode');
                }
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-msg">
          <strong>Error:</strong> {error}
        </div>
      )}
      </div>

      <div className="tool-split-col">
      {/* Result & Breakdown Section */}
      <div className="url-section">
        <div className="url-section-header">
          <div className="url-view-tabs">
            <button
              className={`url-view-tab ${activeTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              {mode === 'encode' ? 'Encoded Output' : 'Decoded Output'}
            </button>
            {parsedUrl.isUrl && (
              <>
                <button
                  className={`url-view-tab ${activeTab === 'params' ? 'active' : ''}`}
                  onClick={() => setActiveTab('params')}
                >
                  Query Params ({parsedUrl.params.length})
                </button>
                <button
                  className={`url-view-tab ${activeTab === 'components' ? 'active' : ''}`}
                  onClick={() => setActiveTab('components')}
                >
                  Components
                </button>
              </>
            )}
          </div>

          <div className="url-section-actions">
            {activeTab === 'output' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCopyOutput}
                disabled={!output}
              >
                Copy Output
              </button>
            )}
            {activeTab === 'params' && parsedUrl.params.length > 0 && (
              <button className="btn btn-sm" onClick={handleCopyParamsJson}>
                Copy JSON
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Formatted Output */}
        {activeTab === 'output' && (
          <div className="url-output-container">
            {output ? (
              output
            ) : (
              <span className="url-output-empty">
                {input ? 'No output generated' : 'Output will appear here...'}
              </span>
            )}
          </div>
        )}

        {/* Tab 2: Query Params Table */}
        {activeTab === 'params' && (
          <div className="url-params-table-container">
            {parsedUrl.params.length > 0 ? (
              <>
                <div className="url-params-header-row">
                  <span />
                  <span>Key</span>
                  <span>Value</span>
                  <span />
                </div>
                {parsedUrl.params.map((param, index) => (
                  <div
                    key={param.id || index}
                    className={`url-param-row ${!param.enabled ? 'disabled' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="url-param-checkbox"
                      title="Enable / Disable query param"
                      checked={param.enabled}
                      onChange={(e) => handleUpdateParam(index, 'enabled', e.target.checked)}
                    />
                    <input
                      type="text"
                      className="url-param-input"
                      placeholder="key"
                      value={param.key}
                      onChange={(e) => handleUpdateParam(index, 'key', e.target.value)}
                    />
                    <input
                      type="text"
                      className="url-param-input"
                      placeholder="value"
                      value={param.value}
                      onChange={(e) => handleUpdateParam(index, 'value', e.target.value)}
                    />
                    <button
                      className="url-param-delete-btn"
                      title="Remove parameter"
                      onClick={() => handleDeleteParam(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <div className="url-params-empty">No query parameters found in URL.</div>
            )}

            <div className="url-params-actions">
              <button className="btn btn-sm" onClick={handleAddParam}>
                + Add Param
              </button>
              {parsedUrl.params.length > 0 && (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleParamsChange([])}
                >
                  Clear Params
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: URL Components Breakdown */}
        {activeTab === 'components' && (
          <div className="url-components-list">
            <div className="url-component-row">
              <span className="url-component-label">Protocol</span>
              <input
                type="text"
                className="url-component-input"
                value={parsedUrl.protocol}
                placeholder="https:"
                onChange={(e) => handleComponentChange('protocol', e.target.value)}
              />
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(parsedUrl.protocol)}
              >
                Copy
              </button>
            </div>

            <div className="url-component-row">
              <span className="url-component-label">Host</span>
              <input
                type="text"
                className="url-component-input"
                value={parsedUrl.host}
                placeholder="example.com"
                onChange={(e) => handleComponentChange('host', e.target.value)}
              />
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(parsedUrl.host)}
              >
                Copy
              </button>
            </div>

            <div className="url-component-row">
              <span className="url-component-label">Path</span>
              <input
                type="text"
                className="url-component-input"
                value={parsedUrl.pathname}
                placeholder="/api/v1/search"
                onChange={(e) => handleComponentChange('pathname', e.target.value)}
              />
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(parsedUrl.pathname)}
              >
                Copy
              </button>
            </div>

            <div className="url-component-row">
              <span className="url-component-label">Fragment</span>
              <input
                type="text"
                className="url-component-input"
                value={parsedUrl.hash}
                placeholder="#section"
                onChange={(e) => handleComponentChange('hash', e.target.value)}
              />
              <button
                className="btn btn-sm"
                onClick={() => copyToClipboard(parsedUrl.hash)}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Stats Bar */}
      <div className="url-stats-bar">
        <span>
          Input: <span className="url-stats-badge">{input.length} chars</span>
        </span>
        {parsedUrl.isUrl && (
          <span>
            Params: <span className="url-stats-badge">{parsedUrl.params.length}</span>
          </span>
        )}
        <span>
          Output: <span className="url-stats-badge">{output.length} chars</span>
        </span>
      </div>
    </div>
  );
};

export default UrlEncoder;
