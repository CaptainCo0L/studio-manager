# Global Search — Design

**Date:** 2026-06-27
**Scope:** A sidebar search box that finds students, batches, and tutors and jumps to them. Staff/admin only.

## Decisions (from brainstorming)
- UX: live dropdown from a search box at the top of the sidebar.
- Covers: students (name + guardian), batches (name), tutors (name).
- Staff/admin only (`require_staff`). Batch/tutor hits land on their list page (no detail route exists); students open `/students/:id`.

## Backend (`backend/app/routers/search.py`, new)
- `GET /search?q=` (`require_staff`). Returns `SearchOut`:
  ```python
  class SearchHit(BaseModel):
      id: int
      label: str
      sublabel: str | None = None

  class SearchOut(BaseModel):
      students: list[SearchHit]
      batches: list[SearchHit]
      tutors: list[SearchHit]
  ```
- Empty/blank `q` → all-empty result. Otherwise, case-insensitive `ILIKE %q%`, each group capped at 8:
  - students: `Student.name ILIKE` OR `Student.guardian_name ILIKE` → `SearchHit(id, name, guardian_name)`.
  - batches: `Batch.name ILIKE` → `SearchHit(id, name)`.
  - tutors: `Tutor.name ILIKE` → `SearchHit(id, name)`.
- Schemas in `schemas.py`; router registered in `main.py`.

## Frontend (`frontend/src/components/GlobalSearch.jsx`, new)
- Debounced (~250ms) input; calls `/search?q=`; dropdown groups results under Students / Batches / Tutors.
- Click a hit → navigate + clear: student → `/students/:id`, batch → `/batches`, tutor → `/tutors`. Calls an `onNavigate` callback (to close the mobile drawer).
- Closes on outside-click; shows "No matches." when a non-empty query returns nothing.
- Mounted in `App.jsx` sidebar (top, under the wordmark) only when `user.role` is admin/staff; passed `onNavigate={() => setOpen(false)}`.

## Verification
- **Smoke**: `GET /search?q=Asha` returns the student; a batch name returns the batch; a tutor name returns the tutor; `GET /search?q=...` as a parent or tutor → 403.
- **Frontend** `npm run build`; manual: type in the sidebar box, see grouped results, click to jump; parent/tutor logins don't see the box.

## Non-goals
- No invoices/sessions search (v1), no keyboard arrow-nav, no fuzzy matching, no new deps.

## Files
- **Backend:** `routers/search.py` (new), `schemas.py`, `main.py`, `test_smoke.py`.
- **Frontend:** `components/GlobalSearch.jsx` (new), `App.jsx`.
