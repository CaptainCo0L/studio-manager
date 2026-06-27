# Audit Log — Design

**Date:** 2026-06-27
**Scope:** Record every mutating request (who/what/when/status) via middleware; admin-only viewer page.

## Decisions (from brainstorming)
- Capture via **request middleware** (action-level, not field diffs).
- **Admin-only** to view; logs all mutations by any authenticated user. Keep all history.

## Backend

### Model (`models.py`)
```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(nullable=True)        # not a FK: keep rows if user deleted
    user_email: Mapped[str] = mapped_column(String, default="anonymous")
    method: Mapped[str] = mapped_column(String)
    path: Mapped[str] = mapped_column(String)
    status_code: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```
(Add `Integer` to the sqlalchemy imports in models.py.)

### Middleware (`main.py`)
`@app.middleware("http")` after `call_next`:
- Only for `method in {POST,PUT,DELETE,PATCH}` and `not path.startswith("/auth")`.
- Decode the bearer token (best-effort) → `user_id`; look up `user_email` (fallback `#id` / "anonymous").
- Insert one `AuditLog` row with method, path, `response.status_code` via a fresh `SessionLocal()`.
- Whole block wrapped in `try/except: pass` — auditing must never break a request.
- `from .auth import decode_token` and `from .models import AuditLog, User` at top.

### Router (`routers/audit.py`, new)
- `GET /audit` (`require_admin`): `limit: int = 200`, `user_id: int | None`; `order_by(id desc)`.
- Schema `AuditOut(ORM)`: id, user_email, method, path, status_code, created_at. Registered in `main.py`.

## Frontend
- **`Audit.jsx`** (`/audit`, admin) — `Table` (sortable/filterable) columns: When (`created_at` slice), Who (`user_email`), Action (readable label from method+path, raw `method path` muted beneath), Status (code; red when ≥400).
  - Action mapper: small map of `METHOD + path-prefix → label` (e.g. `POST /students` → "Created student", `PUT /students` → "Updated student", `DELETE /students` → "Deleted student", `POST /payments` → "Recorded payment", `POST /attendance/bulk` → "Marked attendance", `POST /fees/...` → "Fees change", `POST /users` → "Created user", `PUT /settings` → "Updated studio details", etc.); fallback = `method path`.
- `App.jsx`: NAV `{ to: "/audit", label: "Audit", roles: ["admin"] }`; route guarded `roles={["admin"]}`.

## Verification
- **Smoke**: after admin mutations, `GET /audit` (admin) returns rows incl. a known one (e.g. the `POST /students` for "Asha") with correct `user_email`/method/status; assert no `GET` path and no `/auth/login` row present; `GET /audit` as staff/parent → 403.
- Frontend build; manual: perform an action, see it on the Audit page; non-admin has no Audit nav.

## Non-goals
- No field-level diffs, no log pruning/retention policy, no export, no new deps.

## Files
- **Backend:** `models.py`, `main.py` (middleware + register), `routers/audit.py` (new), `schemas.py`, `test_smoke.py`.
- **Frontend:** `pages/Audit.jsx` (new), `App.jsx`.
