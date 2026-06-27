from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .auth import decode_token
from .database import Base, SessionLocal, engine
from .models import AuditLog, User
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
        if request.method in AUDIT_METHODS and not request.url.path.startswith("/auth"):
            user_id, user_email = None, "anonymous"
            authz = request.headers.get("authorization", "")
            if authz.lower().startswith("bearer "):
                try:
                    user_id = int(decode_token(authz.split(" ", 1)[1]).get("sub"))
                except Exception:
                    user_id = None
            db = SessionLocal()
            try:
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
    app.include_router(r.router)


@app.get("/health")
def health():
    return {"status": "ok"}
