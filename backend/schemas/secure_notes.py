from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class SecureNotesSetPassword(BaseModel):
    password: str = Field(..., min_length=6, max_length=32)


class SecureNotesVerifyPassword(BaseModel):
    password: str


class SecureNotesChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=32)


class SecureNotesVerifyResetOTP(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class SecureNotesResetPassword(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6, max_length=32)


class SecureNotesDisable(BaseModel):
    password: str


class SecureNotesStatusResponse(BaseModel):
    is_password_set: bool
    failed_attempts: int
    is_locked: bool
    locked_until: datetime | None

    class Config:
        from_attributes = True
