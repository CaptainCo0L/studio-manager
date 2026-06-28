-- 001_indexes.sql — apply the 2026-06-28 perf-cleanup schema changes to an
-- EXISTING Postgres database without recreating it (no data loss).
--
-- New deployments don't need this: SQLAlchemy create_all() builds these on a
-- fresh DB. Run this only against a pre-existing DB that predates the change.
--
-- Run on TrueNAS/Docker:
--   docker compose exec -T db psql -U studio -d studio -f - < backend/migrations/001_indexes.sql
-- (adjust -U / -d if your POSTGRES_USER / POSTGRES_DB differ)
--
-- Idempotent: safe to re-run.

BEGIN;

-- Foreign-key indexes added in models.py (match SQLAlchemy's ix_<table>_<col> naming).
CREATE INDEX IF NOT EXISTS ix_batch_enrollments_student_id ON batch_enrollments (student_id);
CREATE INDEX IF NOT EXISTS ix_batch_enrollments_batch_id   ON batch_enrollments (batch_id);
CREATE INDEX IF NOT EXISTS ix_attendance_session_id        ON attendance (session_id);
CREATE INDEX IF NOT EXISTS ix_attendance_student_id        ON attendance (student_id);
CREATE INDEX IF NOT EXISTS ix_sessions_tutor_id            ON sessions (tutor_id);
CREATE INDEX IF NOT EXISTS ix_sessions_batch_id            ON sessions (batch_id);
CREATE INDEX IF NOT EXISTS ix_payments_batch_id            ON payments (batch_id);

-- Drop the legacy Batch scheduling columns removed from the model.
-- (Dropping default_tutor_id also drops its FK constraint.)
ALTER TABLE batches DROP COLUMN IF EXISTS weekly_days;
ALTER TABLE batches DROP COLUMN IF EXISTS start_time;
ALTER TABLE batches DROP COLUMN IF EXISTS end_time;
ALTER TABLE batches DROP COLUMN IF EXISTS default_tutor_id;

COMMIT;
