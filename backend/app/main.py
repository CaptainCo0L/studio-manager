from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse

from .auth import decode_token
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # No migrations yet — create_all on startup (consider Alembic if schema churns)
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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    response = await call_next(request)
    # Record mutations only; never let auditing break the request.
    try:
        if request.method in AUDIT_METHODS and not request.url.path.startswith("/api/auth"):
            user_id, user_email = None, "anonymous"
            authz = request.headers.get("authorization", "")
            if authz.lower().startswith("bearer "):
                try:
                    user_id = int(decode_token(authz.split(" ", 1)[1]).get("sub"))
                except Exception:
                    user_id = None
            db = SessionLocal()
            try:
                s = db.get(StudioSettings, 1)
                if s is not None and not s.audit_enabled:
                    return response  # auditing turned off
                if user_id is not None:
                    u = db.get(User, user_id)
                    user_email = u.email if u else f"#{user_id}"
                db.add(AuditLog(
                    user_id=user_id, user_email=user_email,
                    method=request.method, path=request.url.path,
                    status_code=response.status_code,
                ))
                db.commit()
            finally:
                db.close()
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
