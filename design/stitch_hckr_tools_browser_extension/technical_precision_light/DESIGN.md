---
name: Technical Precision Light
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#703a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#934e00'
  on-tertiary-container: '#ffd2b1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
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
    letterSpacing: 0em
  code-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.01em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.01em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 2px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-lg: 16px
  space-xl: 20px
  space-2xl: 24px
  space-3xl: 32px
  gutter-split: 1px
  toolbar-height: 36px
  panel-header-height: 28px
---

## Brand & Style

This design system is engineered for developers, systems architects, and technical operators navigating complex data, abstract syntax trees (ASTs), regex parsers, query profilers, and code analysis tools. The design philosophy centers on **Technical Precision**: dense, highly legible, structured, and strictly functional.

The visual style rejects decorative skeuomorphism, neon glow, and excessive whitespace in favor of an exacting, high-density utility workbench. It balances cold architectural discipline with ergonomic readability:
- **Tone:** Uncompromising, analytical, reliable, and razor-sharp.
- **Visual Weight:** Light mode engineered specifically to reduce visual fatigue during daytime debugging sessions, using soft cool-gray underlays to ground pure-white work surfaces.
- **Hierarchy:** Dictated by typographic weight, tabular alignment, and 1px structural dividing lines rather than exaggerated shadows.

## Colors

The palette establishes a high-contrast, strictly controlled color environment where hue is reserved strictly for syntax, system state, and active focus.

### Surface Architecture
- **Base Canvas (`bg-canvas`):** `#F8F9FB` — The application root, workbench gutter, and panel split backgrounds.
- **Surface Level 1 (`bg-surface`):** `#FFFFFF` — Code viewports, active editor buffers, input surfaces, and dropdown menus.
- **Surface Level 2 (`bg-subtle`):** `#F1F3F7` — Inactive panel headers, sidebars, tree rows on hover, and structural docks.
- **Surface Level 3 (`bg-muted`):** `#EAECF0` — Toolbar groups, segmented control wells, and disabled fields.

### Border & Division
- **Divider Subtle:** `#E2E5EB` — Default 1px interior pane dividers and table row borders.
- **Border Strong:** `#CBD5E1` — Input perimeters, active panel outlines, and window delimiters.

### Typography & Ink
- **Text Primary:** `#0F172A` (Slate 900) — Primary UI copy, tokens, and tree labels (meets WCAG AAA).
- **Text Secondary:** `#475569` (Slate 600) — Attribute keys, secondary telemetry, and panel headers.
- **Text Muted / Line Numbers:** `#94A3B8` (Slate 400) — Editor gutter line numbers, inactive hotkey tags, and empty states.

### Status & Feedback
- **Accent / Interactive:** `#4F46E5` (Hover: `#4338CA`, Active: `#3730A3`) — Action primary, cursor focus rings, and selection range fills (`#4F46E5` at 12% opacity).
- **Success / Valid:** `#059669` (Surface: `#ECFDF5`, Border: `#A7F3D0`).
- **Warning / Alert:** `#D97706` (Surface: `#FFFBEB`, Border: `#FDE68A`).
- **Critical / Error:** `#DC2626` (Surface: `#FEF2F2`, Border: `#FECACA`).

### Light Mode Syntax Tokens
- **Keywords / Control:** `#4F46E5` (Indigo)
- **Strings / Literals:** `#059669` (Emerald)
- **Numbers / Constants:** `#D97706` (Amber)
- **Functions / Calls:** `#2563EB` (Blue)
- **Types / Interfaces:** `#7C3AED` (Violet)
- **Operators / Punctuation:** `#64748B` (Slate 500)

## Typography

The type system implements a bifurcated hierarchy: **Geist** handles standard interface labels, commands, and structural metadata, while **JetBrains Mono** powers syntax rendering, AST tree labels, keybindings, and numerical telemetry.

### Typographic Principles
- **Monospace Parity:** All code viewers, hex addresses, line numbers, and JSON outputs share standard 12px or 13px sizing with explicit vertical metrics to prevent line jitter when highlighting or selecting.
- **Tabular Numerics:** Enable `font-variant-numeric: tabular-nums` across all monospace instances and data grid tables to ensure strict vertical column alignment.
- **Dense Proportions:** Type sizes prioritize compact scanning over promotional scale. Headings top out at 24px, keeping utility chrome minimal and editor viewports maximized.

## Layout & Spacing

The layout is an IDE-style split-pane docking architecture rather than a conventional promotional grid.

### Layout Mechanics
- **Panels & Splits:** Viewports are subdivided using resizable splitters with a 1px structural gutter (`#E2E5EB`). The canvas (`#F8F9FB`) houses multiple independent operational zones (e.g., File Tree, Editor Buffers, AST Output, Console).
- **4px Spatial Unit:** Layout, padding, and positioning scale on a rigorous 4px baseline (`2px`, `4px`, `8px`, `12px`, `16px`, `24px`).
- **Dense Toolbars:** Standard panel headers lock to `28px` height. Global toolbars lock to `36px` height.
- **Responsive Handling:**
  - **Desktop (>1024px):** Multi-pane split view with horizontal/vertical drag handles.
  - **Tablet (768px - 1023px):** Side-by-side collapses to stacked collapsible accordion panels or a primary/secondary tabbed canvas.
  - **Mobile (<768px):** Single-pane view with a persistent bottom drawer for console/output switching and sticky top context menus.

