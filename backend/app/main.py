from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine
from .routers import (
    attendance,
    auth,
    batches,
    fees,
    notifications,
    payments,
    reports,
    sessions,
    students,
    tutors,
    users,
)
from .seed import seed_admin


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

for r in (
    auth,
    users,
    tutors,
    batches,
    students,
    sessions,
    attendance,
    fees,
    payments,
    reports,
    notifications,
):
    app.include_router(r.router)


@app.get("/health")
def health():
    return {"status": "ok"}
