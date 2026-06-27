# Frontend Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin Studio Manager into a sidebar app-shell that fills the screen, with modular gallery-card browse pages and subtle CSS motion; and remove the two CSV export features.

**Architecture:** Replace the centered top-nav layout in `App.jsx` with a fixed left sidebar + fluid content region. Add reusable `Card`, `EntityCard`, and `Animate` components to `ui.jsx`. Convert Students/Batches/Tutors to card grids; enrich the Dashboard with live data panels. Motion is pure CSS (Tailwind keyframes) gated by the existing `prefers-reduced-motion` block. No new dependencies, no data-model changes.

**Tech Stack:** React 18, React Router 6, Vite 5, Tailwind 3. Backend: FastAPI (only touched to delete CSV routes).

## Global Constraints

- No new npm or Python dependencies.
- No backend data-model or API changes except deleting the two CSV routes.
- Currency rendered via existing `inr()` helper (₹).
- All animation must be neutralized by the existing `@media (prefers-reduced-motion: reduce)` block in `index.css` — use CSS `animation`/`transition`, nothing JS-timed.
- Reuse the existing `NAV` array and role-filtering logic in `App.jsx` unchanged.
- Palette tokens (canvas/paper/terracotta/clay/sage/ochre/ink/muted) and fonts (`font-display` Fraunces, `font-sans` Hanken Grotesk) already defined in `tailwind.config.js` — use them, don't add colors.

## Verification environment

The docker stack is up: backend on `http://localhost:8000`, db healthy. For live UI iteration run the Vite dev server (proxies `/api` → `:8000`):

```bash
cd "D:/test Project/frontend" && node_modules/.bin/vite --host
```

View at **http://localhost:5173**, login `admin@example.com` / `change-me`. The DB is seeded (10 students, 3 batches, 18 sessions, payments). `npm run build` is the compile gate for every frontend task.

---

### Task 1: Remove CSV exports

**Files:**
- Modify: `backend/app/routers/reports.py` (remove lines 70-106: `_csv_response`, `students_csv`, `payments_csv`; clean imports lines 1-2, 11-18)
- Modify: `frontend/src/pages/Reports.jsx:1-28` (remove `download` helper + `actions`)
- Modify: `CLAUDE.md` (the `/reports` route line)

**Interfaces:**
- Produces: nothing consumed downstream. `GET /reports/students.csv` and `GET /reports/payments.csv` cease to exist (404).

- [ ] **Step 1: Verify the routes currently exist (baseline)**

Run:
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login -d "username=admin@example.com&password=change-me" | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8000/reports/students.csv
```
Expected: `200`

- [ ] **Step 2: Edit `backend/app/routers/reports.py`**

Remove the `_csv_response` helper and both `.csv` route functions (current lines 70-106). Fix imports — top of file becomes:
```python
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_staff
from ..models import (
    Attendance,
    FeeInvoice,
    Payment,
    Session as ClassSession,
    Tutor,
)
```
(Removed: `import csv`, `import io`, `from fastapi.responses import StreamingResponse`, and `Student` from the models import. `Payment` stays — used by `fee_collection`.) Leave `attendance_summary`, `fee_collection`, `tutor_sessions` untouched.

- [ ] **Step 3: Restart backend so the route change takes effect**

Run:
```bash
cd "D:/test Project" && docker compose restart backend
```
Wait ~5s for uvicorn to come back.

- [ ] **Step 4: Verify the CSV routes are gone**

Run:
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login -d "username=admin@example.com&password=change-me" | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -o /dev/null -w "students.csv=%{http_code} " -H "Authorization: Bearer $TOKEN" http://localhost:8000/reports/students.csv
curl -s -o /dev/null -w "payments.csv=%{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8000/reports/payments.csv
curl -s -o /dev/null -w "fee-collection=%{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8000/reports/fee-collection
```
Expected: `students.csv=404 payments.csv=404` and `fee-collection=200` (untouched routes still work).

- [ ] **Step 5: Edit `frontend/src/pages/Reports.jsx`**

Remove the `download` helper (lines 4-13) and the `actions` prop with its two buttons. The `import { api } ...` line stays (still used by the `useApi` calls). New top + `Page` open:
```jsx
import { api } from "../api";
import { Page, Table, inr, useApi } from "../ui";

export default function Reports() {
  const attendance = useApi(() => api.get("/reports/attendance-summary"));
  const fees = useApi(() => api.get("/reports/fee-collection"));
  const tutors = useApi(() => api.get("/reports/tutor-sessions"));

  return (
    <Page title="Reports">
```
(Everything from `<div className="grid gap-4 md:grid-cols-2">` down stays as-is.)

