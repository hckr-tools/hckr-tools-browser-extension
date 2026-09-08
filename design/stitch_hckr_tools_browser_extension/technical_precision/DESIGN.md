---
name: Technical Precision
colors:
  surface: '#101319'
  surface-dim: '#101319'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a30'
  surface-container-highest: '#32353b'
  on-surface: '#e1e2eb'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2d3037'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#d97721'
  on-tertiary-container: '#452000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#101319'
  on-background: '#e1e2eb'
  surface-variant: '#32353b'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0em
  code-lg:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: -0.01em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: -0.01em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.02em
  label-ui:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.5rem
  space-lg: 0.75rem
  space-xl: 1rem
  space-2xl: 1.5rem
  space-3xl: 2rem
  split-pane-gutter: 0.25rem
  sidebar-compact-width: 3.5rem
  sidebar-expanded-width: 16rem
  chrome-popup-min-width: 420px
  chrome-popup-max-width: 780px
---

## Brand & Style

This design system serves a mission-critical developer utility where absolute trust, low latency, and zero distraction are non-negotiable. The aesthetic reflects professional instrument design: calm, disciplined, and razor-sharp. It categorically rejects neon "cyberpunk" clichés, consumer-grade gamification, and ornamental skeuomorphism in favor of an ergonomic, data-dense workstation experience.

### Aesthetic Principles
- **Restrained Density:** Information density is calibrated for power users who read structured payloads, diff trees, and tokens rapidly. High density is balanced with strict typographic hierarchy and disciplined alignment.
- **Local-First & Transparent:** Visual cues emphasize privacy, zero remote pings, and client-side deterministic execution. Validation and security statuses are explicit, unambiguous, and quiet.
- **Keyboard-Native Ergonomics:** Every interactive primitive exposes visible keybind affordances, instant state feedback, and prominent, accessible focus geometries.
- **Industrial Precision:** Clean hairline boundaries, muted surface tiers, and calibrated monospaced alignments mirror high-end integrated development environments and Unix utilities.

## Colors

The palette uses a slate-cast dark foundation optimized for prolonged engineering sessions without optical fatigue. Color serves exclusively as a functional differentiator rather than decoration.

### Dark Palette (Primary Mode)
- **Backgrounds:**
  - `canvas-default`: `#0B0D11` (Root viewport background)
  - `canvas-subtle`: `#12151B` (Sidebars, panel groupings, inspector trays)
  - `canvas-elevated`: `#181C24` (Cards, dropdowns, modal layers, popovers)
  - `canvas-inset`: `#07080B` (Code panes, terminal output views, raw text areas)
- **Borders:**
  - `border-subtle`: `#222733` (Dividers, interior pane boundaries)
  - `border-strong`: `#2D3445` (Active panel containers, input boundaries)
  - `border-focus`: `#6366F1` (Active keyboard focus states)
- **Typography:**
  - `text-primary`: `#F1F3F7` (Primary content, active keys, syntax identifiers)
  - `text-secondary`: `#9CA5B8` (Labels, metadata, structural punctuation)
  - `text-muted`: `#5E677A` (Inactive keybinds, line numbers, placeholders)
- **Accent & Interactive:**
  - `accent-base`: `#6366F1` (Selection indicators, active tabs, primary actions)
  - `accent-hover`: `#818CF8` (Hover states, interactive transitions)
  - `accent-active`: `#4F46E5` (Pressed states)
  - `accent-muted`: `rgba(99, 102, 241, 0.12)` (Selection backgrounds, soft badges)
- **Semantic Feedback:**
  - `success-base`: `#10B981` (Valid payload, local-only verified state, match highlight)
  - `success-muted`: `rgba(16, 185, 129, 0.12)`
  - `warning-base`: `#F59E0B` (Truncation, parse warning, unformatted state)
  - `warning-muted`: `rgba(245, 158, 11, 0.12)`
  - `danger-base`: `#EF4444` (Invalid syntax, parse exception, destructive clear)
  - `danger-muted`: `rgba(239, 68, 68, 0.12)`

### Light Palette (Secondary Token Pairing)
- **Backgrounds:** Canvas default `#F8FAFC`, canvas elevated `#FFFFFF`, canvas inset `#F1F5F9`.
- **Borders:** Subtle `#E2E8F0`, strong `#CBD5E1`.
- **Typography:** Text primary `#0F172A`, secondary `#475569`, muted `#94A3B8`.
- **Accent:** Base `#4F46E5`, hover `#4338CA`, muted `rgba(79, 70, 229, 0.08)`.

## Typography

The typographic stack relies on two coordinated workhorses: **Geist** for crisp, proportional UI shell hierarchy, and **JetBrains Mono** for all code blocks, tabular telemetry, JSON keys, values, and keyboard shortcuts.

### Typographic Guidelines
- **Monospaced Scaffolding:** Any numeric count, byte metric, millisecond timing, or keyboard modifier (`⌘`, `⌥`, `⇧`, `Ctrl`, `K`) must be rendered in `JetBrains Mono` with tabular lining enabled (`font-variant-numeric: tabular-nums`).
- **Punctuation Balance:** Syntax tokens use strict standard optical weights (400) to keep glyph boundaries crisp against near-black backgrounds.
- **Micro Labels:** Badges, tags, and status dots leverage `label-code` or `label-ui` with uppercase formatting and slight tracking (`letterSpacing: 0.02em`) for immediate legibility at small scales.

## Layout & Spacing

The layout is built on a tight 4px/8px micro-grid optimized for Chrome extension viewports (popups, side panels, and full DevTools drawer tabs). Content avoids excessive dead space while preserving clear boundaries between data structures and control surfaces.

