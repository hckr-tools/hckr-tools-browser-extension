# hckr-tools — Developer Utility Toolkit Browser Extension ⚡

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E%20Tested-45ba4b.svg)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An essential, privacy-first developer utility toolkit built right into your browser. Instant access to 11 daily developer tools, context menu integrations, on-page smart payload detection, and lightning-fast MRU tab switching.

**100% Offline • Zero Analytics • Zero Tracking • Privacy by Design**

---

## 🚀 Features

### 🧰 11 Built-in Developer Tools

| Tool | Description |
| :--- | :--- |
| **`{ }` JSON Formatter** | Parse, format, minify, validate, and inspect JSON with interactive collapsible tree views, path search, and syntax validation. |
| **`🔤` Base64 Encoder / Decoder** | Encode and decode plain text or binary files, with support for standard and URL-safe Base64 modes. |
| **`🆔` UUID / NanoID Generator** | Generate UUID v1, v4, v7, and custom-length NanoIDs in single or batch mode with instant copy. |
| **`⏰` Timestamp Converter** | Convert Unix epoch timestamps (seconds & milliseconds) to ISO 8601, UTC, and local date/time with relative time calculations. |
| **`🔗` URL Encoder / Decoder** | Encode/decode URIs and component strings, parse query parameters into key-value tables, and edit query strings live. |
| **`🔐` JWT Decoder** | Decode JSON Web Tokens to inspect headers, payload claims, and signature info with expiration status badges. |
| **`#️⃣` Hash Generator** | Generate MD5, SHA-1, SHA-256, and SHA-512 cryptographic hashes and checksums directly on the client. |
| **`🔍` Regex Tester** | Test regular expressions in real-time with flag controls (`g`, `i`, `m`, `s`, `u`), match highlighting, and capture group tables. |
| **`📋` Dummy Data Generator** | Generate realistic mock data including names, emails, addresses, UUIDs, dates, numbers, and structured JSON schemas. |
| **`📊` Diff Checker** | Compare two text blocks or JSON snippets side-by-side or unified with granular character/line difference highlighting. |
| **`📝` Markdown Previewer** | Real-time GitHub Flavored Markdown (GFM) editor with live preview, syntax highlighting, and export options. |

---

### ⚡ Extension Superpowers

- **Smart On-Page Content Detection**: Automatically detects JSON, JWT, and Base64 strings inside `<pre>` and `<code>` blocks on any webpage (API responses, log viewers, documentation) and displays a 1-click **⚡ Open in hckr** widget.
- **Context Menu Integration**: Select any text on any page and right-click to instantly send it to the appropriate tool (Format JSON, Decode JWT, Test Regex, etc.).
- **Quick Tab Switcher (`Alt+Q`)**: Keyboard shortcut to cycle between your most recently used tabs within the current window.
- **Fast MRU State & Preferences**: Automatically preserves your active tool, inputs, and theme across sessions using `chrome.storage`.
- **Dark & Light Mode**: Built-in sleek dark theme and crisp light theme designed for coding environments.
- **Privacy-First**: No data leaves your machine. All computation is executed locally inside your browser sandbox.

---

## 📦 Installation & Loading into Chrome

### 1. Build the Extension
```bash
# Clone the repository
git clone https://github.com/hckr-tools/hckr-tools-browser-extension.git
cd hckr-tools-browser-extension

# Install dependencies
npm install

# Build the extension
npm run build
```

### 2. Load into Chrome / Chromium
1. Open Google Chrome (or any Chromium browser: Brave, Edge, Arc, Opera, Vivaldi).
2. Navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the **`dist/`** directory created inside this project.
6. The `hckr-tools` icon will appear in your extension toolbar. Click it or pin it to open.

---

## 🛠️ Development Workflow

We provide both `npm` scripts and a `Makefile` for streamlined development:

```bash
# Install dependencies
make install        # or: npm install

# Start Vite build in watch mode (updates dist/ on save)
make dev            # or: npm run dev

# Run TypeScript typechecks
make lint           # or: npm run lint

# Build production bundle in dist/
make build          # or: npm run build

# Package extension zip for Chrome Web Store distribution
make zip            # or: npm run zip

# Clean build artifacts
make clean          # or: npm run clean
```

### 💻 Tmux Dev Environment
For a full multi-pane terminal setup with watch builds, automated test triggers, and a dev shell:
```bash
make dev-tmux
```

---

## 🧪 Testing

End-to-End tests are implemented using **Playwright** to verify tool calculations, content script widget injection, service worker tab navigation, and storage persistence.

```bash
# Run all E2E tests headless
make test-e2e           # or: npm run test:e2e

# Run E2E tests in a visible browser window
make test-e2e-headed    # or: npm run test:e2e:headed

# Open interactive Playwright UI Test Runner
make test-e2e-ui        # or: npm run test:e2e:ui
```

---

## 🏗️ Architecture & Project Structure

The extension is structured around Manifest V3 best practices, separating the UI layer, background service worker, content scripts, and shared utilities:

```text
hckr-browser-ext/
├── e2e/                      # Playwright end-to-end test suites
│   ├── fixtures/             # HTML test fixtures & helpers
│   ├── content-script.spec.ts
│   ├── navigation-storage.spec.ts
│   ├── tools-core.spec.ts
│   └── tools-advanced.spec.ts
├── public/
│   └── manifest.json         # Manifest V3 configuration
├── src/
│   ├── content/              # Content scripts injected into web pages
│   │   ├── detector.ts       # On-page JSON/JWT/Base64 detector
│   │   └── widget.css        # Injected widget styling
│   ├── service-worker.ts     # Background service worker (tabs, context menu, IPC)
│   ├── shared/               # Shared cross-context utilities
│   │   ├── clipboard.ts      # Clipboard copy/read helpers
│   │   ├── messaging.ts      # Chrome runtime IPC types & handlers
│   │   └── storage.ts        # Type-safe chrome.storage wrapper
│   └── sidepanel/            # Extension UI (React application)
│       ├── components/       # Common UI components (TabBar, etc.)
│       ├── styles/           # Theme variables & base CSS
│       ├── tools/            # Individual tool implementations (11 tools)
│       ├── App.tsx           # Main application root & tool router
│       ├── index.html        # HTML entry point for the extension app
│       └── main.tsx          # React DOM root mounting
├── Makefile                  # Build & automation commands
├── package.json              # Dependencies and scripts
├── playwright.config.ts      # Playwright test configuration
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite bundler configuration
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>Q</kbd> | Switch to the previously active tab in the current window |

*(You can customize shortcut keys at `chrome://extensions/shortcuts`)*

---

## 🔒 Privacy Guarantee

- **No Remote Servers**: Every conversion, formatting, hashing, and decoding action runs client-side inside your browser.
- **No Analytics / Telemetry**: We do not include Google Analytics, Sentry, Mixpanel, or any third-party tracking scripts.
- **No Data Storage Outside Your Machine**: Data is kept in memory or `chrome.storage.local` on your device.
- **Minimal Permissions**: We only request permissions necessary for core features (`storage`, `contextMenus`, `tabs`, `activeTab`).

---

## 🌐 Documentation & Related Links

- **Documentation & User Guide**: [https://hckr-tools.github.io](https://hckr-tools.github.io)
- **Documentation Source Code**: [hckr-tools.github.io Repository](https://github.com/hckr-tools/hckr-tools.github.io)
- **Chrome Web Store**: *Coming soon*

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
