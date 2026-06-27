# Monthly Batch Payments — Design

**Date:** 2026-06-27
**Scope:** A (non-session) payment must be tagged with student + batch + month. Private/session payments stay untagged.

## Backend
- **`models.py` `Payment`** += `batch_id: Mapped[int | None]` (FK `batches.id`, nullable) and `period_month: Mapped[str | None]` (String, `"YYYY-MM"`).
- **`schemas.py`**: `PaymentCreate` += `batch_id: int | None`, `period_month: str | None`. `PaymentOut` += `batch_id`, `period_month`. `PaymentInvoiceOut` += `batch_name: str | None` (inherits batch_id/period_month).
- **`routers/payments.py`**:
  - `create_payment`: if `payload.session_id is None`, require `student_id` **and** `batch_id` **and** `period_month` (else `400 "student, batch and month are required"`). Persist batch_id/period_month.
  - `get_payment` (invoice): set `batch_name` from the batch (if `batch_id`).
- **DB:** `ALTER TABLE payments ADD COLUMN IF NOT EXISTS batch_id INTEGER; ALTER TABLE payments ADD COLUMN IF NOT EXISTS period_month VARCHAR;` (no migrations; table empty).

## Frontend
- **`pages/Payments.jsx`** Record-payment form:
  - **Student** `<select>` (required). On change, fetch `/students/{id}/batches` (a `useApi` keyed on `form.student_id`) to populate the **Batch** `<select>` (required; disabled until a student is chosen).
  - **Month** — `<input type="month">` → value `"YYYY-MM"` (required).
  - amount/method/note as today. Submit sends `{amount, method, student_id, batch_id, period_month, note}`.
  - Table columns: #, Student, Batch, Month, Amount, Method, When, "" (Invoice →). Batch shown by name (map from a `/batches` fetch); Month shown as `"Mon YYYY"`.
- **`pages/PaymentInvoice.jsx`**: description = `Tuition — {batch_name} ({Mon YYYY})` when `batch_id`, else `Payment received ({method})`. Show `Batch · Month` line near Bill-To.
- Helper `fmtMonth("YYYY-MM")` → `"June 2026"` (via `new Date(y, m-1).toLocaleString(undefined,{month:"long",year:"numeric"})`).

## Verification
- **Smoke**: non-session payment without batch/month → 400; with student+batch+month → 201, and `GET /payments/{id}` returns `batch_name` + `period_month`; a session-tied payment (`session_id`, no batch/month) still 201.
- Frontend build; manual: pick student → batch list = their batches → pick month → save → invoice shows "Tuition — Batch (Month)".

## Files
- **Backend:** `models.py`, `schemas.py`, `routers/payments.py`, `test_smoke.py`.
- **Frontend:** `pages/Payments.jsx`, `pages/PaymentInvoice.jsx`.
