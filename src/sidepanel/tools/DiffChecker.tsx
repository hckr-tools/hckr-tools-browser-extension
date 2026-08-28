import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import { exceedsLiveTextLimit, MAX_LIVE_TEXT_CHARS } from '../../shared/inputLimits';
import './DiffChecker.css';

interface DiffCheckerProps {
  initialInput?: string;
}

export type DiffType = 'added' | 'removed' | 'unchanged';

export interface DiffLine {
  type: DiffType;
  text: string;
  origLineNumber?: number;
  modLineNumber?: number;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
  total: number;
}

export interface DiffResult {
  lines: DiffLine[];
  stats: DiffStats;
  hasDifferences: boolean;
  isCompared: boolean;
}

const SAMPLE_ORIGINAL = `// User service configuration
export const config = {
  appName: "hckr",
  version: "1.0.0",
  mode: "development",
  features: [
    "json-formatter",
    "uuid-generator",
    "base64"
  ],
  maxRetries: 3
};`;

const SAMPLE_MODIFIED = `// User service configuration
export const config = {
  appName: "hckr-tools",
  version: "1.1.0",
  mode: "production",
  features: [
    "json-formatter",
    "uuid-generator",
    "base64",
    "dummy-data",
    "diff-checker"
  ],
  maxRetries: 5,
  offlineMode: true
};`;

