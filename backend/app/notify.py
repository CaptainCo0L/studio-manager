"""Pluggable notification senders. Records every attempt as a Notification row.

Email (SMTP) sends when smtp_host is configured. SMS/WhatsApp mark themselves
'disabled' (no error) unless their creds are present — matching the spec.
ponytail: email uses stdlib smtplib; no provider SDKs. SMS/WhatsApp left as
log-only stubs — wire the real HTTP call when creds actually exist.
"""
import logging
import smtplib
from email.message import EmailMessage

from sqlalchemy.orm import Session

from .config import settings
from .models import Notification

log = logging.getLogger("notify")


def _send_email(to: str, subject: str | None, body: str) -> str:
    if not settings.smtp_host:
        return "disabled"
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject or "Studio Manager"
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as s:
            s.starttls()
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
        return "sent"
    except Exception as e:  # pragma: no cover - network dependent
        log.warning("email send failed: %s", e)
        return "failed"


def _send_sms(to: str, body: str) -> str:
    if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from):
        return "disabled"
    log.info("SMS to %s (twilio configured — stub): %s", to, body)
    return "sent"


def _send_whatsapp(to: str, body: str) -> str:
    if not (settings.whatsapp_token and settings.whatsapp_phone_id):
        return "disabled"
    log.info("WhatsApp to %s (meta configured — stub): %s", to, body)
    return "sent"


def send_notification(
    db: Session, channel: str, to: str, body: str, subject: str | None = None
) -> Notification:
    if not to:
        status = "disabled"
    elif channel == "email":
        status = _send_email(to, subject, body)
    elif channel == "sms":
        status = _send_sms(to, body)
    elif channel == "whatsapp":
        status = _send_whatsapp(to, body)
    else:
        status = "failed"

    n = Notification(channel=channel, to=to or "", subject=subject, body=body, status=status)
    db.add(n)
    db.commit()
    db.refresh(n)
    return n
