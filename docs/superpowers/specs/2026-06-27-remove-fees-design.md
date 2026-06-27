# Remove Fees (keep Payments) — Design

**Date:** 2026-06-27
**Scope:** Delete all fee/invoice functionality; keep Payments as a standalone ledger (no invoice linkage).

## Delete entirely
**Backend**
- `routers/fees.py`, `routers/settings.py` (deleted files).
- `models.py`: `FeeStructure`, `FeeInvoice`, `StudioSettings` classes; `Payment.invoice_id` column.
- `schemas.py`: `FeeStructureCreate/Out`, `InvoiceCreate/Out`, `PaymentLine`, `InvoiceDetailOut`, `StudioSettingsOut/Update`. Remove `invoice_id` from `PaymentCreate`/`PaymentOut`.
- `reports.py`: delete `fee_collection`. Keep attendance-summary, tutor-sessions, my-earnings.
- `main.py`: drop `fees`, `settings` from imports + the include loop.

**Frontend pages**: `Fees.jsx`, `FeeStructureDetail.jsx`, `InvoiceDetail.jsx`, `MyFees.jsx`, `Settings.jsx`.

**`App.jsx`**: remove imports + NAV entries (Fees, My Fees, Studio Details) + routes (`/fees`, `/fees/structures/:id`, `/fees/invoices/:id`, `/my-fees`, `/settings`).

## Trim
- **`payments.py`**: remove the invoice branch (FeeInvoice import, balance update); `create_payment` keeps amount/method/student_id/session_id/note. Receipt email stays.
- **`Payments.jsx`**: remove invoice `<select>` + `invoices` fetch + the Invoice column; keep student/amount/method/note + table (#, Student, Amount, Method, When).
- **`Dashboard.jsx`**: remove `OutstandingFees`, `CollectionProgress`, the Collected/Outstanding stats, the `/reports/fee-collection` fetch, and the parent "Your fees" card. New stat row: Students · Batches · Tutors · Sessions (fetch tutors + sessions for counts). Parent dashboard → UpcomingSessions + a card linking to My Sessions only. Keep TodaysClasses, AttendanceSnapshot, BatchEnrollment, RecentPayments.
- **`StudentDetail.jsx`**: remove the Invoices `Table` + the Outstanding-balance card + the `invoices` fetch and `balance`. Keep guardian, batches, attendance calendar.
- **`Reports.jsx`**: remove the fee-collection card + its `fees` fetch. Keep attendance summary + tutor table.
- **`Audit.jsx`**: drop `fees`/`settings` from the ENTITY map and the "Updated studio details" special case (harmless paths won't occur).
- **`index.css`**: remove `.invoice-sheet` block + the `@media print` block (invoice-only).
- **`App.jsx`**: drop `print:hidden` on the desktop `<aside>` and mobile `<header>` (nothing prints now).
- **Keep** `SessionDetail.jsx`'s private-lesson payment form (it records a payment).

## Data (DB just cleared — safe)
Via psql: `ALTER TABLE payments DROP COLUMN IF EXISTS invoice_id; DROP TABLE IF EXISTS fee_invoices, fee_structures, studio_settings;`

## Verification
- **`test_smoke.py`**: remove fee/invoice/settings asserts and the invoice-application payment asserts. Keep/adjust a payment test: record `{amount, method, student_id}` → 201; `GET /payments` shows it. Add `GET /fees/structures` → 404 and `GET /settings` → 404.
- `npm run build`; manual: no Fees/My Fees/Studio Details nav; Payments records and lists; Dashboard/StudentDetail/Reports render without fee bits; parent sees only My Sessions; tutor portal unaffected.

## Docs
Update `CLAUDE.md` (remove FeeStructure/FeeInvoice/StudioSettings models, `/fees`, `/settings`, fee-collection, parent fee access, ₹ currency note stays for payments), `docs/USER_MANUAL.md`, `README.md` fee mentions.

## Files
Deletes: 2 backend routers, 5 frontend pages. Edits: `models.py`, `schemas.py`, `reports.py`, `payments.py`, `main.py`, `App.jsx`, `Dashboard.jsx`, `StudentDetail.jsx`, `Reports.jsx`, `Payments.jsx`, `Audit.jsx`, `index.css`, `test_smoke.py`, docs.
