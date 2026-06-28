# Batches simplification, record editing, remove Reports, audit toggle — Design

**Date:** 2026-06-28

Four independent changes, one branch.

## 1. Simpler Batches page

**As-is:** batch has `weekly_days` (CSV weekdays), `start_time`, `end_time`, `default_tutor_id`; the page picks days/time/tutor and has a "Generate sessions" button that creates sessions on those weekdays. Student linking lives on StudentDetail.

**Change:** a student's day varies week to week, so fixed-weekday generation no longer fits.

- **Backend** `models.py`: `Batch` += `classes_per_week: int` (default 1). Old columns (`weekly_days`, times, `default_tutor_id`) stay (defaulted/nullable, unused) — no migration. `schemas.py`: `BatchCreate`/`BatchOut` += `classes_per_week`; drop the now-unused fields from `BatchCreate` (so `create`/`update` no longer require them). `routers/batches.py` unchanged in shape (still `Batch(**model_dump())`).
- **Frontend** `Batches.jsx`: form = **name + classes-per-week** (number, min 1). Each card shows `{n}× / week`, the **linked students by name**, and inline **+ add / × remove** student controls (reuse `/batches/{id}/students`, `POST /students/enroll`, `POST /students/unenroll`). Remove the weekday picker, time inputs, tutor select, and the **Generate sessions** button.
- Sessions for a batch are created manually on the Sessions page (already supported: type=batch, date, batch).

**Keep** the `/sessions/{batch_id}/generate` backend endpoint (unused by UI; harmless) — deleting it is out of scope.

## 2. Edit existing records

**As-is:** Students, Tutors, Batches have `PUT`; Sessions, Payments do not; no page has edit UI.

- **Backend:** add `PUT /sessions/{session_id}` and `PUT /payments/{payment_id}`, mirroring create (same fields, same validation — payment update re-checks "non-session payment requires student+batch+month").
- **Frontend:** each create form gains an **edit mode** — opening it pre-filled and submitting `PUT` instead of `POST`:
  - Students: "Edit" on Students list row / StudentDetail.
  - Tutors: "Edit" on Tutors list.
  - Sessions: "Edit" on SessionDetail.
  - Payments: "Edit" on Payments list row.

## 3. Remove Reports page

- Delete `frontend/src/pages/Reports.jsx`; remove its import, nav entry, and `<Route>` in `App.jsx`.
- **Keep** the backend `/reports` router — Dashboard (`attendance-summary`) and Tutor Earnings (`my-earnings`) still call it.

## 4. Audit on/off toggle

- **Backend:** `StudioSettings` += `audit_enabled: bool` (default true); exposed via existing `/settings` GET (any auth) / PUT (admin). `audit_middleware` in `main.py` reads the singleton and **skips recording when off** (still never breaks the request).
- **Frontend:** `Audit.jsx` (admin) gets a switch bound to `PUT /settings { audit_enabled }`.

## Verification

- `test_smoke.py` += : create batch with `classes_per_week`; `PUT /sessions/{id}` and `PUT /payments/{id}` change a field; toggle `audit_enabled=false` then a mutation records no new audit row, back to true records again.
- `npm run build` compiles.

## Files

- **Backend:** `models.py`, `schemas.py`, `routers/sessions.py`, `routers/payments.py`, `routers/settings.py` (if needed), `main.py`, `test_smoke.py`.
- **Frontend:** `Batches.jsx`, `Students.jsx`, `StudentDetail.jsx`, `Tutors.jsx`, `SessionDetail.jsx`, `Payments.jsx`, `Audit.jsx`, `App.jsx`; delete `Reports.jsx`.
