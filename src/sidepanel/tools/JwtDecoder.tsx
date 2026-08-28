import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import { loadToolState, saveToolState } from '../../shared/storage';
import './JwtDecoder.css';

interface JwtDecoderProps {
  initialInput?: string;
}

interface DecodedJwt {
  headerRaw: string;
  payloadRaw: string;
  signatureRaw: string;
  headerObj: Record<string, unknown> | null;
  payloadObj: Record<string, unknown> | null;
  headerFormatted: string;
  payloadFormatted: string;
  expiryStatus: 'valid' | 'expired' | 'no-exp';
  timeRemainingText: string;
  claims: {
    exp?: { raw: number; dateStr: string; relative: string; isExpired: boolean };
    iat?: { raw: number; dateStr: string; relative: string };
    nbf?: { raw: number; dateStr: string; relative: string; isFuture: boolean };
    iss?: string;
    sub?: string;
    aud?: string;
    jti?: string;
    alg?: string;
    typ?: string;
  };
}

// Generate sample JWTs (1 valid with 1 year expiration, 1 expired)
function createSampleJwt(isExpired: boolean): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: 'user_123456789',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'admin',
    iss: 'https://auth.hckr.dev',
    aud: 'https://api.hckr.dev',
    iat: isExpired ? nowSeconds - 86400 * 30 : nowSeconds - 3600, // 30 days ago or 1 hour ago
    exp: isExpired ? nowSeconds - 86400 * 7 : nowSeconds + 86400 * 7, // expired 7 days ago or valid for 7 days
    nbf: isExpired ? nowSeconds - 86400 * 30 : nowSeconds - 3600,
  };

  const encodeB64Url = (obj: unknown) => {
    const jsonStr = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const headerB64 = encodeB64Url(header);
  const payloadB64 = encodeB64Url(payload);
  const dummySignature = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

  return `${headerB64}.${payloadB64}.${dummySignature}`;
}

// Format relative time (e.g. "in 3 hours, 20 minutes" or "5 days ago")
function formatRelativeTime(targetDate: Date, now: Date): { text: string; isFuture: boolean } {
  const diffMs = targetDate.getTime() - now.getTime();
  const isFuture = diffMs > 0;
  const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);

  if (absDiffSec < 60) {
    return {
      text: isFuture ? `in ${absDiffSec}s` : `${absDiffSec}s ago`,
      isFuture,
    };
  }

  const minutes = Math.floor(absDiffSec / 60);
  if (minutes < 60) {
    const sec = absDiffSec % 60;
    return {
      text: isFuture ? `in ${minutes}m ${sec}s` : `${minutes}m ago`,
      isFuture,
    };
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMin = minutes % 60;
    return {
      text: isFuture ? `in ${hours}h ${remMin}m` : `${hours}h ago`,
      isFuture,
    };
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return {
    text: isFuture ? `in ${days}d ${remHours}h` : `${days}d ago`,
    isFuture,
  };
}

// Convert timestamp (seconds or ms) to formatted date and relative string
function parseTimestampClaim(rawVal: unknown): { raw: number; dateStr: string; relative: string; isFuture: boolean } | null {
  if (typeof rawVal !== 'number' && (typeof rawVal !== 'string' || isNaN(Number(rawVal)))) {
    return null;
  }
  const num = Number(rawVal);
  // If > 1e11, already in ms; else convert seconds to ms
  const ms = num > 1e11 ? num : num * 1000;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const rel = formatRelativeTime(date, now);

  return {
    raw: num,
    dateStr: `${date.toLocaleString()} (${date.toISOString()})`,
    relative: rel.text,
    isFuture: rel.isFuture,
  };
}

// Decode Base64URL string safely supporting UTF-8
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

