from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.special_day import SpecialDay
from schemas.special_day import SpecialDayCreate, SpecialDayUpdate, SpecialDayResponse
from middleware.auth import get_current_user
from datetime import date

router = APIRouter(tags=["Special Days"])


@router.get("", response_model=list[SpecialDayResponse])
async def get_special_days(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SpecialDay).where(SpecialDay.user_id == current_user.id)
        .order_by(SpecialDay.date.asc()).offset(skip).limit(limit)
    )
    return [SpecialDayResponse.model_validate(b) for b in result.scalars().all()]


@router.get("/today", response_model=list[SpecialDayResponse])
async def get_today_special_days(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    result = await db.execute(
        select(SpecialDay).where(SpecialDay.user_id == current_user.id)
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
                
    return [SpecialDayResponse.model_validate(b) for b in today_list]


@router.get("/{special_day_id}", response_model=SpecialDayResponse)
async def get_special_day_by_id(
    special_day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SpecialDay).where(SpecialDay.id == special_day_id, SpecialDay.user_id == current_user.id)
    )
    special_day = result.scalar_one_or_none()
    if not special_day:
        raise HTTPException(status_code=404, detail="Special Day not found")
    return SpecialDayResponse.model_validate(special_day)


@router.post("", response_model=SpecialDayResponse, status_code=201)
async def create_special_day(
    data: SpecialDayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Map title/date from incoming schema fields
    special_day = SpecialDay(
        title=data.title or "Untitled Special Day", 
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
    db.add(special_day)
    await db.flush()
    await db.refresh(special_day)
    return SpecialDayResponse.model_validate(special_day)


@router.put("/{special_day_id}", response_model=SpecialDayResponse)
async def update_special_day(
    special_day_id: int, data: SpecialDayUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SpecialDay).where(SpecialDay.id == special_day_id, SpecialDay.user_id == current_user.id)
    )
    special_day = result.scalar_one_or_none()
    if not special_day:
        raise HTTPException(status_code=404, detail="Special Day not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(special_day, key, value)
    await db.flush()
    await db.refresh(special_day)
    return SpecialDayResponse.model_validate(special_day)


@router.delete("/{special_day_id}", status_code=204)
async def delete_special_day(
    special_day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SpecialDay).where(SpecialDay.id == special_day_id, SpecialDay.user_id == current_user.id)
    )
    special_day = result.scalar_one_or_none()
    if not special_day:
        raise HTTPException(status_code=404, detail="Special Day not found")
    await db.delete(special_day)
