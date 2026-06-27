from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_staff
from ..models import (
    Attendance,
    FeeInvoice,
    Payment,
    Session as ClassSession,
    Tutor,
)

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


@router.get("/tutor-sessions")
def tutor_sessions(db: Session = Depends(get_db), _=Depends(require_staff)):
    out = []
    for tutor in db.query(Tutor).order_by(Tutor.name).all():
        sessions = db.query(ClassSession).filter(ClassSession.tutor_id == tutor.id)
        total = sessions.count()
        private = sessions.filter(ClassSession.session_type == "private").all()
        # private earnings = sum of session rates; payout uses tutor.default_rate per session
        earnings = sum(float(s.rate or 0) for s in private)
        payout = float(tutor.default_rate or 0) * len(private)
        out.append(
            {
                "tutor_id": tutor.id,
                "tutor": tutor.name,
                "session_count": total,
                "private_sessions": len(private),
                "private_earnings": earnings,
                "estimated_payout": payout,
            }
        )
    return out


