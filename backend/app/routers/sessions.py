from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_staff
from ..models import Attendance, Batch, BatchEnrollment, Session as ClassSession, User
from ..routers.students import _visible_student_ids
from ..schemas import GenerateIn, SessionCreate, SessionOut

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionOut])
def list_sessions(
    batch_id: int | None = None,
    tutor_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    student_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(ClassSession)
    visible = _visible_student_ids(db, user)
    if visible is not None:
        # parents see only sessions their children attend
        sess_ids = db.query(Attendance.session_id).filter(
            Attendance.student_id.in_(visible or {-1})
        )
        q = q.filter(ClassSession.id.in_(sess_ids))
    if batch_id:
        q = q.filter(ClassSession.batch_id == batch_id)
    if tutor_id:
        q = q.filter(ClassSession.tutor_id == tutor_id)
    if date_from:
        q = q.filter(ClassSession.date >= date_from)
    if date_to:
        q = q.filter(ClassSession.date <= date_to)
    if student_id:
        sess_ids = db.query(Attendance.session_id).filter(Attendance.student_id == student_id)
        q = q.filter(ClassSession.id.in_(sess_ids))
    return q.order_by(ClassSession.date.desc(), ClassSession.id.desc()).all()


@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    sess = _get(db, session_id)
    # parents may only see sessions one of their children attends
    visible = _visible_student_ids(db, user)
    if visible is not None and not (
        db.query(Attendance)
        .filter(Attendance.session_id == session_id, Attendance.student_id.in_(visible or {-1}))
        .first()
    ):
        raise HTTPException(status_code=404, detail="Session not found")
    return sess


@router.post("", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    if payload.session_type not in ("batch", "private", "dropin"):
        raise HTTPException(status_code=400, detail="Invalid session_type")
    data = payload.model_dump(exclude={"student_id"})
    sess = ClassSession(**data)
    db.add(sess)
    db.flush()
    # private/dropin: auto-mark the named student present
    if payload.session_type in ("private", "dropin") and payload.student_id:
        db.add(Attendance(session_id=sess.id, student_id=payload.student_id, status="present"))
    db.commit()
    db.refresh(sess)
    return sess


@router.post("/{batch_id}/generate", response_model=list[SessionOut])
def generate_sessions(
    batch_id: int, payload: GenerateIn, db: Session = Depends(get_db), _=Depends(require_staff)
):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    days = {int(d) for d in batch.weekly_days.split(",") if d.strip() != ""}
    if not days:
        raise HTTPException(status_code=400, detail="Batch has no weekly_days set")

    created: list[ClassSession] = []
    today = date.today()
    for offset in range(payload.weeks * 7):
        day = today + timedelta(days=offset)
        if day.weekday() not in days:
            continue
        exists = (
            db.query(ClassSession)
            .filter(ClassSession.batch_id == batch_id, ClassSession.date == day)
            .first()
        )
        if exists:
            continue
        sess = ClassSession(
            session_type="batch",
            date=day,
            start_time=batch.start_time,
            end_time=batch.end_time,
            tutor_id=batch.default_tutor_id,
            batch_id=batch_id,
        )
        db.add(sess)
        created.append(sess)
    db.commit()
    for s in created:
        db.refresh(s)
    return created


def _get(db: Session, session_id: int) -> ClassSession:
    sess = db.get(ClassSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return sess
