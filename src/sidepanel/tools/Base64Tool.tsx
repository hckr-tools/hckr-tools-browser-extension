import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import { loadToolState, saveToolState } from '../../shared/storage';
import './Base64Tool.css';

interface Base64ToolProps {
  initialInput?: string;
}

type Mode = 'encode' | 'decode';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  rawBase64: string;
}

const TOOL_ID = 'base64';

/**
 * UTF-8 safe Base64 encoder
 */
function utf8ToBase64(str: string, urlSafe = false): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  let base64 = btoa(binary);
  if (urlSafe) {
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return base64;
}

/**
 * UTF-8 safe Base64 decoder
 */
function base64ToUtf8(str: string): string {
  let cleaned = str.trim().replace(/\s+/g, '');
  // Remove data URI prefix if present (e.g. data:text/plain;base64,...)
  if (cleaned.includes('base64,')) {
    cleaned = cleaned.split('base64,')[1];
  }
  // Convert URL-safe chars
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
  // Add missing padding
  const pad = cleaned.length % 4;
  if (pad) {
    cleaned += '='.repeat(4 - pad);
  }

  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/**
 * Test whether a string is likely Base64 encoded
 */
function testIsLikelyBase64(str: string): boolean {
  const trimmed = str.trim().replace(/\s+/g, '');
  if (trimmed.length < 4) return false;

  // Check if string contains base64/data URI markers
  let target = trimmed;
  if (target.includes('base64,')) {
    target = target.split('base64,')[1];
  }

  // Base64 pattern test (standard or url-safe)
  const b64Regex = /^[A-Za-z0-9+/_-]+={0,2}$/;
  if (!b64Regex.test(target)) return false;

  try {
    const decoded = base64ToUtf8(target);
    // If it decodes to something non-empty and contains non-null chars
    return decoded.length > 0 && !decoded.includes('\0');
  } catch {
    return false;
  }
}

/**
 * Format bytes to readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const Base64Tool: React.FC<Base64ToolProps> = ({ initialInput }) => {
  const [input, setInput] = useState<string>('');
  const [mode, setMode] = useState<Mode>('encode');
  const [urlSafe, setUrlSafe] = useState<boolean>(false);
  const [asDataUri, setAsDataUri] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize tool state
  useEffect(() => {
    if (initialInput !== undefined && initialInput !== '') {
      setInput(initialInput);
      if (testIsLikelyBase64(initialInput)) {
        setMode('decode');
      } else {
        setMode('encode');
      }
    } else {
      (async () => {
        const saved = await loadToolState(TOOL_ID);
        if (saved?.input) {
          setInput(saved.input);
          if (saved.options?.mode === 'decode' || saved.options?.mode === 'encode') {
            setMode(saved.options.mode as Mode);
          }
          if (typeof saved.options?.urlSafe === 'boolean') {
            setUrlSafe(saved.options.urlSafe);
          }
        }
      })();
    }
  }, [initialInput]);

  // Check if input is likely Base64 for hint banner
  const isInputLikelyBase64 = useMemo(() => {
    if (mode === 'decode' || !input.trim() || fileInfo) return false;
    return testIsLikelyBase64(input);
  }, [input, mode, fileInfo]);

  // Compute processed output
  const output = useMemo(() => {
    setError(null);
    if (fileInfo) {
      if (mode === 'encode') {
        return asDataUri ? fileInfo.dataUrl : fileInfo.rawBase64;
      }
    }

    const trimmed = input.trim();
    if (!trimmed) return '';

    try {
      if (mode === 'encode') {
        const encoded = utf8ToBase64(input, urlSafe);
        if (asDataUri) {
          return `data:text/plain;charset=utf-8;base64,${encoded}`;
        }
        return encoded;
      } else {
        return base64ToUtf8(trimmed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid Base64 input string');
      return '';
    }
  }, [input, mode, urlSafe, asDataUri, fileInfo]);

  // Save state helper
  const persistState = useCallback((currentInput: string, currentMode: Mode, currentUrlSafe: boolean) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToolState(TOOL_ID, {
        input: currentInput,
        options: { mode: currentMode, urlSafe: currentUrlSafe },
      });
    }, 300);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (fileInfo) setFileInfo(null);
    persistState(val, mode, urlSafe);
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    persistState(input, newMode, urlSafe);
  };

  const handleUrlSafeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setUrlSafe(checked);
    persistState(input, mode, checked);
  };

  const handleSwap = () => {
    if (!output) return;
    setInput(output);
    const newMode: Mode = mode === 'encode' ? 'decode' : 'encode';
    setMode(newMode);
    setFileInfo(null);
    persistState(output, newMode, urlSafe);
  };

  const handleClear = () => {
    setInput('');
    setError(null);
    setFileInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    persistState('', mode, urlSafe);
  };

  const handleCopy = async () => {
    if (output) {
      await copyToClipboard(output);
    }
  };

  // Process File to Base64
  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const rawBase64 = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl;
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
        rawBase64,
      });
      setInput(`[File: ${file.name}]`);
      setMode('encode');
    };
    reader.readAsDataURL(file);
  }, []);

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Stats calculation
  const inputByteLength = useMemo(() => {
    if (fileInfo) return fileInfo.size;
    return new TextEncoder().encode(input).length;
  }, [input, fileInfo]);

  const outputByteLength = useMemo(() => {
    return new TextEncoder().encode(output).length;
  }, [output]);

  const sizeDelta = useMemo(() => {
    if (!inputByteLength || !outputByteLength) return null;
    const delta = ((outputByteLength - inputByteLength) / inputByteLength) * 100;
    return delta.toFixed(1);
  }, [inputByteLength, outputByteLength]);

  // Image preview detection
  const isImagePreview = useMemo(() => {
    if (fileInfo?.type.startsWith('image/')) return fileInfo.dataUrl;
    if (output.startsWith('data:image/')) return output;
    if (mode === 'encode' && asDataUri && output.startsWith('data:image/')) return output;
    return null;
  }, [fileInfo, output, mode, asDataUri]);

  return (
    <div className="tool-container base64-tool">
      {/* Header Controls */}
      <div className="section">
        <div className="base64-header">
          <div className="base64-mode-controls">
            <div className="toggle-group">
              <button
                className={`toggle-btn ${mode === 'encode' ? 'active' : ''}`}
                onClick={() => handleModeChange('encode')}
              >
                Encode
              </button>
              <button
                className={`toggle-btn ${mode === 'decode' ? 'active' : ''}`}
                onClick={() => handleModeChange('decode')}
              >
                Decode
              </button>
            </div>

            <button
              className="base64-swap-btn"
              onClick={handleSwap}
              disabled={!output}
              title="Swap input and output"
            >
              ⇄
            </button>
          </div>

          <div className="toolbar">
            <button
              className="btn btn-sm btn-danger"
              onClick={handleClear}
              disabled={!input && !fileInfo}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Options Row */}
        <div className="base64-options-row">
          {mode === 'encode' && (
            <>
              <label className="base64-checkbox-label">
                <input
                  type="checkbox"
                  checked={urlSafe}
                  onChange={handleUrlSafeChange}
                />
                <span>URL-Safe (- and _)</span>
              </label>
              <label className="base64-checkbox-label">
                <input
                  type="checkbox"
                  checked={asDataUri}
                  onChange={(e) => setAsDataUri(e.target.checked)}
                />
                <span>Data URI prefix</span>
              </label>
            </>
          )}
        </div>
      </div>

      <div className="tool-split">
        <div className="tool-split-col">
        {/* Input Dropzone / Textarea */}
        <div
          className={`base64-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="base64-drop-overlay">
              <span>📥 Drop file to encode as Base64</span>
            </div>
          )}

          <textarea
            className="textarea base64-textarea"
            placeholder={
              mode === 'encode'
                ? 'Type, paste text, or drag and drop any file here...'
                : 'Paste Base64 or Data URI string here to decode...'
            }
            value={input}
            onChange={handleInputChange}
            spellCheck={false}
          />
        </div>

        {/* File Drag Drop Prompt */}
        <div className="base64-file-drop-prompt">
          <span>Drag & drop file or</span>
          <button
            type="button"
            className="base64-file-browse-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            browse from device
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Dropped File Badge */}
        {fileInfo && (
          <div className="base64-file-card">
            <div className="base64-file-info">
              <span className="base64-file-icon">📄</span>
              <div>
                <div className="base64-file-name">{fileInfo.name}</div>
                <div className="base64-file-meta">
                  {fileInfo.type} • {formatBytes(fileInfo.size)}
                </div>
              </div>
            </div>
            <button
              className="base64-file-remove"
              onClick={() => setFileInfo(null)}
              title="Remove file"
            >
              ✕
            </button>
          </div>
        )}

      {/* Auto-detect Hint Banner */}
      {isInputLikelyBase64 && (
        <div className="base64-hint-banner">
          <div className="base64-hint-text">
            <span>💡</span>
            <span>Input appears to be Base64 encoded text.</span>
          </div>
          <button
            className="base64-hint-switch-btn"
            onClick={() => handleModeChange('decode')}
          >
            Switch to Decode
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-msg">
          <strong>Error:</strong> {error}
        </div>
      )}
        </div>

      {/* Output Section */}
      <div className="section flex-1 flex flex-col">
        <div className="base64-header">
          <span className="label" style={{ margin: 0 }}>
            {mode === 'encode' ? 'Base64 Encoded Result' : 'Decoded Text Result'}
          </span>
          <div className="toolbar">
            <button
              className="btn btn-sm btn-primary"
              onClick={handleCopy}
              disabled={!output}
            >
              Copy Output
            </button>
          </div>
        </div>

        <div className="base64-output-container flex-1">
          <div className="base64-output-header">
            <div className="base64-stats-group">
              <span className="base64-stat-item">
                Input: <span className="base64-stat-val">{input.length} chars</span> ({formatBytes(inputByteLength)})
              </span>
              <span className="base64-stat-item">
                Output: <span className="base64-stat-val">{output.length} chars</span> ({formatBytes(outputByteLength)})
              </span>
              {sizeDelta !== null && (
                <span
                  className={`base64-stat-delta ${parseFloat(sizeDelta) >= 0 ? 'inc' : 'dec'}`}
                >
                  {parseFloat(sizeDelta) >= 0 ? `+${sizeDelta}%` : `${sizeDelta}%`}
                </span>
              )}
            </div>
            <span className="badge">{mode.toUpperCase()}</span>
          </div>

          <div className="base64-output-body">
            {output ? (
              output
            ) : (
              <div className="base64-empty-output">
                <span>{error ? 'Could not process input' : 'Enter input above to see output'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Optional Image Preview */}
        {isImagePreview && (
          <div className="base64-img-preview-card">
            <div className="base64-img-preview-header">Image Preview</div>
            <div className="base64-img-preview-frame">
              <img src={isImagePreview} alt="Base64 Preview" />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Base64Tool;
