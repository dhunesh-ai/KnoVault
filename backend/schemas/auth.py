import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class SignupInit(BaseModel):
    full_name: str
    email: EmailStr


class CompleteSignup(BaseModel):
    email: EmailStr
    code: str
    password: str


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class VerifyOTP(BaseModel):
    email: EmailStr
    code: str


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    email: EmailStr
    code: str
    new_password: str


# ── Firebase Auth Schemas ─────────────────────────────────────────────

class FirebaseSyncRequest(BaseModel):
    """Request body for /api/auth/firebase-sync endpoint."""
    id_token: str


class FCMTokenRequest(BaseModel):
    """Request body for /api/auth/fcm-token endpoint."""
    fcm_token: str

