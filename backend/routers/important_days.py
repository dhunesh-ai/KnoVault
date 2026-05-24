from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.important_day import ImportantDay
from schemas.important_day import ImportantDayCreate, ImportantDayUpdate, ImportantDayResponse
from middleware.auth import get_current_user
from datetime import date

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
        user_id=current_user.id,
    )
    db.add(important_day)
    await db.flush()
    await db.refresh(important_day)
    return ImportantDayResponse.model_validate(important_day)


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
    for key, value in data.model_dump(exclude_unset=True).items():
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
