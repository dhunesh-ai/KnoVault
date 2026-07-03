import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from database.connection import async_session
from models.workspace import WorkspaceMeeting, WorkspaceEvent, Workspace
from models.notification import Notification
from services.notification_service import create_workspace_notification

logger = logging.getLogger("NotificationScheduler")

def make_utc_aware(dt: datetime) -> datetime:
    """Ensures datetime is timezone-aware and converted to UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # naive -> UTC aware
        return dt.replace(tzinfo=timezone.utc)
    # aware -> UTC aware conversion
    return dt.astimezone(timezone.utc)

async def check_and_send_workspace_reminders():
    """
    Checks upcoming meetings and events.
    Sends notifications/reminders for the configured offsets:
    0 (starts now), 5m, 15m, 30m, 1h (60m), 1d (1440m) before.
    """
    logger.info("[NOTIFICATION SCHEDULER] Scanning for upcoming workspace reminders...")
    
    # 1. Ensure current time is timezone-aware UTC datetime
    now = datetime.now(timezone.utc)
    
    # Query meetings and events that happen in the near future or recently
    # We scan a window from (now - 10 minutes) to (now + 25 hours) to cover all offset ranges.
    # We make these timezone-aware for the database query, although SQLite ignores timezone
    # or stores as naive string, SQLAlchemy handles datetime filtering.
    min_date = now - timedelta(minutes=15)
    max_date = now + timedelta(hours=26)

    # Convert min_date/max_date back to naive if SQLite stores them as naive, but database queries
    # work fine either way with SQLAlchemy. To be safest, we query and filter in Python or use standard query.
    async with async_session() as session:
        try:
            # Load all workspace meetings that might be within our range.
            # To be absolutely sure timezone differences don't filter out candidates prematurely,
            # we query meetings that are not completed / or simply load meetings with date >= min_date - 1 day and <= max_date + 1 day.
            meetings_stmt = select(WorkspaceMeeting).where(
                WorkspaceMeeting.date >= now - timedelta(days=1),
                WorkspaceMeeting.date <= now + timedelta(days=2)
            )
            meetings_res = await session.execute(meetings_stmt)
            meetings = meetings_res.scalars().all()

            for meeting in meetings:
                # Timezone conversion & validation
                meeting_date = make_utc_aware(meeting.date)
                
                # Get workspace details for the name
                ws_res = await session.execute(select(Workspace).where(Workspace.id == meeting.workspace_id))
                ws = ws_res.scalar_one_or_none()
                ws_name = ws.name if ws else "Workspace"

                # Check each offset: 0m, 5m, 15m, 30m, 60m (1h), 1440m (1d)
                offsets = [0, 5, 15, 30, 60, 1440]
                for offset in offsets:
                    target_time = meeting_date - timedelta(minutes=offset)
                    
                    # Log timezone conversion details
                    logger.info(
                        f"[TIMEZONE CONVERTED] meeting_id={meeting.id} workspace_id={meeting.workspace_id} "
                        f"target_time={target_time} current_time={now} timezone={now.tzinfo}"
                    )

                    # We match if now is >= target_time and within a 10-minute window
                    if target_time <= now <= (target_time + timedelta(minutes=10)):
                        unique_id = f"meeting:{meeting.id}:reminder:{offset}"
                        
                        # Log reminder found
                        logger.info(
                            f"[REMINDER FOUND] meeting_id={meeting.id} workspace_id={meeting.workspace_id} "
                            f"offset={offset} unique_id={unique_id}"
                        )

                        # Check if notification already sent
                        exists_stmt = select(Notification).where(Notification.related_item_id == unique_id)
                        exists_res = await session.execute(exists_stmt)
                        if exists_res.first():
                            continue

                        # Formulate text
                        title = "📹 Meeting Reminder"
                        if offset == 0:
                            title = "📹 Meeting Started"
                            msg = f'Meeting "{meeting.title}" in "{ws_name}" is starting now!'
                        elif offset == 60:
                            msg = f'Meeting "{meeting.title}" in "{ws_name}" starts in 1 hour.'
                        elif offset == 1440:
                            msg = f'Meeting "{meeting.title}" tomorrow in "{ws_name}".'
                        else:
                            msg = f'Meeting "{meeting.title}" in "{ws_name}" starts in {offset} minutes.'

                        logger.info(f"[NOTIFICATION SCHEDULER] Dispatching meeting reminder: {unique_id}")
                        await create_workspace_notification(
                            db=session,
                            workspace_id=meeting.workspace_id,
                            title=title,
                            message=msg,
                            type="meeting",
                            related_item_id=unique_id,
                            sender_id=None
                        )

            # 2. SCAN EVENTS
            events_stmt = select(WorkspaceEvent).where(
                WorkspaceEvent.date >= now - timedelta(days=1),
                WorkspaceEvent.date <= now + timedelta(days=2)
            )
            events_res = await session.execute(events_stmt)
            events = events_res.scalars().all()

            for event in events:
                # Timezone conversion & validation
                event_date = make_utc_aware(event.date)

                # Get workspace details for the name
                ws_res = await session.execute(select(Workspace).where(Workspace.id == event.workspace_id))
                ws = ws_res.scalar_one_or_none()
                ws_name = ws.name if ws else "Workspace"

                # Check each offset
                offsets = [0, 5, 15, 30, 60, 1440]
                for offset in offsets:
                    target_time = event_date - timedelta(minutes=offset)
                    
                    # Log timezone conversion details
                    logger.info(
                        f"[TIMEZONE CONVERTED] event_id={event.id} workspace_id={event.workspace_id} "
                        f"target_time={target_time} current_time={now} timezone={now.tzinfo}"
                    )

                    # We match if now is >= target_time and within a 10-minute window
                    if target_time <= now <= (target_time + timedelta(minutes=10)):
                        unique_id = f"event:{event.id}:reminder:{offset}"
                        
                        # Log reminder found
                        logger.info(
                            f"[REMINDER FOUND] event_id={event.id} workspace_id={event.workspace_id} "
                            f"offset={offset} unique_id={unique_id}"
                        )

                        # Check if notification already sent
                        exists_stmt = select(Notification).where(Notification.related_item_id == unique_id)
                        exists_res = await session.execute(exists_stmt)
                        if exists_res.first():
                            continue

                        # Formulate text
                        title = "📅 Event Reminder"
                        if offset == 0:
                            title = "📅 Event Started"
                            msg = f'Event "{event.title}" ({event.type}) in "{ws_name}" is starting now!'
                        elif offset == 60:
                            msg = f'Event "{event.title}" ({event.type}) in "{ws_name}" starts in 1 hour.'
                        elif offset == 1440:
                            msg = f'Event "{event.title}" ({event.type}) tomorrow in "{ws_name}".'
                        else:
                            msg = f'Event "{event.title}" ({event.type}) in "{ws_name}" starts in {offset} minutes.'

                        logger.info(f"[NOTIFICATION SCHEDULER] Dispatching event reminder: {unique_id}")
                        await create_workspace_notification(
                            db=session,
                            workspace_id=event.workspace_id,
                            title=title,
                            message=msg,
                            type="event",
                            related_item_id=unique_id,
                            sender_id=None
                        )

            # Commit any new notification rows
            await session.commit()
            
        except Exception as e:
            logger.error(f"[NOTIFICATION SCHEDULER] Error during execution: {e}", exc_info=True)


async def auto_workspace_reminders_scheduler():
    """
    Infinite loop running check_and_send_workspace_reminders every 60 seconds.
    """
    logger.info("[NOTIFICATION SCHEDULER] Starting background scheduler loop...")
    # Sleep initially for a few seconds to let startup finish smoothly
    await asyncio.sleep(5)
    while True:
        try:
            await check_and_send_workspace_reminders()
        except Exception as e:
            logger.error(f"[NOTIFICATION SCHEDULER] Loop iteration error: {e}", exc_info=True)
        # Sleep for 60 seconds before next run
        await asyncio.sleep(60)
