import logging

from sqlalchemy.orm import Session

from .auth import hash_password
from .config import settings
from .models import User

log = logging.getLogger("studio")


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
    log.warning("Seeded first admin %s — log in and change this password now.", settings.admin_email)