### Viewport Scenarios
- **Extension Popup (Compact View):** Width bound between `420px` and `780px`, dynamic height capping at `600px`. Single-column layout with pinned search/action header, scrollable body, and sticky keyboard-command footer.
- **Side Panel & Split Panning:** Resizable multi-column configuration utilizing 1px structural dividing rules with an invisible 6px grab target. Left pane: navigation/presets; Middle: payload/editor; Right: inspect/headers/metrics.
- **Full-Page Utility Dashboard:** Fixed-width utility sidebar with a fluid flex canvas that distributes multi-pane panels (e.g., dual diff views) using identical 8px container padding.

### Alignment Rhythm
All icon sizes strictly align with line heights: 14px icons with `0.75rem` text, 16px icons with `0.875rem` text. Interactive row items maintain a uniform height of `28px` (compact) or `32px` (default).

## Elevation & Depth

Visual hierarchy is constructed through **tonal layering and hairline structural borders** rather than diffuse shadows. This keeps the rendering pipeline lightweight, maximizes battery performance, and eliminates visual mud on dark panels.

### Tiers of Depth
- **Level 0 (Recessed Core):** `canvas-inset` (`#07080B`) framed by 1px `border-subtle` (`#222733`). Used for code editors, diff views, and terminal logs. Sits physically recessed behind the UI.
- **Level 1 (Base Viewport):** `canvas-default` (`#0B0D11`). The foundation for viewports and panel backdrops.
- **Level 2 (Active Containers):** `canvas-subtle` (`#12151B`) and `canvas-elevated` (`#181C24`). Used for toolbars, inspection cards, inspector drawers, and list items. Separated strictly via 1px `border-subtle` boundaries.
- **Level 3 (Overlay & Menus):** Overlays, autocomplete drop-downs, and command palettes take `canvas-elevated` (`#181C24`), framed by `border-strong` (`#2D3445`), with a crisp, low-diffusion shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.6)`.

### Border Discipline
Shadows are never used as element delimiters. All component separation is enforced via crisp 1px borders.

## Shapes

The design system employs subtle, tight curvatures to project technical precision. Curvature is deliberately controlled to prevent playful roundness.

### Corner Rules
- **Base Components (Inputs, Buttons, Tabs, Chips):** `6px` radius (`roundedness: 1`). Matches tight monospaced terminal aesthetic.
- **Container Panels & Cards:** `8px` radius (`rounded-lg`). Ensures neat nesting when 6px controls are enclosed with 8px–12px padding.
- **Keyboard Badges (Kbd):** `4px` radius (`rounded-sm`). Mimics physical keyboard caps.
- **Pills / Status Dots:** Circular (`9999px`) reserved strictly for status presence indicators (e.g., "offline", "memory OK", "sanitized").

## Components

### 1. Buttons
- **Primary:** Background `accent-base`, text `#FFFFFF`, radius `6px`, padding `0 10px`, height `28px` or `32px`. Focus ring: 2px solid `accent-base` with 2px offset in `canvas-default`. Hover: `accent-hover`. Active: `accent-active`.
- **Secondary/Subtle:** Background transparent, border 1px `border-subtle`, text `text-primary`. Hover: background `canvas-elevated`, border `border-strong`.
- **Icon Button:** Flat background, 1:1 aspect ratio (`28x28px`), text `text-secondary`. On hover: `text-primary`, background `canvas-subtle`. Always displays keyboard shortcut in tooltip.

### 2. Inputs & Code Fields
- **Single-line Search / Filter:** Background `canvas-inset`, border 1px `border-subtle`, text `text-primary`, placeholder `text-muted`. Left icon for context, right-aligned `kbd` token (`⌘K`). On focus: border `border-focus`, no default browser outline.
- **Monospace Code Textarea:** Integrated line numbers in `text-muted`, line highlight on cursor row via `rgba(255, 255, 255, 0.03)`. Syntax selection background: `rgba(99, 102, 241, 0.25)`.

### 3. Chips & Badges
- **Status Badges:** 20px height, `4px` radius, padding `0 6px`. Rendered in `label-code`. Success status uses `success-muted` background with `success-base` border (1px) and text.
- **Privacy Indicator Chip:** Persistent badge in navigation header: `LOCAL ONLY` indicator with a 6px `success-base` solid green dot, verifying 0 external telemetry requests.

### 4. Lists & Tree Views
- **Tree Row (JSON/AST/DOM):** Height `24px`, indentation increments by `12px` with a subtle guide line (`#222733`). Hover: background `rgba(255, 255, 255, 0.03)`. Selected: background `accent-muted`, text `text-primary`.
- **Key-Value Pair:** Left column `text-secondary` (`JetBrains Mono`), right column `text-primary` with copy-on-click feedback tooltip.

### 5. Checkboxes & Switches
- **Checkbox:** `14x14px`, 1px border `border-strong`, `3px` radius. When checked: background `accent-base`, white checkmark glyph.
- **Toggle Switch:** `28x16px` track, `12x12px` thumb. Thumb animates 120ms linear. Track is `canvas-subtle` when off, `accent-base` when on.

### 6. Cards & Panels
- Surface `canvas-subtle`, border 1px `border-subtle`, radius `8px`. Header bar height `36px` with bottom border `border-subtle` and integrated action toolbar (Clear, Copy, Format, Minify).

### 7. Keyboard Shortcut Hint (`<kbd>`)
- Inline element with height `18px`, min-width `18px`, padding `0 4px`, radius `4px`, background `canvas-elevated`, border 1px `border-strong`, text `text-secondary`, font `JetBrains Mono` at `0.6875rem`.