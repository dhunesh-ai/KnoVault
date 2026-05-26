import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete
from database import get_db
from models.user import User
from models.reminder import Reminder
from schemas.reminder import ReminderCreate, ReminderUpdate, ReminderResponse
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])


@router.get("", response_model=list[ReminderResponse])
async def get_reminders(
    type: str | None = None,
    upcoming: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[REMINDERS] Fetching reminders for user: {current_user.id} (type: {type}, upcoming: {upcoming})")
    query = select(Reminder).where(Reminder.user_id == current_user.id)

    if type:
        query = query.where(Reminder.type == type)
    if upcoming:
        query = query.where(Reminder.reminder_date >= datetime.now(timezone.utc))

    query = query.order_by(Reminder.reminder_date.asc()).offset(skip).limit(limit)
    result = await db.execute(query)
    reminders = result.scalars().all()
    print(f"[REMINDERS] Found {len(reminders)} reminders")
    return [ReminderResponse.model_validate(r) for r in reminders]


@router.get("/upcoming", response_model=list[ReminderResponse])
async def get_upcoming_reminders(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns upcoming meetings, assignments, and events.
    Excludes birthdays.
    """
    # Robust logic: Include reminders from 5 minutes ago to account for slight delays
    now = datetime.now(timezone.utc) - timedelta(minutes=5)
    
    print("[UPCOMING NOW]", now)
    print("[UPCOMING USER]", current_user.id)
    
    allowed_types = ["meeting", "assignment", "event", "birthday", "medicine", "custom"]
    
    # Query with case-insensitive type matching and timezone awareness
    query = select(Reminder).where(
        and_(
            Reminder.user_id == current_user.id,
            func.lower(Reminder.type).in_(allowed_types),
            Reminder.reminder_date >= now
        )
    ).order_by(Reminder.reminder_date.asc()).limit(limit)
    
    result = await db.execute(query)
    reminders = result.scalars().all()
    
    print("[UPCOMING COUNT]", len(reminders))
    print("[UPCOMING TYPES]", [r.type for r in reminders])
    
    return [ReminderResponse.model_validate(r) for r in reminders]


@router.get("/{reminder_id}", response_model=ReminderResponse)
async def get_reminder(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[REMINDERS] Fetching reminder: {reminder_id} for user: {current_user.id}")
    result = await db.execute(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        print(f"[REMINDERS] Reminder {reminder_id} not found")
        raise HTTPException(status_code=404, detail="Reminder not found")
    return ReminderResponse.model_validate(reminder)


def parse_duration_days(duration_str: str) -> int:
    try:
        # e.g., "5 days" -> 5, "1 week" -> 7, "1 month" -> 30
        ds = duration_str.lower().strip()
        if "day" in ds:
            return int("".join(filter(str.isdigit, ds)))
        if "week" in ds:
            return int("".join(filter(str.isdigit, ds))) * 7
        if "month" in ds:
            return int("".join(filter(str.isdigit, ds))) * 30
        return int("".join(filter(str.isdigit, ds)))
    except Exception:
        return 5


async def generate_medicine_reminders(
    db: AsyncSession,
    current_user: User,
    data_title: str,
    data_description: str,
    data_reminder_date: datetime,
    data_custom_type: str | None
) -> Reminder:
    try:
        desc_json = json.loads(data_description)
    except Exception:
        desc_json = {}
        
    med_name = desc_json.get("medName", data_title)
    med_type = desc_json.get("medType", "Tablet 💊")
    dosage = desc_json.get("dosage", "1 tablet")
    food_timing = desc_json.get("foodTiming", "After Food")
    frequency = desc_json.get("frequency", "Once Daily")
    timings = desc_json.get("timings", ["Breakfast 🍳"])
    timing_times = desc_json.get("timing_times", {})
    duration_str = desc_json.get("duration", "5 days")
    notes = desc_json.get("notes", "")
    
    duration_days = parse_duration_days(duration_str)
    series_id = str(uuid.uuid4())
    
    first_reminder = None
    
    # Ensure timings list is not empty
    if not timings:
        timings = ["Breakfast 🍳"]
        timing_times = {"Breakfast 🍳": "08:00"}
        
    for d in range(duration_days):
        for t in timings:
            time_str = timing_times.get(t, "08:00")
            try:
                time_clean = time_str.split(" ")[0].strip()
                parts = time_clean.split(":")
                hour = int(parts[0])
                minute = int(parts[1])
                if "PM" in time_str.upper() and hour < 12:
                    hour += 12
                if "AM" in time_str.upper() and hour == 12:
                    hour = 0
            except Exception:
                hour, minute = 8, 0
                
            start_date = data_reminder_date
            occurrence_date = start_date + timedelta(days=d)
            occurrence_date = occurrence_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            occurrence_desc = json.dumps({
                "isMedicine": True,
                "medName": med_name,
                "medType": med_type,
                "dosage": dosage,
                "foodTiming": food_timing,
                "frequency": frequency,
                "timings": timings,
                "timing_times": timing_times,
                "timing": t,
                "day_number": d + 1,
                "total_days": duration_days,
                "series_id": series_id,
                "notes": notes
            })
            
            reminder = Reminder(
                title=f"💊 Take {med_name}",
                description=occurrence_desc,
                type="medicine",
                custom_type=None,
                reminder_date=occurrence_date,
                user_id=current_user.id
            )
            db.add(reminder)
            if first_reminder is None:
                first_reminder = reminder
                
    await db.flush()
    if first_reminder:
        await db.refresh(first_reminder)
    return first_reminder


@router.post("/", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    data: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[REMINDER RECEIVED] Title: {data.title}, Type: {data.type}")
    
    # Normalize type: ensure it's one of the expected types
    reminder_type = data.type.lower().strip()
    valid_types = ["meeting", "assignment", "event", "birthday", "medicine", "custom"]
    if reminder_type not in valid_types:
        reminder_type = "custom"

    # Check if this is a medicine reminder
    is_medicine_rem = False
    if reminder_type == "medicine":
        is_medicine_rem = True
    elif data.description and data.description.startswith('{'):
        try:
            parsed = json.loads(data.description)
            if parsed.get("isMedicine"):
                is_medicine_rem = True
                reminder_type = "medicine"
        except Exception:
            pass

    if is_medicine_rem and data.description:
        first_rem = await generate_medicine_reminders(
            db, current_user, data.title, data.description, data.reminder_date, data.custom_type
        )
        if first_rem:
            return ReminderResponse.model_validate(first_rem)

    reminder = Reminder(
        title=data.title,
        description=data.description,
        type=reminder_type,
        custom_type=data.custom_type,
        reminder_date=data.reminder_date,
        user_id=current_user.id,
    )
    db.add(reminder)
    await db.flush()
    await db.refresh(reminder)
    
    print(f"[REMINDER INSERTED] ID: {reminder.id}")
    print(f"[INSERTED DATETIME] {reminder.reminder_date}")
    print(f"[INSERTED CATEGORY] {reminder.type}")
    print(f"[REMINDER CREATED] {reminder.title}")
    
    return ReminderResponse.model_validate(reminder)


@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: int,
    data: ReminderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Check if the existing reminder is part of a series
    old_series_id = None
    if reminder.description and reminder.description.startswith('{'):
        try:
            parsed = json.loads(reminder.description)
            old_series_id = parsed.get("series_id")
        except Exception:
            pass

    # Determine if the updated state is a medicine reminder
    new_type = data.type.lower().strip() if data.type else reminder.type
    new_desc = data.description if data.description is not None else reminder.description
    new_date = data.reminder_date if data.reminder_date is not None else reminder.reminder_date
    new_title = data.title if data.title is not None else reminder.title
    new_custom_type = data.custom_type if data.custom_type is not None else reminder.custom_type

    is_new_medicine = False
    if new_type == "medicine":
        is_new_medicine = True
    elif new_desc and new_desc.startswith('{'):
        try:
            parsed = json.loads(new_desc)
            if parsed.get("isMedicine"):
                is_new_medicine = True
                new_type = "medicine"
        except Exception:
            pass

    if is_new_medicine:
        # If it was an old series, delete the old series first
        if old_series_id:
            delete_stmt = delete(Reminder).where(
                Reminder.user_id == current_user.id,
                Reminder.description.like(f'%"series_id": "{old_series_id}"%')
            )
            await db.execute(delete_stmt)
        else:
            # Delete just the current single reminder
            await db.delete(reminder)
            
        # Re-generate the medicine reminder series
        first_rem = await generate_medicine_reminders(
            db, current_user, new_title, new_desc or "{}", new_date, new_custom_type
        )
        if first_rem:
            return ReminderResponse.model_validate(first_rem)
        raise HTTPException(status_code=400, detail="Failed to regenerate medicine reminder series")

    # Standard update flow
    if old_series_id:
        # If transitioning from a series to a standard reminder, delete all other series reminders
        delete_stmt = delete(Reminder).where(
            Reminder.user_id == current_user.id,
            Reminder.description.like(f'%"series_id": "{old_series_id}"%'),
            Reminder.id != reminder_id
        )
        await db.execute(delete_stmt)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(reminder, key, value)

    await db.flush()
    await db.refresh(reminder)
    return ReminderResponse.model_validate(reminder)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Check if it has a series_id
    if reminder.description and reminder.description.startswith('{'):
        try:
            parsed = json.loads(reminder.description)
            series_id = parsed.get("series_id")
            if series_id:
                # Delete all matching series reminders
                delete_stmt = delete(Reminder).where(
                    Reminder.user_id == current_user.id,
                    Reminder.description.like(f'%"series_id": "{series_id}"%')
                )
                await db.execute(delete_stmt)
                return
        except Exception:
            pass

    await db.delete(reminder)
