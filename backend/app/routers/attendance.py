from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Attendance, BatchEnrollment, Session as ClassSession, Student, User
from ..routers.students import _visible_student_ids
from ..routers.tutors import _visible_tutor_id
from ..schemas import AttendanceBulk, AttendanceOut, RosterRow

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _can_mark(db: Session, user: User, sess: ClassSession) -> bool:
    """Staff mark any session; a tutor only their own; nobody else."""
    if user.role in ("admin", "staff"):
        return True
    if user.role == "tutor":
        return sess.tutor_id == _visible_tutor_id(db, user)
    return False


@router.post("/bulk", response_model=list[AttendanceOut])
def mark_bulk(payload: AttendanceBulk, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sess = db.get(ClassSession, payload.session_id)
    if not sess or not _can_mark(db, user, sess):
        # 404 (not 403) so a tutor can't probe other tutors' session ids
        raise HTTPException(status_code=404, detail="Session not found")
    valid = {"present", "absent"}
    out = []
    for item in payload.items:
        if item.status not in valid:
            raise HTTPException(status_code=400, detail=f"Invalid status {item.status}")
        rec = (
            db.query(Attendance)
            .filter(
                Attendance.session_id == payload.session_id,
                Attendance.student_id == item.student_id,
            )
            .first()
        )
        if rec:
            rec.status = item.status
        else:
            rec = Attendance(
                session_id=payload.session_id, student_id=item.student_id, status=item.status
            )
            db.add(rec)
        out.append(rec)
    db.commit()
    for r in out:
        db.refresh(r)
    return out


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    session_id: int | None = None,
    student_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Attendance)
    visible = _visible_student_ids(db, user)
    if visible is not None:
        q = q.filter(Attendance.student_id.in_(visible or {-1}))
    if session_id:
        q = q.filter(Attendance.session_id == session_id)
    if student_id:
        q = q.filter(Attendance.student_id == student_id)
    return q.order_by(Attendance.id).all()


@router.get("/roster/{session_id}", response_model=list[RosterRow])
def roster(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Roster for a batch session: auto-fill enrolled students not yet marked."""
    sess = db.get(ClassSession, session_id)
    if not sess or not _can_mark(db, user, sess):
        raise HTTPException(status_code=404, detail="Session not found")
    if sess.batch_id:
        enrolled = (
            db.query(BatchEnrollment.student_id)
            .filter(BatchEnrollment.batch_id == sess.batch_id, BatchEnrollment.is_active.is_(True))
            .all()
        )
        existing = {
            a.student_id
            for a in db.query(Attendance).filter(Attendance.session_id == session_id).all()
        }
        for (sid,) in enrolled:
            if sid not in existing:
                # default present: most students attend, so this minimises marking
                db.add(Attendance(session_id=session_id, student_id=sid, status="present"))
        db.commit()
    rows = (
        db.query(Attendance)
        .filter(Attendance.session_id == session_id)
        .order_by(Attendance.student_id)
        .all()
    )
    names = {s.id: s.name for s in db.query(Student).filter(Student.id.in_([r.student_id for r in rows] or [-1])).all()}
    return [
        RosterRow(id=r.id, session_id=r.session_id, student_id=r.student_id, status=r.status,
                  student_name=names.get(r.student_id, f"#{r.student_id}"))
        for r in rows
    ]
