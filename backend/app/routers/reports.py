import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_staff
from ..models import (
    Attendance,
    FeeInvoice,
    Payment,
    Session as ClassSession,
    Student,
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


def _csv_response(header: list[str], rows: list[list], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/students.csv")
def students_csv(db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = [
        [s.id, s.name, s.guardian_name, s.guardian_phone, s.guardian_email, s.is_active]
        for s in db.query(Student).order_by(Student.name).all()
    ]
    return _csv_response(
        ["id", "name", "guardian_name", "guardian_phone", "guardian_email", "is_active"],
        rows,
        "students.csv",
    )


@router.get("/payments.csv")
def payments_csv(db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = [
        [p.id, p.student_id, float(p.amount), p.method, p.invoice_id, p.session_id, p.created_at]
        for p in db.query(Payment).order_by(Payment.id).all()
    ]
    return _csv_response(
        ["id", "student_id", "amount", "method", "invoice_id", "session_id", "created_at"],
        rows,
        "payments.csv",
    )
