# Google Stitch design prompt — hckr-tools browser extension

Design **hckr-tools**, a privacy-first Chrome developer utility toolkit. Create a fresh visual direction from scratch for a compact, keyboard-first product interface used by developers throughout the day. This is an extension workspace, not a marketing site, analytics dashboard, or generic card grid.

## Product and audience

- Audience: developers who need quick, trustworthy local utilities while browsing, debugging APIs, and inspecting data.
- Product promise: **local only, fast, focused, zero tracking**. Avoid dramatic security imagery or a consumer “hacker” aesthetic.
- Tone: calm, technical, premium, direct, and highly legible. Think of the clarity and density of excellent developer tools, but do not copy Linear, Raycast, VS Code, or Chrome styling.
- Primary experience: desktop Chrome side panel / full extension page. Design dark mode as the primary concept and provide a light-mode token direction.

## Deliver three connected desktop frames

### 1. Main developer workspace

Create the main hckr-tools application at roughly 1440 × 900.

- Use a narrow left navigation rail with product mark, grouped tool navigation, active state, keyboard shortcut affordances, and a subtle light/dark theme control near the bottom.
- Organize the 15 tools under these exact groups and labels:
  - **Transform:** JSON, YAML, Base64, URL, JWT, Hash
  - **Create:** UUID, Time, Cron, Data
  - **View:** Read files
  - **Inspect:** Regex, Diff, MD
  - **Browser:** Tabs
- Show the **JSON** tool as the active workspace. It should feel like a practical formatter: large input/editor region, clear format/validate actions, an output/tree region, and a compact status or error area. Use realistic developer content, not lorem ipsum.
- The layout should make dense tools comfortable: strong alignment, a clear primary work surface, useful empty/loaded states, restrained dividers, and deliberate control typography.
- Keep “Local only” visible as a quiet trust signal, not a loud banner.

### 2. Keyboard command palette

Show a centered, focused command palette state over the same workspace.

- Search field label: **Search developer tools**.
- Results are grouped or ranked by the tool names above, with icons, concise descriptions, selected-row treatment, and shortcut hints.
- It must feel fast and keyboard-native: selection, Enter to open, Escape to close.
- Avoid oversized rounded cards, excessive pills, gradients, glassmorphism, or decorative charts.

### 3. Browser tab switcher with closed-history results

Design a standalone floating **hckr-tools tab switcher** popup at approximately 820 × 620, suitable for an always-on-top Chrome popup.

- Header: one prominent search input labelled **Search open tabs…**.
- On an empty query, show a **Recent** list of open tabs ordered by recent use.
- Each open-tab row must clearly show: favicon, tab title, URL/domain on a second line, optional **Current** label, and a numeric keyboard shortcut aligned at the far right. Preserve generous text space; title and URL must not fight the shortcut.
- When a user types, show **Open tabs** first and then a visually distinct **History** section for recently closed matching pages from the past seven days.
- History rows show a fallback favicon/monogram, title, full URL, and muted recency copy such as **Visited 2h ago**. They intentionally have no numeric shortcut.
- Footer hint bar: **1–9 Jump · ↑↓ Select · ↵ Open · esc Close**.
- Make selection/focus state obvious without harsh saturation. Ensure long titles and URLs ellipsize gracefully.

## Design system and constraints

- Create a coherent, implementation-ready system: dark and light color tokens, one compact sans-serif UI type family, code/editor type guidance, an 8px spacing rhythm, border/radius/shadow rules, and icon style.
- Favor near-black/slate surfaces, warm-neutral text, restrained blue or violet as the main interactive accent, and small semantic success/warning/error colors. Do not use a rainbow UI.
- Use open layout, tool panels, lists, and editors where appropriate. Do not turn the app into a dashboard of unrelated metric cards.
- Controls must have clear hover, selected, focus-visible, disabled, empty, and error states. Maintain WCAG-friendly contrast and 44px-friendly hit targets where practical.
- Design responsive behavior: below about 920px, collapse the labeled tool rail into an accessible icon rail while keeping tool names available through tooltips; preserve the work surface and keyboard navigation.
- All visible text must be code-native and readable. No fake logos, fabricated integrations, user avatars, activity feeds, or enterprise metrics.

## Deliverable

Return a polished, coherent set of the three frames above, using the same design system. Include a small token/style reference with color, typography, spacing, and component-state notes so the resulting UI can be implemented in React and CSS.
