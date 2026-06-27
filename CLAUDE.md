# Studio Manager — Project Spec

Self-hosted management app for an art class (TrueNAS SCALE / Docker).
Handles recurring weekly **batches**, ad-hoc **drop-ins**, and one-on-one **private lessons** (billed per session).

## Stack
- **Backend:** FastAPI + PostgreSQL, JWT auth, role-based perms. Auto-seeds first admin on boot.
- **Frontend:** React + Vite + Tailwind. Palette: warm canvas / terracotta / sage. Responsive.
- **Deploy:** Docker. Source → git repo; image → container registry (ghcr.io + GitHub Actions). Secrets in `.env` (git-ignored).

## Roles
- **admin** — full access incl. user management.
- **staff** — all except user accounts.
- **parent** — read-only portal; sees only their own linked children's sessions and attendance.
- **tutor** — portal scoped to their own sessions; marks attendance for them and sees their own earnings/payout. Linked to a Tutor record via `Tutor.linked_user_id`. Isolation via `_visible_tutor_id()` in `routers/tutors.py`.

## Data model (SQLAlchemy)
- **User** — login account (admin/staff/parent).
- **Tutor** — teaching directory, *separate from logins*. `is_guest` = no account. Optional `linked_user_id`, `default_rate`.
- **Batch** — recurring group: `weekly_days` (Mon=0..Sun=6, CSV e.g. "1,3"), start/end time, `default_tutor_id`.
- **Student** — guardian name/phone/email. No single class — uses enrollment.
- **BatchEnrollment** — M:N student↔batch (`is_active`).
- **ParentLink** — M:N parent-user↔student.
- **Session** — one class occurrence. `session_type` = batch|private|dropin. Has date, optional times, `rate` (private/dropin), `tutor_id`, `batch_id`.
- **Attendance** — per (session, student). status = present|absent. Unique on (session_id, student_id).
- **Payment** — cash|card|upi|bank_transfer|other. Standalone ledger; optional `student_id`, `session_id` (private lesson), `note`.
- **Notification** — channel email|sms|whatsapp, status pending|sent|failed|disabled.

## API routes (prefix shown)
- `/auth/login` → JWT (OAuth2 password form).
- `/users` — list/create (admin), `/me`, enable/disable. Parent create accepts `student_ids`; tutor create accepts `tutor_id` (links the Tutor). `PUT /me`, `POST /me/password` for self-service.
- `/tutors` — CRUD-ish, deactivate.
- `/batches` — list (w/ student_count), create/update/delete, `/{id}/students`.
- `/students` — list (search, batch filter), get/create/update/delete; `/enroll`, `/unenroll`. Parents see only linked kids.
- `/sessions` — list (filters: batch/tutor/date/student), create (auto-marks student present for private/dropin), `/{batch_id}/generate` (makes sessions for next N weeks from batch schedule).
- `/attendance` — `/bulk` (mark roster), list (filters). Batch roster auto-fills from enrollment.
- `/payments` — list, create (emails receipt if guardian email present).
- `/reports` — `attendance-summary`, `tutor-sessions` (counts + private earnings/payouts), `my-earnings` (tutor's own).
- `/notifications` — list, send.

## Notifications
Pluggable providers. **Email (SMTP)** works once configured. **SMS (Twilio)** + **WhatsApp (Meta Business API)** activate when their `.env` creds are set; otherwise log as `disabled` (no error). Receipt auto-sent on payment when guardian email exists.

## Frontend pages
Login; role-aware Dashboard; Students + StudentDetail (enroll/unenroll, attendance calendar); Batches (create, generate sessions); Tutors; Sessions + SessionDetail (mark roster, record private payment); Payments; Reports; Users (admin); Audit (admin); global search; dark mode. Parent: MySessions. Tutor: My Sessions (mark attendance), My Earnings. Auth + role guards in `App.jsx`.

## Status
- Backend: **complete, tested end-to-end** (login, batches, students, sessions, attendance, payments, reports, parent + tutor isolation, audit).
- Frontend: all pages written; **not yet build-verified**.

## TODO (deployment)
1. Frontend Dockerfile + nginx (serve build, proxy `/api` → backend).
2. `docker-compose.yml` (postgres + backend + frontend).
3. `.env.example`, `.gitignore`.
4. GitHub Actions: build + push images to ghcr.io on push.
5. README (TrueNAS install steps).
6. `npm run build` to verify React compiles.

## Conventions
- Currency shown as ₹.
- New backend route → register in `app/main.py`. New model → `Base.metadata.create_all` runs on startup (no migrations yet; consider Alembic if schema churns).
- Parent data isolation enforced via `_visible_student_ids()` in `routers/students.py` — reuse it for any new student-scoped endpoint.
