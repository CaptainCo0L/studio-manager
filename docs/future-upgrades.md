# Future Upgrades

Deferred ideas not yet scheduled. Each entry: what, why, and rough scope. Promote to a spec in `docs/superpowers/specs/` when picked up.

## Attendance locking + edit history

**Status:** deferred (noted 2026-06-27)

**Idea:** Optionally lock attendance after a period and/or record an audit trail of who changed a record and when.

**Current state (as-is):**
- Attendance is freely editable forever. `POST /attendance/bulk` upserts `(session_id, student_id)` rows in place (`attendance.py`); re-saving a session overwrites statuses.
- Any `staff`/`admin` can edit any session's attendance at any time — no lock, no time limit.
- No audit trail: the `Attendance` row stores only `status`; there's no record of who marked it, who changed it, or when.

**What the upgrade entails (rough scope):**
- **Locking:** add a `locked`/`finalized` flag (per session, or a cutoff date) and have `mark_bulk` reject edits to locked sessions (admins could override). Surface a lock/unlock control on the Session detail page.
- **Edit history:** add `marked_by`/`updated_by` (FK to `users`) and `updated_at` to `Attendance`, or a separate `attendance_audit` table appending each change. Show "last edited by X on date" on the roster.
- Both are additive; no change to how rosters auto-fill.

**Why deferred:** Easy corrections are currently desirable; locking/audit only matters if attendance becomes a disputed or compliance record.
