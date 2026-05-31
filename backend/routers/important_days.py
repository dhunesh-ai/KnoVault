from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.important_day import ImportantDay
from schemas.important_day import ImportantDayCreate, ImportantDayUpdate, ImportantDayResponse
from middleware.auth import get_current_user
from datetime import date
import json

router = APIRouter(tags=["Important Days"])


@router.get("", response_model=list[ImportantDayResponse])
async def get_important_days(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.user_id == current_user.id)
        .order_by(ImportantDay.date.asc()).offset(skip).limit(limit)
    )
    return [ImportantDayResponse.model_validate(b) for b in result.scalars().all()]


@router.get("/today", response_model=list[ImportantDayResponse])
async def get_today_important_days(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.user_id == current_user.id)
    )
    # Filter for today (matching month and day, or matching exactly if not recurring)
    today_list = []
    for b in result.scalars().all():
        if b.is_recurring:
            if b.date.month == today.month and b.date.day == today.day:
                today_list.append(b)
        else:
            if b.date == today:
                today_list.append(b)
                
    return [ImportantDayResponse.model_validate(b) for b in today_list]


@router.get("/{important_day_id}", response_model=ImportantDayResponse)
async def get_important_day_by_id(
    important_day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.id == important_day_id, ImportantDay.user_id == current_user.id)
    )
    important_day = result.scalar_one_or_none()
    if not important_day:
        raise HTTPException(status_code=404, detail="Important Day not found")
    return ImportantDayResponse.model_validate(important_day)


@router.post("", response_model=ImportantDayResponse, status_code=201)
async def create_important_day(
    data: ImportantDayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        important_day = ImportantDay(
            title=data.title or "Untitled Important Day", 
            date=data.date or date.today(),
            type=data.type,
            is_recurring=data.is_recurring,
            custom_type=data.custom_type,
            notes=data.notes,
            gift_ideas=data.gift_ideas,
            celebration_plans=data.celebration_plans,
            reminder_notes=data.reminder_notes,
            message_draft=data.message_draft,
            recipient_email=data.recipient_email,
            email_subject=data.email_subject,
            email_message=data.email_message,
            email_enabled=data.email_enabled,
            delivery_type=data.delivery_type,
            send_time=data.send_time,
            reminders_json=None,  # Legacy field removed from schema
            reminder_enabled=data.reminder_enabled,
            reminder_type=data.reminder_type,
            reminder_value=data.reminder_value,
            reminder_unit=data.reminder_unit,
            reminder_time=data.reminder_time,
            notification_ids=data.notification_ids,
            user_id=current_user.id,
        )
        print("[DEBUG] Important Day created model instance:", important_day.__dict__)
        db.add(important_day)
        print("[DEBUG] db.add() success")
        await db.flush()
        print("[DEBUG] db.flush() success")
        await db.refresh(important_day)
        print("[DEBUG] db.refresh() success")
        return ImportantDayResponse.model_validate(important_day)
    except Exception as e:
        import traceback
        print(f"[Create Important Day Error] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{important_day_id}", response_model=ImportantDayResponse)
async def update_important_day(
    important_day_id: int, data: ImportantDayUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.id == important_day_id, ImportantDay.user_id == current_user.id)
    )
    important_day = result.scalar_one_or_none()
    if not important_day:
        raise HTTPException(status_code=404, detail="Important Day not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle reminders separately
    if 'reminders' in update_data:
        reminders = update_data.pop('reminders')
        important_day.reminders_json = json.dumps(reminders) if reminders else None
    
    for key, value in update_data.items():
        setattr(important_day, key, value)
    
    await db.flush()
    await db.refresh(important_day)
    return ImportantDayResponse.model_validate(important_day)


@router.delete("/{important_day_id}", status_code=204)
async def delete_important_day(
    important_day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.id == important_day_id, ImportantDay.user_id == current_user.id)
    )
    important_day = result.scalar_one_or_none()
    if not important_day:
        raise HTTPException(status_code=404, detail="Important Day not found")
    await db.delete(important_day)
