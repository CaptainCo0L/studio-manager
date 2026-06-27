# Account Settings (My Account) — Design

**Date:** 2026-06-27
**Scope:** A gear icon next to Logout that opens a "My Account" page where the signed-in user edits their own email and changes their password. All roles.

## Decisions (from brainstorming)

- Editable: **email + password only** (the `User` model stores nothing else self-editable; role/is_active stay admin-managed). No model change.
- UI: **dedicated `/account` page**, reached via a gear icon button beside Logout. No modal system introduced.
- No new dependencies.

## Backend (`backend/app/routers/users.py`, `schemas.py`)

Reuse `hash_password`, `verify_password` from `..auth`; `get_current_user` from `..deps`.

### Schemas (`schemas.py`)
```python
class MeUpdate(BaseModel):
    email: EmailStr

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)  # basic floor; reject trivially short
```

### Endpoints
```python
@router.put("/me", response_model=UserOut)
def update_me(payload: MeUpdate, db, user=Depends(get_current_user)):
    # uniqueness excluding self
    clash = db.query(User).filter(User.email == payload.email, User.id != user.id).first()
    if clash:
        raise HTTPException(400, "Email already registered")
    user.email = payload.email
    db.commit(); db.refresh(user)
    return user

@router.post("/me/password")
def change_password(payload: PasswordChange, db, user=Depends(get_current_user)):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}
```
- Place `PUT /me` and `POST /me/password` near the existing `GET /me`. Token is keyed by user id, so an email change does not invalidate the session.
- New imports in `users.py`: `verify_password` (alongside existing `hash_password`); `MeUpdate`, `PasswordChange` from `..schemas`. `Field`/`EmailStr` already importable in `schemas.py` (EmailStr is used by `UserCreate`; add `Field` to the pydantic import if not present).

## Frontend

### Auth context (`frontend/src/auth.jsx`)
Add `refreshUser` and expose it:
```jsx
const refreshUser = async () => setUser(await api.get("/users/me"));
// include in provider value: { user, loading, login, logout, refreshUser }
```

### Sidebar gear (`frontend/src/App.jsx`)
In the sidebar footer (where email + Logout live), put the gear next to Logout:
```jsx
<div className="flex items-center gap-2">
  <Link to="/account" onClick={() => setOpen(false)} className="btn-ghost px-2 py-2" title="My account" aria-label="My account">
    {/* inline gear SVG, h-4 w-4, stroke-current */}
  </Link>
  <button className="btn-ghost flex-1" onClick={() => { logout(); navigate("/login"); }}>Logout</button>
</div>
```
Gear = a minimal inline SVG (cog), `aria-label="My account"`. No icon dependency.

### Account page (`frontend/src/pages/Account.jsx`, new)
- `const { user, refreshUser } = useAuth();`
- **Email card:** input prefilled with `user.email`; Save → `await api.put("/users/me", { email })`, then `await refreshUser()`, show "Saved." Handle thrown error message inline.
- **Password card:** `current_password`, `new_password`, `confirm`. On submit: if `new !== confirm`, show "Passwords don't match" and stop; else `await api.post("/users/me/password", { current_password, new_password })`, clear fields, show "Password changed." Inline error on failure (e.g. wrong current).
- Uses existing `.input` / `.btn` / `card` styles and the `Page` wrapper. Shows the user's role read-only for context.

### Route (`frontend/src/App.jsx`)
`<Route path="/account" element={<Guard><Account /></Guard>} />` — auth only, no role restriction. No `NAV` entry (gear is the entry point).

## Verification

- **Smoke test (`backend/test_smoke.py`)** add (admin token `h` in scope):
  ```python
  # wrong current password rejected
  assert c.post("/users/me/password", json={"current_password": "nope", "new_password": "newpass1"}, headers=h).status_code == 400
  # change password, then login with the new one
  assert c.post("/users/me/password", json={"current_password": "admin123", "new_password": "newpass1"}, headers=h).json()["ok"] is True
  assert c.post("/auth/login", data={"username": "admin@example.com", "password": "newpass1"}).status_code == 200
  # change email; login by new email works; token still valid
  assert c.put("/users/me", json={"email": "boss@example.com"}, headers=h).json()["email"] == "boss@example.com"
  assert c.get("/users/me", headers=h).json()["email"] == "boss@example.com"
  # taking the parent's email is rejected
  assert c.put("/users/me", json={"email": "parent@example.com"}, headers=h).status_code == 400
  ```
  (Place after the parent account `parent@example.com` is created.)
- **Frontend:** `npm run build` compiles. Manual: gear → My Account; change email (sidebar updates via `refreshUser`); change password (wrong current shows error; correct one works, re-login with new password).

## Non-goals
- No display name / avatar (no model change). No email-verification flow. No admin password-reset-for-others (admins already create/disable accounts). No modal.

## Files
- **Backend:** `routers/users.py` (+2 endpoints, imports), `schemas.py` (+`MeUpdate`, `PasswordChange`), `test_smoke.py` (+asserts).
- **Frontend:** `auth.jsx` (+`refreshUser`), `App.jsx` (gear + route), `pages/Account.jsx` (new).
