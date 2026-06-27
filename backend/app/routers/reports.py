from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_staff
from ..models import (
    Attendance,
    FeeInvoice,
    Payment,
    Session as ClassSession,
    Tutor,
    User,
)
from ..routers.tutors import _visible_tutor_id

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/attendance-summary")
def attendance_summary(db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = (
        db.query(Attendance.status, func.count(Attendance.id))
        .group_by(Attendance.status)
        .all()
    )
    return {status: count for status, count in rows}


@router.get("/fee-collection")
def fee_collection(db: Session = Depends(get_db), _=Depends(require_staff)):
    due = db.query(func.coalesce(func.sum(FeeInvoice.amount_due), 0)).scalar()
    paid = db.query(func.coalesce(func.sum(FeeInvoice.amount_paid), 0)).scalar()
    outstanding = db.query(func.coalesce(func.sum(FeeInvoice.balance), 0)).scalar()
    payments_total = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar()
    return {
        "invoiced": float(due),
        "collected_on_invoices": float(paid),
        "outstanding": float(outstanding),
        "payments_total": float(payments_total),
    }


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


@router.get("/tutor-sessions")
def tutor_sessions(db: Session = Depends(get_db), _=Depends(require_staff)):
    return [_tutor_figures(db, t) for t in db.query(Tutor).order_by(Tutor.name).all()]


@router.get("/my-earnings")
def my_earnings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "tutor":
        raise HTTPException(status_code=403, detail="Tutors only")
    tid = _visible_tutor_id(db, user)
    tutor = db.get(Tutor, tid) if tid and tid != -1 else None
    if not tutor:
        raise HTTPException(status_code=404, detail="No linked tutor")
    return _tutor_figures(db, tutor)


