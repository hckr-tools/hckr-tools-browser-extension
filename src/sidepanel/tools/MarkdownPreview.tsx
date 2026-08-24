import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import { saveToolState, loadToolState } from '../../shared/storage';
import './MarkdownPreview.css';

export interface MarkdownPreviewProps {
  initialInput?: string;
}

type ViewMode = 'split' | 'edit' | 'preview';

const TOOL_ID = 'markdown';

const DEFAULT_MARKDOWN = `# Markdown Preview

Welcome to the **hckr** Markdown Preview tool!

## Text Formatting
You can format text using **bold**, *italic*, ***bold italic***, ~~strikethrough~~, ==highlight==, or \`inline code\`.

## Lists & Tasks
- [x] Lightweight markdown parser
- [x] Secure HTML sanitizer
- [ ] Try typing your own markdown!

### Ordered List
1. Write markdown on the top/edit pane
2. View real-time rendered HTML
3. Copy markdown or HTML with one click

## Code Blocks
\`\`\`typescript
interface DevTool {
  id: string;
  name: string;
  offline: boolean;
}

const tool: DevTool = {
  id: 'markdown',
  name: 'Markdown Preview',
  offline: true,
};
\`\`\`

## Blockquotes
> "Simplicity is prerequisite for reliability."
> — Edsger W. Dijkstra

## Tables
| Feature | Status | Notes |
| :--- | :---: | ---: |
| Split View | ✅ | Top / Bottom layout |
| HTML Sanitizer | ✅ | Strips scripts & event handlers |
| Export Options | ✅ | Copy MD & HTML |

---
*Built for developers with dark theme.*`;

/**
 * Escapes HTML entities.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format inline styles (bold, italic, strikethrough, highlight).
 */
function parseInlineFormatted(str: string): string {
  return str
    // Bold & Italic (***text*** or ___text___)
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
    // Bold (**text** or __text__)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    // Italic (*text* or _text_)
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>')
    // Strikethrough (~~text~~)
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    // Mark / Highlight (==text==)
    .replace(/==([^=]+)==/g, '<mark>$1</mark>');
}

/**
 * Parses inline markdown elements (inline code, images, links, styles).
 */
export function parseInline(text: string): string {
  if (!text) return '';

  // 1. Extract inline code `code` to protect from formatting
  const inlineCodes: string[] = [];
  let processed = text.replace(/`([^`]+)`/g, (_match, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `%%INLINECODE${idx}%%`;
  });

  // 2. Images: ![alt](url "title")
  processed = processed.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_match, alt, url, title) => {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${titleAttr} />`;
    }
  );

  // 3. Links: [text](url "title")
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_match, linkText, url, title) => {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      const parsedText = parseInlineFormatted(linkText);
      return `<a href="${escapeHtml(url)}"${titleAttr} target="_blank" rel="noopener noreferrer">${parsedText}</a>`;
    }
  );

  // 4. Text styles (bold, italic, etc.)
  processed = parseInlineFormatted(processed);

  // 5. Restore inline codes
  processed = processed.replace(/%%INLINECODE(\d+)%%/g, (_match, idx) => {
    return inlineCodes[Number(idx)] || '';
  });

  return processed;
}

/**
 * Splits a markdown table row into trimmed cell contents.
 */
function splitTableRow(row: string): string[] {
  let trimmed = row.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|');
}

/**
 * Renders an ordered or unordered list from list items.
 */
function renderList(items: { indent: number; text: string }[], isOrdered: boolean): string {
  const tag = isOrdered ? 'ol' : 'ul';
  let html = `<${tag}>`;

  items.forEach((item) => {
    const content = item.text;
    const taskMatch = content.match(/^\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const taskText = parseInline(taskMatch[2]);
      html += `<li class="task-list-item"><input type="checkbox" disabled ${
        isChecked ? 'checked ' : ''
      }/> <span>${taskText}</span></li>`;
    } else {
      html += `<li>${parseInline(content)}</li>`;
    }
  });

  html += `</${tag}>`;
  return html;
}

/**
 * Lightweight, zero-dependency Markdown parser.
 */
export function parseMarkdown(md: string): string {
  if (!md || !md.trim()) return '';

  const lines = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const output: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 1. Fenced Code Blocks (``` or ~~~)
    const codeBlockMatch = line.match(/^```(\w*)/) || line.match(/^~~~(\w*)/);
    if (codeBlockMatch) {
      const lang = codeBlockMatch[1] ? codeBlockMatch[1].trim() : '';
      const delimiter = line.slice(0, 3);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i].startsWith(delimiter)) {
          i++;
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      const codeContent = escapeHtml(codeLines.join('\n'));
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      output.push(`<pre><code${langClass}>${codeContent}</code></pre>`);
      continue;
    }

    // 2. Empty Line
    if (!line.trim()) {
      i++;
      continue;
    }

    // 3. Horizontal Rule (---, ***, ___)
    if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
      output.push('<hr />');
      i++;
      continue;
    }

    // 4. Headers (# through ######)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2].trim();
      output.push(`<h${level}>${parseInline(text)}</h${level}>`);
      i++;
      continue;
    }

    // 5. Blockquotes (> ...)
    if (line.match(/^>\s?(.*)$/)) {
      const quoteLines: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith('>') ||
          (lines[i].trim() !== '' &&
            quoteLines.length > 0 &&
            !lines[i].match(/^```|^~~~|^#{1,6}\s+|^\s*(?:---|\*\*\*|___)\s*$/)))
      ) {
        if (lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
        } else {
          quoteLines.push(lines[i]);
        }
        i++;
      }
      const quoteHtml = parseMarkdown(quoteLines.join('\n'));
      output.push(`<blockquote>${quoteHtml}</blockquote>`);
      continue;
    }

    // 6. Tables (| Col 1 | Col 2 |)
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?(\s*:?-+:?\s*\|)+\s*(:?-+:?\s*)?\|?\s*$/.test(lines[i + 1])
    ) {
      const headerCells = splitTableRow(line);
      const alignLine = lines[i + 1];
      const aligns = splitTableRow(alignLine).map((col) => {
        const trimmed = col.trim();
        const left = trimmed.startsWith(':');
        const right = trimmed.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        if (left) return 'left';
        return 'left';
      });

      i += 2; // skip header row and separator row

      const bodyRows: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        bodyRows.push(splitTableRow(lines[i]));
        i++;
      }

      let tableHtml = '<table><thead><tr>';
      headerCells.forEach((cell, idx) => {
        const align = aligns[idx] || 'left';
        tableHtml += `<th style="text-align: ${align}">${parseInline(cell.trim())}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      bodyRows.forEach((row) => {
        tableHtml += '<tr>';
        row.forEach((cell, idx) => {
          const align = aligns[idx] || 'left';
          tableHtml += `<td style="text-align: ${align}">${parseInline(cell.trim())}</td>`;
        });
        // Pad row if it has fewer columns than header
        for (let idx = row.length; idx < headerCells.length; idx++) {
          const align = aligns[idx] || 'left';
          tableHtml += `<td style="text-align: ${align}"></td>`;
        }
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table>';
      output.push(tableHtml);
      continue;
    }

    // 7. Unordered Lists (*, -, +)
    const ulMatch = line.match(/^(\s*)([*+-])\s+(.*)$/);
    if (ulMatch) {
      const listItems: { indent: number; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([*+-])\s+(.*)$/);
        if (m) {
          listItems.push({ indent: m[1].length, text: m[3] });
          i++;
        } else if (lines[i].trim() === '') {
          if (i + 1 < lines.length && lines[i + 1].match(/^(\s*)([*+-])\s+(.*)$/)) {
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      output.push(renderList(listItems, false));
      continue;
    }

    // 8. Ordered Lists (1., 2., etc.)
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const listItems: { indent: number; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (m) {
          listItems.push({ indent: m[1].length, text: m[3] });
          i++;
        } else if (lines[i].trim() === '') {
          if (i + 1 < lines.length && lines[i + 1].match(/^(\s*)(\d+)\.\s+(.*)$/)) {
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      output.push(renderList(listItems, true));
      continue;
    }

    // 9. Paragraphs
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(
        /^```|^~~~|^#{1,6}\s+|^\s*(?:---|\*\*\*|___)\s*$|^>\s?|^(\s*)([*+-]|\d+\.)\s+/
      ) &&
      !(
        lines[i].includes('|') &&
        i + 1 < lines.length &&
        /^\s*\|?(\s*:?-+:?\s*\|)+\s*(:?-+:?\s*)?\|?\s*$/.test(lines[i + 1])
      )
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      const paraText = paraLines.map((l) => parseInline(l)).join('<br />');
      output.push(`<p>${paraText}</p>`);
    }
  }

  return output.join('\n');
}

/**
 * Sanitizes HTML string to prevent XSS.
 * Removes script tags, iframes, objects, embeds, event handler attributes,
 * and dangerous URI schemes (javascript:, vbscript:, data:).
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // Forbidden tags to completely remove
    const forbiddenTags = [
      'SCRIPT',
      'IFRAME',
      'OBJECT',
      'EMBED',
      'BASE',
      'FRAME',
      'FRAMESET',
      'APPLET',
      'STYLE',
      'LINK',
      'META',
      'FORM',
    ];

    forbiddenTags.forEach((tagName) => {
      const elements = doc.querySelectorAll(tagName);
      elements.forEach((el) => el.remove());
    });

    // Clean attributes and URLs on all remaining elements
    const allElements = doc.querySelectorAll('*');
    allElements.forEach((el) => {
      // Remove all inline event handlers (onclick, onerror, onload, etc.)
      const attrNames = Array.from(el.attributes).map((a) => a.name);
      for (const attrName of attrNames) {
        if (attrName.toLowerCase().startsWith('on')) {
          el.removeAttribute(attrName);
        }
      }

      // Sanitize URL attributes
      ['href', 'src', 'action', 'formaction'].forEach((attr) => {
        const val = el.getAttribute(attr);
        if (val) {
          const trimmed = val.trim().toLowerCase();
          if (
            trimmed.startsWith('javascript:') ||
            trimmed.startsWith('vbscript:') ||
            (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/'))
          ) {
            el.removeAttribute(attr);
          }
        }
      });

      // Ensure links open safely in a new tab
      if (el.tagName === 'A') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return doc.body.innerHTML;
  } catch {
    // Regex fallback
    return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/\son\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, '');
  }
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ initialInput }) => {
  const [markdown, setMarkdown] = useState<string>(initialInput ?? DEFAULT_MARKDOWN);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved state on mount if no initialInput is passed
  useEffect(() => {
    if (initialInput !== undefined) {
      setMarkdown(initialInput);
      setIsLoaded(true);
      return;
    }

    let isMounted = true;
    (async () => {
      const saved = await loadToolState(TOOL_ID);
      if (isMounted) {
        if (saved?.input !== undefined) {
          setMarkdown(saved.input);
        }
        if (saved?.options?.viewMode) {
          setViewMode(saved.options.viewMode as ViewMode);
        }
        setIsLoaded(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialInput]);

  // Update markdown when initialInput prop changes
  useEffect(() => {
    if (initialInput !== undefined) {
      setMarkdown(initialInput);
    }
  }, [initialInput]);

  // Persist state changes with debounce
  useEffect(() => {
    if (!isLoaded) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToolState(TOOL_ID, {
        input: markdown,
        options: { viewMode },
      });
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [markdown, viewMode, isLoaded]);

  // Render and sanitize markdown
  const renderedHtml = useMemo(() => {
    const raw = parseMarkdown(markdown);
    return sanitizeHtml(raw);
  }, [markdown]);

  // Markdown statistics
  const stats = useMemo(() => {
    const trimmed = markdown.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = markdown.length;
    const lines = markdown ? markdown.split('\n').length : 0;
    return { words, chars, lines };
  }, [markdown]);

  // Copy markdown source
  const handleCopyMarkdown = useCallback(async () => {
    await copyToClipboard(markdown);
  }, [markdown]);

  // Copy rendered HTML
  const handleCopyHtml = useCallback(async () => {
    await copyToClipboard(renderedHtml);
  }, [renderedHtml]);

  // Clear editor content
  const handleClear = useCallback(() => {
    setMarkdown('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle Tab key in editor to insert 2 spaces
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const updated = val.substring(0, start) + '  ' + val.substring(end);
      setMarkdown(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, []);

  return (
    <div className="tool-container md-tool-root">
      {/* Top Header & Toolbar */}
      <div className="section md-header-section">
        <div className="md-toolbar">
          <div className="toggle-group md-view-toggle">
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Split View (Editor + Preview)"
            >
              Split
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'edit' ? 'active' : ''}`}
              onClick={() => setViewMode('edit')}
              title="Editor View Only"
            >
              Edit
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => setViewMode('preview')}
              title="Preview View Only"
            >
              Preview
            </button>
          </div>

          <div className="md-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyMarkdown}
              title="Copy raw Markdown source"
              disabled={!markdown}
            >
              Copy MD
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleCopyHtml}
              title="Copy rendered HTML output"
              disabled={!renderedHtml}
            >
              Copy HTML
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleClear}
              title="Clear editor contents"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Word/Char/Line Stats */}
        <div className="md-stats-bar">
          <span className="badge">{stats.words} words</span>
          <span className="badge">{stats.chars} chars</span>
          <span className="badge">{stats.lines} lines</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`md-workspace md-workspace-${viewMode}`}>
        {/* Editor Pane */}
        {(viewMode === 'split' || viewMode === 'edit') && (
          <div className="md-pane md-editor-pane">
            <div className="md-pane-header">
              <span className="label">Markdown Source</span>
            </div>
            <textarea
              ref={textareaRef}
              className="textarea md-textarea"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or paste Markdown content here..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview Pane */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className="md-pane md-preview-pane">
            <div className="md-pane-header">
              <span className="label">Rendered Preview</span>
            </div>
            <div className="md-preview-container">
              {renderedHtml ? (
                <div
                  className="md-rendered-content"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              ) : (
                <div className="md-empty-preview">
                  <span>Nothing to preview. Start typing markdown in the editor.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownPreview;
