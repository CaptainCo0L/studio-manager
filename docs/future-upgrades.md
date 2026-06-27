# Future Upgrades

Deferred ideas not yet scheduled. Each entry: what, why, and rough scope. Promote to a spec in `docs/superpowers/specs/` when picked up.

## Tutor login + tutor portal

**Status:** deferred (noted 2026-06-27)

**Idea:** Let tutors log in and see a tutor-scoped portal — their own sessions, attendance to mark, and earnings/payouts — mirroring how the parent portal limits parents to their own children.

**Current state (as-is):**
- `Tutor` and `User` are separate tables. A Tutor is a directory entry with no password and no login.
- Roles are `admin | staff | parent` — there is **no `tutor` role**.
- A tutor can only log in if an admin manually creates a `User` for them (usually role `staff`), which grants *full* staff access (all students, fees, payments) — not a tutor-restricted view.
- `Tutor.linked_user_id` and `Tutor.is_guest` exist on the model/schema but are **stored metadata only** — nothing reads them for auth or permissions.

**What the upgrade entails (rough scope):**
- Add a `tutor` role to the auth/role system (`deps.py` guards, `User.role` values).
- Use `Tutor.linked_user_id` for real: link a tutor directory entry to a login `User`; optionally auto-create the login when a non-guest tutor is added.
- A visibility helper analogous to `_visible_student_ids` — e.g. `_visible_tutor_id(user)` — so tutor-scoped endpoints (sessions, attendance, tutor-sessions report/payouts) filter to `tutor_id == the caller's linked tutor`.
- Frontend: tutor portal pages (My Sessions / mark attendance / My Earnings) + role guards in `App.jsx`, parallel to the parent portal.
- Reuse the existing `/reports/tutor-sessions` earnings/payout logic for the tutor's own figures.

**Why deferred:** Tutors don't currently need self-service login; staff manage everything centrally. Revisit if tutors should manage their own rosters/see their own payouts.