- [ ] **Step 6: Update `CLAUDE.md`**

Find the `/reports` line under "API routes" and change:
```
- `/reports` — `attendance-summary`, `fee-collection`, `tutor-sessions` (counts + private earnings/payouts), `students.csv`, `payments.csv`.
```
to:
```
- `/reports` — `attendance-summary`, `fee-collection`, `tutor-sessions` (counts + private earnings/payouts).
```

- [ ] **Step 7: Build the frontend to confirm it compiles**

Run: `cd "D:/test Project/frontend" && npm run build`
Expected: build succeeds, no errors about `download` or unused imports.

- [ ] **Step 8: Commit**

```bash
cd "D:/test Project"
git add backend/app/routers/reports.py frontend/src/pages/Reports.jsx CLAUDE.md
git commit -m "Remove students.csv and payments.csv exports"
```

---

### Task 2: Animation utilities + table zebra (CSS foundation)

**Files:**
- Modify: `frontend/tailwind.config.js` (add `keyframes` + `animation` to `theme.extend`)
- Modify: `frontend/src/index.css` (zebra rows on `.td`/table, optional sidebar accent helper)

**Interfaces:**
- Produces: Tailwind utilities `animate-fade-rise` and `animate-fade-in` usable by any component (Tasks 3-7).

- [ ] **Step 1: Add keyframes to `frontend/tailwind.config.js`**

Inside `theme.extend`, after `fontFamily`, add:
```js
      keyframes: {
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 0.18s ease-out both",
        "fade-in": "fade-in 0.18s ease-out both",
      },
```

- [ ] **Step 2: Add zebra striping in `frontend/src/index.css`**

In the `@layer components` block, update the `.td` rule's row context by adding a zebra rule. Add after the `.td` rule:
```css
  /* zebra rows for data tables */
  tbody tr:nth-child(even) {
    @apply bg-canvas/30;
  }
```

- [ ] **Step 3: Verify the build compiles with new utilities**

Add a throwaway usage to confirm Tailwind emits the class: run `cd "D:/test Project/frontend" && npm run build` and confirm success. (The animation classes are referenced by later tasks; build now confirms config is valid.)
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "D:/test Project"
git add frontend/tailwind.config.js frontend/src/index.css
git commit -m "Add fade-rise/fade-in animation utilities and table zebra"
```

---

### Task 3: Shared components — Card, EntityCard, Animate, Stagger

**Files:**
- Modify: `frontend/src/ui.jsx` (add four exports; keep existing `inr`, `useApi`, `Page`, `Table`)

**Interfaces:**
- Consumes: `animate-fade-rise` from Task 2; existing `.card` class.
- Produces:
  - `Card({ hover, className, children })` → styled surface; `hover` adds lift.
  - `EntityCard({ to, title, initial, lines, badge })` → gallery tile. `lines` is an array of strings; `initial` a single char; `badge` optional node; `to` optional route (wraps in `Link`).
  - `Animate({ delay, className, children })` → applies `animate-fade-rise` with optional `animationDelay`.
  - `Stagger({ children, step, className })` → wraps each child in an `Animate` with incrementing delay (`step` ms, default 40).

- [ ] **Step 1: Add the components to `frontend/src/ui.jsx`**

Add at the top: `import { Link } from "react-router-dom";` (alongside existing imports). Append these exports:
```jsx
export function Card({ hover = false, className = "", children }) {
  return (
    <div className={`card ${hover ? "transition hover:-translate-y-0.5 hover:shadow-md" : ""} ${className}`}>
      {children}
    </div>
  );
}

