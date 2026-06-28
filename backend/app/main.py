import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from .auth import decode_token
from .config import insecure_defaults
from .config import settings as cfg  # 'settings' name is taken by the router module below
from .database import Base, SessionLocal, engine
from .models import AuditLog, StudioSettings, User
from .routers import (
    attendance,
    audit,
    auth,
    batches,
    notifications,
    payments,
    reports,
    search,
    sessions,
    settings,
    students,
    tutors,
    users,
)
from .seed import seed_admin

AUDIT_METHODS = {"POST", "PUT", "DELETE", "PATCH"}
log = logging.getLogger("studio")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Refuse to boot a prod deploy still using the dev placeholder secrets; in dev
    # just warn so zero-.env local runs (and tests) keep working untouched.
    bad = insecure_defaults()
    if bad:
        if cfg.app_env == "prod":
            raise RuntimeError(
                f"Refusing to start: {', '.join(bad)} still set to the insecure "
                f"default. Set real values in .env (APP_ENV=prod)."
            )
        log.warning("Using insecure default %s — fine for dev, NOT for prod.", ", ".join(bad))
    # Schema is created here via create_all for zero-config single-container boot.
    # ponytail: Alembic is wired (backend/alembic) for schema *changes*; run
    # `alembic upgrade head` on deploy when migrations exist. create_all stays the
    # fresh-install path.
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Studio Manager", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cfg.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _write_audit(method: str, path: str, authz: str, status_code: int) -> None:
    """Blocking audit write. Runs in a threadpool so it never blocks the loop."""
    user_id, user_email = None, "anonymous"
    if authz.lower().startswith("bearer "):
        try:
            user_id = int(decode_token(authz.split(" ", 1)[1]).get("sub"))
        except Exception:
            user_id = None
    db = SessionLocal()
    try:
        s = db.get(StudioSettings, 1)
        if s is not None and not s.audit_enabled:
            return  # auditing turned off
        if user_id is not None:
            u = db.get(User, user_id)
            user_email = u.email if u else f"#{user_id}"
        db.add(AuditLog(
            user_id=user_id, user_email=user_email,
            method=method, path=path, status_code=status_code,
        ))
        db.commit()
    finally:
        db.close()


@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    response = await call_next(request)
    # Record mutations only; never let auditing break the request. The DB write is
    # synchronous, so defer it to a threadpool to keep it off the event loop.
    try:
        if request.method in AUDIT_METHODS and not request.url.path.startswith("/api/auth"):
            await run_in_threadpool(
                _write_audit,
                request.method,
                request.url.path,
                request.headers.get("authorization", ""),
                response.status_code,
            )
    except Exception:
        pass
    return response

for r in (
    auth,
    users,
    tutors,
    batches,
    students,
    sessions,
    attendance,
    payments,
    reports,
    notifications,
    search,
    settings,
    audit,
):
    app.include_router(r.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve the built SPA (single-image deploy). Only active when the bundle has been
# copied in (Docker build / local verify); absent in dev + tests, where this is a
# no-op and the frontend is served by Vite. Registered last, so /api/* and /health win.
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.is_dir():
    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # Unknown API paths must 404 (don't hand an API client the SPA HTML).
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        target = (STATIC_DIR / full_path).resolve()
        # Path-traversal guard: only serve real files inside STATIC_DIR.
        if full_path and STATIC_DIR in target.parents and target.is_file():
            return FileResponse(target)
        return FileResponse(STATIC_DIR / "index.html")
