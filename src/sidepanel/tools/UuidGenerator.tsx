import React, { useState, useCallback, useMemo } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import './UuidGenerator.css';

interface UuidGeneratorProps {
  initialInput?: string;
}

type GeneratorMode = 'uuid' | 'ulid';

// Crockford's Base32 alphabet: excludes I, L, O, U to avoid confusion
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Encode integer timestamp into Crockford's Base32 (10 chars for 48 bits)
 */
function encodeTime(timeMs: number, len = 10): string {
  let str = '';
  let now = timeMs;
  for (let i = len - 1; i >= 0; i--) {
    const mod = now % 32;
    str = CROCKFORD_BASE32[mod] + str;
    now = Math.floor(now / 32);
  }
  return str;
}

/**
 * Generate 80 bits (10 bytes) of cryptographically secure randomness
 * and encode into Crockford's Base32 (16 chars)
 */
function encodeRandom(len = 16): string {
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  let randBigInt = 0n;
  for (let i = 0; i < 10; i++) {
    randBigInt = (randBigInt << 8n) | BigInt(randomBytes[i]);
  }

  let str = '';
  for (let i = 0; i < len; i++) {
    const shift = BigInt((len - 1 - i) * 5);
    const index = Number((randBigInt >> shift) & 0x1fn);
    str += CROCKFORD_BASE32[index];
  }
  return str;
}

/**
 * Generate ULID (Universally Unique Lexicographically Sortable Identifier)
 * 26 chars = 10 chars (48-bit timestamp) + 16 chars (80-bit random)
 */
function generateULID(uppercase = true): string {
  const timeStr = encodeTime(Date.now(), 10);
  const randStr = encodeRandom(16);
  const ulid = timeStr + randStr;
  return uppercase ? ulid.toUpperCase() : ulid.toLowerCase();
}

/**
 * Generate UUID v4
 */
function generateUUID(uppercase = false, hyphens = true): string {
  let uuid = '';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID();
  } else {
    // RFC 4122 v4 fallback
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC 4122
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  if (!hyphens) {
    uuid = uuid.replace(/-/g, '');
  }

  return uppercase ? uuid.toUpperCase() : uuid.toLowerCase();
}

interface GeneratedItem {
  id: string;
  value: string;
  type: GeneratorMode;
  createdAt: number;
}

const UuidGenerator: React.FC<UuidGeneratorProps> = () => {
  const [mode, setMode] = useState<GeneratorMode>('uuid');
  const [uppercase, setUppercase] = useState(false);
  const [includeHyphens, setIncludeHyphens] = useState(true);
  const [generatedList, setGeneratedList] = useState<GeneratedItem[]>(() => {
    // Initialize with 1 item on mount for instant preview
    const initialVal = generateUUID(false, true);
    return [
      {
        id: `${Date.now()}-0`,
        value: initialVal,
        type: 'uuid',
        createdAt: Date.now(),
      },
    ];
  });

  const generateItems = useCallback(
    (count: number) => {
      const now = Date.now();
      const newItems: GeneratedItem[] = [];

      for (let i = 0; i < count; i++) {
        let val = '';
        if (mode === 'uuid') {
          val = generateUUID(uppercase, includeHyphens);
        } else {
          val = generateULID(uppercase);
        }

        newItems.push({
          id: `${now}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          value: val,
          type: mode,
          createdAt: now,
        });
      }

      setGeneratedList((prev) => [...newItems, ...prev]);
    },
    [mode, uppercase, includeHyphens]
  );

  const handleCopyAll = useCallback(async () => {
    if (generatedList.length === 0) return;
    const text = generatedList.map((item) => item.value).join('\n');
    await copyToClipboard(text);
  }, [generatedList]);

  const handleClear = useCallback(() => {
    setGeneratedList([]);
  }, []);

  const handleCopyItem = useCallback(async (val: string) => {
    await copyToClipboard(val);
  }, []);

  const totalCount = generatedList.length;

  const modeDescription = useMemo(() => {
    if (mode === 'uuid') {
      return '128-bit RFC 4122 v4 Universally Unique Identifier';
    }
    return '128-bit Universally Unique Lexicographically Sortable Identifier (48-bit timestamp + 80-bit random)';
  }, [mode]);

  return (
    <div className="tool-container uuid-container">
      {/* Configuration Card */}
      <div className="section uuid-controls-card">
        <div className="uuid-mode-header">
          <label className="label">Generator Type</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${mode === 'uuid' ? 'active' : ''}`}
              onClick={() => {
                setMode('uuid');
                setUppercase(false);
              }}
            >
              UUID v4
            </button>
            <button
              type="button"
              className={`toggle-btn ${mode === 'ulid' ? 'active' : ''}`}
              onClick={() => {
                setMode('ulid');
                setUppercase(true);
              }}
            >
              ULID
            </button>
          </div>
        </div>

        <div className="uuid-desc">{modeDescription}</div>

        {/* Options */}
        <div className="uuid-options-row">
          <label className="uuid-checkbox-label">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="uuid-checkbox"
            />
            <span>Uppercase</span>
          </label>

          {mode === 'uuid' && (
            <label className="uuid-checkbox-label">
              <input
                type="checkbox"
                checked={includeHyphens}
                onChange={(e) => setIncludeHyphens(e.target.checked)}
                className="uuid-checkbox"
              />
              <span>Hyphens</span>
            </label>
          )}
        </div>

        {/* Batch Generate Buttons */}
        <div className="uuid-batch-section">
          <label className="label">Generate Batch</label>
          <div className="uuid-batch-buttons">
            <button
              type="button"
              className="btn btn-primary btn-batch"
              onClick={() => generateItems(1)}
            >
              + 1
            </button>
            <button
              type="button"
              className="btn btn-batch"
              onClick={() => generateItems(5)}
            >
              + 5
            </button>
            <button
              type="button"
              className="btn btn-batch"
              onClick={() => generateItems(10)}
            >
              + 10
            </button>
            <button
              type="button"
              className="btn btn-batch"
              onClick={() => generateItems(50)}
            >
              + 50
            </button>
          </div>
        </div>
      </div>

      {/* Results Header & Actions */}
      <div className="uuid-list-header">
        <div className="uuid-count-badge">
          <span className="badge">
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </span>
        </div>
        <div className="uuid-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleCopyAll}
            disabled={totalCount === 0}
            title="Copy all IDs separated by newlines"
          >
            📋 Copy All
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={handleClear}
            disabled={totalCount === 0}
            title="Clear all generated IDs"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="uuid-list-wrapper">
        {totalCount === 0 ? (
          <div className="uuid-empty-state">
            <span className="uuid-empty-icon">🆔</span>
            <p>No IDs generated yet.</p>
            <p className="uuid-empty-hint">Use the buttons above to generate UUIDs or ULIDs.</p>
          </div>
        ) : (
          <div className="uuid-list">
            {generatedList.map((item, index) => (
              <div key={item.id} className="uuid-item">
                <div className="uuid-item-meta">
                  <span className="uuid-item-index">#{totalCount - index}</span>
                  <span className="uuid-item-tag">{item.type.toUpperCase()}</span>
                </div>
                <span className="uuid-item-value">{item.value}</span>
                <button
                  type="button"
                  className="btn btn-sm uuid-item-copy"
                  onClick={() => handleCopyItem(item.value)}
                  title="Copy this ID"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UuidGenerator;
