# Dark Mode — Design

**Date:** 2026-06-27
**Scope:** App-wide dark mode via a CSS-variable palette swap; warm-charcoal theme; sidebar toggle persisted in localStorage. Frontend only.

## Approach
The app uses only semantic palette tokens (`canvas/paper/ink/muted/terracotta/clay/sage/ochre`), so convert those tokens to CSS variables and swap their values under a `.dark` class — every component flips with no markup changes.

## Changes

### `tailwind.config.js`
- `darkMode: "class"`.
- Each palette color → `rgb(var(--<name>) / <alpha-value>)` (keeps opacity modifiers like `bg-canvas/40` working).

### `index.css`
- `:root` light values (current hex, as space-separated RGB channels); `.dark` warm-charcoal values:
  | token | light (RGB) | dark (RGB) |
  |---|---|---|
  | canvas | 243 236 223 | 29 25 22 |
  | paper | 255 253 248 | 39 34 31 |
  | terracotta | 189 91 61 | 205 107 75 |
  | clay | 143 63 40 | 217 138 106 |
  | sage | 126 139 104 | 150 165 124 |
  | ochre | 217 160 78 | 224 168 90 |
  | ink | 43 37 33 | 236 227 214 |
  | muted | 111 101 87 | 165 150 132 |
  (Dark values are tunable after eyeballing.)
- `.invoice-sheet { ...all 8 tokens pinned to light values... }` — the printable invoice stays dark-on-white on screen and in print, regardless of theme.
- Existing `@media print` / reduced-motion blocks unchanged.

### Decouple white-on-accent text from `paper`
Replace `text-paper` → `text-white` in the 5 on-accent spots so they stay light in dark mode:
- `index.css` `.btn`; `App.jsx` active nav pill; `SessionDetail.jsx` STATUS_STYLE (present/absent); `TutorSessionDetail.jsx` STATUS_STYLE (present/absent).

### Theme init (`main.jsx`)
Before render: `const dark = localStorage.theme ? localStorage.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; document.documentElement.classList.toggle("dark", dark);` (follows OS first visit, then remembers; login screen honors it too).

### Toggle (`components/ThemeToggle.jsx`, new)
Sun/moon `btn-ghost` button; toggles the `dark` class on `<html>` and writes `localStorage.theme`. Mounted in the sidebar footer next to the gear + Logout (all roles).

## Verification
- `npm run build`. Manual: toggle flips the entire app (sidebar/cards/tables/dashboard); choice persists across reload; the invoice stays readable on screen and prints dark-on-white in dark mode; red "absent"/error stays red; no light flash on load.

## Non-goals
- No per-component `dark:` variants, no theme beyond light/dark, no backend, no new deps.

## Files
- `frontend/tailwind.config.js`, `frontend/src/index.css`, `frontend/src/main.jsx`, `frontend/src/App.jsx`, `frontend/src/pages/SessionDetail.jsx`, `frontend/src/pages/TutorSessionDetail.jsx`, new `frontend/src/components/ThemeToggle.jsx`.
