# Dedicated Attendance page — Design

**Date:** 2026-06-28

A review grid (students × session-dates of a batch in a month) becomes the **only** place attendance is marked. Roster marking is removed from the session detail pages.

## Backend (`routers/attendance.py`)

- **`GET /attendance/batches`** → `[{id, name}]`, role-scoped:
  - admin/staff: all active batches.
  - tutor: only batches they have ≥1 session in (`distinct session.batch_id where tutor_id = _visible_tutor_id`). Needed because `/batches` is staff-only.
- **`GET /attendance/grid?batch_id={id}&month=YYYY-MM`** →
  - `students`: active enrolled students of the batch `[{id, name}]` (rows).
  - `sessions`: that batch's sessions within the month, date-ordered `[{id, date}]` (columns). **For tutors, filtered to their own sessions** (`tutor_id = _visible_tutor_id`).
  - `marks`: existing attendance for those sessions `[{student_id, session_id, status}]`; unmarked pairs are simply absent.
  - 400 on a malformed `month`. Staff/tutor only (parents 403).
- **Writes reuse `POST /attendance/bulk`** — already upserts and already enforces "a tutor may only mark their own session" via `_can_mark`. One item per cell click; all enrolled students for a column "all present".
- `GET /attendance/roster/{id}` stays (harmless; still exercised by the smoke test) but the UI no longer calls it.
- **Schemas:** `GridStudent{id,name}`, `GridSession{id,date}`, `GridMark{student_id,session_id,status}`, `AttendanceGridOut{students,sessions,marks}`, `GridBatch{id,name}`.

## Frontend

- **New `pages/Attendance.jsx`** (admin/staff/tutor) — one component; the backend scopes data by role.
  - Controls: batch `<select>` (from `/attendance/batches`) + `<input type="month">` (default current month).
  - `useApi` on `/attendance/grid` keyed on `[batch_id, month]`.
  - Table: student name column on the left; one column per session, header = day-of-month with `title` = full date and a small **"✓ all present"** action. Cells render **P (green) / A (red) / empty**.
  - Cell click → next status (empty→present→absent→present…), `POST /attendance/bulk {session_id, items:[{student_id, status}]}`, optimistic local update; on error, refetch grid.
  - Column ✓ → `POST /attendance/bulk` with every enrolled student `present` for that session.
  - Empty states: "Pick a batch to mark attendance." / "No sessions for this batch in {month}."
- **`App.jsx`:** add `{ to: "/attendance", label: "Attendance", roles: ["admin","staff","tutor"] }` and `<Route path="/attendance" … roles={["admin","staff","tutor"]}>`.
- **`SessionDetail.jsx`** (staff): remove the roster block, its state (`roster`, `dirty`, `setStatus`, `markAll`, `saveRoster`) and the `/attendance/roster` effect. Keep session info, Edit, and the private-payment form.
- **`TutorSessionDetail.jsx`:** remove the roster block and its state → a read-only info card (links from My Sessions still resolve).

## Verification

- **Smoke** (`test_smoke.py`): with the existing batch + enrolled student + two batch sessions:
  - `GET /attendance/batches` (staff) includes the batch; tutor's list includes only batches with their sessions.
  - `GET /attendance/grid?batch_id&month` returns the student, both sessions, and marks reflecting a `bulk` POST; an unmarked pair is absent from `marks`.
  - tutor `GET /attendance/grid` for a batch shows only their session(s).
- `npm run build` compiles.

## Files

- **Backend:** `routers/attendance.py`, `schemas.py`, `test_smoke.py`.
- **Frontend:** new `pages/Attendance.jsx`; `App.jsx`, `pages/SessionDetail.jsx`, `pages/TutorSessionDetail.jsx`.
