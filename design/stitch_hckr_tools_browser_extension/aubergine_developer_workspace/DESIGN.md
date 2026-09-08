---
name: Aubergine Developer Workspace
colors:
  surface: '#111417'
  surface-dim: '#111417'
  surface-bright: '#36393e'
  surface-container-lowest: '#0b0e12'
  surface-container-low: '#191c20'
  surface-container: '#1d2024'
  surface-container-high: '#272a2e'
  surface-container-highest: '#323539'
  on-surface: '#e1e2e8'
  on-surface-variant: '#bec8d0'
  inverse-surface: '#e1e2e8'
  inverse-on-surface: '#2e3135'
  outline: '#88929a'
  outline-variant: '#3e484f'
  surface-tint: '#7fd0ff'
  primary: '#7fd0ff'
  on-primary: '#00344a'
  primary-container: '#1d9bd1'
  on-primary-container: '#002e41'
  inverse-primary: '#00658c'
  secondary: '#64dca2'
  on-secondary: '#003822'
  secondary-container: '#1ea46f'
  on-secondary-container: '#00311d'
  tertiary: '#f8bd39'
  on-tertiary: '#412d00'
  tertiary-container: '#bb8900'
  on-tertiary-container: '#392700'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c5e7ff'
  primary-fixed-dim: '#7fd0ff'
  on-primary-fixed: '#001e2d'
  on-primary-fixed-variant: '#004c6a'
  secondary-fixed: '#82f9bd'
  secondary-fixed-dim: '#64dca2'
  on-secondary-fixed: '#002112'
  on-secondary-fixed-variant: '#005234'
  tertiary-fixed: '#ffdea4'
  tertiary-fixed-dim: '#f8bd39'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#111417'
  on-background: '#e1e2e8'
  surface-variant: '#323539'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  code-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.25rem
  space-2xl: 1.5rem
  space-3xl: 2rem
  sidebar-width: 16.25rem
  header-height: 2.75rem
---

## Brand & Style

This design system translates the distinctive identity of Slack's aubergine palette into a high-density, technical workspace engineered for developer utility tooling, AST inspection, payload parsing, and workspace telemetry. 

The aesthetic is functional minimalism fused with IDE ergonomics: deeply muted plum chrome, dark slate canvas areas, crisp typography, and disciplined color-coded syntax tokens. It targets software engineers, systems developers, and API architects who need deep focus during high-cognitive-load debugging and structural inspection.

Key tonal attributes:
- **Focused & Low-Fatigue:** Dark aubergine and slate surfaces reduce eye strain across long engineering sessions.
- **Systematic & Modular:** Sharp 4px geometry, structural borders, and strict spatial metrics create predictable spatial boundaries.
- **Accented Utility:** Strategic Slack blues and mint-greens direct user attention to operational statuses, active channels, and AST execution nodes.

## Colors

The palette reproduces authentic enterprise aubergine dark mode dynamics, separating structural navigation chrome from the central developer canvas and interactive payload views.

### Surface Architecture
- **Sidebar Shell:** `#1A0D1B` (Base), `#120713` (Header / Workspace Switcher), `#2A162C` (Hover / Active item background).
- **Primary Canvas:** `#1A1D21` (Main workspace view and stream logs).
- **Surface Elevation 1 (Cards & Toolbars):** `#22252A` (Panels, input containers, inspector panes).
- **Surface Elevation 2 (Code Snippets & AST Nodes):** `#282C34` (Code views, payload viewer, AST nodes).
- **Structural Borders:** `#2E343A` (Canvas division lines), `#383F45` (Interactive controls & focused borders), `#351D38` (Sidebar divider lines).

### Text & Icon Tokens
- **High-Contrast Value (Primary Text):** `#E8E8E8`
- **Mid-Contrast Value (Secondary / Labels):** `#A0A5AA`
- **Subdued / Disabled (Muted Chrome):** `#71767B`
- **Sidebar Dimmed Text:** `#AB9BAE`
- **Sidebar Active Text:** `#FFFFFF`

### Accent & Status
- **Interactive Blue:** `#1D9BD1` (Default interactive, active pills, links), `#1264A3` (Pressed states / Deep selection), `#36C5F0` (High-contrast focus rings).
- **Operational Green (Success/Live):** `#2BAC76` (Online status, valid schemas, parsed AST indicators), `#007A5A` (Deep badges).
- **Warning Amber:** `#ECB22E` (Lint warnings, dirty states).
- **Critical Red:** `#E01E5A` (Parse failures, syntax errors, disconnected states).

### Syntax Engine Tokens (Code & AST Tree)
- **Object Keys & Properties:** `#7CD5F3` / `#F3F4F6`
- **Strings:** `#34D399` (Emerald)
- **Numbers / Constants:** `#F59E0B` (Amber)
- **Booleans / Keywords:** `#C084FC` (Light Purple)
- **Null / Undefined:** `#9CA3AF` (Subtle Slate)
- **Punctuation / Operators:** `#6B7280`

## Typography

The typography uses Geist for structural UI, messaging, labels, and code environments. Typescales maintain strict tabular ergonomics, high vertical economy, and legibility at sub-14px sizes.

Rules for application:
- **Dense Data & Hierarchy:** Standard technical tools render primarily at `body-md` (13px) to maximize screen real estate, matching Slack's compact density preferences.
- **Code & Syntax Output:** Use `code-md` for interactive code editors, JSON viewers, and raw logs. AST node tags and memory offsets use `code-sm`.
- **Numbers and Counters:** Force tabular figures (`font-feature-settings: 'tnum' 1`) across all metric labels, payload byte counters, and execution runtimes.
- **Sidebar Typography:** Sidebar section headers render at `label-sm` with 0.04em letter-spacing and uppercase styling, tinted in `#AB9BAE`.

