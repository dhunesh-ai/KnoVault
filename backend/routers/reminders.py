import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
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
    
    allowed_types = ["meeting", "assignment", "event"]
    
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
    if reminder_type not in ["meeting", "assignment", "event", "birthday"]:
        reminder_type = "custom"

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
    await db.delete(reminder)
