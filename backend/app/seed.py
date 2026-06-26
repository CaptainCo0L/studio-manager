from sqlalchemy.orm import Session

from .auth import hash_password
from .config import settings
from .models import User


def seed_admin(db: Session) -> None:
    """Create the first admin on boot if there are no users yet."""
    if db.query(User).count() > 0:
        return
    db.add(
        User(
            email=settings.admin_email,
            hashed_password=hash_password(settings.admin_password),
            role="admin",
        )
    )
    db.commit()