// Gallery tile for browse pages. initial = avatar letter, lines = fact strings.
export function EntityCard({ to, title, initial, lines = [], badge }) {
  const inner = (
    <Card hover={!!to} className="flex h-full gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-terracotta/15 font-display text-lg font-semibold text-clay" aria-hidden="true">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="truncate font-medium text-ink">{title}</div>
          {badge}
        </div>
        {lines.map((l, i) => (
          <div key={i} className="truncate text-sm text-muted">{l}</div>
        ))}
      </div>
    </Card>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

export function Animate({ delay = 0, className = "", children }) {
  return (
    <div className={`animate-fade-rise ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

// Wraps each child with an incrementing mount delay for a staggered grid.
export function Stagger({ children, step = 40, className = "" }) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <Animate delay={i * step}>{child}</Animate>
      ))}
    </div>
  );
}
```
Add `import React from "react";` at the top (needed for `React.Children`).

- [ ] **Step 2: Build to confirm the module compiles**

Run: `cd "D:/test Project/frontend" && npm run build`
Expected: build succeeds (components unused so far — that's fine; this confirms syntax).

- [ ] **Step 3: Commit**

```bash
cd "D:/test Project"
git add frontend/src/ui.jsx
git commit -m "Add Card, EntityCard, Animate, Stagger UI components"
```

---

### Task 4: Sidebar app-shell layout

**Files:**
- Modify: `frontend/src/App.jsx` (rewrite `Pigment`/`Layout`; keep `NAV`, `Guard`, routes unchanged)

**Interfaces:**
- Consumes: existing `NAV`, `useAuth`, React Router `NavLink`/`Link`.
- Produces: full-screen flex shell — sidebar (`w-60`) + fluid `<main>`. Mobile drawer toggled by local `useState`.

- [ ] **Step 1: Rewrite the `Layout` component in `frontend/src/App.jsx`**

Add `useState` to the React import: `import { useState } from "react";` at top. Replace the `Layout` function with:
```jsx
function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => n.roles.includes(user.role));

  const nav = (
    <nav className="flex flex-col gap-1 text-sm">
      {items.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === "/"}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `rounded-md px-3 py-2 font-medium transition-colors ${isActive ? "bg-terracotta text-paper" : "text-muted hover:bg-ink/5 hover:text-ink"}`
          }
        >
          {n.label}
        </NavLink>
      ))}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full w-60 flex-col border-r border-ink/10 bg-paper">
      <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-5 py-4">
        <Pigment />
        <span className="font-display text-xl font-semibold tracking-tight text-clay">Studio Manager</span>
      </Link>
      <div className="flex-1 overflow-y-auto px-3">{nav}</div>
      <div className="border-t border-ink/10 px-4 py-3 text-sm">
        <div className="mb-2 truncate text-muted">{user.email}</div>
        <button className="btn-ghost w-full" onClick={() => { logout(); navigate("/login"); }}>Logout</button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen md:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-20 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur md:hidden">
          <button className="btn-ghost px-2 py-1" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <span className="font-display text-lg font-semibold text-clay">Studio Manager</span>
        </header>
        <main className="mx-auto w-full max-w-screen-2xl flex-1 px-6 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm `Pigment` still exists above `Layout`**

`Pigment` is referenced by the new sidebar — it is already defined in the file (lines ~34-42). No change needed. Verify it is still present.

- [ ] **Step 3: Build to confirm compile**

Run: `cd "D:/test Project/frontend" && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual check in dev server**

Start `node_modules/.bin/vite --host` (if not running), open http://localhost:5173, login. Confirm:
- Desktop: left sidebar visible, nav links work + highlight active, content fills the width to the right, logout works.
- Narrow the window < 768px: sidebar hides, ☰ appears, tapping it slides the drawer in; tapping a link or the backdrop closes it.

- [ ] **Step 5: Commit**

```bash
cd "D:/test Project"
git add frontend/src/App.jsx
git commit -m "Replace top-nav with sidebar app-shell layout"
```

---

### Task 5: Dashboard modular panels

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `Card`, `Animate` from Task 3; existing `useApi`, `inr`, `Page`; API routes `/sessions`, `/payments`.
- Produces: richer staff + parent dashboards. No new exports.

- [ ] **Step 1: Add an `today` helper and two panel components to `frontend/src/pages/Dashboard.jsx`**

Update imports:
```jsx
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Page, Card, Animate, inr, useApi } from "../ui";
```
Add below `Stat`:
```jsx
const todayISO = () => new Date().toISOString().slice(0, 10);

function Panel({ title, link, children }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {link && <Link className="text-sm text-terracotta hover:underline" to={link}>View all</Link>}
      </div>
      {children}
    </Card>
  );
}

function UpcomingSessions() {
  const sessions = useApi(() => api.get(`/sessions?date_from=${todayISO()}`));
  const rows = (sessions.data || []).slice(0, 5);
  return (
    <Panel title="Upcoming sessions" link="/sessions">
      {rows.length ? (
        <ul className="divide-y divide-ink/5 text-sm">
          {rows.map((s) => (
            <li key={s.id} className="flex justify-between py-2">
              <Link className="hover:underline" to={`/sessions/${s.id}`}>{s.date}</Link>
              <span className="capitalize text-muted">{s.session_type}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">No upcoming sessions.</p>}
    </Panel>
  );
}

function RecentPayments() {
  const payments = useApi(() => api.get("/payments"));
  const rows = (payments.data || []).slice(0, 5);
  return (
    <Panel title="Recent payments" link="/payments">
      {rows.length ? (
        <ul className="divide-y divide-ink/5 text-sm">
          {rows.map((p) => (
            <li key={p.id} className="flex justify-between py-2">
              <span className="text-muted capitalize">{p.method}</span>
              <span className="font-medium">{inr(p.amount)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">No payments yet.</p>}
    </Panel>
  );
}
```

- [ ] **Step 2: Replace `StaffDashboard`'s return with stat row + panels**

```jsx
function StaffDashboard() {
  const students = useApi(() => api.get("/students"));
  const batches = useApi(() => api.get("/batches"));
  const fees = useApi(() => api.get("/reports/fee-collection"));

  return (
    <Page title="Dashboard">
      <Animate>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Students" value={students.data?.length ?? "…"} accent="bg-terracotta" />
          <Stat label="Batches" value={batches.data?.length ?? "…"} accent="bg-sage" />
          <Stat label="Collected" value={fees.data ? inr(fees.data.payments_total) : "…"} accent="bg-ochre" />
          <Stat label="Outstanding" value={fees.data ? inr(fees.data.outstanding) : "…"} accent="bg-clay" />
        </div>
      </Animate>
      <Animate delay={60} className="mt-6 grid gap-4 lg:grid-cols-2">
        <UpcomingSessions />
        <RecentPayments />
      </Animate>
    </Page>
  );
}
```

- [ ] **Step 3: Give the parent dashboard the same panel treatment**

Replace the parent branch return with:
```jsx
  if (user.role === "parent") {
    return (
      <Page title="Welcome">
        <Animate className="grid gap-4 lg:grid-cols-2">
          <UpcomingSessions />
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Your fees</h2>
            <div className="flex gap-2">
              <Link className="btn" to="/my-sessions">My Sessions</Link>
              <Link className="btn-ghost" to="/my-fees">My Fees</Link>
            </div>
          </Card>
        </Animate>
      </Page>
    );
  }
```
(Parent's `/sessions` is parent-scoped server-side via `_visible_student_ids`, so `UpcomingSessions` is safe to reuse.)

- [ ] **Step 4: Build + manual check**

Run: `cd "D:/test Project/frontend" && npm run build` → succeeds.
In dev server, login as admin: Dashboard shows the 4 stat cards in a full-width row, then two panels (upcoming sessions, recent payments) populated from seeded data, fading in on load.

- [ ] **Step 5: Commit**

```bash
cd "D:/test Project"
git add frontend/src/pages/Dashboard.jsx
git commit -m "Make Dashboard modular with live session/payment panels"
```

---

### Task 6: Browse card grids — Students, Batches, Tutors

**Files:**
- Modify: `frontend/src/pages/Students.jsx`
- Modify: `frontend/src/pages/Batches.jsx`
- Modify: `frontend/src/pages/Tutors.jsx`

**Interfaces:**
- Consumes: `EntityCard`, `Stagger` from Task 3.
- Produces: grid views replacing the `Table` on these three pages. Create/search/action controls unchanged.

- [ ] **Step 1: Read the current Batches and Tutors pages**

Run: open `frontend/src/pages/Batches.jsx` and `frontend/src/pages/Tutors.jsx` to confirm the exact data fields each list returns (batch: `name`, `weekly_days`, `start_time`, `student_count`, `default_tutor_id`; tutor: `name`, `is_guest`, `default_rate`, `is_active`). Match field names exactly.

- [ ] **Step 2: Convert Students list to a card grid**

In `frontend/src/pages/Students.jsx`, change the import from `Table` to the new components:
```jsx
import { Page, EntityCard, Stagger, useApi } from "../ui";
```
Replace the `<Table ... />` block with:
```jsx
      {list.error && <div className="mb-3 text-sm text-red-700">{list.error}</div>}
      {(list.data || []).length ? (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(list.data || []).map((s) => (
            <EntityCard
              key={s.id}
              to={`/students/${s.id}`}
              initial={(s.name || "?").charAt(0).toUpperCase()}
              title={s.name}
              lines={[s.guardian_name || "—", s.guardian_phone || "—"]}
            />
          ))}
        </Stagger>
      ) : (
        <div className="card text-sm text-muted">No students yet.</div>
      )}
```

- [ ] **Step 3: Convert Tutors list to a card grid**

In `frontend/src/pages/Tutors.jsx`, swap to `EntityCard`/`Stagger` and render each tutor:
```jsx
<EntityCard
  key={t.id}
  initial={(t.name || "?").charAt(0).toUpperCase()}
  title={t.name}
  lines={[t.default_rate ? `Rate ${inr(t.default_rate)}` : "No default rate"]}
  badge={t.is_guest ? <span className="rounded-full bg-ochre/20 px-2 py-0.5 text-xs text-clay">Guest</span> : null}
/>
```
inside a `<Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">`. Keep existing create/deactivate actions and any per-row buttons — if deactivate was a row action, place it in the card via a footer line or keep it accessible (preserve the existing handler; render a small `btn-ghost` below `lines` if needed). Import `inr` from `../ui`.

- [ ] **Step 4: Convert Batches list to a card grid**

In `frontend/src/pages/Batches.jsx`, render each batch:
```jsx
<EntityCard
  key={b.id}
  initial={(b.name || "?").charAt(0).toUpperCase()}
  title={b.name}
  lines={[
    b.weekly_days ? `Days: ${b.weekly_days}` : "No schedule",
    `${b.student_count ?? 0} students`,
  ]}
/>
```
inside a `<Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">`. Preserve the existing "create" and "generate sessions" controls/actions exactly — only the list rendering changes from table to grid. If a batch row had action buttons (generate/delete/view students), keep them working: render them as a small button row inside the card (reuse the existing handlers).

- [ ] **Step 5: Build + manual check**

Run: `cd "D:/test Project/frontend" && npm run build` → succeeds.
In dev server: Students shows a 4-column card grid of the 10 seeded students with avatar initials, staggering in; Batches shows 3 cards with schedule + student counts; Tutors shows 3 cards with the guest badge on Faisal Khan. Create forms and actions still function.

- [ ] **Step 6: Commit**

```bash
cd "D:/test Project"
git add frontend/src/pages/Students.jsx frontend/src/pages/Batches.jsx frontend/src/pages/Tutors.jsx
git commit -m "Convert Students/Batches/Tutors to gallery card grids"
```

---

### Task 7: Page-level motion on remaining pages + final verification

**Files:**
- Modify: `frontend/src/ui.jsx` (`Page` wraps its children in fade-rise)

**Interfaces:**
- Consumes: `animate-fade-rise` (Task 2).
- Produces: every page that uses `Page` gets a subtle mount fade — covers Sessions, Payments, Fees, Reports, Users, detail pages with one change.

- [ ] **Step 1: Add mount animation to the `Page` component**

In `frontend/src/ui.jsx`, change the `Page` wrapper's root `<div>`:
```jsx
export function Page({ title, actions, children }) {
  return (
    <div className="animate-fade-rise">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <div className="flex gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}
```
(Dashboard already wraps inner sections in `Animate`; the double fade is harmless and brief. If it feels like too much, drop the inner `Animate` from Dashboard — optional.)

- [ ] **Step 2: Build**

Run: `cd "D:/test Project/frontend" && npm run build`
Expected: succeeds.

- [ ] **Step 3: Full manual smoke across roles**

In the dev server, verify each as admin: Dashboard, Students (grid), Batches (grid), Tutors (grid), Sessions (table + zebra), Payments (table), Fees, Reports (no CSV buttons), Users. Each page fades in; sidebar persists; content fills width. Then test the reduced-motion path: enable "Reduce motion" in OS/browser settings and reload — pages appear instantly with no animation (the existing media block handles this).

- [ ] **Step 4: Verify reduced-motion in the build**

Confirm `index.css` still contains the `@media (prefers-reduced-motion: reduce)` block zeroing `animation-duration` (it predates this work — just confirm it wasn't removed).

- [ ] **Step 5: Commit**

```bash
cd "D:/test Project"
git add frontend/src/ui.jsx
git commit -m "Add subtle mount animation to all pages via Page wrapper"
```

- [ ] **Step 6: Rebuild the docker frontend image to ship the revamp**

Run:
```bash
cd "D:/test Project" && docker compose up -d --build frontend
```
Then open http://localhost:8080, login, and confirm the production build matches the dev experience.

---

## Self-Review notes

- **Spec coverage:** App-shell (Task 4), modular Dashboard (Task 5), card grids (Task 6), CSS motion (Tasks 2,3,7), zebra/less-flat tables (Task 2), CSV removal (Task 1), CLAUDE.md update (Task 1). All §1-§5 spec items mapped.
- **No new deps:** confirmed — Tailwind keyframes + React only.
- **Type consistency:** `EntityCard`/`Stagger`/`Animate`/`Card` signatures defined in Task 3 are used verbatim in Tasks 5-7.
- **Known soft spot:** Tasks 6 steps 3-4 say "preserve existing actions" without quoting them because Batches.jsx/Tutors.jsx weren't read at plan time — Step 1 of Task 6 mandates reading them first so the implementer matches the real handlers. This is deliberate, not a placeholder.
