# hckr-tools — Developer Utility Toolkit ⚡

[![CI](https://github.com/hckr-tools/hckr-tools-browser-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/hckr-tools/hckr-tools-browser-extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Website](https://img.shields.io/badge/Website-hckr--tools.github.io-cyan.svg)](https://hckr-tools.github.io)

**hckr-tools** is a privacy-first, offline developer utility toolkit built as a Chrome Manifest V3 browser extension. It provides 11 essential developer tools right inside your browser side panel or dedicated workspace tab, eliminating the need to paste sensitive data into random online websites.

---

## 🚀 Key Highlights

- 🔒 **100% Privacy-First & Offline**: Everything executes locally in the browser runtime. Zero tracking, zero telemetry, and zero network calls.
- ⚡ **11 Built-in Developer Tools**: Instant access to JSON formatters, JWT decoders, regex testers, hash generators, and more.
- 🎯 **Page Content Detection**: Automatically detects JSON, JWT, and Base64 strings in web pages (API responses, `<pre>`, `<code>`) with an inline quick-open widget.
- 🖱️ **Context Menu Integration**: Highlight any text on any webpage, right-click, and instantly send it into any tool.
- 🔄 **Previous Active Tab Switcher (`Alt+Q`)**: Fast keyboard shortcut to toggle back and forth between your code and your browser tab.
- 🎨 **Dark & Light Theme**: Cyberpunk dark mode by default with clean light mode toggle.

---

## 🛠️ Included Developer Tools

| Tool | Icon | Description |
| :--- | :---: | :--- |
| **JSON Formatter & Validator** | `{ }` | Beautify, minify, validate, and inspect JSON with syntax highlighting and instant error diagnostics. |
| **Base64 Encoder / Decoder** | `🔤` | Encode/decode ASCII, Unicode text, and raw data with URL-safe variant support. |
| **JWT Decoder** | `🔐` | Parse JWT headers and payloads, inspect claims, format timestamps, and check expiration dates. |
| **UUID Generator** | `🆔` | Generate bulk UUID v4 identifiers with custom hyphens and uppercase options. |
| **Timestamp Converter** | `⏰` | Convert between Unix epoch timestamps (seconds/ms) and human-readable UTC/local date formats with live clock. |
| **URL Encoder / Decoder** | `🔗` | Encode and decode query strings, full URLs, and inspect parsed query parameters. |
| **Hash Generator** | `#️⃣` | Instant MD5, SHA-1, SHA-256, and SHA-512 cryptographic hash computation. |
| **Regex Tester** | `🔍` | Real-time JavaScript regular expression evaluator with match highlighting and capture group breakdown. |
| **Dummy Data Generator** | `📋` | Generate realistic mock names, emails, UUIDs, IPv4/IPv6 addresses, dates, and structured test datasets. |
| **Diff Checker** | `📊` | Side-by-side or unified difference comparison for text snippets and code with line-by-line diffing. |
| **Markdown Preview** | `📝` | Live Markdown editor and previewer with GitHub-flavored Markdown and code highlighting. |

---

## 📦 Installation & Setup

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10+` (Standard package manager)

### 1. Clone the Repository

```bash
git clone https://github.com/hckr-tools/hckr-tools-browser-extension.git
cd hckr-tools-browser-extension
```

### 2. Install Dependencies

```bash
npm install
# or
make install
```

### 3. Build Extension

```bash
# Build production bundle in dist/
npm run build
# or
make build
```

### 4. Load into Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `dist/` directory inside this repository.

---

## 💻 Development Workflow

### Available Commands

| Command | Make Target | Description |
| :--- | :--- | :--- |
| `npm run dev` | `make dev` | Starts Vite in watch mode to automatically recompile `dist/` on code changes |
| `npm run build` | `make build` | Runs TypeScript typecheck (`tsc`) and compiles optimized production bundle |
| `npm run lint` | `make lint` | Validates TypeScript strict typing across the project without emitting code |
| `npm run test:e2e` | `make test-e2e` | Runs Playwright end-to-end integration tests headlessly |
| `npm run test:e2e:headed` | `make test-e2e-headed` | Runs Playwright tests with visible Chrome browser window |
| `npm run test:e2e:ui` | `make test-e2e-ui` | Opens the interactive Playwright test runner UI |
| `npm run zip` | `make zip` | Packages `dist/` into `hckr-tools-browser-extension.zip` for Chrome Web Store upload |
| `npm run clean` | `make clean` | Cleans `dist/` build artifacts and generated zip files |

### Tmux Multi-Pane Dev Environment

If you use `tmux`, you can launch the watch build, test watcher, and a dev shell in a tiled layout:

```bash
make dev-tmux
```

---

## 🏛️ Architecture Overview

```
hckr-browser-ext/
├── Makefile                     # Developer task automation
├── package.json                 # Project dependencies & npm scripts
├── vite.config.ts               # Vite multi-entry build configuration
├── tsconfig.json                # TypeScript compiler configuration
├── playwright.config.ts         # Playwright test configuration
├── public/
│   ├── manifest.json            # Chrome Manifest V3 definition
│   └── icons/                   # Extension icons (16x16, 48x48, 128x128)
├── src/
│   ├── service-worker.ts        # Background service worker (tabs, context menu, MRU history)
│   ├── content/
│   │   ├── detector.ts          # Content script: auto-detects JSON/JWT/Base64 on pages
│   │   └── widget.css           # Floating inline badge styling
│   ├── shared/
│   │   ├── clipboard.ts         # Async clipboard copy/paste utilities
│   │   ├── messaging.ts         # Type-safe IPC messaging helpers
│   │   └── storage.ts           # chrome.storage preference abstractions
│   └── sidepanel/
│       ├── index.html           # Sidepanel / full-tab HTML entry
│       ├── main.tsx             # React DOM root mounting
│       ├── App.tsx              # Tool navigation & lazy-loaded view router
│       ├── components/          # TabBar, navigation, common inputs
│       ├── styles/              # Theme variables, cyberpunk color scheme
│       └── tools/               # 11 Developer utility tool components
├── e2e/                         # Playwright E2E browser tests
└── dist/                        # Compiled unpacked extension distribution
```

---

## 🧪 Testing

End-to-end testing is powered by [Playwright](https://playwright.dev/) with automated browser context launch and extension loading:

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed browser mode
npm run test:e2e:headed

# Run tests with UI inspector
npm run test:e2e:ui
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
