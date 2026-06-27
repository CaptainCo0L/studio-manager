from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_staff
from ..models import (
    Attendance,
    Batch,
    BatchEnrollment,
    ParentLink,
    Session as ClassSession,
    Student,
    User,
)
from ..schemas import AttendanceCalendarItem, BatchOut, EnrollIn, StudentCreate, StudentOut

router = APIRouter(prefix="/students", tags=["students"])


def _visible_student_ids(db: Session, user: User) -> set[int] | None:
    """Student ids a user may see. None == no restriction (admin/staff).

    Reuse this in any student-scoped endpoint to enforce parent isolation.
    """
    if user.role in ("admin", "staff"):
        return None
    rows = db.query(ParentLink.student_id).filter(ParentLink.parent_user_id == user.id).all()
    return {r[0] for r in rows}


@router.get("", response_model=list[StudentOut])
def list_students(
    search: str | None = None,
    batch_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Student)
    visible = _visible_student_ids(db, user)
    if visible is not None:
        q = q.filter(Student.id.in_(visible or {-1}))
    if search:
        q = q.filter(Student.name.ilike(f"%{search}%"))
    if batch_id:
        q = q.join(BatchEnrollment, BatchEnrollment.student_id == Student.id).filter(
            BatchEnrollment.batch_id == batch_id, BatchEnrollment.is_active.is_(True)
        )
    return q.order_by(Student.name).all()


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return _get_visible(db, user, student_id)


@router.get("/{student_id}/batches", response_model=list[BatchOut])
def student_batches(
    student_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _get_visible(db, user, student_id)
    return (
        db.query(Batch)
        .join(BatchEnrollment, BatchEnrollment.batch_id == Batch.id)
        .filter(BatchEnrollment.student_id == student_id, BatchEnrollment.is_active.is_(True))
        .order_by(Batch.name)
        .all()
    )


@router.get("/{student_id}/attendance-calendar", response_model=list[AttendanceCalendarItem])
def attendance_calendar(
    student_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _get_visible(db, user, student_id)  # 404 for parents on a non-visible student
    batch_ids = [
        b
        for (b,) in db.query(BatchEnrollment.batch_id)
        .filter(BatchEnrollment.student_id == student_id, BatchEnrollment.is_active.is_(True))
        .all()
    ]
    att_session_ids = db.query(Attendance.session_id).filter(Attendance.student_id == student_id)
    sessions = (
        db.query(ClassSession)
        .filter(or_(ClassSession.batch_id.in_(batch_ids), ClassSession.id.in_(att_session_ids)))
        .order_by(ClassSession.date)
        .all()
    )
    status_by_session = {
        a.session_id: a.status
        for a in db.query(Attendance).filter(Attendance.student_id == student_id).all()
    }
    return [
        AttendanceCalendarItem(
            date=s.date,
            session_id=s.id,
            session_type=s.session_type,
            status=status_by_session.get(s.id),
        )
        for s in sessions
    ]


@router.post("", response_model=StudentOut, status_code=201)
def create_student(payload: StudentCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    student = Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int, payload: StudentCreate, db: Session = Depends(get_db), _=Depends(require_staff)
):
    student = _get(db, student_id)
    for k, v in payload.model_dump().items():
        setattr(student, k, v)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    student = _get(db, student_id)
    db.delete(student)
    db.commit()


@router.post("/enroll", status_code=201)
def enroll(payload: EnrollIn, db: Session = Depends(get_db), _=Depends(require_staff)):
    existing = (
        db.query(BatchEnrollment)
        .filter(
            BatchEnrollment.student_id == payload.student_id,
            BatchEnrollment.batch_id == payload.batch_id,
        )
        .first()
    )
    if existing:
        existing.is_active = True
    else:
        db.add(BatchEnrollment(student_id=payload.student_id, batch_id=payload.batch_id))
    db.commit()
    return {"ok": True}


@router.post("/unenroll")
def unenroll(payload: EnrollIn, db: Session = Depends(get_db), _=Depends(require_staff)):
    existing = (
        db.query(BatchEnrollment)
        .filter(
            BatchEnrollment.student_id == payload.student_id,
            BatchEnrollment.batch_id == payload.batch_id,
        )
        .first()
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    existing.is_active = False
    db.commit()
    return {"ok": True}


def _get(db: Session, student_id: int) -> Student:
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


def _get_visible(db: Session, user: User, student_id: int) -> Student:
    visible = _visible_student_ids(db, user)
    if visible is not None and student_id not in visible:
        raise HTTPException(status_code=404, detail="Student not found")
    return _get(db, student_id)
