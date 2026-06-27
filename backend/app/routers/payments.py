from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_staff
from ..models import Payment, Student, User
from ..notify import send_notification
from ..routers.students import _visible_student_ids
from ..schemas import PaymentCreate, PaymentOut

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
    return q.order_by(Payment.id.desc()).all()


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    if payload.method not in VALID_METHODS:
        raise HTTPException(status_code=400, detail="Invalid payment method")

    student_id = payload.student_id
    payment = Payment(
        amount=payload.amount,
        method=payload.method,
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
