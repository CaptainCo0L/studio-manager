from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_staff
from ..models import Attendance, Batch, Session as ClassSession, Tutor, User
from ..routers.students import _visible_student_ids
from ..routers.tutors import _visible_tutor_id
from ..schemas import SessionCreate, SessionOut

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
    if user.role == "tutor":
        # tutors see only their own sessions
        q = q.filter(ClassSession.tutor_id == _visible_tutor_id(db, user))
    else:
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
    sessions = q.order_by(ClassSession.date.desc(), ClassSession.id.desc()).all()
    # Attach batch/tutor names in two bulk lookups (no per-row queries) so the
    # client doesn't have to fetch all batches/tutors to map ids -> names.
    bids = {s.batch_id for s in sessions if s.batch_id}
    tids = {s.tutor_id for s in sessions if s.tutor_id}
    bnames = dict(db.query(Batch.id, Batch.name).filter(Batch.id.in_(bids or {-1})).all())
    tnames = dict(db.query(Tutor.id, Tutor.name).filter(Tutor.id.in_(tids or {-1})).all())
    for s in sessions:
        s.batch_name = bnames.get(s.batch_id)
        s.tutor_name = tnames.get(s.tutor_id)
    return sessions


@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    sess = _get(db, session_id)
    if user.role == "tutor":
        # tutors may only see their own sessions
        if sess.tutor_id != _visible_tutor_id(db, user):
            raise HTTPException(status_code=404, detail="Session not found")
        return sess
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


@router.put("/{session_id}", response_model=SessionOut)
def update_session(session_id: int, payload: SessionCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    sess = _get(db, session_id)
    if payload.session_type not in ("batch", "private", "dropin"):
        raise HTTPException(status_code=400, detail="Invalid session_type")
    # student_id is only for create-time auto-attendance; ignore on edit.
    for k, v in payload.model_dump(exclude={"student_id"}).items():
        setattr(sess, k, v)
    db.commit()
    db.refresh(sess)
    return sess


def _get(db: Session, session_id: int) -> ClassSession:
    sess = db.get(ClassSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return sess
