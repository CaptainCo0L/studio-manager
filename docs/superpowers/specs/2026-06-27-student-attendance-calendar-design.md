# Student Page: Clickable Invoices + Attendance Calendar — Design

**Date:** 2026-06-27
**Scope:** On `StudentDetail`, make invoices clickable (to the invoice detail page) and replace the flat attendance table with a visual month calendar showing scheduled and attended sessions.

## Decisions (from brainstorming)

- **Invoices:** rows clickable → `/fees/invoices/:id` (reuses `Table.onRowClick` + invoice-detail page already shipped).
- **Calendar encoding:** 4 attendance statuses + scheduled — present=sage(green), late=ochre(amber), absent=red, excused=grey, scheduled(no record)=hollow outline.
- **Scheduled days included:** yes — upcoming sessions from the student's active enrollments appear as outline dots.
- No new dependencies.

## Backend

### Schema (`backend/app/schemas.py`)
```python
class AttendanceCalendarItem(BaseModel):
    date: date          # `date` already imported at top of schemas.py
    session_id: int
    session_type: str   # batch|private|dropin
    status: str | None  # present|late|absent|excused, or None when not yet marked
```

### Endpoint (`backend/app/routers/students.py`)
`GET /students/{student_id}/attendance-calendar` → `list[AttendanceCalendarItem]`.

- Reuse `_get_visible(db, user, student_id)` — raises 404 for parents on a non-visible student (and 404 if missing).
- Gather the relevant sessions:
  - `batch_ids` = the student's **active** enrollments (`BatchEnrollment.student_id == id, is_active`).
  - `att_session_ids` = subquery of `Attendance.session_id` where `Attendance.student_id == id` (covers private/drop-in and any marked session).
  - `sessions` = `ClassSession` where `or_(batch_id.in_(batch_ids), id.in_(att_session_ids))`, ordered by date.
- Build `status_by_session = {a.session_id: a.status}` from this student's attendance rows.
- Return one item per session: `date`, `session_id`, `session_type`, `status = status_by_session.get(s.id)` (None ⇒ scheduled).
- New imports in `students.py`: `Attendance`, `Session as ClassSession` from `..models`; `or_` from `sqlalchemy`; `AttendanceCalendarItem` from `..schemas`. Place the route next to `/{student_id}/batches`.

Returns all dates (no range filter) — a single student's session count is small; the frontend pages by month client-side. *(ponytail: range filter is YAGNI here; add `date_from`/`date_to` only if a student ever accrues enough sessions to matter.)*

## Frontend (`frontend/src/pages/StudentDetail.jsx`)

### Clickable invoices
- Add `useNavigate`. The Invoices `Table` gets `onRowClick={(i) => navigate(`/fees/invoices/${i.id}`)}` and an "Open →" trailing cell (column header `""`).

### Attendance calendar
- Replace the `attendance` fetch with `const calendar = useApi(() => api.get(`/students/${id}/attendance-calendar`), [id]);` and remove the old attendance `Table` section.
- Add a local component `AttendanceCalendar({ items })` rendered under an "Attendance" heading:
  - **Month state:** `useState` holding `{year, month}` (0-based month), defaulting to today. `‹ / ›` buttons step the month; header shows `"June 2026"`.
  - **Bucket:** group `items` by `date` string (`YYYY-MM-DD`).
  - **Grid:** weekday header `Mon Tue Wed Thu Fri Sat Sun`. Compute the first weekday (Mon-based: `(new Date(y,m,1).getDay() + 6) % 7`) for leading blanks, and `daysInMonth = new Date(y, m+1, 0).getDate()`. Render a 7-col grid; each day cell shows the day number and a row of dots for that day's sessions.
  - **Dots:** each session → a small `rounded-full` dot wrapped in a `Link` to `/sessions/${session_id}` with `title={`${session_type} — ${status || "scheduled"}`}`. Colors:
    - present → `bg-sage`
    - late → `bg-ochre`
    - absent → `bg-red-500`
    - excused → `bg-ink/30`
    - `null` (scheduled) → `border border-ink/40 bg-transparent` (hollow)
  - **Legend** beneath the grid mapping each color/shape to its label.
- The guardian, outstanding-balance, and batches sections stay unchanged.

No CSS/config changes needed (uses existing palette tokens + Tailwind `bg-red-500`, which is in the default palette).

## Verification

- **Smoke test (`backend/test_smoke.py`)** — add after the existing fee/settings asserts (variables `sid`, `s0`, `s1`, `other`, `h`, `ph` are in scope; `s0` was marked present, `s1` left unmarked):
  ```python
  cal = c.get(f"/students/{sid}/attendance-calendar", headers=h).json()
  by_sess = {r["session_id"]: r["status"] for r in cal}
  assert by_sess.get(s0) == "present" and by_sess.get(s1) is None, cal
  assert c.get(f"/students/{other['id']}/attendance-calendar", headers=ph).status_code == 404
  ```
- **Frontend:** `npm run build` compiles. Manual: open a seeded student → Attendance shows a month grid with green dots on attended days and hollow dots on upcoming sessions; `‹/›` change months; clicking a dot opens the session detail; an invoice row opens the official invoice.

## Non-goals
- No calendar for the parent portal (MySessions stays as-is) — staff `StudentDetail` only.
- No editing attendance from the calendar (marking still happens on the session roster).
- No date-range pagination on the endpoint, no new deps.

## Files
- **Backend:** `schemas.py` (+`AttendanceCalendarItem`), `routers/students.py` (+endpoint, imports), `test_smoke.py` (+asserts).
- **Frontend:** `pages/StudentDetail.jsx` (clickable invoices + `AttendanceCalendar`).
