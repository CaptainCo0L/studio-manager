# Tutor Login + Tutor Portal — Design

**Date:** 2026-06-27
**Scope:** Add a `tutor` role with a login linked to a `Tutor` record, and a tutor-scoped portal: view own sessions + earnings, and mark attendance for own sessions only. Mirrors the parent-portal isolation pattern.

## Decisions (from brainstorming)
- Tutor abilities: **view own sessions/earnings + mark attendance for own sessions**. Nothing else writable; no access to students/fees/payments/batches/users/settings.
- Login created by **admin on the Users page** (role `tutor` + pick the linked Tutor); auto-sets `Tutor.linked_user_id`.
- Tutors **may** see their estimated payout figure.

## Backend

### Role + linking
- `users.py` `create_user`: allow role `tutor` (add to the allowed set). `UserCreate` gains `tutor_id: int | None = None`. When role is `tutor`: require `tutor_id`, the `Tutor` must exist and have `linked_user_id is None` (else 400); after `db.flush()`, set `tutor.linked_user_id = user.id`.
- `schemas.py`: `UserCreate` += `tutor_id: int | None = None`.

### Isolation helper (`tutors.py`)
```python
def _visible_tutor_id(db: Session, user: User) -> int | None:
    """The tutor id a user is scoped to. None == no restriction (admin/staff)."""
    if user.role in ("admin", "staff"):
        return None
    t = db.query(Tutor).filter(Tutor.linked_user_id == user.id).first()
    return t.id if t else -1  # -1 matches no session
```

### Sessions (`sessions.py`) — add tutor scoping BEFORE the parent path
`list_sessions`: 
```python
if user.role == "tutor":
    q = q.filter(ClassSession.tutor_id == _visible_tutor_id(db, user))
else:
    visible = _visible_student_ids(db, user)
    if visible is not None:
        q = q.filter(ClassSession.id.in_(<their children's sessions>))
```
(The parent branch is the current code.) `get_session`: for a tutor, `404` unless `sess.tutor_id == _visible_tutor_id(db, user)`; parent branch unchanged.

### Attendance (`attendance.py`) — allow the owning tutor
- Add `_can_mark(db, user, sess)`: `True` for admin/staff; for tutor `sess.tutor_id == _visible_tutor_id(db, user)`; else `False`.
- `roster(session_id)` and `mark_bulk`: change `require_staff` → `get_current_user`; if not `_can_mark(...)` → `404`. (Parents → 404, never mark.)
- **Enrich the roster response with names** so the tutor portal needs no students access: new schema `RosterRow(AttendanceOut)` += `student_name: str`; `roster` returns `list[RosterRow]` (join `Student.name`).

### Earnings (`reports.py`)
- New `GET /reports/my-earnings` (`get_current_user`, tutor only — else 403): compute the caller's own `{ session_count, private_sessions, private_earnings, estimated_payout }` reusing the per-tutor logic from `tutor_sessions`. Staff `tutor-sessions` stays `require_staff`.

## Frontend

### Roles & routes (`App.jsx`)
- `NAV` += tutor entries (`roles: ["tutor"]`): Dashboard `/`, My Sessions `/tutor/sessions`, My Earnings `/tutor/earnings`.
- Routes (guarded `roles={["tutor"]}`): `/tutor/sessions`, `/tutor/sessions/:id`, `/tutor/earnings`.

### Pages
- **`TutorSessions.jsx`** — `GET /sessions` (tutor-scoped); `Table` (sortable) of date/type/batch with an Open link to `/tutor/sessions/:id`.
- **`TutorSessionDetail.jsx`** — `GET /sessions/:id` + `GET /attendance/roster/:id` (names included). Lean roster: present/absent buttons (reuse `STATUS_STYLE` styling), Mark-all present/absent, live counts, unsaved hint, Save → `POST /attendance/bulk`. No payment form.
- **`TutorEarnings.jsx`** — `GET /reports/my-earnings`; cards/list for session count, private sessions, private earnings (`inr`), estimated payout.
- **`Dashboard.jsx`** — tutor branch: reuse `UpcomingSessions` (already tutor-scoped via `/sessions?date_from=`) + an earnings summary card linking to My Earnings.

### Users page (`Users.jsx`)
- Add `tutor` to the role `<select>`. Fetch `/tutors`. When role is `tutor`, show a single Tutor `<select>` and send `tutor_id`. (Parent's student multiselect path unchanged.)

## Verification
- **Smoke (`test_smoke.py`)**: create a `Tutor`, a tutor `User` linked to it; a session assigned to that tutor and one to another tutor (or none). Assert the tutor:
  - sees only their own session in `GET /sessions`;
  - `GET /sessions/{own}` 200, `GET /sessions/{other}` 404;
  - `POST /attendance/bulk` on their own session 200, on another's 404;
  - `GET /students` is forbidden (403) — staff-only data stays hidden;
  - `GET /reports/my-earnings` 200; staff `GET /reports/tutor-sessions` as tutor 403.
- **Frontend** `npm run build`; manual: create a tutor login, log in, see only the 3 portal pages, mark a roster, view earnings.

## Cleanup
- Remove the "Tutor login + tutor portal" entry from `docs/future-upgrades.md` (now done).

## Non-goals
- No tutor self-scheduling, no payments/fees access, no editing student records, no auto-created logins, no password reset flow. No new deps.

## Files
- **Backend:** `schemas.py`, `routers/users.py`, `routers/tutors.py`, `routers/sessions.py`, `routers/attendance.py`, `routers/reports.py`, `test_smoke.py`.
- **Frontend:** `App.jsx`, `pages/Dashboard.jsx`, `pages/Users.jsx`, new `pages/TutorSessions.jsx`, `pages/TutorSessionDetail.jsx`, `pages/TutorEarnings.jsx`.
- **Docs:** `future-upgrades.md`, `CLAUDE.md` (note tutor role).
