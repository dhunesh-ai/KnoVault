from typing import Callable, Sequence
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.admin import AuditLog, SecurityLog, SystemSetting
from utils.auth import decode_token

security = HTTPBearer()

ALLOWED_ADMIN_ROLES = {"super_admin", "admin", "support_admin", "moderator"}


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin token",
        )

    user_id_val = payload.get("sub")
    if not user_id_val:
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

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin user not found",
        )

    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account blocked: {user.block_reason or 'Policy violation'}",
        )

    if user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account has been deleted",
        )

    if user.role not in ALLOWED_ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin privileges required",
        )

    return user


def require_role(roles: Sequence[str]):
    async def role_checker(current_user: User = Depends(get_current_admin)) -> User:
        if current_user.role not in roles and current_user.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of the following roles: {', '.join(roles)}",
            )
        return current_user
    return role_checker


async def log_admin_action(
    db: AsyncSession,
    admin: User,
    action: str,
    target_type: str,
    target_id: str | None = None,
    details: str | None = None,
    request: Request | None = None
):
    ip_addr = request.client.host if request and request.client else None
    audit = AuditLog(
        admin_id=admin.id,
        admin_name=admin.full_name,
        admin_email=admin.email,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else None,
        details=details,
        ip_address=ip_addr
    )
    db.add(audit)
    await db.flush()


async def log_security_event(
    db: AsyncSession,
    event_type: str,
    user_id: int | None = None,
    user_email: str | None = None,
    platform: str | None = "web",
    details: str | None = None,
    request: Request | None = None
):
    ip_addr = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent") if request else None
    sec = SecurityLog(
        user_id=user_id,
        user_email=user_email,
        event_type=event_type,
        ip_address=ip_addr,
        user_agent=ua,
        platform=platform,
        details=details
    )
    db.add(sec)
    await db.flush()