// Syntax-highlighted JSON rendering
const JsonViewer: React.FC<{ jsonStr: string }> = ({ jsonStr }) => {
  const rendered = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonStr);
      const formatted = JSON.stringify(parsed, null, 2);

      // Tokenize JSON for syntax highlighting
      const regex = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}[\],])/g;

      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let keyCounter = 0;

      while ((match = regex.exec(formatted)) !== null) {
        const matchStart = match.index;
        const matchStr = match[0];

        // Add leading whitespace/indent
        if (matchStart > lastIndex) {
          elements.push(formatted.slice(lastIndex, matchStart));
        }

        if (/^"/.test(matchStr)) {
          if (/:$/.test(matchStr)) {
            // Key
            const keyContent = matchStr.slice(0, -1);
            elements.push(
              <span key={keyCounter++} className="json-key">
                {keyContent}
              </span>,
              <span key={keyCounter++} className="json-punctuation">
                :
              </span>
            );
          } else {
            // String value
            elements.push(
              <span key={keyCounter++} className="json-string">
                {matchStr}
              </span>
            );
          }
        } else if (/true|false/.test(matchStr)) {
          elements.push(
            <span key={keyCounter++} className="json-boolean">
              {matchStr}
            </span>
          );
        } else if (/null/.test(matchStr)) {
          elements.push(
            <span key={keyCounter++} className="json-null">
              {matchStr}
            </span>
          );
        } else if (/^[{}[\],]$/.test(matchStr)) {
          elements.push(
            <span key={keyCounter++} className="json-punctuation">
              {matchStr}
            </span>
          );
        } else {
          // Number
          elements.push(
            <span key={keyCounter++} className="json-number">
              {matchStr}
            </span>
          );
        }

        lastIndex = matchStart + matchStr.length;
      }

      if (lastIndex < formatted.length) {
        elements.push(formatted.slice(lastIndex));
      }

      return elements;
    } catch {
      return jsonStr;
    }
  }, [jsonStr]);

  return <div className="jwt-code-block">{rendered}</div>;
};

