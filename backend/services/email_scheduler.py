import asyncio
import logging
from zoneinfo import ZoneInfo
from datetime import date, datetime, time, timezone, timedelta
from sqlalchemy import select, and_, delete
from database.connection import async_session
from models.scheduled_email import ScheduledEmail
from services.email import send_custom_email
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger("EmailScheduler")

def calculate_next_send_datetime(
    event_date: date, 
    send_time_str: str, 
    tz_name: str, 
    is_recurring: bool,
    schedule_for_tomorrow: bool = False
) -> datetime | None:
    tz_name = tz_name or "UTC"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")
        
    try:
        h, m = map(int, (send_time_str or "09:00").split(':'))
    except Exception:
        h, m = 9, 0
    
    # Target date
    target_date = event_date
    if is_recurring:
        current_year = datetime.now(tz).year
        target_date = date(current_year, event_date.month, event_date.day)
        
    target_dt = datetime.combine(target_date, time(h, m))
    localized_target = target_dt.replace(tzinfo=tz)
    
    # If the localized target is in the past, adjust accordingly
    now_in_tz = datetime.now(tz)
    if localized_target < now_in_tz:
        if schedule_for_tomorrow:
            tomorrow = now_in_tz + timedelta(days=1)
            localized_target = datetime.combine(tomorrow.date(), time(h, m)).replace(tzinfo=tz)
        elif is_recurring:
            try:
                target_date = date(target_date.year + 1, event_date.month, event_date.day)
            except ValueError:
                target_date = date(target_date.year + 1, event_date.month, event_date.day - 1)
            target_dt = datetime.combine(target_date, time(h, m))
            localized_target = target_dt.replace(tzinfo=tz)
        else:
            return None
        
    return localized_target

async def process_email_sending(email_id: int):
    # Verify status is exactly 'scheduled' on start and change to 'sending' to lock
    async with async_session() as session:
        email = await session.get(ScheduledEmail, email_id)
        if not email:
            return
        if email.status != "scheduled":
            logger.info(f"[Scheduler] Email id={email_id} current status is '{email.status}'. Aborting send.")
            return
            
        email.status = "sending"
        await session.commit()

    for attempt in range(1, 4):
        print("[Scheduler] Sending email...")
        logger.info("[Scheduler] Sending email...")
        
        async with async_session() as session:
            email = await session.get(ScheduledEmail, email_id)
            if not email or email.status != "sending":
                logger.info(f"[Scheduler] Email {email_id} has status '{email.status if email else 'None'}'. Aborting send.")
                return
                
            success, error_msg = await send_custom_email(email.recipient_email, email.subject, email.body)
            if success:
                email.status = "sent"
                email.sent_at = datetime.now(timezone.utc)
                email.error_message = None
                await session.commit()
                print("[Scheduler] Email sent successfully.")
                logger.info("[Scheduler] Email sent successfully.")
                
                # Automatically schedule next year's email if it's recurring
                if email.important_day_id:
                    from models.important_day import ImportantDay
                    stmt = select(ImportantDay).where(ImportantDay.id == email.important_day_id)
                    res = await session.execute(stmt)
                    imp_day = res.scalar_one_or_none()
                    if imp_day and imp_day.is_recurring and imp_day.auto_send_email and not imp_day.is_deleted:
                        next_send = calculate_next_send_datetime(
                            imp_day.date,
                            imp_day.email_send_time,
                            imp_day.timezone or "UTC",
                            imp_day.is_recurring
                        )
                        if next_send is not None:
                            next_email = ScheduledEmail(
                                recipient_email=imp_day.recipient_email,
                                subject=imp_day.email_subject or f"Happy {imp_day.type}!",
                                body=imp_day.email_message or f"Best wishes on your {imp_day.type}!",
                                send_datetime=next_send,
                                timezone=imp_day.timezone or "UTC",
                                status="scheduled",
                                user_id=imp_day.user_id,
                                important_day_id=imp_day.id
                            )
                            session.add(next_email)
                            await session.commit()
                            print(f"[Scheduler] Email scheduled for {next_send.strftime('%Y-%m-%d %H:%M')}")
                            logger.info(f"[Scheduler] Email scheduled for {next_send.strftime('%Y-%m-%d %H:%M')}")
                return
            else:
                email.retry_count = attempt
                email.error_message = error_msg
                if attempt < 3:
                    await session.commit()
                    backoff = 2 ** attempt
                    logger.warning(f"[EmailScheduler] Attempt {attempt} failed for email {email_id}. Retrying in {backoff}s... Error: {error_msg}")
                    await asyncio.sleep(backoff)
                else:
                    email.status = "failed"
                    await session.commit()
                    logger.error(f"[EmailScheduler] All 3 attempts failed for email {email_id}. Error: {error_msg}")

async def send_pending_emails():
    """
    Finds all emails where status = 'scheduled' and send_datetime <= current time,
    and sends them concurrently.
    """
    print("[Scheduler] Running send_pending_emails job...")
    logger.info("[Scheduler] Running send_pending_emails job...")
    now = datetime.now(timezone.utc)
    
    async with async_session() as session:
        try:
            stmt = select(ScheduledEmail).where(
                and_(
                    ScheduledEmail.status == "scheduled",
                    ScheduledEmail.send_datetime <= now
                )
            )
            res = await session.execute(stmt)
            pending_emails = res.scalars().all()
            
            if not pending_emails:
                return
                
            for email in pending_emails:
                print(f"[Scheduler] Found scheduled email id={email.id}")
                logger.info(f"[Scheduler] Found scheduled email id={email.id}")
                
            # Spawn processing tasks
            for email in pending_emails:
                asyncio.create_task(process_email_sending(email.id))
                
        except Exception as e:
            logger.error(f"[EmailScheduler] Error in send_pending_emails job: {e}", exc_info=True)

async def auto_email_wishes_scheduler():
    """
    Runs send_pending_emails every minute using AsyncIOScheduler.
    """
    logger.info("[EmailScheduler] Starting background scheduler loop using APScheduler...")
    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_pending_emails, 'interval', minutes=1, id='send_pending_emails_job')
    scheduler.start()
    
    try:
        while True:
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        logger.info("[EmailScheduler] Stopping background scheduler loop...")
        scheduler.shutdown()
