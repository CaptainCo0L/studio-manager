from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_staff
from ..models import Tutor, User
from ..schemas import TutorCreate, TutorOut

router = APIRouter(prefix="/tutors", tags=["tutors"])


def _visible_tutor_id(db: Session, user: User) -> int | None:
    """Tutor id a user is scoped to. None == no restriction (admin/staff).

    Reuse in any tutor-scoped endpoint to enforce tutor isolation.
    """
    if user.role in ("admin", "staff"):
        return None
    t = db.query(Tutor).filter(Tutor.linked_user_id == user.id).first()
    return t.id if t else -1  # -1 matches no session


@router.get("", response_model=list[TutorOut])
def list_tutors(
    active_only: bool = False, db: Session = Depends(get_db), _=Depends(require_staff)
):
    q = db.query(Tutor)
    if active_only:
        q = q.filter(Tutor.is_active.is_(True))
    return q.order_by(Tutor.name).all()


@router.post("", response_model=TutorOut, status_code=201)
def create_tutor(payload: TutorCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    tutor = Tutor(**payload.model_dump())
    db.add(tutor)
    db.commit()
    db.refresh(tutor)
    return tutor


@router.put("/{tutor_id}", response_model=TutorOut)
def update_tutor(
    tutor_id: int, payload: TutorCreate, db: Session = Depends(get_db), _=Depends(require_staff)
):
    tutor = _get(db, tutor_id)
    for k, v in payload.model_dump().items():
        setattr(tutor, k, v)
    db.commit()
    db.refresh(tutor)
    return tutor


@router.post("/{tutor_id}/deactivate", response_model=TutorOut)
def deactivate_tutor(tutor_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    tutor = _get(db, tutor_id)
    tutor.is_active = False
    db.commit()
    db.refresh(tutor)
    return tutor


def _get(db: Session, tutor_id: int) -> Tutor:
    tutor = db.get(Tutor, tutor_id)
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    return tutor