const JwtDecoder: React.FC<JwtDecoderProps> = ({ initialInput }) => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedJwt | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Update live clock every second to keep time remaining accurate
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load initial input or stored state
  useEffect(() => {
    if (initialInput !== undefined) {
      setTokenInput(initialInput);
    } else {
      (async () => {
        const saved = await loadToolState('jwt-decoder');
        if (saved?.input) {
          setTokenInput(saved.input);
        }
      })();
    }
  }, [initialInput]);

  // Decode JWT function
  const decodeToken = useCallback((rawToken: string): { decoded: DecodedJwt | null; error: string | null } => {
    const cleanToken = rawToken.trim();
    if (!cleanToken) {
      return { decoded: null, error: null };
    }

    // Split token into 3 parts
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      return {
        decoded: null,
        error: `Invalid JWT format: Token must have 3 dot-separated parts (Header.Payload.Signature), but found ${parts.length} part${parts.length === 1 ? '' : 's'}.`,
      };
    }

    const [headerRaw, payloadRaw, signatureRaw] = parts;

    // Decode Header
    let headerStr = '';
    let headerObj: Record<string, unknown> | null = null;
    try {
      headerStr = base64UrlDecode(headerRaw);
      headerObj = JSON.parse(headerStr);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Base64/JSON decode error';
      return {
        decoded: null,
        error: `Failed to decode JWT Header: ${msg}`,
      };
    }

    // Decode Payload
    let payloadStr = '';
    let payloadObj: Record<string, unknown> | null = null;
    try {
      payloadStr = base64UrlDecode(payloadRaw);
      payloadObj = JSON.parse(payloadStr);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Base64/JSON decode error';
      return {
        decoded: null,
        error: `Failed to decode JWT Payload: ${msg}`,
      };
    }

    // Parse Claims
    const expInfo = payloadObj?.exp ? parseTimestampClaim(payloadObj.exp) : null;
    const iatInfo = payloadObj?.iat ? parseTimestampClaim(payloadObj.iat) : null;
    const nbfInfo = payloadObj?.nbf ? parseTimestampClaim(payloadObj.nbf) : null;

    let expiryStatus: 'valid' | 'expired' | 'no-exp' = 'no-exp';
    let timeRemainingText = 'No expiration set';

    if (expInfo) {
      const isExpired = !expInfo.isFuture;
      expiryStatus = isExpired ? 'expired' : 'valid';
      timeRemainingText = isExpired
        ? `Expired ${expInfo.relative}`
        : `Expires ${expInfo.relative}`;
    }

    return {
      error: null,
      decoded: {
        headerRaw,
        payloadRaw,
        signatureRaw,
        headerObj,
        payloadObj,
        headerFormatted: JSON.stringify(headerObj, null, 2),
        payloadFormatted: JSON.stringify(payloadObj, null, 2),
        expiryStatus,
        timeRemainingText,
        claims: {
          exp: expInfo ? { ...expInfo, isExpired: !expInfo.isFuture } : undefined,
          iat: iatInfo || undefined,
          nbf: nbfInfo ? { ...nbfInfo, isFuture: nbfInfo.isFuture } : undefined,
          iss: typeof payloadObj?.iss === 'string' ? payloadObj.iss : undefined,
          sub: typeof payloadObj?.sub === 'string' || typeof payloadObj?.sub === 'number' ? String(payloadObj.sub) : undefined,
          aud: typeof payloadObj?.aud === 'string' ? payloadObj.aud : undefined,
          jti: typeof payloadObj?.jti === 'string' ? payloadObj.jti : undefined,
          alg: typeof headerObj?.alg === 'string' ? headerObj.alg : undefined,
          typ: typeof headerObj?.typ === 'string' ? headerObj.typ : undefined,
        },
      },
    };
  }, []);

  // Process input whenever tokenInput or currentTime changes
  useEffect(() => {
    const result = decodeToken(tokenInput);
    setError(result.error);
    setDecoded(result.decoded);

    // Save state
    saveToolState('jwt-decoder', { input: tokenInput });
  }, [tokenInput, currentTime, decodeToken]);

  const handleClear = () => {
    setTokenInput('');
    setError(null);
    setDecoded(null);
    saveToolState('jwt-decoder', { input: '' });
  };

  const handleLoadSample = (isExpired: boolean) => {
    const sample = createSampleJwt(isExpired);
    setTokenInput(sample);
  };

  const handleCopySection = (content: string) => {
    copyToClipboard(content);
  };

  const handleCopyFullDecoded = () => {
    if (!decoded) return;
    const full = {
      header: decoded.headerObj,
      payload: decoded.payloadObj,
      signature: decoded.signatureRaw,
    };
    copyToClipboard(JSON.stringify(full, null, 2));
  };

  return (
    <div className="jwt-decoder">
      {/* Header Toolbar */}
      <div className="jwt-toolbar">
        <span className="jwt-title">JSON Web Token Decoder</span>
        <div className="jwt-toolbar-actions">
          {decoded && (
            <button className="btn btn-sm" onClick={handleCopyFullDecoded}>
              Copy Decoded JSON
            </button>
          )}
          {tokenInput && (
            <button className="btn btn-sm btn-danger" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="tool-split">
      <div className="tool-split-col">
      {/* Input Section */}
      <div className="jwt-section">
        <textarea
          className="jwt-textarea"
          placeholder="Paste JWT token here (header.payload.signature)..."
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          spellCheck={false}
        />

        {/* Quick Sample Chips */}
        <div className="jwt-samples">
          <span className="jwt-samples-label">Samples:</span>
          <button
            className="jwt-sample-chip"
            onClick={() => handleLoadSample(false)}
          >
            Valid Token
          </button>
          <button
            className="jwt-sample-chip"
            onClick={() => handleLoadSample(true)}
          >
            Expired Token
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-msg">
          <strong>Invalid JWT:</strong> {error}
        </div>
      )}
      </div>

      <div className="tool-split-col">
      {/* Token 3-Part Color Visualizer */}
      {decoded && (
        <div className="jwt-token-preview" title="Color-coded token components">
          <span className="jwt-part-header">{decoded.headerRaw}</span>
          <span className="jwt-dot">.</span>
          <span className="jwt-part-payload">{decoded.payloadRaw}</span>
          <span className="jwt-dot">.</span>
          <span className="jwt-part-signature">{decoded.signatureRaw}</span>
        </div>
      )}

      {/* Status & Expiration Banner */}
      {decoded && (
        <div className={`jwt-status-banner ${decoded.expiryStatus}`}>
          <div className="flex items-center gap-2">
            {decoded.expiryStatus === 'valid' && (
              <span className="jwt-status-badge valid">Valid ✓</span>
            )}
            {decoded.expiryStatus === 'expired' && (
              <span className="jwt-status-badge expired">Expired ✗</span>
            )}
            {decoded.expiryStatus === 'no-exp' && (
              <span className="jwt-status-badge info">No Expiry</span>
            )}
            <span>
              {decoded.expiryStatus === 'valid' && 'Token is currently valid'}
              {decoded.expiryStatus === 'expired' && 'Token has expired'}
              {decoded.expiryStatus === 'no-exp' && 'Token has no expiration claim (never expires)'}
            </span>
          </div>
          <span className="jwt-status-time">{decoded.timeRemainingText}</span>
        </div>
      )}

      {/* Key Claims Grid */}
      {decoded && (
        <div className="jwt-claims-grid">
          {/* Expiration Claim */}
          <div className="jwt-claim-card">
            <span className="jwt-claim-name">
              exp (Expiration Time)
              {decoded.claims.exp && (
                <span
                  style={{
                    color: decoded.claims.exp.isExpired ? 'var(--error)' : 'var(--success)',
                    fontWeight: 'bold',
                  }}
                >
                  {decoded.claims.exp.isExpired ? '✗ Expired' : '✓ Valid'}
                </span>
              )}
            </span>
            <span className="jwt-claim-val">
              {decoded.claims.exp ? decoded.claims.exp.dateStr : 'Not specified'}
            </span>
            {decoded.claims.exp && (
              <span className="jwt-claim-subtext">
                {decoded.claims.exp.relative} ({decoded.claims.exp.raw})
              </span>
            )}
          </div>

          {/* Issued At Claim */}
          <div className="jwt-claim-card">
            <span className="jwt-claim-name">iat (Issued At)</span>
            <span className="jwt-claim-val">
              {decoded.claims.iat ? decoded.claims.iat.dateStr : 'Not specified'}
            </span>
            {decoded.claims.iat && (
              <span className="jwt-claim-subtext">
                {decoded.claims.iat.relative} ({decoded.claims.iat.raw})
              </span>
            )}
          </div>

          {/* Not Before Claim */}
          {decoded.claims.nbf && (
            <div className="jwt-claim-card">
              <span className="jwt-claim-name">nbf (Not Before)</span>
              <span className="jwt-claim-val">{decoded.claims.nbf.dateStr}</span>
              <span className="jwt-claim-subtext">
                {decoded.claims.nbf.isFuture ? `Starts ${decoded.claims.nbf.relative}` : 'Active'} ({decoded.claims.nbf.raw})
              </span>
            </div>
          )}

          {/* Algorithm & Subject */}
          {(decoded.claims.alg || decoded.claims.sub) && (
            <div className="jwt-claim-card">
              <span className="jwt-claim-name">
                {decoded.claims.alg ? `alg: ${decoded.claims.alg}` : 'Subject'}
              </span>
              <span className="jwt-claim-val">
                {decoded.claims.sub ? `sub: ${decoded.claims.sub}` : `typ: ${decoded.claims.typ || 'JWT'}`}
              </span>
              {decoded.claims.iss && (
                <span className="jwt-claim-subtext">iss: {decoded.claims.iss}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 1. Header Section (Blue Accent) */}
      {decoded && (
        <div className="jwt-section-card header-section">
          <div className="jwt-card-header">
            <div className="jwt-card-header-title">
              <span>Header</span>
              <span className="jwt-card-badge">Algorithm & Token Type</span>
            </div>
            <button
              className="btn btn-sm"
              onClick={() => handleCopySection(decoded.headerFormatted)}
            >
              Copy Header
            </button>
          </div>
          <JsonViewer jsonStr={decoded.headerFormatted} />
        </div>
      )}

      {/* 2. Payload Section (Green Accent) */}
      {decoded && (
        <div className="jwt-section-card payload-section">
          <div className="jwt-card-header">
            <div className="jwt-card-header-title">
              <span>Payload</span>
              <span className="jwt-card-badge">Data & Claims</span>
            </div>
            <button
              className="btn btn-sm"
              onClick={() => handleCopySection(decoded.payloadFormatted)}
            >
              Copy Payload
            </button>
          </div>
          <JsonViewer jsonStr={decoded.payloadFormatted} />
        </div>
      )}

      {/* 3. Signature Section (Orange/Red Accent) */}
      {decoded && (
        <div className="jwt-section-card signature-section">
          <div className="jwt-card-header">
            <div className="jwt-card-header-title">
              <span>Signature</span>
              <span className="jwt-card-badge">Verification Base64URL</span>
            </div>
            <button
              className="btn btn-sm"
              onClick={() => handleCopySection(decoded.signatureRaw)}
            >
              Copy Signature
            </button>
          </div>
          <div className="jwt-sig-block">{decoded.signatureRaw}</div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};

export default JwtDecoder;
