# More Staff Dashboard Cards — Design

**Date:** 2026-06-27
**Scope:** Add four panels to the staff dashboard — Today's classes, Attendance snapshot, Outstanding fees, Fee collection progress. Frontend only (`Dashboard.jsx`), existing endpoints.

## Cards (all staff-only, in `StaffDashboard`)
- **TodaysClasses** — `GET /sessions?date_from=<today>&date_to=<today>`; lists today's sessions (time · type · batch name) linking to `/sessions/:id`. Batch names from the dashboard's existing `/batches` (passed as prop). Empty → "No classes today."
- **AttendanceSnapshot** — `GET /reports/attendance-summary`; attendance rate = `present/(present+absent)` shown large, with present/absent counts. Empty → "No attendance recorded yet."
- **OutstandingFees** — `GET /fees/invoices?unpaid=true`; count + total owed, top 5 by balance linking to `/fees/invoices/:id`, an "overdue" tag when `due_date < today`. Student names from existing `/students` (prop). Empty → "All paid up."
- **CollectionProgress** — reuses the dashboard's `/reports/fee-collection`; progress bar `collected_on_invoices / invoiced` (width clamped to 100%) with "₹X of ₹Y (Z%)".

## Layout
Stat row unchanged. Panels in `grid gap-4 lg:grid-cols-2`, order: TodaysClasses · AttendanceSnapshot · OutstandingFees · CollectionProgress · UpcomingSessions · RecentPayments. New components reuse `Panel`/`Card`/`useApi`/`inr`.

## Data
`StaffDashboard` keeps fetching `/students`, `/batches`, `/reports/fee-collection`; passes `students`/`batches`/`fees` data to the cards that need names/totals (no duplicate calls). Net-new calls: attendance-summary, unpaid invoices, today's sessions.

## Verification
`npm run build`; manual against seeded data — today's classes show today's sessions; attendance rate computes; outstanding lists students with balances (clickable, overdue tags); collection bar matches fee-collection. No backend/smoke change.

## Files
- `frontend/src/pages/Dashboard.jsx`.
