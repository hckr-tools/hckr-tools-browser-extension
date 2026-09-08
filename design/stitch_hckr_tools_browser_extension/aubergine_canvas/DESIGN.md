---
name: Aubergine Canvas
colors:
  surface: '#fdf8f9'
  surface-dim: '#ddd9da'
  surface-bright: '#fdf8f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f2f3'
  surface-container: '#f1edee'
  surface-container-high: '#ebe7e8'
  surface-container-highest: '#e6e1e2'
  on-surface: '#1c1b1c'
  on-surface-variant: '#4e444c'
  inverse-surface: '#313031'
  inverse-on-surface: '#f4f0f1'
  outline: '#80737d'
  outline-variant: '#d2c2cc'
  surface-tint: '#824b7f'
  primary: '#210023'
  on-primary: '#ffffff'
  primary-container: '#3f0e40'
  on-primary-container: '#b377ae'
  inverse-primary: '#f4b1ec'
  secondary: '#0a61a0'
  on-secondary: '#ffffff'
  secondary-container: '#7bbaff'
  on-secondary-container: '#004a7c'
  tertiary: '#001208'
  on-tertiary: '#ffffff'
  tertiary-container: '#002a19'
  on-tertiary-container: '#119e6a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd6f7'
  primary-fixed-dim: '#f4b1ec'
  on-primary-fixed: '#350437'
  on-primary-fixed-variant: '#673366'
  secondary-fixed: '#d1e4ff'
  secondary-fixed-dim: '#9dcaff'
  on-secondary-fixed: '#001d35'
  on-secondary-fixed-variant: '#00497c'
  tertiary-fixed: '#82f9bd'
  tertiary-fixed-dim: '#64dca2'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#005234'
  background: '#fdf8f9'
  on-background: '#1c1b1c'
  surface-variant: '#e6e1e2'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 22px
  title-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
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
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  sidebar-width: 260px
  thread-pane-width: 380px
---

## Brand & Style

This design system captures the unmistakable workplace communication aesthetic: human, collaborative, dense, and structured. It balances deep tonal density with crisp functional clarity, blending elements of corporate modernism and high-utility software ergonomics.

The atmosphere relies on a two-world dynamic:
1. **The Navigation Anchor**: A rich, deep aubergine chrome pane that grounds navigation, workspaces, and system-level operations.
2. **The Canvas Pane**: A high-legibility, bright neutral workspace designed for continuous long-form reading, rapid message triage, rich inline blocks, and developer-grade density.

The UI avoids sterile minimalism and theatrical ornamentation. Depth is functional, interactions are immediate, and colors serve rigorous semantic duties—distinguishing team presence, critical mentions, unread states, and active channel selections with zero visual ambiguity.

## Colors

The color palette is engineered to maintain crisp division between workspace chrome and interactive canvas data.

### Foundation & Chrome
- **Sidebar Background (`#3F0E40`)**: The definitive brand anchor. Houses channels, direct messages, and system switches.
- **Sidebar Active/Hover (`#350D36` / `#4A154B`)**: Subtly modulates interactive channel rows and workspace selector blocks.
- **Canvas Base (`#FFFFFF`)**: The primary reading surface for feeds, threads, and document cards.
- **Canvas Sub-surface (`#F8F8F8`)**: Used for code blocks, nested replies, pinned thread headers, and inactive inputs.
- **Border Neutral (`#DDDDDD`)**: Crisp structural division between sidebars, thread drawers, and input borders. A slightly lighter `#EEEEEE` separates individual message blocks on hover.

### Accents & Interactivity
- **Interactive Blue (`#1164A3`)**: The workhorse actionable tone. Applied to focused states, primary action buttons, active search tabs, and hyperlink texts.
- **Active Navigation Pill (`#1164A3` on dark chrome or `#4A154B` fallback)**: Indicates current channel or view with stark clarity.

### Semantic & Notification
- **Presence Emerald (`#2BAC76`)**: User online indicators, operational checkmarks, and active status indicators.
- **Notification Amber (`#ECB22E`)**: Starred items, muted mentions, and status highlights.
- **Alert Crimson (`#E01E5A`)**: Direct `@mention` badges, unread count pills, and critical destructive dialogs.

## Typography

The typography is optimized for dense scanning, programmatic text parsing, and rapid communication throughput. Geist is deployed across headlines, body copy, and UI controls for its geometric balance and neutral personality.

- **Headlines**: Compact vertical metrics prevent wasted canvas space when channels carry multi-line topic titles or header canvases.
- **Body (`body-md` / `body-lg`)**: Tuned to 14px–15px with relaxed line heights (20px–22px) ensuring dense streams of multi-author text remain effortless to parse during long sessions.
- **Code & Snippets**: Uses `JetBrains Mono` at 12px for inline key terms, markdown code fences, and bot outputs.
- **Labels & Badges**: Small caps and bold weight (`label-sm`, 11px/700) ensure counter badges remain legible within cramped navigation nodes.

## Layout & Spacing

This design system uses a strict 4px base increment model to support dense, modular productivity layouts.

### Structural Frame
- **Dock & Channel Rail**: A dual-rail layout. The extreme left icon dock spans a narrow fixed footprint (64px), while the primary aubergine channel tree spans a flexible `sidebar-width` (260px default, resizable between 200px and 340px).
- **Message Canvas**: A fluid central column with bounded line lengths (max 960px for message containers, expanding fluidly when full-width table or dashboard integrations are invoked).
- **Secondary Sliding Rail (Thread / Details)**: Opens as an anchored pane on the right edge at `thread-pane-width` (380px), pushing or overlaying content depending on viewport threshold.

