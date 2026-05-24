from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, extract
from database import get_db
from models.user import User
from models.reminder import Reminder
from models.important_day import ImportantDay
from middleware.auth import get_current_user
from datetime import datetime, date, timedelta, timezone
from typing import Dict, List, Any

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])

@router.get("/events")
async def get_calendar_events(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000),
    tz_offset: int = Query(0), # Offset in minutes (e.g. -330 for IST)
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[CALENDAR EVENTS REQUEST] Month: {month}, Year: {year}, Offset: {tz_offset}")
    
    # 1. Fetch Important Days (matching month, regardless of year for recurring)
    important_day_query = select(ImportantDay).where(
        and_(
            ImportantDay.user_id == current_user.id,
            extract('month', ImportantDay.date) == month
        )
    )
    important_day_result = await db.execute(important_day_query)
    important_days = important_day_result.scalars().all()

    # 2. Fetch Reminders (matching month and year)
    reminder_query = select(Reminder).where(
        and_(
            Reminder.user_id == current_user.id,
            extract('month', Reminder.reminder_date) == month,
            extract('year', Reminder.reminder_date) == year
        )
    )
    reminder_result = await db.execute(reminder_query)
    reminders = reminder_result.scalars().all()

    events_by_date: Dict[str, List[Dict[str, Any]]] = {}

    # Track birthdays/celebrations added by date to avoid duplication with reminders
    birthdays_added: Dict[str, str] = {} # date_str -> person_name

    # Helper to add event
    def add_event(date_str: str, event_data: Dict[str, Any]):
        if date_str not in events_by_date:
            events_by_date[date_str] = []
        events_by_date[date_str].append(event_data)

    # Process Important Days
    for b in important_days:
        if not b.is_recurring and b.date.year != year:
            continue
        try:
            event_date = date(year, b.date.month, b.date.day)
        except ValueError:
            event_date = date(year, b.date.month, 28)
            
        date_str = event_date.isoformat()
        birthdays_added[date_str] = b.title.lower()
        
        type_colors = {
            "birthday": "#FFD700",
            "wedding anniversary": "#EC4899",
            "wedding": "#EC4899",
            "anniversary": "#EC4899",
            "engagement": "#3B82F6",
            "festival": "#F59E0B",
            "meeting": "#10B981",
            "achievement": "#0EA5E9",
            "personal memory": "#8B5CF6",
            "memory": "#8B5CF6",
            "custom event": "#64748B",
            "event": "#64748B",
            "custom": "#64748B",
        }
        
        add_event(date_str, {
            "id": f"s-{b.id}",
            "type": b.type.lower().strip(),
            "title": f"{b.title} ({b.type})",
            "color": type_colors.get(b.type.lower().strip(), "#A78BFA"),
            "original_id": b.id,
            "notes": b.notes
        })

    # Process Reminders
    color_map = {
        "meeting": "#10B981",    # Green
        "assignment": "#3B82F6", # Blue
        "event": "#8B5CF6",      # Purple
        "birthday": "#FFD700",   # Yellow
        "medicine": "#10B981",   # Emerald Green
        "custom": "#F59E0B"      # Amber/Orange
    }

    for r in reminders:
        # Standardize: adjust with tz_offset for localized grouping
        # Ensure r.reminder_date is treated as UTC
        if r.reminder_date.tzinfo is None:
            r_utc = r.reminder_date.replace(tzinfo=timezone.utc)
        else:
            r_utc = r.reminder_date

        local_datetime = r_utc - timedelta(minutes=tz_offset)
        date_str = local_datetime.strftime("%Y-%m-%d")
        time_str = local_datetime.strftime("%H:%M")
        
        # Deduplicate: If this is a birthday reminder and we already have a birthday entry for this person on this date
        if r.type.lower() == "birthday":
            person_in_title = any(name in r.title.lower() for name in birthdays_added.get(date_str, "").split())
            if date_str in birthdays_added and person_in_title:
                continue # Skip duplicate birthday reminder

        add_event(date_str, {
            "id": f"r-{r.id}",
            "type": r.type.lower().strip(),
            "title": r.title,
            "color": color_map.get(r.type.lower().strip(), color_map["custom"]),
            "original_id": r.id,
            "time": time_str,
            "description": r.description
        })

    total_events = sum(len(v) for v in events_by_date.values())
    print(f"[CALENDAR EVENTS FOUND] Total Events: {total_events}")
    return events_by_date
