from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import AuditLog
from ..schemas import AuditOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditOut])
def list_audit(
    limit: int = 200,
    user_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = db.query(AuditLog)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    return q.order_by(AuditLog.id.desc()).limit(limit).all()
