from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_staff
from ..models import Batch, Payment, Student, User
from ..notify import send_notification
from ..routers.students import _visible_student_ids
from ..schemas import PaymentCreate, PaymentInvoiceOut, PaymentOut

router = APIRouter(prefix="/payments", tags=["payments"])

VALID_METHODS = {"cash", "card", "upi", "bank_transfer", "other"}


@router.get("", response_model=list[PaymentOut])
def list_payments(
    student_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Payment)
    visible = _visible_student_ids(db, user)
    if visible is not None:
        q = q.filter(Payment.student_id.in_(visible or {-1}))
    if student_id:
        q = q.filter(Payment.student_id == student_id)
    payments = q.order_by(Payment.id.desc()).all()
    # Attach student/batch names in two bulk lookups so the client needn't map ids.
    sids = {p.student_id for p in payments if p.student_id}
    bids = {p.batch_id for p in payments if p.batch_id}
    snames = dict(db.query(Student.id, Student.name).filter(Student.id.in_(sids or {-1})).all())
    bnames = dict(db.query(Batch.id, Batch.name).filter(Batch.id.in_(bids or {-1})).all())
    for p in payments:
        p.student_name = snames.get(p.student_id)
        p.batch_name = bnames.get(p.batch_id)
    return payments


@router.get("/{payment_id}", response_model=PaymentInvoiceOut)
def get_payment(payment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.get(Payment, payment_id)
    visible = _visible_student_ids(db, user)
    # 404 (not 403) when out of scope: don't leak existence
    if p is None or (visible is not None and p.student_id not in visible):
        raise HTTPException(status_code=404, detail="Payment not found")
    student = db.get(Student, p.student_id) if p.student_id else None
    batch = db.get(Batch, p.batch_id) if p.batch_id else None
    return PaymentInvoiceOut(
        id=p.id, student_id=p.student_id, amount=float(p.amount), method=p.method,
        batch_id=p.batch_id, period_month=p.period_month,
        session_id=p.session_id, note=p.note, created_at=p.created_at,
        student_name=student.name if student else None,
        guardian_name=student.guardian_name if student else None,
        guardian_phone=student.guardian_phone if student else None,
        guardian_email=student.guardian_email if student else None,
        batch_name=batch.name if batch else None,
    )


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    if payload.method not in VALID_METHODS:
        raise HTTPException(status_code=400, detail="Invalid payment method")

    # Non-session payments are monthly batch fees: student + batch + month required.
    if payload.session_id is None and not (payload.student_id and payload.batch_id and payload.period_month):
        raise HTTPException(status_code=400, detail="student, batch and month are required")

    student_id = payload.student_id
    payment = Payment(
        amount=payload.amount,
        method=payload.method,
        batch_id=payload.batch_id,
        period_month=payload.period_month,
        session_id=payload.session_id,
        note=payload.note,
        student_id=student_id,
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Email receipt when guardian email present
    if student_id:
        student = db.get(Student, student_id)
        if student and student.guardian_email:
            send_notification(
                db,
                channel="email",
                to=student.guardian_email,
                subject="Payment received — Studio Manager",
                body=(
                    f"Dear {student.guardian_name or 'Guardian'},\n\n"
                    f"We have received a payment of ₹{payload.amount:.2f} "
                    f"({payload.method}) for {student.name}.\n\nThank you."
                ),
            )
    return payment


@router.put("/{payment_id}", response_model=PaymentOut)
def update_payment(payment_id: int, payload: PaymentCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    p = db.get(Payment, payment_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payload.method not in VALID_METHODS:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    if payload.session_id is None and not (payload.student_id and payload.batch_id and payload.period_month):
        raise HTTPException(status_code=400, detail="student, batch and month are required")
    # Edited in place; no receipt re-sent (this is a correction, not a new payment).
    for k, v in payload.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p
