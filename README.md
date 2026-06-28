# Studio Manager

[![Build & push images](https://github.com/CaptainCo0L/studio-manager/actions/workflows/build.yml/badge.svg)](https://github.com/CaptainCo0L/studio-manager/actions/workflows/build.yml)

Self-hosted management app for an art class — recurring weekly **batches**, ad-hoc
**drop-ins**, and one-on-one **private lessons** (billed per session).

- **Backend:** FastAPI + PostgreSQL, JWT auth, role-based access. Seeds the first admin on boot.
- **Frontend:** React + Vite + Tailwind.
- **Deploy:** Docker Compose — postgres + a single **app** image (FastAPI serves the
  built UI and the API together on one port; API lives under `/api`).

## Roles

| Role   | Access |
|--------|--------|
| admin  | Everything, including user management |
| staff  | Everything except user accounts |
| parent | Read-only portal — only their linked children's sessions and attendance |

## Quick start (local, Docker)

```bash
cp .env.example .env        # then edit secrets
docker compose up --build
```

- App (UI + API): http://localhost:8000
- API docs: http://localhost:8000/docs
- Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

## Local dev (no Docker)

```bash
# Backend
cd backend
python -m venv .venv && . .venv/Scripts/activate   # or source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="sqlite:///./dev.db"            # or point at Postgres
uvicorn app.main:app --reload

# Frontend (separate terminal) — proxies /api -> http://localhost:8000
cd frontend
npm install
npm run dev
```

## Install on TrueNAS SCALE

TrueNAS SCALE runs Docker workloads. Two common paths:

### Option A — Custom App (docker compose)

1. **Apps → Discover Apps → Custom App** (or the "Install via YAML" option).
2. Paste the contents of `docker-compose.yml`.
3. Add the environment variables from `.env.example` (set real secrets for
   `POSTGRES_PASSWORD`, `JWT_SECRET`, `ADMIN_PASSWORD`).
4. Map a dataset to the `db_data` volume so the database survives upgrades
   (e.g. `/mnt/tank/apps/studio/db`).
5. Deploy. Access the app (UI + API) on the host's IP at port `8000`.

### Option B — Pull the prebuilt image

A single image is published to GHCR by the GitHub Action on every push to `main`:

- `ghcr.io/<owner>/<repo>:latest`

Use the ready-made `docker-compose.hub.yml` (pulls it instead of building):

```bash
cp .env.example .env        # then edit secrets
docker compose -f docker-compose.hub.yml up -d
```

The GitHub Action rebuilds and republishes `:latest` (and a `:sha-…` tag) on
every push to `main` — no manual push step needed.

### Notes

- **First boot** auto-creates the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
  This only happens when there are zero users — change the password after first login.
- **Backups:** snapshot the dataset backing `db_data`.
- **HTTPS:** put TrueNAS's built-in reverse proxy (or Traefik/nginx) in front of
  port 8000 for TLS.

## Notifications

Pluggable providers, all optional:

- **Email (SMTP):** works once `SMTP_HOST` etc. are set. A receipt is auto-emailed
  on payment when the student's guardian email is on file.
- **SMS (Twilio)** / **WhatsApp (Meta Business API):** activate when their creds are
  set in `.env`; otherwise attempts are logged as `disabled` (no error).

## Schema migrations

Tables are created on startup (`Base.metadata.create_all`) — no migrations yet.
If the schema starts churning, add Alembic.
