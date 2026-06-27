# Attendance Calendar: Check/✗ Marks + Scheduled-as-Cell — Design

**Date:** 2026-06-27
**Scope:** Replace the hard-to-read colored dots in the StudentDetail attendance calendar with check/✗ marks (+ words), and show "scheduled" as a tinted day cell. Frontend only (`StudentDetail.jsx`).

## Problem
Five states encoded as ~10px colored dots are hard to distinguish (green/amber/grey blur) and rely on colour alone.

## Encoding (decided)
- **Scheduled** (session, not yet marked) → no marker; the **day cell** gets a faint ochre tint (`bg-ochre/15` + `border-ochre/40`).
- **Present** → `✓` green (`text-sage`)
- **Late** → `✓ Late` amber (`text-ochre`)
- **Absent** → `✗` red (`text-red-600`)
- **Excused** → `✗ Excused` grey (`text-ink/40`)
- Marks/words are **bigger** (icon ~`text-lg`, word `text-xs`) and the **day cells grow** (`min-h-[4.5rem]`) to fit them.
- Each mark stays a `Link` to its session (tooltip `type — status`).

## Implementation (`frontend/src/pages/StudentDetail.jsx`)
- Replace the `DOT` map with `MARK = { present:{icon:"✓",word:"",cls:"text-sage"}, late:{icon:"✓",word:"Late",cls:"text-ochre"}, absent:{icon:"✗",word:"",cls:"text-red-600"}, excused:{icon:"✗",word:"Excused",cls:"text-ink/40"} }`.
- Replace the `Legend` dot component with a `Marker({ status })` that renders `<icon> [word]` in the status colour.
- In each day cell: split that day's items into `scheduled = items.some(it => !it.status)` and `marked = items.filter(it => it.status)`.
  - Cell class: tinted when `scheduled`, else neutral border; empty cells transparent.
  - Render a wrapped, centered row of `<Link><Marker/></Link>` for each `marked` item. A day with both scheduled and marked sessions shows the tint **and** the marks.
- Update the legend to: `✓ Present` (green), `✓ Late` (amber), `✗ Absent` (red), `✗ Excused` (grey), and a tinted swatch = Scheduled.

## Verification
- `npm run build`. Manual (seeded student): present days show a green ✓, the private "present" session shows ✓, upcoming batch days show as **tinted cells** (no marker), mark a session late/absent/excused on the roster and confirm `✓ Late` / `✗` / `✗ Excused` render bigger and legibly; clicking a mark opens the session.

## Non-goals
- No backend change, no new statuses, no deps. Calendar month-nav and bucketing unchanged.

## Files
- `frontend/src/pages/StudentDetail.jsx`.
