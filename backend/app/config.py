from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ponytail: one settings object; defaults make local dev work with zero .env
    database_url: str = "postgresql+psycopg2://studio:studio@db:5432/studio"
    jwt_secret: str = "change-me-in-prod"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12

    # First-admin seed (created on boot if no users exist)
    admin_email: str = "admin@example.com"
    admin_password: str = "admin123"

    # Email (SMTP) — notifications send only when host is set
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "Studio Manager <noreply@studio.local>"

    # SMS (Twilio) — active only when all three set
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from: str = ""

    # WhatsApp (Meta Business API) — active only when both set
    whatsapp_token: str = ""
    whatsapp_phone_id: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
