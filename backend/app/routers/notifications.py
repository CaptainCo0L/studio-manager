from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_staff
from ..models import Notification
from ..notify import send_notification
from ..schemas import NotificationOut, NotificationSend

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), _=Depends(require_staff)):
    return db.query(Notification).order_by(Notification.id.desc()).all()


@router.post("/send", response_model=NotificationOut, status_code=201)
def send(payload: NotificationSend, db: Session = Depends(get_db), _=Depends(require_staff)):
    return send_notification(
        db, channel=payload.channel, to=payload.to, body=payload.body, subject=payload.subject
    )
