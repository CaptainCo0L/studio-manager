from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ponytail: one settings object; defaults make local dev work with zero .env
    app_env: str = "dev"  # set APP_ENV=prod to refuse booting with default secrets
    database_url: str = "postgresql+psycopg2://studio:studio@db:5432/studio"
    jwt_secret: str = "change-me-in-prod"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    # CORS: comma-separated origins. Default "*" suits split dev; the single-image
    # deploy serves the SPA same-origin so this is moot there. Set in prod if split.
    cors_origins: str = "*"

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

# Default placeholder secrets shipped for zero-config local dev. If any of these
# survive into a prod boot (APP_ENV=prod), startup refuses (see main.lifespan).
DEFAULT_JWT_SECRET = "change-me-in-prod"
DEFAULT_ADMIN_PASSWORD = "admin123"


def insecure_defaults() -> list[str]:
    """Names of secrets still set to their dev placeholder. Empty == safe."""
    bad = []
    if settings.jwt_secret == DEFAULT_JWT_SECRET:
        bad.append("JWT_SECRET")
    if settings.admin_password == DEFAULT_ADMIN_PASSWORD:
        bad.append("ADMIN_PASSWORD")
    return bad
