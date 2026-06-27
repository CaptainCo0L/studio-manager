from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import hash_password, verify_password
from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import ParentLink, User
from ..schemas import MeUpdate, PasswordChange, UserCreate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(
    payload: MeUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    clash = db.query(User).filter(User.email == payload.email, User.id != user.id).first()
    if clash:
        raise HTTPException(status_code=400, detail="Email already registered")
    user.email = payload.email
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/password")
def change_password(
    payload: PasswordChange, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).order_by(User.id).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    if payload.role not in ("admin", "staff", "parent"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()
    if payload.role == "parent":
        for sid in payload.student_ids:
            db.add(ParentLink(parent_user_id=user.id, student_id=sid))
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/enable", response_model=UserOut)
def enable_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _set_active(db, user_id, True)


@router.post("/{user_id}/disable", response_model=UserOut)
def disable_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _set_active(db, user_id, False)


def _set_active(db: Session, user_id: int, active: bool) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = active
    db.commit()
    db.refresh(user)
    return user
