import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

interface DiffDisplayRow {
  kind: 'added' | 'changed' | 'removed' | 'unchanged';
  original?: DiffLine;
  modified?: DiffLine;
  differenceIndex?: number;
}

type DiffDisplayItem =
  | { kind: 'row'; row: DiffDisplayRow }
  | { kind: 'collapsed'; groupId: number; rows: DiffDisplayRow[] };

const COLLAPSE_UNCHANGED_THRESHOLD = 4;

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

function buildDiffDisplayItems(lines: DiffLine[]): DiffDisplayItem[] {
  const displayRows: DiffDisplayRow[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const nextLine = lines[index + 1];
    if (line.type === 'removed' && nextLine?.type === 'added') {
      displayRows.push({ kind: 'changed', original: line, modified: nextLine });
      index++;
    } else if (line.type === 'unchanged') {
      displayRows.push({ kind: 'unchanged', original: line, modified: line });
    } else if (line.type === 'removed') {
      displayRows.push({ kind: 'removed', original: line });
    } else {
      displayRows.push({ kind: 'added', modified: line });
    }
  }

  let differenceIndex = 0;
  for (const row of displayRows) {
    if (row.kind !== 'unchanged') row.differenceIndex = differenceIndex++;
  }

  const items: DiffDisplayItem[] = [];
  let unchangedRows: DiffDisplayRow[] = [];
  let groupId = 0;
  const flushUnchangedRows = () => {
    if (unchangedRows.length >= COLLAPSE_UNCHANGED_THRESHOLD) {
      items.push({ kind: 'collapsed', groupId: groupId++, rows: unchangedRows });
    } else {
      items.push(...unchangedRows.map((row) => ({ kind: 'row' as const, row })));
    }
    unchangedRows = [];
  };

  for (const row of displayRows) {
    if (row.kind === 'unchanged') {
      unchangedRows.push(row);
    } else {
      flushUnchangedRows();
      items.push({ kind: 'row', row });
    }
  }
  flushUnchangedRows();
  return items;
}

function DiffCell({ line, side }: { line?: DiffLine; side: 'original' | 'modified' }) {
  return (
    <div className={`diff-side-cell diff-side-cell-${side}${line ? ` diff-side-cell-${line.type}` : ''}`}>
      <span className="diff-side-line-number">
        {side === 'original' ? line?.origLineNumber ?? '' : line?.modLineNumber ?? ''}
      </span>
      <span className="diff-side-line-text">{line?.text || ' '}</span>
    </div>
  );
}

function SideBySideDiffRow({ row, isCurrent }: { row: DiffDisplayRow; isCurrent: boolean }) {
  return (
    <div
      className={`diff-side-row diff-side-row-${row.kind}${isCurrent ? ' diff-row-current' : ''}`}
      data-diff-index={row.differenceIndex}
    >
      <DiffCell line={row.original} side="original" />
      <DiffCell line={row.modified} side="modified" />
    </div>
  );
}

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
  const [currentDifferenceIndex, setCurrentDifferenceIndex] = useState(0);
  const [expandedUnchangedGroups, setExpandedUnchangedGroups] = useState<Set<number>>(() => new Set());
  const diffViewerRef = useRef<HTMLDivElement>(null);

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
    setCurrentDifferenceIndex(0);
    setExpandedUnchangedGroups(new Set());
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
    setCurrentDifferenceIndex(0);
    setExpandedUnchangedGroups(new Set());
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

  const diffDisplayItems = useMemo(() => {
    return diffResult ? buildDiffDisplayItems(diffResult.lines) : [];
  }, [diffResult]);

  const differenceCount = useMemo(() => {
    return diffDisplayItems.reduce((count, item) => {
      if (item.kind === 'row') return count + (item.row.kind === 'unchanged' ? 0 : 1);
      return count;
    }, 0);
  }, [diffDisplayItems]);

  const handleNextDifference = useCallback(() => {
    if (differenceCount === 0) return;

    const nextIndex = (currentDifferenceIndex + 1) % differenceCount;
    setCurrentDifferenceIndex(nextIndex);
    const row = diffViewerRef.current?.querySelector<HTMLElement>(
      `[data-diff-index="${nextIndex}"]`
    );
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentDifferenceIndex, differenceCount]);

  const toggleUnchangedGroup = useCallback((groupId: number) => {
    setExpandedUnchangedGroups((currentGroups) => {
      const nextGroups = new Set(currentGroups);
      if (nextGroups.has(groupId)) nextGroups.delete(groupId);
      else nextGroups.add(groupId);
      return nextGroups;
    });
  }, []);

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
              <div className="diff-stats-group" aria-label={`${differenceCount} total differences`}>
                <span className="diff-stat-badge diff-stat-added" title="Added lines">
                  +{diffResult.stats.added}
                </span>
                <span className="diff-stat-badge diff-stat-removed" title="Removed lines">
                  -{diffResult.stats.removed}
                </span>
                <span className="diff-stat-badge diff-stat-unchanged" title="Unchanged lines">
                  ={diffResult.stats.unchanged}
                </span>
                <span className="diff-stat-badge diff-stat-total" title="Total differences">
                  {differenceCount} diffs
                </span>
              </div>
            )}
          </div>

          <div className="diff-output-actions">
            {differenceCount > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleNextDifference}
                title="Jump to the next changed line"
              >
                Next diff ({currentDifferenceIndex + 1}/{differenceCount})
              </button>
            )}
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
          <div className="diff-viewer" ref={diffViewerRef}>
            <div className="diff-table">
              <div className="diff-side-header" aria-hidden="true">
                <span>Original</span>
                <span>Modified</span>
              </div>
              {diffDisplayItems.map((item, itemIndex) => {
                if (item.kind === 'row') {
                  return (
                    <SideBySideDiffRow
                      key={`row-${itemIndex}`}
                      row={item.row}
                      isCurrent={item.row.differenceIndex === currentDifferenceIndex}
                    />
                  );
                }

                const isExpanded = expandedUnchangedGroups.has(item.groupId);
                return (
                  <React.Fragment key={`unchanged-${itemIndex}`}>
                    <button
                      type="button"
                      className="diff-unchanged-toggle"
                      onClick={() => toggleUnchangedGroup(item.groupId)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'Hide' : 'Show'} {item.rows.length} unchanged lines
                    </button>
                    {isExpanded && item.rows.map((row) => (
                      <SideBySideDiffRow
                        key={`unchanged-row-${row.original?.origLineNumber}`}
                        row={row}
                        isCurrent={false}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffChecker;
