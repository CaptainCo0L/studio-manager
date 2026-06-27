from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_staff
from ..models import Batch, Student, Tutor
from ..schemas import SearchHit, SearchOut

router = APIRouter(prefix="/search", tags=["search"])

LIMIT = 8


@router.get("", response_model=SearchOut)
def search(q: str = "", db: Session = Depends(get_db), _=Depends(require_staff)):
    term = q.strip()
    if not term:
        return SearchOut(students=[], batches=[], tutors=[])
    like = f"%{term}%"

    students = (
        db.query(Student)
        .filter(or_(Student.name.ilike(like), Student.guardian_name.ilike(like)))
        .order_by(Student.name)
        .limit(LIMIT)
        .all()
    )
    batches = db.query(Batch).filter(Batch.name.ilike(like)).order_by(Batch.name).limit(LIMIT).all()
    tutors = db.query(Tutor).filter(Tutor.name.ilike(like)).order_by(Tutor.name).limit(LIMIT).all()

    return SearchOut(
        students=[SearchHit(id=s.id, label=s.name, sublabel=s.guardian_name) for s in students],
        batches=[SearchHit(id=b.id, label=b.name) for b in batches],
        tutors=[SearchHit(id=t.id, label=t.name) for t in tutors],
    )
