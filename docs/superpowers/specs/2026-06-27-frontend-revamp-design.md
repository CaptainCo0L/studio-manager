# Frontend Revamp — Sidebar App-Shell + Modular Pages

**Date:** 2026-06-27
**Scope:** Visual/layout revamp of the existing Studio Manager frontend. No new features, no backend changes, no new dependencies.

## Problem

The current UI already has the warm art-studio identity (canvas/terracotta/sage/ochre palette, Fraunces display font, card surfaces, hover transitions, `prefers-reduced-motion` support — shipped in commit `fff5437`). The remaining complaints:

1. **Doesn't fill the screen.** Everything is locked in a centered `max-w-6xl` column (`App.jsx:90`), leaving large empty side margins on wide displays.
2. **Top-clustered / sparse.** Light pages (Dashboard) stack a few items at the top with dead space below.
3. **Too table-heavy / flat.** Browse entities are plain tables.
4. **Not enough motion.** Only hover color changes.

## Decisions (from brainstorming)

- Layout: **Sidebar app-shell** (left nav + fluid full-width content).
- Motion: **CSS-only** (Tailwind keyframes + a tiny mount hook). No Framer Motion.
- Browse pages (Students/Batches/Tutors): **gallery card-grid** as default view.
- Transactional pages (Sessions, Payments, Fees, Reports): **stay tables** — columns matter there.

## Design

### 1. App shell (`App.jsx`)

Replace top-nav + centered `<main>` with a two-region flex shell:

- **Sidebar** — fixed, full-height, `w-60`, `bg-paper`, right border + thin vertical pigment accent on its edge.
  - Top: `Pigment` mark + "Studio Manager" wordmark.
  - Middle: role-filtered nav (reuse existing `NAV` array unchanged). Active link = terracotta fill (current style), others = muted with hover.
  - Bottom (pinned): user email + Logout button.
- **Content region** — `flex-1`, fluid, `px-8 py-8`, capped at `max-w-screen-2xl` (mx-auto) so 4K doesn't stretch lines absurdly. This removes the empty side margins.
- **Mobile (`<md`)** — sidebar becomes a slide-in drawer behind a hamburger button in a slim top bar; content is full-width. Drawer state held in `Layout` via `useState`; closes on nav click and on backdrop tap. Keeps responsiveness.
- The horizontal `pigment-band` moves to the sidebar edge as a vertical strip (or is kept as a thin top accent on the content region — implementer's pick, keep the signature visible).

### 2. Shared components

- **`Card`** (in `ui.jsx`) — formalize the existing `.card` as a component with an optional `hover` prop that adds lift (`hover:-translate-y-0.5 hover:shadow-md transition`). Used by entity cards and dashboard panels.
- **`EntityCard`** (in `ui.jsx`) — gallery tile: initial-avatar chip (first letter, palette-tinted bg), title, 1–2 fact lines, optional footer link. Wraps in a `Link` when given a `to`.
- **`Animate`** (in `ui.jsx`) — wrapper applying a `fade-rise` mount animation via a CSS class; respects reduced-motion automatically (the global media block already neutralizes animation-duration). For staggered grids, accept an optional `delay` (inline `animationDelay`) applied per child, or expose a `Stagger` helper that maps children with incremental delays.

### 3. CSS (`index.css` + `tailwind.config.js`)

- Add keyframes `fade-rise` (opacity 0→1, translateY 8px→0, ~180ms ease-out) and `fade-in`. Register as Tailwind `animation` utilities (`animate-fade-rise`).
- Tables: add subtle zebra (`even:bg-canvas/30`) and keep existing header/hover. Strengthen header contrast slightly.
- Existing `@media (prefers-reduced-motion)` block already zeroes animation/transition durations — covers the new keyframes. No extra work.

### 4. Pages

- **Dashboard (`Dashboard.jsx`)**
  - Staff: keep 4 stat cards (now full-width row) **+ two modular panels below**:
    - *Upcoming sessions* — `GET /sessions?date_from=<today>` (cap to ~5), each row links to `/sessions/:id`.
    - *Recent payments* — `GET /payments` (cap to ~5), show amount (`inr`) + method + date.
  - Parent: same modular treatment over their own data (`/sessions`, `/fees/invoices` or existing parent routes) instead of a bare paragraph.
  - Wrap panels in `Animate`.
- **Students (`Students.jsx`)** — replace `Table` with `EntityCard` grid (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`). Card: initial avatar, name, guardian name + phone, "Open" → `/students/:id`. Keep search + create form as-is. Staggered mount.
- **Batches (`Batches.jsx`)** — `EntityCard` grid. Card: name, weekly-day summary + time, student_count badge, default tutor. Keep create/generate actions.
- **Tutors (`Tutors.jsx`)** — `EntityCard` grid. Card: name, guest/account badge, default rate. Keep actions.
- **Sessions / Payments / Fees / Reports / Users / detail pages** — keep table layouts; benefit from the new shell width, zebra rows, and a page-level `Animate` wrapper. No structural change.

## Non-goals

- No e-commerce / portfolio / gallery-store / AR / blog / newsletter features (those belong to a public site, not this admin tool).
- No new npm dependencies.
- No backend or API changes.
- No data-model changes.

## Files touched (estimate ~6–8)

- `frontend/src/App.jsx` — shell rewrite.
- `frontend/src/ui.jsx` — `Card`, `EntityCard`, `Animate`/`Stagger`.
- `frontend/src/index.css` — keyframes, zebra, sidebar accent.
- `frontend/tailwind.config.js` — animation utilities.
- `frontend/src/pages/Dashboard.jsx` — modular panels.
- `frontend/src/pages/Students.jsx`, `Batches.jsx`, `Tutors.jsx` — card grids.

## Verification

- `npm run build` compiles (also satisfies the long-standing TODO #6 — frontend was never build-verified).
- Manual: load each role (admin/staff/parent), confirm nav filtering, sidebar drawer on mobile width, card grids render, dashboard panels fetch, reduced-motion disables animation.
