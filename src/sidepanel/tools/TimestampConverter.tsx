import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import './TimestampConverter.css';

interface TimestampConverterProps {
  initialInput?: string;
}

interface ParsedResult {
  date: Date | null;
  detectedFormat: string;
  isLive: boolean;
  error?: string;
}

/**
 * Format relative time string from target timestamp against current time
 */
function formatRelativeTime(targetMs: number, nowMs: number): string {
  const diffSec = Math.round((targetMs - nowMs) / 1000);
  const absSec = Math.abs(diffSec);
  const isFuture = diffSec > 0;

  if (absSec < 5) {
    return 'just now';
  }

  const intervals: { unit: string; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(absSec / interval.seconds);
    if (count >= 1) {
      const unitStr = count === 1 ? interval.unit : `${interval.unit}s`;
      return isFuture ? `in ${count} ${unitStr}` : `${count} ${unitStr} ago`;
    }
  }

  return 'just now';
}

/**
 * Format ISO 8601 string with local timezone offset
 */
function formatLocalISO(date: Date): string {
  const pad = (n: number, len = 2) => String(Math.floor(n)).padStart(len, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);

  const tzOffset = -date.getTimezoneOffset(); // offset in minutes
  const tzSign = tzOffset >= 0 ? '+' : '-';
  const tzHours = pad(Math.floor(Math.abs(tzOffset) / 60));
  const tzMinutes = pad(Math.abs(tzOffset) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${tzSign}${tzHours}:${tzMinutes}`;
}

/**
 * Format local human-readable date
 */
function formatHumanReadable(date: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Format UTC human-readable date
 */
function formatHumanReadableUTC(date: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toUTCString();
  }
}

/**
 * Parse raw input string and auto-detect format
 */
function parseInput(input: string, liveNow: Date): ParsedResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      date: liveNow,
      detectedFormat: 'Current Time (Live)',
      isLive: true,
    };
  }

  // Pure numeric check (integer or decimal, optional sign)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      return {
        date: null,
        detectedFormat: 'Invalid Number',
        isLive: false,
        error: 'Invalid numeric timestamp value.',
      };
    }

    const absNum = Math.abs(num);
    const intDigits = Math.floor(absNum).toString().length;

    let d: Date;
    let formatLabel: string;

    if (intDigits <= 11) {
      // Unix Seconds (e.g. 1724519243)
      d = new Date(num * 1000);
      formatLabel = 'Unix Seconds (s)';
    } else if (intDigits <= 14) {
      // Unix Milliseconds (e.g. 1724519243000)
      d = new Date(num);
      formatLabel = 'Unix Milliseconds (ms)';
    } else if (intDigits <= 17) {
      // Microseconds
      d = new Date(num / 1000);
      formatLabel = 'Unix Microseconds (µs)';
    } else {
      // Nanoseconds
      d = new Date(num / 1000000);
      formatLabel = 'Unix Nanoseconds (ns)';
    }

    if (isNaN(d.getTime())) {
      return {
        date: null,
        detectedFormat: formatLabel,
        isLive: false,
        error: 'Numeric timestamp is outside of valid date range.',
      };
    }

    return {
      date: d,
      detectedFormat: formatLabel,
      isLive: false,
    };
  }

  // String date parse (ISO 8601, RFC 2822, etc.)
  const parsedMs = Date.parse(trimmed);
  if (!isNaN(parsedMs)) {
    const d = new Date(parsedMs);
    let formatLabel = 'Date String';

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      formatLabel = 'ISO 8601 String';
    } else if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      formatLabel = 'ISO Date (YYYY-MM-DD)';
    } else if (/^[A-Za-z]{3},\s\d{1,2}\s[A-Za-z]{3}\s\d{4}/.test(trimmed)) {
      formatLabel = 'RFC 2822 Date';
    }

    return {
      date: d,
      detectedFormat: formatLabel,
      isLive: false,
    };
  }

  return {
    date: null,
    detectedFormat: 'Unrecognized',
    isLive: false,
    error: 'Could not parse timestamp or date. Please enter a valid Unix timestamp or ISO string.',
  };
}

interface OutputRow {
  key: string;
  label: string;
  value: string;
  description?: string;
}

const TimestampConverter: React.FC<TimestampConverterProps> = ({ initialInput }) => {
  const [inputValue, setInputValue] = useState<string>(initialInput || '');
  const [currentNow, setCurrentNow] = useState<number>(Date.now());

  // Handle incoming initialInput prop changes
  useEffect(() => {
    if (initialInput !== undefined) {
      setInputValue(initialInput);
    }
  }, [initialInput]);

  // Live timer ticking every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const liveDate = useMemo(() => new Date(currentNow), [currentNow]);

  const parsed = useMemo(() => {
    return parseInput(inputValue, liveDate);
  }, [inputValue, liveDate]);

  const activeDate = parsed.date;

  // Build output rows
  const outputRows = useMemo<OutputRow[]>(() => {
    if (!activeDate) return [];

    const targetMs = activeDate.getTime();
    const unixSeconds = Math.floor(targetMs / 1000).toString();
    const unixMs = targetMs.toString();
    const isoUtc = activeDate.toISOString();
    const isoLocal = formatLocalISO(activeDate);
    const relative = formatRelativeTime(targetMs, currentNow);
    const humanLocal = formatHumanReadable(activeDate);
    const humanUtc = formatHumanReadableUTC(activeDate);
    const rfc2822 = activeDate.toUTCString();

    return [
      {
        key: 'unix-sec',
        label: 'Unix Seconds',
        value: unixSeconds,
        description: 'Seconds since Jan 01 1970 (UTC)',
      },
      {
        key: 'unix-ms',
        label: 'Unix Milliseconds',
        value: unixMs,
        description: 'Milliseconds since Jan 01 1970 (UTC)',
      },
      {
        key: 'iso-utc',
        label: 'ISO 8601 (UTC)',
        value: isoUtc,
        description: 'Standard UTC Zulu format',
      },
      {
        key: 'iso-local',
        label: 'ISO 8601 (Local)',
        value: isoLocal,
        description: 'With local timezone offset',
      },
      {
        key: 'relative',
        label: 'Relative Time',
        value: relative,
        description: 'Live calculated from now',
      },
      {
        key: 'human-local',
        label: 'Human Readable (Local)',
        value: humanLocal,
        description: 'Localized date & 12-hour time',
      },
      {
        key: 'human-utc',
        label: 'Human Readable (UTC)',
        value: humanUtc,
        description: 'UTC date & 12-hour time',
      },
      {
        key: 'rfc-2822',
        label: 'RFC 2822 / GMT',
        value: rfc2822,
        description: 'Internet Message Format',
      },
    ];
  }, [activeDate, currentNow]);

  const handleSetNow = useCallback(() => {
    const nowSec = Math.floor(Date.now() / 1000).toString();
    setInputValue(nowSec);
  }, []);

  const handleSetNowISO = useCallback(() => {
    setInputValue(new Date().toISOString());
  }, []);

  const handleClear = useCallback(() => {
    setInputValue('');
  }, []);

  const handleCopyRow = useCallback(async (val: string) => {
    await copyToClipboard(val);
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (outputRows.length === 0) return;
    const formatted = outputRows.map((row) => `${row.label}: ${row.value}`).join('\n');
    await copyToClipboard(formatted);
  }, [outputRows]);

  return (
    <div className="tool-container timestamp-container">
      {/* Input Section */}
      <div className="section timestamp-input-card">
        <div className="timestamp-header">
          <label className="label">Timestamp / Date String</label>
          <div className="timestamp-badge-wrap">
            <span
              className={`badge ${
                parsed.error ? 'badge-error' : parsed.isLive ? 'badge-live' : ''
              }`}
            >
              {parsed.detectedFormat}
            </span>
          </div>
        </div>

        <div className="timestamp-input-wrapper">
          <input
            type="text"
            className="input timestamp-input"
            placeholder="e.g. 1724519243, 1724519243000, 2024-08-24T16:57:23Z"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        </div>

        <div className="timestamp-quick-actions">
          <div className="timestamp-now-group">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleSetNow}
              title="Set to current Unix seconds timestamp"
            >
              ⚡ Now (Sec)
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSetNowISO}
              title="Set to current ISO 8601 string"
            >
              📅 Now (ISO)
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={handleClear}
            disabled={!inputValue}
            title="Reset to live clock"
          >
            Clear
          </button>
        </div>

        {parsed.error && <div className="error-msg">{parsed.error}</div>}
      </div>

      {/* Output Section */}
      {parsed.date && (
        <div className="section timestamp-output-card">
          <div className="timestamp-output-header">
            <div className="timestamp-output-title">
              <label className="label">Converted Formats</label>
              {parsed.isLive && (
                <span className="timestamp-pulse-indicator">
                  <span className="pulse-dot"></span> Live Clock
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyAll}
              title="Copy all formats to clipboard"
            >
              📋 Copy All
            </button>
          </div>

          <div className="timestamp-rows">
            {outputRows.map((row) => (
              <div key={row.key} className="timestamp-row">
                <div className="timestamp-row-info">
                  <span className="timestamp-row-label">{row.label}</span>
                  <span className="timestamp-row-val">{row.value}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm timestamp-row-copy"
                  onClick={() => handleCopyRow(row.value)}
                  title={`Copy ${row.label}`}
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimestampConverter;
