"""
KnoVault — Push Notification Endpoints

Provides endpoints for sending push notifications via FCM:
  - Send notification to a specific user
  - Send daily goal reminders
  - Broadcast to all users with FCM tokens
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from middleware.auth import get_current_user
from utils.firebase import send_push_notification, send_push_to_user, send_push_to_multiple, is_firebase_ready
from pydantic import BaseModel
from datetime import datetime

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    workspace_id: int | None
    workspace_name: str | None
    title: str
    message: str
    type: str
    related_item_id: str | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ── Request Schemas ───────────────────────────────────────────────────

class SendNotificationRequest(BaseModel):
    user_id: int
    title: str
    body: str
    data: dict | None = None


class BroadcastRequest(BaseModel):
    title: str
    body: str
    data: dict | None = None


# ── Endpoints ─────────────────────────────────────────────────────────


@router.post("/send")
async def send_notification(
    req: SendNotificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a push notification to a specific user by user_id."""
    if not is_firebase_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase is not configured",
        )

    success = await send_push_to_user(db, req.user_id, req.title, req.body, req.data)
    if success:
        return {"message": "Notification sent successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to send notification. User may not have an FCM token.",
        )


@router.post("/send-goal-reminder")
async def send_goal_reminder(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a daily goal reminder push notification to the authenticated user.
    """
    if not is_firebase_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase is not configured",
        )

    if not current_user.fcm_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No FCM token registered. Enable notifications in the app.",
        )

    result = send_push_notification(
        fcm_token=current_user.fcm_token,
        title="🎯 Daily Goals Reminder",
        body="Don't forget to check your daily goals! Stay productive with KnoVault.",
        data={"type": "goal_reminder", "action": "open_goals"},
    )

    if result:
        return {"message": "Goal reminder sent", "message_id": result}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send goal reminder",
        )


@router.post("/test-push")
async def test_push(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a test push notification to the authenticated user."""
    if not is_firebase_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase is not configured",
        )

    if not current_user.fcm_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No FCM token registered",
        )

    result = send_push_notification(
        fcm_token=current_user.fcm_token,
        title="🔔 KnoVault Test",
        body="Push notifications are working! You're all set.",
        data={"type": "test", "action": "none"},
    )

    if result:
        return {"message": "Test notification sent", "message_id": result}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test notification",
        )


@router.post("/broadcast")
async def broadcast_notification(
    req: BroadcastRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Broadcast a push notification to all users with FCM tokens."""
    if not is_firebase_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase is not configured",
        )

    # Get all FCM tokens
    result = await db.execute(
        select(User.fcm_token).where(User.fcm_token.isnot(None))
    )
    tokens = [row[0] for row in result.all() if row[0]]

    if not tokens:
        return {"message": "No users with FCM tokens", "success_count": 0, "failure_count": 0}

    stats = send_push_to_multiple(tokens, req.title, req.body, req.data)
    return {
        "message": f"Broadcast sent to {len(tokens)} devices",
        **stats,
    }


@router.get("/status")
async def notification_status(
    current_user: User = Depends(get_current_user),
):
    """Check notification configuration status for the authenticated user."""
    return {
        "firebase_ready": is_firebase_ready(),
        "fcm_token_registered": bool(current_user.fcm_token),
        "user_id": current_user.id,
    }


@router.get("", response_model=list[NotificationResponse])
async def get_user_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all notifications for the authenticated user."""
    from models.notification import Notification
    from models.workspace import Workspace
    from sqlalchemy import delete, or_

    # Delete obsolete biometric-related notifications
    stmt_del = delete(Notification).where(
        Notification.user_id == current_user.id,
        or_(
            Notification.title.ilike("%Biometrics%"),
            Notification.title.ilike("%Keychain%"),
            Notification.title.ilike("%Session Secured%"),
            Notification.title.ilike("%Fingerprint%"),
            Notification.title.ilike("%Device authentication%"),
            Notification.title.ilike("%Keychain initialized%")
        )
    )
    await db.execute(stmt_del)
    await db.commit()
    
    stmt = (
        select(Notification, Workspace.name.label("workspace_name"))
        .outerjoin(Workspace, Notification.workspace_id == Workspace.id)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    res = await db.execute(stmt)
    notifications_data = []
    for row in res.all():
        notif, ws_name = row[0], row[1]
        notifications_data.append(NotificationResponse(
            id=notif.id,
            user_id=notif.user_id,
            workspace_id=notif.workspace_id,
            workspace_name=ws_name,
            title=notif.title,
            message=notif.message,
            type=notif.type,
            related_item_id=notif.related_item_id,
            is_read=notif.is_read,
            created_at=notif.created_at
        ))
    return notifications_data


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.notification import Notification
    stmt = select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id)
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.notification import Notification
    from sqlalchemy import update
    stmt = update(Notification).where(Notification.user_id == current_user.id).values(is_read=True)
    await db.execute(stmt)
    await db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/clear-all")
async def clear_all_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.notification import Notification
    from sqlalchemy import delete
    stmt = delete(Notification).where(Notification.user_id == current_user.id)
    await db.execute(stmt)
    await db.commit()
    return {"message": "All notifications cleared"}


@router.delete("/{notification_id}")
async def delete_single_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.notification import Notification
    stmt = select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id)
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.delete(notif)
    await db.commit()
    return {"message": "Notification deleted"}