## Elevation & Depth

Visual depth is achieved through **structural outlines and tonal nesting** rather than ambient shadows. This keeps visual noise near zero and guarantees sharp legibility on all monitor types.

- **Level 0 (App Shell):** `#F8F9FB` canvas, no borders, flush to the screen edges.
- **Level 1 (Panels & Docks):** `#FFFFFF` surfaces inset against the canvas, enclosed by a 1px solid border (`#E2E5EB`). No drop shadow.
- **Level 2 (Dropdowns, Menus & Tooltips):** `#FFFFFF` surface bordered with `#CBD5E1`, supported by an ultra-tight technical shadow: `0 1px 3px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.05)`.
- **Level 3 (Command Palette / Modals):** `#FFFFFF` surface with `#CBD5E1` border and structured drop shadow: `0 8px 24px -4px rgba(15, 23, 42, 0.12)`.
- **Focus & Selection States:** High-precision double-ring elevation using `box-shadow: 0 0 0 1px #FFFFFF, 0 0 0 3px #4F46E5`.

## Shapes

The design system enforces a disciplined, compact shape language with a corner radius of `4px` (`roundedness: 1`) for interactive widgets and small containers, scaling up to a maximum of `6px` for outer dialogs and floating panels.

- **Buttons, Inputs, Badges, Tabs:** `4px` (`0.25rem`).
- **Modals, Floating Panels, Popovers:** `6px` (`0.375rem`).
- **AST Node Indicators & Icon Buttons:** `4px` (`0.25rem`).
- **Pill Badges (Status dots/chips):** `4px` with square or subtly soft corners—avoid 9999px pill shapes to maintain the technical, box-calibrated aesthetic.

## Components

### Buttons
- **Primary:** Background `#4F46E5`, foreground `#FFFFFF`, border none. Hover `#4338CA`, active `#3730A3`. Height: 28px (compact) or 32px (standard). Typography: `Geist` 12px/13px 500 weight.
- **Secondary / Outline:** Background `#FFFFFF`, border 1px solid `#CBD5E1`, foreground `#0F172A`. Hover background `#F1F3F7`.
- **Ghost / Icon Tool:** Background transparent, border none, foreground `#475569`. Hover background `#EAECF0`, hover foreground `#0F172A`.

### Inputs & Search Bars
- **Style:** Background `#FFFFFF`, 1px solid `#CBD5E1`, radius 4px, height 30px, padding horizontal 8px.
- **Typography:** JetBrains Mono for expression/query inputs, Geist for metadata inputs.
- **Focus:** Border color `#4F46E5`, outline none, box-shadow `0 0 0 1px #4F46E5`.

### Chips, Tags & Badges
- **Format:** Inset padding `1px 6px`, radius `4px`, font `JetBrains Mono` 10px / 500 weight, uppercase tracking `0.04em`.
- **Neutral:** Background `#F1F5F9`, border 1px solid `#E2E8F0`, text `#475569`.
- **Success:** Background `#ECFDF5`, border 1px solid `#A7F3D0`, text `#059669`.
- **Warning:** Background `#FFFBEB`, border 1px solid `#FDE68A`, text `#B45309`.
- **Error:** Background `#FEF2F2`, border 1px solid `#FECACA`, text `#DC2626`.

### AST Tree View & List Rows
- **Row Height:** 22px fixed height.
- **Hierarchy:** Indentation at 12px intervals, punctuated by faint vertical guide lines (`1px solid #E2E5EB`).
- **States:** Hover background `#F1F3F7`. Selected row background `#EEF2FF`, border-left `2px solid #4F46E5`, text `#0F172A`.

### Checkboxes & Radios
- **Geometry:** 14px × 14px, radius 3px (checkbox) or 50% (radio). Border 1px solid `#CBD5E1`, background `#FFFFFF`.
- **Checked:** Background `#4F46E5`, border-color `#4F46E5`, inner check icon/dot `#FFFFFF`.

### Cards & Panels
- **Structure:** Background `#FFFFFF`, border 1px solid `#E2E5EB`.
- **Header:** Height 28px, background `#F8F9FB`, border-bottom 1px solid `#E2E5EB`, padding `0 8px`, typography `Geist` 12px 600 weight slate-700.

### Code Editor Gutter & Canvas
- **Gutter:** Background `#F8F9FB`, border-right 1px solid `#E2E5EB`, text `#94A3B8`, line height matching editor precisely (`20px`).
- **Active Line Highlight:** Background `#F1F3F7` across the entire row, border-left `2px solid #4F46E5`.