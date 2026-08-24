import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import { loadToolState, saveToolState } from '../../shared/storage';
import './HashGenerator.css';

interface HashGeneratorProps {
  initialInput?: string;
}

type AlgorithmId = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

interface AlgorithmConfig {
  id: AlgorithmId;
  label: string;
  bits: number;
  hexLength: number;
}

const ALGORITHMS: AlgorithmConfig[] = [
  { id: 'SHA-1', label: 'SHA-1', bits: 160, hexLength: 40 },
  { id: 'SHA-256', label: 'SHA-256', bits: 256, hexLength: 64 },
  { id: 'SHA-384', label: 'SHA-384', bits: 384, hexLength: 96 },
  { id: 'SHA-512', label: 'SHA-512', bits: 512, hexLength: 128 },
];

const HashGenerator: React.FC<HashGeneratorProps> = ({ initialInput }) => {
  const [input, setInput] = useState<string>('');
  const [isUppercase, setIsUppercase] = useState<boolean>(false);
  const [hashes, setHashes] = useState<Record<AlgorithmId, string>>({
    'SHA-1': '',
    'SHA-256': '',
    'SHA-384': '',
    'SHA-512': '',
  });
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [compareHash, setCompareHash] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute hashes using Web Crypto API
  const computeAllHashes = useCallback(async (text: string) => {
    if (text === '') {
      setHashes({
        'SHA-1': '',
        'SHA-256': '',
        'SHA-384': '',
        'SHA-512': '',
      });
      setError(null);
      return;
    }

    try {
      setIsComputing(true);
      setError(null);

      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      const entries = await Promise.all(
        ALGORITHMS.map(async (algo) => {
          const buffer = await crypto.subtle.digest(algo.id, data);
          const byteArray = new Uint8Array(buffer);
          const hex = Array.from(byteArray, (byte) =>
            byte.toString(16).padStart(2, '0')
          ).join('');
          return [algo.id, hex] as const;
        })
      );

      const results: Record<AlgorithmId, string> = {
        'SHA-1': '',
        'SHA-256': '',
        'SHA-384': '',
        'SHA-512': '',
      };

      for (const [id, hex] of entries) {
        results[id] = hex;
      }

      setHashes(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to compute hashes';
      setError(message);
    } finally {
      setIsComputing(false);
    }
  }, []);

  // Load saved state or initialInput on mount
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (initialInput !== undefined) {
        setInput(initialInput);
        computeAllHashes(initialInput);
        return;
      }

      try {
        const savedState = await loadToolState('hash-generator');
        if (isMounted && savedState?.input !== undefined) {
          setInput(savedState.input);
          if (typeof savedState.options?.isUppercase === 'boolean') {
            setIsUppercase(savedState.options.isUppercase);
          }
          computeAllHashes(savedState.input);
        }
      } catch (err) {
        console.error('Failed to load tool state', err);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [initialInput, computeAllHashes]);

  // Handle live input with 300ms debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      computeAllHashes(value);
      saveToolState('hash-generator', {
        input: value,
        options: { isUppercase },
      }).catch(console.error);
    }, 300);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Save uppercase toggle state
  const handleToggleCase = (uppercase: boolean) => {
    setIsUppercase(uppercase);
    saveToolState('hash-generator', {
      input,
      options: { isUppercase: uppercase },
    }).catch(console.error);
  };

  // Format hash string according to uppercase setting
  const formatHash = useCallback(
    (hash: string): string => {
      if (!hash) return '';
      return isUppercase ? hash.toUpperCase() : hash.toLowerCase();
    },
    [isUppercase]
  );

  // Copy single hash
  const handleCopySingle = async (algoId: AlgorithmId, rawHash: string) => {
    if (!rawHash) return;
    const formatted = formatHash(rawHash);
    await copyToClipboard(formatted);
    setCopiedId(algoId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Copy all hashes
  const handleCopyAll = async () => {
    if (!input && !hashes['SHA-256']) return;
    const lines = ALGORITHMS.map((algo) => {
      const val = hashes[algo.id] ? formatHash(hashes[algo.id]) : '(empty)';
      return `${algo.label}: ${val}`;
    });
    const summary = lines.join('\n');
    await copyToClipboard(summary);
    setCopiedId('ALL');
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Clear all inputs
  const handleClear = () => {
    setInput('');
    setCompareHash('');
    setError(null);
    setHashes({
      'SHA-1': '',
      'SHA-256': '',
      'SHA-384': '',
      'SHA-512': '',
    });
    saveToolState('hash-generator', {
      input: '',
      options: { isUppercase },
    }).catch(console.error);
  };

  // Character and byte metrics
  const byteCount = useMemo(() => {
    return new TextEncoder().encode(input).length;
  }, [input]);

  // Clean normalized compare hash for matching
  const normalizedCompare = compareHash.trim().toLowerCase();

  return (
    <div className="hash-generator">
      {/* Input Section */}
      <div className="hash-section">
        <div className="hash-section-header">
          <label className="label" htmlFor="hash-input-text">
            Input Text
          </label>
          <div className="hash-meta-info">
            <span>{input.length} chars</span>
            <span>•</span>
            <span>{byteCount} bytes</span>
          </div>
        </div>
        <textarea
          id="hash-input-text"
          className="hash-input-textarea"
          value={input}
          onChange={handleInputChange}
          placeholder="Type or paste text to compute hashes in real time..."
          autoFocus
          spellCheck={false}
        />
        <div className="hash-controls-bar">
          <div className="hash-controls-left">
            <div className="toggle-group" role="group" aria-label="Hash casing">
              <button
                type="button"
                className={`toggle-btn ${!isUppercase ? 'active' : ''}`}
                onClick={() => handleToggleCase(false)}
              >
                lowercase
              </button>
              <button
                type="button"
                className={`toggle-btn ${isUppercase ? 'active' : ''}`}
                onClick={() => handleToggleCase(true)}
              >
                UPPERCASE
              </button>
            </div>
            {isComputing && <span className="badge">Computing...</span>}
          </div>
          <div className="hash-controls-right">
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyAll}
              disabled={!input}
              title="Copy all hashes to clipboard"
            >
              {copiedId === 'ALL' ? '✓ Copied All' : 'Copy All'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleClear}
              disabled={!input && !compareHash}
              title="Clear input and hashes"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && <div className="error-msg">{error}</div>}

      {/* Compare Hash Section */}
      <div className="hash-section">
        <div className="hash-section-header">
          <label className="label" htmlFor="hash-compare-input">
            Compare / Verify Hash (Optional)
          </label>
        </div>
        <input
          id="hash-compare-input"
          type="text"
          className="hash-compare-input"
          value={compareHash}
          onChange={(e) => setCompareHash(e.target.value)}
          placeholder="Paste an existing hash here to find matching algorithm..."
          spellCheck={false}
        />
      </div>

      {/* Hash Results List */}
      <div className="hash-results-list">
        {ALGORITHMS.map((algo) => {
          const rawHash = hashes[algo.id];
          const formattedHash = formatHash(rawHash);
          const isMatch =
            normalizedCompare.length > 0 &&
            rawHash.length > 0 &&
            rawHash.toLowerCase() === normalizedCompare;

          return (
            <div
              key={algo.id}
              className={`hash-card ${isMatch ? 'hash-match' : ''}`}
            >
              <div className="hash-card-header">
                <div className="hash-card-title-group">
                  <span className="hash-algo-title">{algo.label}</span>
                  <span className="hash-algo-badge">
                    {algo.bits}-bit ({algo.hexLength} chars)
                  </span>
                  {isMatch && (
                    <span className="hash-match-badge">✓ MATCH</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleCopySingle(algo.id, rawHash)}
                  disabled={!rawHash}
                  title={`Copy ${algo.label} hash`}
                >
                  {copiedId === algo.id ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="hash-card-body">
                <div
                  className={`hash-value-display ${!formattedHash ? 'empty' : ''}`}
                >
                  {formattedHash || (input ? 'Computing...' : 'No input')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HashGenerator;
