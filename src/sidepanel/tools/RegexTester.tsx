import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import { loadToolState, saveToolState } from '../../shared/storage';
import './RegexTester.css';

interface RegexTesterProps {
  initialInput?: string;
}

interface RegexFlags {
  g: boolean;
  i: boolean;
  m: boolean;
  s: boolean;
}

interface CapturedGroup {
  index: number;
  name?: string;
  value: string;
  isMatched: boolean;
}

interface MatchResult {
  matchIndex: number;
  index: number;
  endIndex: number;
  text: string;
  groups: CapturedGroup[];
}

interface TextSegment {
  text: string;
  isMatch: boolean;
  matchIndex?: number;
  isZeroWidth?: boolean;
}

const PRESETS = [
  { label: 'Presets...', pattern: '', flags: 'gm' },
  { label: 'Email Address', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: 'gi' },
  { label: 'URL (HTTP/HTTPS)', pattern: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)', flags: 'gi' },
  { label: 'IPv4 Address', pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b', flags: 'g' },
  { label: 'UUID v4', pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}', flags: 'gi' },
  { label: 'Hex Color (#fff / #ffffff)', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'gi' },
  { label: 'Date (YYYY-MM-DD)', pattern: '(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])', flags: 'g' },
  { label: 'HTML Tag', pattern: '<(?<tag>[a-zA-Z0-9]+)(?:\\s+[^>]*)?>(?<content>.*?)<\\/\\k<tag>>', flags: 'gis' },
  { label: 'Phone (US)', pattern: '(?:\\+?1[-. ]?)?\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})', flags: 'gm' },
];

const DEFAULT_TEST_STRING = `Welcome to hckr Regex Tester!
Contact us at support@example.com or admin@hckr.dev
Visit https://example.com for more documentation.
Server IP: 192.168.1.1 and 10.0.0.254
Release date: 2026-08-24
Color palette: #00d2ff, #1a1a2e, #22c55e`;

const MAX_MATCH_LIMIT = 500;

const RegexTester: React.FC<RegexTesterProps> = ({ initialInput }) => {
  const [pattern, setPattern] = useState<string>('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [flags, setFlags] = useState<RegexFlags>({
    g: true,
    i: false,
    m: true,
    s: false,
  });
  const [testString, setTestString] = useState<string>(DEFAULT_TEST_STRING);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Initialize from initialInput or saved state
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (initialInput !== undefined) {
        setPattern(initialInput);
        return;
      }

      try {
        const saved = await loadToolState('regex-tester');
        if (isMounted && saved) {
          if (saved.input !== undefined) setPattern(saved.input);
          if (saved.secondaryInput !== undefined) setTestString(saved.secondaryInput);
          if (saved.options?.flags) {
            setFlags(saved.options.flags as unknown as RegexFlags);
          }
        }
      } catch (err) {
        console.error('Failed to load regex-tester state', err);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [initialInput]);

  // Save state helper
  const persistState = useCallback(
    (newPattern: string, newTestString: string, newFlags: RegexFlags) => {
      saveToolState('regex-tester', {
        input: newPattern,
        secondaryInput: newTestString,
        options: { flags: newFlags },
      }).catch(console.error);
    },
    []
  );

  const handlePatternChange = (newPattern: string) => {
    setPattern(newPattern);
    persistState(newPattern, testString, flags);
  };

  const handleTestStringChange = (newTestString: string) => {
    setTestString(newTestString);
    persistState(pattern, newTestString, flags);
  };

  const toggleFlag = (flagKey: keyof RegexFlags) => {
    setFlags((prev) => {
      const updated = { ...prev, [flagKey]: !prev[flagKey] };
      persistState(pattern, testString, updated);
      return updated;
    });
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = PRESETS.find((p) => p.pattern === e.target.value);
    if (selected && selected.pattern) {
      const newFlags: RegexFlags = {
        g: selected.flags.includes('g'),
        i: selected.flags.includes('i'),
        m: selected.flags.includes('m'),
        s: selected.flags.includes('s'),
      };
      setPattern(selected.pattern);
      setFlags(newFlags);
      persistState(selected.pattern, testString, newFlags);
    }
  };

  // Build flags string
  const flagsString = useMemo(() => {
    let str = '';
    if (flags.g) str += 'g';
    if (flags.i) str += 'i';
    if (flags.m) str += 'm';
    if (flags.s) str += 's';
    return str;
  }, [flags]);

  // Compute matches and errors
  const { matches, error, hitLimit } = useMemo(() => {
    if (!pattern) {
      return { matches: [], error: null, hitLimit: false };
    }

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flagsString);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid Regular Expression';
      return { matches: [], error: message, hitLimit: false };
    }

    const results: MatchResult[] = [];
    let isHitLimit = false;

    try {
      if (!flags.g) {
        const match = regex.exec(testString);
        if (match && match.index !== undefined) {
          const groups: CapturedGroup[] = [];
          for (let i = 1; i < match.length; i++) {
            groups.push({
              index: i,
              value: match[i] ?? '',
              isMatched: match[i] !== undefined,
            });
          }
          if (match.groups) {
            for (const [name, val] of Object.entries(match.groups)) {
              const existing = groups.find((g) => g.value === val);
              if (existing) {
                existing.name = name;
              } else {
                groups.push({
                  index: -1,
                  name,
                  value: val ?? '',
                  isMatched: val !== undefined,
                });
              }
            }
          }

          results.push({
            matchIndex: 0,
            index: match.index,
            endIndex: match.index + match[0].length,
            text: match[0],
            groups,
          });
        }
      } else {
        let match: RegExpExecArray | null;
        let count = 0;

        while ((match = regex.exec(testString)) !== null) {
          const groups: CapturedGroup[] = [];
          for (let i = 1; i < match.length; i++) {
            groups.push({
              index: i,
              value: match[i] ?? '',
              isMatched: match[i] !== undefined,
            });
          }
          if (match.groups) {
            for (const [name, val] of Object.entries(match.groups)) {
              const existing = groups.find((g) => g.value === val);
              if (existing) {
                existing.name = name;
              } else {
                groups.push({
                  index: -1,
                  name,
                  value: val ?? '',
                  isMatched: val !== undefined,
                });
              }
            }
          }

          results.push({
            matchIndex: count,
            index: match.index,
            endIndex: match.index + match[0].length,
            text: match[0],
            groups,
          });

          count++;
          if (count >= MAX_MATCH_LIMIT) {
            isHitLimit = true;
            break;
          }

          // Advance regex index if match is zero-length to prevent infinite loop
          if (match[0].length === 0) {
            regex.lastIndex++;
            if (regex.lastIndex > testString.length) {
              break;
            }
          }
        }
      }
    } catch (execErr: unknown) {
      const message = execErr instanceof Error ? execErr.message : 'Execution error';
      return { matches: [], error: message, hitLimit: false };
    }

    return { matches: results, error: null, hitLimit: isHitLimit };
  }, [pattern, flagsString, testString, flags.g]);

  // Compute text segments for highlighting
  const highlightedSegments = useMemo(() => {
    if (matches.length === 0 || !testString) {
      return [{ text: testString, isMatch: false }];
    }

    const segments: TextSegment[] = [];
    let lastIndex = 0;

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      // Text before match
      if (m.index > lastIndex) {
        segments.push({
          text: testString.slice(lastIndex, m.index),
          isMatch: false,
        });
      }

      // Matched text
      if (m.endIndex > m.index) {
        segments.push({
          text: testString.slice(m.index, m.endIndex),
          isMatch: true,
          matchIndex: m.matchIndex,
        });
        lastIndex = m.endIndex;
      } else if (m.index === m.endIndex) {
        // Zero-width match (e.g. ^, $, \b)
        segments.push({
          text: '📍',
          isMatch: true,
          matchIndex: m.matchIndex,
          isZeroWidth: true,
        });
        lastIndex = m.index;
      }
    }

    // Remaining text after last match
    if (lastIndex < testString.length) {
      segments.push({
        text: testString.slice(lastIndex),
        isMatch: false,
      });
    }

    return segments;
  }, [matches, testString]);

  // Copy helpers
  const handleCopyRegex = async () => {
    const fullRegex = `/${pattern}/${flagsString}`;
    await copyToClipboard(fullRegex);
    setCopiedType('regex');
    setTimeout(() => setCopiedType(null), 1500);
  };

  const handleCopyMatches = async () => {
    if (matches.length === 0) return;
    const textList = matches.map((m) => m.text).join('\n');
    await copyToClipboard(textList);
    setCopiedType('matches');
    setTimeout(() => setCopiedType(null), 1500);
  };

  const handleCopyJson = async () => {
    if (matches.length === 0) return;
    const jsonOutput = JSON.stringify(
      matches.map((m) => ({
        match: m.text,
        start: m.index,
        end: m.endIndex,
        groups: m.groups.map((g) => ({
          group: g.name ? `${g.name} ($${g.index})` : `$${g.index}`,
          value: g.value,
        })),
      })),
      null,
      2
    );
    await copyToClipboard(jsonOutput);
    setCopiedType('json');
    setTimeout(() => setCopiedType(null), 1500);
  };

  const handleClear = () => {
    setPattern('');
    setTestString('');
    persistState('', '', flags);
  };

  return (
    <div className="regex-tester">
      {/* Pattern & Flags Section */}
      <div className="regex-section">
        <div className="regex-section-header">
          <label className="label" htmlFor="regex-pattern-field">
            Regular Expression
          </label>
          <div className="regex-presets-group">
            <select
              className="regex-preset-select"
              onChange={handlePresetSelect}
              value=""
              aria-label="Regex Presets"
            >
              {PRESETS.map((preset, idx) => (
                <option key={idx} value={preset.pattern} disabled={idx === 0}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="regex-pattern-container">
          <span className="regex-slash">/</span>
          <input
            id="regex-pattern-field"
            type="text"
            className="regex-pattern-input"
            value={pattern}
            onChange={(e) => handlePatternChange(e.target.value)}
            placeholder="Enter regex pattern (e.g. \w+@\w+\.\w+)"
            spellCheck={false}
            autoFocus
          />
          <span className="regex-slash">/{flagsString}</span>
        </div>

        {/* Flag Checkboxes */}
        <div className="regex-flags-bar">
          <div className="regex-flags-group">
            <label
              className={`regex-flag-label ${flags.g ? 'active' : ''}`}
              title="Global: Match all occurrences rather than stopping after the first"
            >
              <input
                type="checkbox"
                className="regex-flag-checkbox"
                checked={flags.g}
                onChange={() => toggleFlag('g')}
              />
              <span>g</span>
            </label>

            <label
              className={`regex-flag-label ${flags.i ? 'active' : ''}`}
              title="Ignore Case: Case-insensitive match"
            >
              <input
                type="checkbox"
                className="regex-flag-checkbox"
                checked={flags.i}
                onChange={() => toggleFlag('i')}
              />
              <span>i</span>
            </label>

            <label
              className={`regex-flag-label ${flags.m ? 'active' : ''}`}
              title="Multiline: ^ and $ match start and end of line"
            >
              <input
                type="checkbox"
                className="regex-flag-checkbox"
                checked={flags.m}
                onChange={() => toggleFlag('m')}
              />
              <span>m</span>
            </label>

            <label
              className={`regex-flag-label ${flags.s ? 'active' : ''}`}
              title="DotAll: . matches newlines"
            >
              <input
                type="checkbox"
                className="regex-flag-checkbox"
                checked={flags.s}
                onChange={() => toggleFlag('s')}
              />
              <span>s</span>
            </label>
          </div>

          <div className="regex-actions-bar">
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyRegex}
              disabled={!pattern}
              title="Copy /pattern/flags"
            >
              {copiedType === 'regex' ? '✓ Copied' : 'Copy Regex'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleClear}
              disabled={!pattern && !testString}
              title="Clear all fields"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && <div className="error-msg">{error}</div>}

      <div className="tool-split">
      {/* Test String Input */}
      <div className="regex-section">
        <div className="regex-section-header">
          <label className="label" htmlFor="regex-test-string">
            Test String
          </label>
          <span className="regex-match-pos-badge">
            {testString.length} chars
          </span>
        </div>
        <textarea
          id="regex-test-string"
          className="regex-textarea"
          value={testString}
          onChange={(e) => handleTestStringChange(e.target.value)}
          placeholder="Enter test string to test your regex against..."
          spellCheck={false}
        />
      </div>

      <div className="tool-split-col">
      {/* Match Overview & Highlights */}
      <div className="regex-section">
        <div className="regex-summary-bar">
          <div className="regex-match-status">
            {error ? (
              <span style={{ color: 'var(--error)' }}>⚠️ Syntax Error</span>
            ) : !pattern ? (
              <span style={{ color: 'var(--text-muted)' }}>Enter a pattern</span>
            ) : matches.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>No matches</span>
            ) : (
              <span style={{ color: 'var(--accent)' }}>
                {matches.length} {matches.length === 1 ? 'match' : 'matches'} found
                {hitLimit && ` (capped at ${MAX_MATCH_LIMIT})`}
              </span>
            )}
          </div>
          <div className="regex-actions-bar">
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyMatches}
              disabled={matches.length === 0}
              title="Copy matched text strings"
            >
              {copiedType === 'matches' ? '✓ Copied' : 'Copy Matches'}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyJson}
              disabled={matches.length === 0}
              title="Copy matches and capture groups as JSON"
            >
              {copiedType === 'json' ? '✓ Copied JSON' : 'JSON'}
            </button>
          </div>
        </div>

        {/* Live Highlighted Box */}
        <div className="regex-highlight-box">
          {!testString ? (
            <span className="regex-highlight-empty">
              Match highlights will appear here when test string is provided...
            </span>
          ) : !pattern || error || matches.length === 0 ? (
            <span>{testString}</span>
          ) : (
            highlightedSegments.map((segment, idx) => {
              if (!segment.isMatch) {
                return <span key={idx}>{segment.text}</span>;
              }
              if (segment.isZeroWidth) {
                return (
                  <span
                    key={idx}
                    className="match-hl-zero-width"
                    title={`Match #${(segment.matchIndex ?? 0) + 1} (Zero-width)`}
                  >
                    {segment.text}
                  </span>
                );
              }
              const colorClass = (segment.matchIndex ?? 0) % 2 === 0 ? 'match-hl-0' : 'match-hl-1';
              return (
                <mark
                  key={idx}
                  className={colorClass}
                  title={`Match #${(segment.matchIndex ?? 0) + 1}`}
                >
                  {segment.text}
                </mark>
              );
            })
          )}
        </div>
      </div>

      {/* Match Details & Capture Groups */}
      {matches.length > 0 && (
        <div className="regex-section">
          <div className="regex-section-header">
            <label className="label">
              Match Details & Capture Groups ({matches.length})
            </label>
          </div>
          <div className="regex-matches-list">
            {matches.map((match) => (
              <div key={match.matchIndex} className="regex-match-card">
                <div className="regex-match-header">
                  <div className="regex-match-title">
                    <span className="regex-match-index-badge">
                      Match #{match.matchIndex + 1}
                    </span>
                    <span className="regex-match-pos-badge">
                      Pos: {match.index}..{match.endIndex} (len: {match.text.length})
                    </span>
                  </div>
                </div>
                <div className="regex-match-text">
                  {match.text.length > 0 ? match.text : <em style={{ color: 'var(--text-muted)' }}>&lt;zero-length match&gt;</em>}
                </div>

                {/* Capture Groups */}
                {match.groups.length > 0 ? (
                  <div className="regex-groups-container">
                    {match.groups.map((group, gIdx) => (
                      <div key={gIdx} className="regex-group-row">
                        <span className="regex-group-name">
                          {group.name ? `$${group.name}` : `Group ${group.index}`}:
                        </span>
                        <span className="regex-group-val">
                          {group.isMatched ? (
                            group.value === '' ? (
                              <em style={{ color: 'var(--text-muted)' }}>&quot;&quot; (empty)</em>
                            ) : (
                              group.value
                            )
                          ) : (
                            <em style={{ color: 'var(--text-muted)' }}>undefined</em>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="regex-no-groups-note">No capture groups in pattern</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};

export default RegexTester;
