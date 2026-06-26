from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_staff
from ..models import BatchEnrollment, FeeInvoice, FeeStructure, User
from ..routers.students import _visible_student_ids
from ..schemas import (
    FeeStructureCreate,
    FeeStructureOut,
    InvoiceCreate,
    InvoiceOut,
)

router = APIRouter(prefix="/fees", tags=["fees"])


@router.get("/structures", response_model=list[FeeStructureOut])
def list_structures(
    batch_id: int | None = None, db: Session = Depends(get_db), _=Depends(require_staff)
):
    q = db.query(FeeStructure)
    if batch_id:
        q = q.filter(FeeStructure.batch_id == batch_id)
    return q.order_by(FeeStructure.id).all()


@router.post("/structures", response_model=FeeStructureOut, status_code=201)
def create_structure(
    payload: FeeStructureCreate, db: Session = Depends(get_db), _=Depends(require_staff)
):
    fs = FeeStructure(
        batch_id=payload.batch_id, name=payload.name, amount=payload.amount, period=payload.period
    )
    db.add(fs)
    db.flush()
    if payload.auto_invoice:
        enrolled = (
            db.query(BatchEnrollment.student_id)
            .filter(
                BatchEnrollment.batch_id == payload.batch_id, BatchEnrollment.is_active.is_(True)
            )
            .all()
        )
        for (sid,) in enrolled:
            db.add(
                FeeInvoice(
                    student_id=sid,
                    fee_structure_id=fs.id,
                    amount_due=payload.amount,
                    amount_paid=0,
                    balance=payload.amount,
                    status="unpaid",
                )
            )
    db.commit()
    db.refresh(fs)
    return fs


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(
    student_id: int | None = None,
    unpaid: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(FeeInvoice)
    visible = _visible_student_ids(db, user)
    if visible is not None:
        q = q.filter(FeeInvoice.student_id.in_(visible or {-1}))
    if student_id:
        q = q.filter(FeeInvoice.student_id == student_id)
    if unpaid:
        q = q.filter(FeeInvoice.balance > 0)
    return q.order_by(FeeInvoice.id.desc()).all()


@router.post("/invoices", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    inv = FeeInvoice(
        student_id=payload.student_id,
        fee_structure_id=payload.fee_structure_id,
        amount_due=payload.amount_due,
        amount_paid=0,
        balance=payload.amount_due,
        status="unpaid",
        due_date=payload.due_date,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv
