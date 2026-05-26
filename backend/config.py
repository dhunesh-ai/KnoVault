from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@host/neondb?ssl=require"
    JWT_SECRET: str = "super_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    GROQ_API_KEY: str = "your_groq_api_key"
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    ALLOWED_ORIGINS: str = "*"

    # SMTP Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "KnoVault <noreply@knovault.com>"

    # Brevo API Settings
    BREVO_API_KEY: str = ""

    # Firebase Settings
    FIREBASE_CREDENTIALS_PATH: str = "secrets/firebase-adminsdk.json"
    FIREBASE_CREDENTIALS_JSON: str = ""
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    GOOGLE_WEB_CLIENT_ID: str = ""

    # Encryption Settings
    FERNET_SECRET_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
