from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_staff
from ..models import Batch, BatchEnrollment, Payment, Session, Student
from ..schemas import BatchCreate, BatchOut, NameRef, StudentOut

router = APIRouter(prefix="/batches", tags=["batches"])


def _with_count(db: Session, batch: Batch) -> BatchOut:
    count = (
        db.query(BatchEnrollment)
        .filter(BatchEnrollment.batch_id == batch.id, BatchEnrollment.is_active.is_(True))
        .count()
    )
    out = BatchOut.model_validate(batch)
    out.student_count = count
    return out


@router.get("", response_model=list[BatchOut])
def list_batches(db: Session = Depends(get_db), _=Depends(require_staff)):
    # Two queries total: all batches, then all active enrollments joined to
    # students — grouped in-memory so each card has its roster without N+1.
    batches = db.query(Batch).order_by(Batch.name).all()
    rows = (
        db.query(BatchEnrollment.batch_id, Student.id, Student.name)
        .join(Student, Student.id == BatchEnrollment.student_id)
        .filter(BatchEnrollment.is_active.is_(True), Student.is_active.is_(True))
        .order_by(Student.name)
        .all()
    )
    by_batch: dict[int, list[NameRef]] = defaultdict(list)
    for bid, sid, sname in rows:
        by_batch[bid].append(NameRef(id=sid, name=sname))
    out = []
    for b in batches:
        o = BatchOut.model_validate(b)
        o.students = by_batch.get(b.id, [])
        o.student_count = len(o.students)
        out.append(o)
    return out


@router.post("", response_model=BatchOut, status_code=201)
def create_batch(payload: BatchCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    batch = Batch(**payload.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return _with_count(db, batch)


@router.put("/{batch_id}", response_model=BatchOut)
def update_batch(
    batch_id: int, payload: BatchCreate, db: Session = Depends(get_db), _=Depends(require_staff)
):
    batch = _get(db, batch_id)
    for k, v in payload.model_dump().items():
        setattr(batch, k, v)
    db.commit()
    db.refresh(batch)
    return _with_count(db, batch)


@router.delete("/{batch_id}", status_code=204)
def delete_batch(batch_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    batch = _get(db, batch_id)
    # Block deletes that would orphan real data (FK has no cascade, so the commit
    # would otherwise 500). Only *active* enrollments count as "in use" — unenroll
    # is a soft delete, so removed students leave an inactive row behind that we
    # clean up below rather than block on.
    blockers = []
    n = db.query(BatchEnrollment).filter_by(batch_id=batch_id, is_active=True).count()
    if n:
        blockers.append(f"{n} enrolled student(s)")
    n = db.query(Session).filter_by(batch_id=batch_id).count()
    if n:
        blockers.append(f"{n} session(s)")
    n = db.query(Payment).filter_by(batch_id=batch_id).count()
    if n:
        blockers.append(f"{n} payment(s)")
    if blockers:
        raise HTTPException(
            status_code=409,
            detail="Can't delete: batch still has " + ", ".join(blockers) + ". Remove them first.",
        )
    # Drop the dead join rows left by unenroll — they only hold the FK and have no
    # meaning once the batch is gone.
    db.query(BatchEnrollment).filter_by(batch_id=batch_id).delete()
    db.delete(batch)
    db.commit()


@router.get("/{batch_id}/students", response_model=list[StudentOut])
def batch_students(batch_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    _get(db, batch_id)
    return (
        db.query(Student)
        .join(BatchEnrollment, BatchEnrollment.student_id == Student.id)
        .filter(BatchEnrollment.batch_id == batch_id, BatchEnrollment.is_active.is_(True))
        .order_by(Student.name)
        .all()
    )


def _get(db: Session, batch_id: int) -> Batch:
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch
