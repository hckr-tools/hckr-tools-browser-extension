import widgetCss from './widget.css?inline';

/**
 * Content script: detects JSON, JWT, and Base64 content on web pages
 * and offers a floating "Send to hckr" widget.
 */

interface Detection {
  type: 'json' | 'jwt' | 'base64';
  text: string;
  element: Element;
}

const TOOL_MAP: Record<string, string> = {
  json: 'json-formatter',
  jwt: 'jwt-decoder',
  base64: 'base64',
};

// JWT pattern: header.payload.signature (each base64url encoded)
const JWT_REGEX = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

// Base64 pattern: at least 20 chars, valid base64 alphabet
const BASE64_REGEX = /^[A-Za-z0-9+/]{20,}={0,2}$/;
const MAX_CANDIDATES = 100;
const MAX_CANDIDATE_CHARS = 128 * 1024;
const MAX_TOTAL_CANDIDATE_CHARS = 512 * 1024;
const WIDGET_STYLE_ID = 'hckr-widget-styles';

function isJSON(text: string): boolean {
  const trimmed = text.trim();
  if ((!trimmed.startsWith('{') && !trimmed.startsWith('[')) || trimmed.length < 2) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function isJWT(text: string): boolean {
  return JWT_REGEX.test(text.trim());
}

function isBase64(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20) return false;
  if (!BASE64_REGEX.test(trimmed)) return false;
  try {
    atob(trimmed);
    return true;
  } catch {
    return false;
  }
}

function detectContent(): Detection[] {
  const detections: Detection[] = [];

  // Check <pre> and <code> elements for JSON
  const codeElements = document.querySelectorAll('pre, code');
  let scannedChars = 0;
  for (const el of Array.from(codeElements).slice(0, MAX_CANDIDATES)) {
    const text = el.textContent?.trim();
    if (!text || text.length < 2 || text.length > MAX_CANDIDATE_CHARS) continue;
    if (scannedChars + text.length > MAX_TOTAL_CANDIDATE_CHARS) break;
    scannedChars += text.length;

    if (isJSON(text)) {
      detections.push({ type: 'json', text, element: el });
    } else if (isJWT(text)) {
      detections.push({ type: 'jwt', text, element: el });
    } else if (isBase64(text)) {
      detections.push({ type: 'base64', text, element: el });
    }
    if (detections.length >= 5) break;
  }

  // Check if the entire page body is JSON (like API response pages)
  const bodyIsSmallRawContent = document.body?.children.length === 1;
  if (detections.length === 0 && (document.contentType.includes('json') || bodyIsSmallRawContent)) {
    const bodyText = document.body?.textContent?.trim();
    if (bodyText && bodyText.length <= MAX_CANDIDATE_CHARS && isJSON(bodyText)) {
      detections.push({ type: 'json', text: bodyText, element: document.body });
    }
  }

  return detections;
}

function createWidget(detection: Detection): void {
  // Avoid duplicates
  if (detection.element.querySelector('.hckr-widget')) return;

  if (!document.getElementById(WIDGET_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = WIDGET_STYLE_ID;
    style.textContent = widgetCss;
    document.documentElement.appendChild(style);
  }

  const widget = document.createElement('div');
  widget.className = 'hckr-widget';
  widget.innerHTML = `<span class="hckr-widget-icon">⚡</span> Open in hckr`;
  widget.title = `Send ${detection.type.toUpperCase()} to hckr`;

  widget.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    chrome.runtime.sendMessage({
      type: 'SEND_TO_TOOL',
      toolId: TOOL_MAP[detection.type],
      text: detection.text,
    });
  });

  // Position relative to the detected element
  const parent = detection.element;
  const wrapper = parent.parentElement;
  if (wrapper) {
    const computedStyle = getComputedStyle(wrapper);
    if (computedStyle.position === 'static') {
      wrapper.style.position = 'relative';
    }
  }

  (detection.element as HTMLElement).style.position = 'relative';
  detection.element.appendChild(widget);
}

function isTabSwitcherHotkey(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.altKey && !event.shiftKey;
}

function initTabSwitcherHotkey(): void {
  window.addEventListener('keydown', (event) => {
    if (!isTabSwitcherHotkey(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    chrome.runtime.sendMessage({ type: 'OPEN_TAB_SWITCHER' });
  }, true);
}

// Run detection after page is idle
function init(): void {
  // Only run on http/https or file pages
  if (!location.protocol.startsWith('http') && location.protocol !== 'file:') return;

  initTabSwitcherHotkey();

  const detections = detectContent();

  // Limit to first 5 detections to avoid clutter
  detections.slice(0, 5).forEach(createWidget);
}

// Use requestIdleCallback if available, otherwise setTimeout
if ('requestIdleCallback' in window) {
  requestIdleCallback(init, { timeout: 3000 });
} else {
  setTimeout(init, 1000);
}
