import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

env_path = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@host/neondb?ssl=require"
    JWT_SECRET: str = "super_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    GROQ_API_KEY: str = "your_groq_api_key"
    GROQ_MODEL: str = "gpt-oss-20b"
    ALLOWED_ORIGINS: str = "*"
    ALLOW_SQLITE_FALLBACK: bool = True

    # Super Admin Bootstrap Settings
    SUPER_ADMIN_EMAIL: str = "admin@knovault.app"
    SUPER_ADMIN_PASSWORD: str = ""

    # Brevo API Settings
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "thinkgood24hrs@gmail.com"
    BREVO_SENDER_NAME: str = "KnoVault"

    # Firebase Settings
    FIREBASE_CREDENTIALS_PATH: str = "secrets/firebase-adminsdk.json"
    FIREBASE_CREDENTIALS_JSON: str = ""
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    GOOGLE_WEB_CLIENT_ID: str = ""

    # Encryption Settings
    FERNET_SECRET_KEY: str = ""

    class Config:
        env_file = str(env_path) if env_path.exists() else ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
