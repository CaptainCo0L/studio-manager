# Leaner Attendance Marking — Design

**Date:** 2026-06-27
**Scope:** Make marking a session roster faster and clearer. Default to present, add bulk mark-all + live counts, colour-code statuses, and warn on unsaved changes.

## Problem
Today (`SessionDetail.jsx` + `attendance.py` roster) every student defaults to **absent**, so the common case (most attend) costs a tap per student. Four identical neutral buttons per row are visually busy, there's no bulk action, no running count, and no unsaved-changes safety.

## Changes

### Backend (`backend/app/routers/attendance.py`)
- In `roster()`, change the auto-seed status for unmarked enrolled students from `"absent"` to **`"present"`** (one word). Private/drop-in already auto-mark present. Everything else (upsert in `mark_bulk`, parent scoping) is unchanged.

### Frontend (`frontend/src/pages/SessionDetail.jsx`)
Rework the Roster section:
- **Bulk controls** above the list: `Mark all present` / `Mark all absent` buttons.
- **Live counts** summary: `Present X · Absent Y · Late Z · Excused W`, recomputed from roster state.
- **Per-row status buttons** colour-coded to match the attendance calendar so state reads at a glance:
  - present → `bg-sage text-paper`, absent → `bg-red-500 text-paper`, late → `bg-ochre text-ink`, excused → `bg-ink/40 text-paper`; inactive = outline (`border border-ink/20`).
- **Unsaved-changes guard:** track a `dirty` flag (set on any status change / mark-all, cleared on load and after save). Show a `Unsaved changes` hint next to Save while dirty; the existing "Attendance saved." message stays on save.
- Keep the four statuses available (late/excused are real, just not the default). Keep the private-lesson payment form unchanged.

## Verification
- **Smoke (`backend/test_smoke.py`)**: add — `GET /attendance/roster/{session}` for a batch session with an enrolled, unmarked student returns that student defaulted to `present`.
- **Frontend**: `npm run build`; manual — open a batch session: everyone shows present by default, `Mark all absent` flips them, counts update live, colours match the calendar, editing shows "Unsaved changes", Save persists and the student calendar reflects it.

## Non-goals
- No autosave, no new control widgets beyond buttons, no per-session lock (tracked separately in `future-upgrades.md`). No new deps.

## Files
- `backend/app/routers/attendance.py` (seed present), `backend/test_smoke.py` (assert).
- `frontend/src/pages/SessionDetail.jsx` (roster rework).
