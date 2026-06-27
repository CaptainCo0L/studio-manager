# Fee Detail Pages + Official Invoice (PDF) — Design

**Date:** 2026-06-27
**Scope:** Make fee templates and invoices clickable into detail pages; render an invoice as an official, printable (PDF) document; add a studio-settings profile for the invoice issuer block.

## Decisions (from brainstorming)

- **PDF:** browser print-to-PDF via `window.print()` + Tailwind `print:` variants. No new dependencies.
- **Issuer block:** a new `StudioSettings` singleton in the DB, edited on an admin-only Settings page.
- **Template click:** opens a detail page showing the template + the invoices generated from it.
- **Clickable rows, not cards:** the two Fees tables stay tables (financial columns read better) but rows become clickable to their detail pages.
- **No logo upload** in v1 (avoids file storage). Text issuer block only.

## Backend

### StudioSettings model (`backend/app/models.py`)
Singleton row (id always 1):
```python
class StudioSettings(Base):
    __tablename__ = "studio_settings"
    id: Mapped[int] = mapped_column(primary_key=True)  # always 1
    studio_name: Mapped[str] = mapped_column(String, default="")
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
```

### Settings router (`backend/app/routers/settings.py`, new)
- `GET /settings` → `StudioSettingsOut`. Any authenticated user (`get_current_user`). If row 1 missing, create empty and return it (so the invoice always has an issuer object).
- `PUT /settings` → `StudioSettingsOut`. Admin only (`require_admin`). Upserts row 1 from `StudioSettingsUpdate` (all fields optional; only provided fields overwrite).
- Register in `main.py` (import + include_router). Table auto-creates via `Base.metadata.create_all`.

### Schemas (`backend/app/schemas.py`)
```python
class StudioSettingsOut(ORM):
    id: int
    studio_name: str
    address: str | None
    phone: str | None
    email: str | None

class StudioSettingsUpdate(BaseModel):
    studio_name: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None

class PaymentLine(BaseModel):
    id: int
    amount: float
    method: str
    created_at: datetime

class InvoiceDetailOut(InvoiceOut):
    student_name: str
    guardian_name: str | None
    guardian_phone: str | None
    guardian_email: str | None
    fee_name: str | None        # fee structure name, if linked
    fee_period: str | None
    payments: list[PaymentLine]
```

### Fee router additions (`backend/app/routers/fees.py`)
- `GET /fees/structures/{id}` → `FeeStructureOut` (staff). 404 if missing.
- `GET /fees/invoices` gains a `fee_structure_id: int | None = None` filter (keeps existing parent-scoping + other filters).
- `GET /fees/invoices/{id}` → `InvoiceDetailOut`. Uses `get_current_user`; applies `_visible_student_ids` — if the invoice's `student_id` is not visible to the caller, **404** (not 403, to avoid leaking existence — matches the session-detail isolation pattern). Assembles: invoice fields, student snapshot, fee structure name/period (if `fee_structure_id`), and payments where `Payment.invoice_id == id` ordered by id.

**Route ordering note:** declare `GET /fees/invoices/{id}` and `/fees/structures/{id}` after the list routes; FastAPI matches `/invoices` (list) and `/invoices/{id}` distinctly, but keep `{id}` typed `int` so `/structures` won't shadow.

## Frontend

### Routes (`frontend/src/App.jsx`)
- `/fees/invoices/:id` → `InvoiceDetail` (staff + parent — parents can view their own; backend enforces isolation).
- `/fees/structures/:id` → `FeeStructureDetail` (staff).
- `/settings` → `Settings` (admin only). New `NAV` entry `{ to: "/settings", label: "Settings", roles: ["admin"] }`.

### Fees page (`frontend/src/pages/Fees.jsx`)
Both tables: wrap each row's navigation by making the row clickable (`onClick` → `navigate`, `className` adds `cursor-pointer`, existing hover). Add a trailing "Open" cell affordance for discoverability. Templates → `/fees/structures/:id`; invoices → `/fees/invoices/:id`.

### InvoiceDetail (`frontend/src/pages/InvoiceDetail.jsx`, new)
- Fetch `GET /fees/invoices/:id` and `GET /settings`.
- Layout: an `.invoice-sheet` card styled as an official invoice:
  - **Header:** studio_name (large) on the left; on the right "INVOICE", number `INV-{id padded to 4}`, issue date (`created_at`), due date.
  - **From:** studio address / phone / email.
  - **Bill To:** student_name, guardian_name, guardian_phone, guardian_email.
  - **Line items table:** one row — description = `fee_name || "Tuition fee"` (+ period if present), amount = `amount_due`.
  - **Totals:** Amount due / Paid / Balance (via `inr`), status badge.
  - **Payments received:** if `payments.length`, a small list (date, method, amount).
- **Download PDF** button (top, `print:hidden`) → `window.print()`.
- Print isolation: the sidebar `<aside>`, mobile header, and Download button get `print:hidden`; the sheet prints. Add `print:p-0` reset on `<main>` if needed so the sheet isn't cramped.

### FeeStructureDetail (`frontend/src/pages/FeeStructureDetail.jsx`, new)
- Fetch `GET /fees/structures/:id` and `GET /fees/invoices?fee_structure_id=:id`.
- Show template summary (name, batch, amount, period) in a `Card`, then a `Table` of its invoices (student, due, paid, balance, status) with clickable rows → invoice detail.

### Settings (`frontend/src/pages/Settings.jsx`, new)
- Fetch `GET /settings`; form with studio_name/address/phone/email; Save → `PUT /settings`. Admin only (route-guarded).

### Print CSS
Use Tailwind `print:` variants only — no new global CSS beyond what variants provide. Sidebar/header/buttons: `print:hidden`. Optionally `@media print { body { background: white } }` if the canvas ground bleeds — add to `index.css` only if needed.

## Verification

- **Backend smoke (`backend/test_smoke.py`)** add:
  - `GET /settings` returns a row (auto-created); `PUT /settings` as admin updates `studio_name`; `PUT /settings` as parent → 403.
  - Create invoice, `GET /fees/invoices/{id}` returns composite with `student_name` and a `payments` list reflecting the earlier payment; parent sees own invoice (200), parent gets 404 on a non-visible invoice.
  - `GET /fees/structures/{id}` returns the structure; `GET /fees/invoices?fee_structure_id=` filters.
- **Frontend:** `npm run build` compiles. Manual: click template → detail with its invoices; click invoice → official sheet; Download PDF → print preview shows only the invoice sheet; Settings (admin) saves and the invoice header reflects it.

## Non-goals
- No logo/image upload. No multi-currency. No tax/GST lines (single amount). No server-side PDF. No new npm/Python deps.

## Files

**Backend:** `models.py` (+model), `schemas.py` (+schemas), `routers/settings.py` (new), `routers/fees.py` (+3 endpoints/filter), `main.py` (register), `test_smoke.py` (asserts).
**Frontend:** `App.jsx` (routes + NAV), `pages/Fees.jsx` (clickable rows), `pages/InvoiceDetail.jsx` (new), `pages/FeeStructureDetail.jsx` (new), `pages/Settings.jsx` (new). Possibly `index.css` (print body bg).
