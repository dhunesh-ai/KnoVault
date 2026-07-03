from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.calendar_note import CalendarNote
from schemas.calendar_note import CalendarNoteCreate, CalendarNoteUpdate, CalendarNoteResponse
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/calendar-notes", tags=["Calendar Notes"])


@router.post("", response_model=CalendarNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_calendar_note(
    data: CalendarNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = CalendarNote(
        title=data.title,
        content=data.content,
        note_date=data.note_date,
        user_id=current_user.id
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)
    return CalendarNoteResponse.model_validate(note)


@router.get("", response_model=list[CalendarNoteResponse])
async def get_calendar_notes(
    date_str: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(CalendarNote).where(CalendarNote.user_id == current_user.id)
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
            query = query.where(CalendarNote.note_date == target_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    query = query.order_by(CalendarNote.note_date.desc(), CalendarNote.created_at.desc())
    result = await db.execute(query)
    notes = result.scalars().all()
    return [CalendarNoteResponse.model_validate(n) for n in notes]


@router.get("/date/{date_val}", response_model=list[CalendarNoteResponse])
async def get_calendar_notes_by_date(
    date_val: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(CalendarNote).where(
        CalendarNote.user_id == current_user.id,
        CalendarNote.note_date == date_val
    ).order_by(CalendarNote.created_at.desc())
    
    result = await db.execute(query)
    notes = result.scalars().all()
    return [CalendarNoteResponse.model_validate(n) for n in notes]


@router.get("/{note_id}", response_model=CalendarNoteResponse)
async def get_calendar_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CalendarNote).where(CalendarNote.id == note_id, CalendarNote.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Calendar note not found")
    return CalendarNoteResponse.model_validate(note)


@router.put("/{note_id}", response_model=CalendarNoteResponse)
async def update_calendar_note(
    note_id: int,
    data: CalendarNoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CalendarNote).where(CalendarNote.id == note_id, CalendarNote.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Calendar note not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(note, key, value)

    await db.flush()
    await db.refresh(note)
    return CalendarNoteResponse.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CalendarNote).where(CalendarNote.id == note_id, CalendarNote.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Calendar note not found")
    await db.delete(note)
