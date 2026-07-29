"""
KnoVault — Auth Middleware

Supports DUAL authentication:
  1. KnoVault JWT (existing, primary)
  2. Firebase JWT (new, for Google Sign-In and Firebase Auth)

The middleware tries KnoVault JWT first. If it fails, it tries Firebase JWT.
Firebase users are auto-linked by email or looked up by firebase_uid.
"""
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.user import User
from utils.auth import decode_token
from utils.firebase import verify_firebase_token, is_firebase_ready

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials

    # ── Strategy 1: Try KnoVault JWT ───────────────────────────────────
    payload = decode_token(token)

    if payload is not None:
        user_id_val = payload.get("sub")
        if user_id_val is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        try:
            user_id_int = int(user_id_val)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID in token",
            )

        result = await db.execute(select(User).where(User.id == user_id_int))
        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        return user

    # ── Strategy 2: Try Firebase JWT ──────────────────────────────────
    if is_firebase_ready():
        firebase_claims = verify_firebase_token(token)

        if firebase_claims is not None:
            firebase_uid = firebase_claims.get("uid")
            firebase_email = firebase_claims.get("email")

            if not firebase_uid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Firebase token — missing UID",
                )

            # Try to find user by firebase_uid first
            result = await db.execute(
                select(User).where(User.firebase_uid == firebase_uid)
            )
            user = result.scalar_one_or_none()

            if user:
                return user

            # Try to find by email and auto-link firebase_uid
            if firebase_email:
                clean_email = firebase_email.strip().lower()
                result = await db.execute(
                    select(User).where(func.lower(User.email) == clean_email)
                )
                user = result.scalar_one_or_none()

                if user:
                    # Auto-link Firebase UID to existing account
                    user.firebase_uid = firebase_uid
                    await db.flush()
                    return user

            # Firebase user not found in our database
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Firebase user not synced. Please call /api/auth/firebase-sync first.",
            )

    # ── Neither strategy succeeded ────────────────────────────────────
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
