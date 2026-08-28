# Repository Guidelines

## Project Structure & Architecture

This is a Manifest V3 Chrome extension built with Vite and strict TypeScript. Keep extension contexts separate:

- `src/sidepanel/` contains the React UI. Add a tool in `tools/`, its styles beside it, and register it in `App.tsx`.
- `src/content/` holds scripts and CSS injected into web pages.
- `src/service-worker.ts` owns background behavior such as context menus, tabs, and runtime messaging.
- `src/shared/` contains cross-context storage, clipboard, and message helpers.
- `public/manifest.json` defines extension permissions and entry points.
- `e2e/` contains Playwright specs and browser fixtures. Build output belongs in `dist/`; do not edit it.

## Build, Test, and Development Commands

Use Node 20 (the CI version) and install dependencies with `npm ci` for a clean checkout or `make install` locally.

- `make dev` — continuously rebuilds the unpacked extension into `dist/`.
- `make lint` — runs the strict TypeScript check (`tsc --noEmit`).
- `make build` — typechecks and builds `dist/`, including the manifest and content CSS.
- `make test-e2e` — runs headless Playwright; use `make test-e2e-headed` for debugging.
- `make verify` — runs lint, build, and packages the installable ZIP. `make zip` creates `hckr-tools-browser-extension.zip`.

Load `dist/` through `chrome://extensions` in Developer mode after a build.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, single quotes, and the existing React functional-component style. TypeScript is strict: do not introduce unused locals or parameters. Use PascalCase for components and their files (`JsonFormatter.tsx`), camelCase for functions and values, and kebab-case for tool IDs and CSS classes (for example, `json-formatter`). Keep component CSS adjacent to its tool; reserve `sidepanel/styles/` for shared theme rules. Use the configured aliases (`@shared`, `@tools`, `@components`) where they improve clarity.

## Testing Guidelines

Add or update an E2E case whenever a user-visible tool, content-script, service-worker, navigation, or storage behavior changes. Name specs `*.spec.ts`, group related behavior with `test.describe`, and write behavior-focused test names. Prefer stable roles, labels, and existing CSS selectors. Run `make lint && make build && make test-e2e` before requesting review; CI also validates the packaged extension artifacts.

## Commits & Pull Requests

Recent history uses concise imperative subjects, commonly Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, and `ci:`. Keep each commit focused. PRs should explain the user-facing change, list validation commands, link the relevant issue when available, and include screenshots or a short recording for sidepanel/widget changes. Call out manifest permission changes and any privacy or storage impact explicitly.
