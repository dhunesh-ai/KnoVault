import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.workspace import WorkspaceMember
from models.user import User
from models.notification import Notification
from utils.firebase import send_push_notification

logger = logging.getLogger("NotificationService")

async def create_workspace_notification(
    db: AsyncSession,
    workspace_id: int,
    title: str,
    message: str,
    type: str,
    related_item_id: str | None = None,
    sender_id: int | None = None
) -> list[Notification]:
    """
    Creates notification records in the database for all members of a workspace
    (excluding the sender_id) and sends them push notifications (FCM or Expo).
    """
    try:
        # Query all members of the workspace and their user details (FCM tokens)
        stmt = (
            select(WorkspaceMember, User)
            .join(User, WorkspaceMember.user_id == User.id)
            .where(WorkspaceMember.workspace_id == workspace_id)
        )
        res = await db.execute(stmt)
        rows = res.all()

        notifications_created = []

        for member, user in rows:
            # Skip the sender themselves
            if sender_id is not None and user.id == sender_id:
                continue

            # Python-level duplicate check for extra safety
            if related_item_id:
                dup_stmt = select(Notification).where(
                    Notification.user_id == user.id,
                    Notification.related_item_id == related_item_id
                )
                dup_res = await db.execute(dup_stmt)
                if dup_res.first() is not None:
                    logger.info(
                        f"[NOTIFICATION SKIPPED] (DUPLICATE) user_id={user.id} "
                        f"related_item_id={related_item_id}"
                    )
                    continue

            # Log creation
            logger.info(
                f"[NOTIFICATION CREATED] workspace_id={workspace_id} user_id={user.id} "
                f"type={type} title='{title}' message='{message}' related_item_id={related_item_id}"
            )

            # 1. Create database notification record
            notif = Notification(
                user_id=user.id,
                workspace_id=workspace_id,
                title=title,
                message=message,
                type=type,
                related_item_id=related_item_id,
                is_read=False
            )
            db.add(notif)
            notifications_created.append(notif)

            # Log saved
            logger.info(
                f"[NOTIFICATION SAVED] workspace_id={workspace_id} user_id={user.id} "
                f"related_item_id={related_item_id}"
            )

            # 2. Dispatch push notification if token exists
            if user.fcm_token:
                logger.info(f"[TOKEN FOUND] user_id={user.id} token={user.fcm_token[:30]}...")
                push_data = {
                    "type": str(type),
                    "workspace_id": str(workspace_id),
                }
                if related_item_id:
                    push_data["related_item_id"] = str(related_item_id)
                
                # Send push (either Expo or FCM)
                try:
                    msg_id = send_push_notification(
                        fcm_token=user.fcm_token,
                        title=title,
                        body=message,
                        data=push_data
                    )
                    if msg_id:
                        logger.info(f"[PUSH SENT] user_id={user.id} response={msg_id}")
                    else:
                        logger.error(f"[PUSH FAILED] user_id={user.id} error=no response from push service")
                except Exception as push_err:
                    logger.error(f"[PUSH FAILED] user_id={user.id} error={push_err}")
            else:
                logger.info(f"[TOKEN MISSING] user_id={user.id}")

        if notifications_created:
            await db.flush()
            
        return notifications_created

    except Exception as e:
        logger.error(f"Error creating workspace notification: {e}", exc_info=True)
        return []