## Layout & Spacing

The workspace operates on an explicit 4px/8px coordinate model, prioritizing multi-pane docking:
- **Left Navigation Rail:** Fixed width (`sidebar-width`: 260px) in `#1A0D1B`, containing workspaces, channel-like tool buckets, and connection statuses.
- **Top Utility Bar:** Fixed height (`header-height`: 44px) in `#120713`, hosting global search, quick-switch command palette, and developer profile metadata.
- **Workspace Splitter Canvas:** Resizable fluid split-panes (`#1A1D21`) housing payload input on one side and parsed output / AST trees on the opposing side, divided by a 1px border (`#2E343A`).
- **Inspection Drawers:** Collapsible 320px panels on `#22252A` surfaces with strict 12px interior padding (`space-md`) for token inspection and schema validation output.

## Elevation & Depth

Visual separation relies on calibrated surface contrast and crisp 1px borders rather than diffuse drop shadows. Shadows are reserved exclusively for floating menus, dropdown popovers, and the global command palette.

- **Level 0 (Canvas Base):** Flat `#1A1D21` or `#1A0D1B` without borders or elevation.
- **Level 1 (Panels & Tool Containers):** `#22252A` bounded by a 1px border of `#2E343A`.
- **Level 2 (Inlaid Editors & AST Trees):** `#282C34` recessed into the Level 1 container, delineated by a `#383F45` hairline border.
- **Level 3 (Modals, Overlays & Flyouts):** `#22252A` surface with a 1px `#383F45` border, backed by an ambient shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.55), 0 2px 6px -1px rgba(0, 0, 0, 0.4)`.
- **Focus States:** 2px ring using `#1D9BD1` with a 1px offset against `#1A1D21` or `#22252A`.

## Shapes

The design system standardizes on a compact, developer-oriented curvature profile (`roundedness: 1`):
- **Base Components:** Inputs, buttons, channel list items, badges, and inline code tags strictly adhere to a **4px** (`0.25rem`) radius.
- **Cards, Panels & Containers:** Larger structural blocks and code blocks use an **8px** (`0.5rem`) outer border radius, nesting internal 4px child components cleanly.
- **Floating Modals & Command Palettes:** Fixed at **8px** (`0.5rem`) radius to preserve the crisp, tool-like engineering feel.
- **Pills & Status Indicators:** Presence indicators (online dot, notification count) are rounded to full circles (50%), while status badges stay locked to 4px.

## Components

### Buttons
- **Primary Action:** Solid `#1D9BD1` fill with `#FFFFFF` text. Hover: `#1264A3`. Active: `#0F5184`. Height: 28px (compact) or 32px (standard), padding: 0 12px, border-radius: 4px.
- **Secondary (Subtle):** `#22252A` surface with 1px border `#383F45` and `#E8E8E8` text. Hover: `#282C34` background with border `#71767B`.
- **Ghost (Sidebar/Nav):** Transparent fill, `#AB9BAE` text. Hover: `#2A162C` fill, `#FFFFFF` text. Active channel/tool: `#1164A3` fill with crisp white typography.
- **Destructive:** Transparent or `#22252A` surface with `#E01E5A` text. Hover: `#E01E5A` background with `#FFFFFF` text.

### Chips & Badges
- **Status / Environment:** 20px height, 4px radius, 6px horizontal padding.
  - *Success / Production:* Background `rgba(43, 172, 118, 0.15)`, text `#2BAC76`, border `1px solid rgba(43, 172, 118, 0.25)`.
  - *Dev / Staging:* Background `rgba(29, 155, 209, 0.15)`, text `#1D9BD1`, border `1px solid rgba(29, 155, 209, 0.25)`.
- **AST Node Badges:** Height 18px, monospace font, background `#1A1D21`, text `#A0A5AA`, border `1px solid #2E343A`.

### Inputs & Search Bars
- **Main Canvas Inputs:** Background `#22252A`, border `1px solid #383F45`, text `#E8E8E8`, placeholder `#71767B`. 4px radius. Focus: border `#1D9BD1`, box-shadow `0 0 0 1px #1D9BD1`.
- **Sidebar Search (Global Quick Switcher):** Background `rgba(255, 255, 255, 0.08)`, border `1px solid rgba(255, 255, 255, 0.15)`, text `#FFFFFF`, placeholder `#AB9BAE`.

### Tree & List Items
- **Channel / Tool List:** Height 28px, 4px radius, display flex with alignment. Left icon: 16px `#AB9BAE`. Label: `body-md` typography. Hover background: `#2A162C`. Selected background: `#1164A3` with `#FFFFFF` text.
- **AST Tree Rows:** Indented by 16px increments. Collapsible chevron: 12px `#71767B`. Row hover: `#22252A`. Selected node highlight: `rgba(29, 155, 209, 0.1)` with a 2px left-border accent in `#1D9BD1`.

### Form Controls (Checkboxes & Radios)
- **Checkboxes:** 14px x 14px square, 3px border-radius. Border `1px solid #71767B`. Checked state: background `#1D9BD1`, border `#1D9BD1` with `#FFFFFF` checkmark vector.
- **Radio Buttons:** 14px diameter circular form, identical color state transitions.

### Cards & Snippet Containers
- **Snippet Box:** Outer frame `#282C34`, 1px border `#383F45`, 4px radius. Header strip: `#22252A`, 28px height, containing file type badge, line count, and copy button.
- **Interactive JSON / AST View:** Background `#1E2228`, border `1px solid #2E343A`, syntax highlighting applied via specified tokens. Horizontal and vertical custom dark scrollbars: width 6px, thumb `#383F45`, hover thumb `#71767B`.