function computeLcsDiff(
  originalText: string,
  modifiedText: string,
  options: { ignoreWhitespace: boolean; ignoreCase: boolean; trimLines: boolean }
): DiffResult {
  if (!originalText && !modifiedText) {
    return {
      lines: [],
      stats: { added: 0, removed: 0, unchanged: 0, total: 0 },
      hasDifferences: false,
      isCompared: true,
    };
  }

  const origLines = originalText.length > 0 ? originalText.split(/\r?\n/) : [];
  const modLines = modifiedText.length > 0 ? modifiedText.split(/\r?\n/) : [];

  const normalize = (line: string): string => {
    let result = line;
    if (options.trimLines) {
      result = result.trim();
    } else if (options.ignoreWhitespace) {
      result = result.replace(/\s+/g, ' ').trim();
    }
    if (options.ignoreCase) {
      result = result.toLowerCase();
    }
    return result;
  };

  const n = origLines.length;
  const m = modLines.length;

  // Build 2D DP matrix for LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const aNorm = normalize(origLines[i - 1]);
    for (let j = 1; j <= m; j++) {
      const bNorm = normalize(modLines[j - 1]);
      if (aNorm === bNorm) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find differences
  let i = n;
  let j = m;
  const rawDiff: Array<{
    type: DiffType;
    text: string;
    origNum?: number;
    modNum?: number;
  }> = [];

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      normalize(origLines[i - 1]) === normalize(modLines[j - 1])
    ) {
      rawDiff.push({
        type: 'unchanged',
        text: origLines[i - 1],
        origNum: i,
        modNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({
        type: 'added',
        text: modLines[j - 1],
        modNum: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({
        type: 'removed',
        text: origLines[i - 1],
        origNum: i,
      });
      i--;
    }
  }

  rawDiff.reverse();

  let added = 0;
  let removed = 0;
  let unchanged = 0;

  const lines: DiffLine[] = rawDiff.map((item) => {
    if (item.type === 'added') added++;
    else if (item.type === 'removed') removed++;
    else unchanged++;

    return {
      type: item.type,
      text: item.text,
      origLineNumber: item.origNum,
      modLineNumber: item.modNum,
    };
  });

  return {
    lines,
    stats: {
      added,
      removed,
      unchanged,
      total: lines.length,
    },
    hasDifferences: added > 0 || removed > 0,
    isCompared: true,
  };
}

export const DiffChecker: React.FC<DiffCheckerProps> = ({ initialInput }) => {
  const [originalText, setOriginalText] = useState<string>(initialInput || '');
  const [modifiedText, setModifiedText] = useState<string>('');

  // Options
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(false);
  const [ignoreCase, setIgnoreCase] = useState<boolean>(false);
  const [trimLines, setTrimLines] = useState<boolean>(false);

  // Diff output state
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);

  // Synchronize when initialInput prop changes
  useEffect(() => {
    if (initialInput !== undefined) {
      setOriginalText(initialInput);
    }
  }, [initialInput]);

  // Compute diff function
  const handleCompare = useCallback(() => {
    if (exceedsLiveTextLimit(originalText) || exceedsLiveTextLimit(modifiedText)) {
      setDiffResult(null);
      return;
    }
    const result = computeLcsDiff(originalText, modifiedText, {
      ignoreWhitespace,
      ignoreCase,
      trimLines,
    });
    setDiffResult(result);
  }, [originalText, modifiedText, ignoreWhitespace, ignoreCase, trimLines]);

  const exceedsLimit = exceedsLiveTextLimit(originalText) || exceedsLiveTextLimit(modifiedText);

  // Auto-compare on mount if initial input is provided or when sample is loaded
  useEffect(() => {
    if (originalText || modifiedText) {
      handleCompare();
    }
  }, [originalText, modifiedText, ignoreWhitespace, ignoreCase, trimLines, handleCompare]);

  // Swap handler
  const handleSwap = useCallback(() => {
    setOriginalText(modifiedText);
    setModifiedText(originalText);
  }, [originalText, modifiedText]);

  // Clear handler
  const handleClear = useCallback(() => {
    setOriginalText('');
    setModifiedText('');
    setDiffResult(null);
  }, []);

  // Sample load handler
  const handleLoadSample = useCallback(() => {
    setOriginalText(SAMPLE_ORIGINAL);
    setModifiedText(SAMPLE_MODIFIED);
  }, []);

  // Copy diff output as formatted text
  const handleCopyDiff = useCallback(() => {
    if (!diffResult || diffResult.lines.length === 0) return;

    const diffText = diffResult.lines
      .map((line) => {
        const prefix = line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  ';
        return `${prefix}${line.text}`;
      })
      .join('\n');

    copyToClipboard(diffText);
  }, [diffResult]);

  const originalLineCount = useMemo(() => {
    return originalText ? originalText.split(/\r?\n/).length : 0;
  }, [originalText]);

  const modifiedLineCount = useMemo(() => {
    return modifiedText ? modifiedText.split(/\r?\n/).length : 0;
  }, [modifiedText]);

  return (
    <div className="tool-container diff-checker-tool">
      {/* Top Action Toolbar */}
      <div className="toolbar justify-between">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCompare}
          title="Compute differences"
        >
          <span>⚡</span> Compare Diff
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn"
            onClick={handleSwap}
            title="Swap Original and Modified text"
          >
            ⇄ Swap
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleLoadSample}
            title="Load sample code for comparison"
          >
            Sample
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleClear}
            title="Clear all inputs and diff"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Options Bar */}
      <div className="diff-options-bar">
        <label className="diff-option-checkbox">
          <input
            type="checkbox"
            checked={ignoreWhitespace}
            onChange={(e) => setIgnoreWhitespace(e.target.checked)}
          />
          <span>Ignore Whitespace</span>
        </label>
        <label className="diff-option-checkbox">
          <input
            type="checkbox"
            checked={ignoreCase}
            onChange={(e) => setIgnoreCase(e.target.checked)}
          />
          <span>Ignore Case</span>
        </label>
        <label className="diff-option-checkbox">
          <input
            type="checkbox"
            checked={trimLines}
            onChange={(e) => setTrimLines(e.target.checked)}
          />
          <span>Trim Lines</span>
        </label>
      </div>

      {/* Input Textareas (Original & Modified) */}
      <div className="diff-inputs-grid">
        <div className="diff-input-pane">
          <div className="diff-pane-header">
            <label className="label">Original</label>
            <span className="diff-pane-count">{originalLineCount} lines</span>
          </div>
          <textarea
            className="textarea diff-textarea"
            placeholder="Paste original text or code here..."
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="diff-input-pane">
          <div className="diff-pane-header">
            <label className="label">Modified</label>
            <span className="diff-pane-count">{modifiedLineCount} lines</span>
          </div>
          <textarea
            className="textarea diff-textarea"
            placeholder="Paste modified text or code here..."
            value={modifiedText}
            onChange={(e) => setModifiedText(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      {exceedsLimit && <p className="diff-empty-state">Large inputs stay in this page but comparison is paused above {MAX_LIVE_TEXT_CHARS.toLocaleString()} characters.</p>}

      {/* Diff Result Section */}
      <div className="section flex-1 diff-output-section">
        <div className="diff-output-header">
          <div className="flex items-center gap-2">
            <label className="label" style={{ marginBottom: 0 }}>
              Diff Output
            </label>
            {diffResult && diffResult.isCompared && (
              <div className="diff-stats-group">
                <span className="diff-stat-badge diff-stat-added" title="Added lines">
                  +{diffResult.stats.added}
                </span>
                <span className="diff-stat-badge diff-stat-removed" title="Removed lines">
                  -{diffResult.stats.removed}
                </span>
                <span className="diff-stat-badge diff-stat-unchanged" title="Unchanged lines">
                  ={diffResult.stats.unchanged}
                </span>
              </div>
            )}
          </div>

          {diffResult && diffResult.lines.length > 0 && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyDiff}
              title="Copy unified diff to clipboard"
            >
              📋 Copy Diff
            </button>
          )}
        </div>

        {/* Output Content */}
        {exceedsLimit ? null : !diffResult || (!originalText && !modifiedText) ? (
          <div className="diff-empty-state">
            <span className="diff-empty-icon">📊</span>
            <p>Enter text in Original and Modified fields above to compare.</p>
          </div>
        ) : !diffResult.hasDifferences ? (
          <div className="diff-identical-state">
            <span className="diff-identical-icon">✓</span>
            <p><strong>Identical!</strong> No differences found between original and modified text.</p>
          </div>
        ) : (
          <div className="diff-viewer">
            <div className="diff-table">
              {diffResult.lines.map((line, index) => (
                <div
                  key={index}
                  className={`diff-row diff-row-${line.type}`}
                >
                  <div className="diff-line-num diff-line-orig">
                    {line.origLineNumber ?? ''}
                  </div>
                  <div className="diff-line-num diff-line-mod">
                    {line.modLineNumber ?? ''}
                  </div>
                  <div className="diff-line-prefix">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </div>
                  <div className="diff-line-text">
                    {line.text || ' '}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffChecker;
