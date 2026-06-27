from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import StudioSettings
from ..schemas import StudioSettingsOut, StudioSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


def _get_or_create(db: Session) -> StudioSettings:
    s = db.get(StudioSettings, 1)
    if s is None:
        s = StudioSettings(id=1, studio_name="")
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@router.get("", response_model=StudioSettingsOut)
def get_settings(db: Session = Depends(get_db), _=Depends(get_current_user)):
    # Any authenticated user can read — the invoice header needs it.
    return _get_or_create(db)


@router.put("", response_model=StudioSettingsOut)
def update_settings(
    payload: StudioSettingsUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    s = _get_or_create(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s
