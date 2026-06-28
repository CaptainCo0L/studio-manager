import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_staff
from ..models import (
    Attendance,
    Batch,
    BatchEnrollment,
    Payment,
    Session as ClassSession,
    Student,
    Tutor,
    User,
)
from ..routers.tutors import _visible_tutor_id

router = APIRouter(prefix="/reports", tags=["reports"])

MONTH_RE = re.compile(r"^\d{4}-\d{2}$")  # YYYY-MM, same check the attendance grid uses


@router.get("/dues")
def dues(
    month: str,
    batch_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    """Outstanding batch fees for a month: per active enrollment in a fee-bearing
    batch, outstanding = monthly_fee - (sum of payments tagged that student/batch/month).
    Two queries, no N+1. 'Expected payers' = currently-active enrollments (no
    enrollment-date history exists to reconstruct mid-month joins)."""
    if not MONTH_RE.match(month):
        raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    enr = (
        db.query(
            BatchEnrollment.student_id, Batch.id, Batch.name,
            Batch.monthly_fee, Student.name, Student.guardian_phone,
        )
        .join(Batch, Batch.id == BatchEnrollment.batch_id)
        .join(Student, Student.id == BatchEnrollment.student_id)
        .filter(
            BatchEnrollment.is_active.is_(True),
            Student.is_active.is_(True),
            Batch.is_active.is_(True),
            Batch.monthly_fee.isnot(None),
        )
    )
    if batch_id:
        enr = enr.filter(Batch.id == batch_id)
    paid = {
        (sid, bid): float(amt)
        for sid, bid, amt in db.query(
            Payment.student_id,
            Payment.batch_id,
            func.coalesce(func.sum(Payment.amount), 0),
        )
        .filter(Payment.period_month == month)
        .group_by(Payment.student_id, Payment.batch_id)
        .all()
    }
    rows = []
    for sid, bid, bname, fee, sname, phone in enr.all():
        p = paid.get((sid, bid), 0.0)
        outstanding = round(float(fee or 0) - p, 2)
        if outstanding > 0:
            rows.append({
                "student_id": sid, "student_name": sname,
                "batch_id": bid, "batch_name": bname, "guardian_phone": phone,
                "period_month": month, "fee": float(fee or 0),
                "paid": p, "outstanding": outstanding,
            })
    rows.sort(key=lambda r: (r["batch_name"], r["student_name"]))
    return {
        "month": month,
        "count": len(rows),
        "total_outstanding": round(sum(r["outstanding"] for r in rows), 2),
        "rows": rows,
    }


@router.get("/attendance-summary")
def attendance_summary(db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = (
        db.query(Attendance.status, func.count(Attendance.id))
        .group_by(Attendance.status)
        .all()
    )
    return {status: count for status, count in rows}


def _tutor_figures(db: Session, tutor: Tutor) -> dict:
    sessions = db.query(ClassSession).filter(ClassSession.tutor_id == tutor.id)
    total = sessions.count()
    private = sessions.filter(ClassSession.session_type == "private").all()
    # private earnings = sum of session rates; payout uses tutor.default_rate per session
    return {
        "tutor_id": tutor.id,
        "tutor": tutor.name,
        "session_count": total,
        "private_sessions": len(private),
        "private_earnings": sum(float(s.rate or 0) for s in private),
        "estimated_payout": float(tutor.default_rate or 0) * len(private),
    }


@router.get("/my-earnings")
def my_earnings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "tutor":
        raise HTTPException(status_code=403, detail="Tutors only")
    tid = _visible_tutor_id(db, user)
    tutor = db.get(Tutor, tid) if tid and tid != -1 else None
    if not tutor:
        raise HTTPException(status_code=404, detail="No linked tutor")
    return _tutor_figures(db, tutor)


