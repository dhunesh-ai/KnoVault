import asyncio
import logging
from zoneinfo import ZoneInfo
from datetime import date, datetime, time, timezone
from sqlalchemy import select, and_
from database.connection import async_session
from models.important_day import ImportantDay
from services.email import send_custom_email

logger = logging.getLogger("EmailScheduler")

async def check_and_send_email_wishes():
    """
    Checks all ImportantDay entries in the database.
    Sends auto-email wishes if enabled, scheduled for today, and not yet sent.
    Evaluates timezone local time for scheduling accuracy.
    """
    logger.info("[EMAIL SCHEDULER] Running check_and_send_email_wishes...")
    
    async with async_session() as session:
        try:
            # Query all active important days with auto send enabled
            stmt = select(ImportantDay).where(
                and_(
                    ImportantDay.auto_send_email == True,
                    ImportantDay.is_deleted == False
                )
            )
            res = await session.execute(stmt)
            important_days = res.scalars().all()
            
            processed_any = False
            for item in important_days:
                tz_name = item.timezone or "UTC"
                try:
                    tz = ZoneInfo(tz_name)
                except Exception:
                    tz = ZoneInfo("UTC")
                
                # Get the current datetime in the item's local timezone
                local_now = datetime.now(tz)
                local_date = local_now.date()
                local_time = local_now.time()
                current_year = local_date.year
                
                # 0. Handle recurring event year transition:
                # If recurring and last_sent_year is less than the current local year, reset status to PENDING and retry count to 0.
                if item.is_recurring:
                    if item.last_sent_year is not None and item.last_sent_year < current_year:
                        item.email_status = "PENDING"
                        item.email_retry_count = 0
                        
                # 1. Check if email already sent successfully or failed all retries
                if item.email_status == "SENT":
                    continue
                if item.email_retry_count >= 3:
                    continue
                    
                # 2. Date matching (relative to localized date)
                date_matches = False
                if item.is_recurring:
                    if item.date.month == local_date.month and item.date.day == local_date.day:
                        date_matches = True
                else:
                    if item.date == local_date:
                        date_matches = True
                
                if not date_matches:
                    continue
                    
                # 3. Time matching (email_send_time e.g., "09:00")
                send_time_str = item.email_send_time or "09:00"
                try:
                    h, m = map(int, send_time_str.split(':'))
                    target_time = time(h, m)
                except Exception:
                    target_time = time(9, 0)
                    
                if local_time < target_time:
                    continue
                    
                # 4. Recipient email present
                if not item.recipient_email:
                    logger.warning(f"[EMAIL SCHEDULER] ImportantDay {item.id} has auto_send_email enabled but no recipient_email.")
                    continue
                    
                # We are attempting to send this email now.
                # Increment retry count first, mark as FAILED by default until it succeeds.
                item.email_retry_count += 1
                logger.info(f"[EMAIL SCHEDULER] Attempting to send auto email to {item.recipient_email} for event '{item.title}' (Attempt {item.email_retry_count}/3)...")
                
                subject = item.email_subject or f"Happy {item.type}!"
                message = item.email_message or f"Best wishes on your {item.type}!"
                
                success, error_msg = await send_custom_email(item.recipient_email, subject, message)
                if success:
                    item.email_status = "SENT"
                    item.last_email_sent_at = local_now
                    item.last_sent_year = current_year
                    logger.info(f"[EMAIL SCHEDULER] Successfully sent email to {item.recipient_email} on attempt {item.email_retry_count}.")
                else:
                    item.email_status = "FAILED"
                    logger.error(f"[EMAIL SCHEDULER] Failed to send email to {item.recipient_email} on attempt {item.email_retry_count}. Reason: {error_msg}")
                    
                processed_any = True
                # Commit immediately per item to prevent duplicate attempts if the loop crashes or runs in parallel
                await session.commit()
                
            if not processed_any:
                logger.info("[EMAIL SCHEDULER] No pending email wishes to send.")
        except Exception as e:
            logger.error(f"[EMAIL SCHEDULER] Error during execution: {e}", exc_info=True)


async def auto_email_wishes_scheduler():
    """
    Infinite loop running check_and_send_email_wishes every 60 seconds.
    """
    logger.info("[EMAIL SCHEDULER] Starting background scheduler loop...")
    while True:
        try:
            await check_and_send_email_wishes()
        except Exception as e:
            logger.error(f"[EMAIL SCHEDULER] Loop iteration error: {e}", exc_info=True)
        # Sleep for 60 seconds before next run
        await asyncio.sleep(60)
