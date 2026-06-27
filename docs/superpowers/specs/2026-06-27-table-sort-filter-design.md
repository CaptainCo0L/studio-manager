# Excel-like Sort + Filter on All Tables — Design

**Date:** 2026-06-27
**Scope:** Add click-to-sort column headers and a per-table quick-filter text box to every list table, via the shared `Table` component. Client-side, no backend changes, no new deps.

## Decisions (from brainstorming)

- **Filter:** one quick-filter text input per table (case-insensitive contains across sortable columns).
- **Sort:** click a sortable header to cycle asc → desc → off, with ▲/▼ indicator.
- Backward-compatible: plain-string columns keep working (header only, not sortable/searchable).

## `Table` component (`frontend/src/ui.jsx`)

### API
- `columns`: array where each entry is **either**:
  - a `string` (header only — not sortable, not searchable), or
  - `{ label: string, sort?: (row) => any, align?: "right" }`. A column with `sort` is sortable + searchable.
- `filter?: boolean` — show the quick-filter box. Default: `true` when any column has `sort`, else `false`.
- Unchanged: `rows`, `render`, `empty`, `onRowClick`.

### Behavior (internal `useState`)
- State: `sortIdx` (column index or null), `sortDir` (`"asc"|"desc"`), `query` (string).
- **Filter step:** if `query`, keep rows where any sortable column's `String(sort(row)).toLowerCase()` includes `query.toLowerCase()`.
- **Sort step:** if `sortIdx != null`, sort a **copy** of the filtered rows by that column's `sort`:
  - comparator: if both values are `number`, numeric subtract; else `String(a).localeCompare(String(b))`.
  - `desc` negates; **stable** via original-index tiebreak (decorate with index, compare, undecorate).
- Header rendering: sortable columns render a `<button>` with label + an arrow (`▲` asc, `▼` desc, faint `↕` when inactive); string columns render plain `<th>`. Clicking cycles asc→desc→off (off ⇒ `sortIdx=null`).
- Quick-filter: a `.input max-w-xs mb-3` above the table card, placeholder `"Filter…"`, bound to `query`.
- Empty: existing `empty` prop when `rows` is empty; show a `"No matches."` card when a filter removes everything.
- `onRowClick(row)` receives the actual (filtered/sorted) row object — unchanged semantics.

### Helper (testable)
Extract the comparator as a module-local pure function `compareBy(sort, dir)` returning a comparator usable by `Array.prototype.sort`, so the ordering logic is isolated. (No test runner exists in this repo; verification is build + manual, consistent with the codebase.)

## Consumers — columns to upgrade

Action/`""`/buttons columns stay plain strings. Derived display values use a matching accessor.

- **Sessions** (`Sessions.jsx`): Date `r=>r.date`, Type `r=>r.session_type`, Batch `r=>r.batch_id ?? 0`; `""` stays string.
- **Payments** (`Payments.jsx`): `#` `r=>r.id`, Student `p=>nameOf(p.student_id)`, Amount `p=>Number(p.amount)`, Method `p=>p.method`, Invoice `p=>p.invoice_id ?? p.session_id ?? 0`, When `p=>p.created_at`.
- **Fees templates** (`Fees.jsx`): Name `f=>f.name`, Batch `f=>f.batch_id`, Amount `f=>Number(f.amount)`, Period `f=>f.period`; trailing `""` string.
- **Fees invoices** (`Fees.jsx`): Student `i=>nameOf(i.student_id)`, Due `i=>Number(i.amount_due)`, Paid `i=>Number(i.amount_paid)`, Balance `i=>Number(i.balance)`, Status `i=>i.status`; trailing `""` string.
- **Reports tutor table** (`Reports.jsx`): Tutor `t=>t.tutor`, Sessions `t=>t.session_count`, Private `t=>t.private_sessions`, Earnings `t=>Number(t.private_earnings)`, Est. payout `t=>Number(t.estimated_payout)`.
- **Users** (`Users.jsx`): Email `u=>u.email`, Role `u=>u.role`, Status `u=>u.is_active`; trailing `""` string.
- **StudentDetail batches** (`StudentDetail.jsx`): Batch `b=>b.name`, Days `b=>b.weekly_days`; trailing `""` string.
- **StudentDetail invoices** (`StudentDetail.jsx`): Due `i=>Number(i.amount_due)`, Paid `i=>Number(i.amount_paid)`, Balance `i=>Number(i.balance)`, Status `i=>i.status`; trailing `""` string.
- **FeeStructureDetail invoices** (`FeeStructureDetail.jsx`): Student `i=>nameOf(i.student_id)`, Due `i=>Number(i.amount_due)`, Paid `i=>Number(i.amount_paid)`, Balance `i=>Number(i.balance)`, Status `i=>i.status`.
- **MySessions** (`MySessions.jsx`): Date `s=>s.date`, Type `s=>s.session_type`, Time `s=>s.start_time || ""`.
- **MyFees invoices** (`MyFees.jsx`): Due `i=>Number(i.amount_due)`, Paid `i=>Number(i.amount_paid)`, Balance `i=>Number(i.balance)`, Status `i=>i.status`.
- **MyFees payments** (`MyFees.jsx`): Amount `p=>Number(p.amount)`, Method `p=>p.method`, When `p=>p.created_at`.

## Verification
- `npm run build` compiles.
- Manual: on Payments/Sessions/Fees — sort each column both directions (money/dates order numerically, not lexically), type in the filter box and confirm rows narrow, clear it, confirm `onRowClick` opens the correct row (Fees invoice, FeeStructureDetail row).
- Rebuild frontend docker image to ship.

## Non-goals
- No backend changes, no server-side sort/pagination, no per-column dropdown filters, no new dependencies.

## Files
- `frontend/src/ui.jsx` (Table upgrade).
- `frontend/src/pages/`: `Sessions.jsx`, `Payments.jsx`, `Fees.jsx`, `Reports.jsx`, `Users.jsx`, `StudentDetail.jsx`, `FeeStructureDetail.jsx`, `MySessions.jsx`, `MyFees.jsx`.