### Responsive Breakpoints & Reflow
- **Desktop (>= 1200px)**: Icon rail + Channel tree + Central chat canvas + Thread pane all display simultaneously.
- **Laptop / Compact Desktop (900px - 1199px)**: Icon rail + Channel tree + Central canvas. Threads open as full-height layered sheets sliding over the canvas.
- **Tablet (600px - 899px)**: Sidebar collapses into an off-canvas drawer invoked via top-left breadcrumb.
- **Mobile (< 600px)**: Single viewport stack. Switching channels performs a horizontal screen transition. Input fields pin rigidly above virtual keyboards.

## Elevation & Depth

Visual depth is achieved through **low-contrast structural outlines and planar contrast**, deliberately avoiding dramatic or heavy drop-shadows that clutter high-density operational surfaces.

- **Level 0 (Flat Canvas)**: Canvas base (`#FFFFFF`) with 1px solid borders (`#DDDDDD`) dividing panes. Message rows sit flush with no borders until hover states activate.
- **Level 1 (Hover & Embedded Wells)**: Hovering message clusters introduces a faint neutral wash (`#F8F8F8`). Pinned panels, quoted blocks, and rich link attachments live inside a 1px border (`#DDDDDD`) with a subtle `rgba(0, 0, 0, 0.02)` fill.
- **Level 2 (Dropdowns, Popovers & Context Menus)**: Emoji pickers, quick-action floaters, and user profile cards cast a tight, crisp shadow: `0 2px 8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.08)`.
- **Level 3 (Modals & Command Center)**: Universal search dialogs and settings overlays use `0 8px 32px rgba(0, 0, 0, 0.16)` alongside a dark aubergine backdrop overlay (`rgba(37, 8, 38, 0.4)` with a `2px` backdrop blur).

## Shapes

The design system maintains a **Soft (Level 1)** geometric standard. This balance ensures UI density without clinical severity.

- **Base Radii (`0.25rem` / 4px)**: Checkboxes, inline code badges, channel list hover indicators, and form inputs.
- **Medium Radii (`0.375rem` / 6px)**: Message reaction pills, contextual toolbar menus, standard buttons, and popover shells.
- **Large Radii (`0.5rem` / 8px)**: Rich preview attachments, workspace configuration cards, and modal dialogs.
- **Full Pill (`9999px`)**: Reserved strictly for notification counters, channel search inputs, presence status dots, and active filter tags.

## Components

### Buttons
- **Primary**: Solid blue (`#1164A3`) fill with `#FFFFFF` text. Flat finish, crisp 1px active inset, 6px radius.
- **Aubergine Brand**: Used in channel settings or modal primary confirms (`#3F0E40` normal, `#350D36` hover).
- **Secondary / Ghost**: Transparent fill with a 1px `#DDDDDD` border. On dark sidebar chrome, secondary buttons use transparent white with hover `rgba(255, 255, 255, 0.1)`.
- **Icon Actions**: 28x28px squarish hit areas with 4px radii, displaying `#616061` icons that transition to `#1D1C1D` over `#F8F8F8` on hover.

### Chips & Reaction Badges
- **Emoji Reactions**: Subtle pills with `rgba(29, 28, 29, 0.08)` border, 12px height, 6px horizontal padding. Selected reactions switch to a blue-tinted fill (`#EBF5FA`) with a solid blue border (`#1164A3`) and blue counter text.
- **Channel Mentions**: Soft blue background (`#E8F5FA`), `#1164A3` text, 3px radius, 2px padding. Invert to active white on dark sidebar hover.

### Lists & Channel Rows
- **Channel Item**: 28px row height. Normal state displays `#BCABBC` muted text on sidebar chrome. Active state triggers an active channel highlight (`#1164A3` fill or high-contrast white text over `#4A154B`).
- **Unread Channels**: Bold weight text (`#FFFFFF`) with a solid 4px white dot aligned to the far-left margin.

### Checkboxes & Radio Buttons
- **Checkboxes**: 16x16px square, 3px border radius. Unchecked state is bordered with `#868686`. Checked state triggers `#1164A3` with a crisp white check icon.
- **Radio Buttons**: 16x16px circle. Checked displays an inner concentric 6px dot in `#1164A3`.

### Input Fields & Compose Box
- **Global Search**: Pill-shaped container mounted in top header chrome (`rgba(255, 255, 255, 0.2)` against dark, converting to solid white on focus with 1px `#1164A3` border).
- **Message Input Canvas**: Multi-line composite input. Clean white surface with a continuous 1px `#868686` border (focus transitions to `#1164A3` with an ambient `0 0 0 1px #1164A3` ring). Bottom toolbar houses rich-text formatting buttons and send actions.

### Cards & Code Blocks
- **Rich Message Attachments**: Left-bordered cards using a 3px solid vertical anchor stripe (`#DDDDDD` or custom integration color), `#F8F8F8` fill, and `#1D1C1D` body typography.
- **Code Fences**: Flat `#F8F8F8` background, 1px `#DDDDDD` border, 4px corner radius, monospaced typography with syntax-highlighted tokens.

### Presence & Badges
- **Status Indicator**: 9x9px circle. `#2BAC76` for active, hollow ring with 2px stroke for away. Positioned overlapping the bottom-right corner of user avatars.
- **Unread Badges**: Solid `#E01E5A` background with white text, 18px height, 9999px pill radius, minimum width 18px.