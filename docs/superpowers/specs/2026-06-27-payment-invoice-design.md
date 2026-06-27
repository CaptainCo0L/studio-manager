# Payment Invoice — Design

**Date:** 2026-06-27
**Scope:** Every payment has a printable receipt-style invoice (derived from the payment). Re-add a small Studio Details settings for the issuer header. No dues/balance tracking.

## Backend

### StudioSettings (re-add)
- `models.py`: `StudioSettings` singleton (`id` always 1; `studio_name`, `address`, `phone`, `email`).
- `schemas.py`: `StudioSettingsOut`, `StudioSettingsUpdate`.
- `routers/settings.py`: `GET /settings` (any auth, auto-create row 1) + `PUT /settings` (admin upsert). Register in `main.py`.

### Payment invoice endpoint
- `schemas.py`: `PaymentInvoiceOut(PaymentOut)` += `student_name: str | None`, `guardian_name/phone/email: str | None`.
- `routers/payments.py`: `GET /payments/{payment_id}` (`get_current_user`): load payment; apply `_visible_student_ids` (404 if the payment's `student_id` isn't visible — for staff/admin always visible); attach student snapshot. Place after the list route.

## Frontend

### Studio Details (re-add)
- `pages/Settings.jsx`: form for studio_name/address/phone/email → `GET`/`PUT /settings` (admin).
- `App.jsx`: import + NAV `{ to: "/settings", label: "Studio Details", roles: ["admin"] }` + route guarded admin.

### Payment invoice
- `pages/PaymentInvoice.jsx` (`/payments/:id`, staff): fetch `GET /payments/:id` + `GET /settings`. `.invoice-sheet` document:
  - Header: `studio_name` + From (address/phone/email) on the left; "INVOICE", `INV-{id padded to 4}`, date (`created_at`) on the right.
  - **Bill To**: student_name + guardian (when the payment has a student).
  - Line table: description = `Payment received (method)` (+ note if present), amount = `inr(amount)`; total = same; **Paid** status badge.
  - **Download PDF** button (`print:hidden`) → `window.print()`.
- `App.jsx`: route `/payments/:id` (staff).
- `pages/Payments.jsx`: `onRowClick` → `/payments/:id`; and after `create()` succeeds, `navigate('/payments/' + newPayment.id)` (auto-open the invoice). Add an "Open →" affordance column.

### Print CSS (re-add)
- `index.css`: `.invoice-sheet { ...light palette... }` + `@media print { body{background:#fff} main{padding:0!important;max-width:none!important} }`.
- `App.jsx`: `print:hidden` on the desktop `<aside>` and mobile `<header>`.

## Verification
- **Smoke**: `GET /settings` auto-creates + admin PUT + non-admin 403; record a payment with a student → `GET /payments/{id}` returns `student_name` + amount + method.
- Frontend build; manual: Studio Details saves; record a payment → lands on its printable invoice with the studio header; Payments rows open invoices; Download PDF shows only the sheet.

## Docs
Restore the Studio Details + payment-invoice mentions in `CLAUDE.md` (StudioSettings model, `/settings`, `GET /payments/{id}`) and `USER_MANUAL` (Payments → invoice; Studio Details).

## Files
- **Backend:** `models.py`, `schemas.py`, `routers/settings.py` (new), `routers/payments.py`, `main.py`, `test_smoke.py`.
- **Frontend:** `App.jsx`, `pages/Settings.jsx` (new), `pages/PaymentInvoice.jsx` (new), `pages/Payments.jsx`, `index.css`.
