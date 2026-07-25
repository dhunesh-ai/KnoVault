from datetime import datetime, date
from pydantic import BaseModel


class CalendarNoteCreate(BaseModel):
    title: str
    content: str | None = None
    note_date: date
    color: str | None = "#6D4CFF"
    is_pinned: bool = False
    is_all_day: bool = True


class CalendarNoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    note_date: date | None = None
    color: str | None = None
    is_pinned: bool | None = None
    is_all_day: bool | None = None


class CalendarNoteResponse(BaseModel):
    id: int
    title: str
    content: str | None = None
    note_date: date
    color: str | None = "#6D4CFF"
    is_pinned: bool = False
    is_all_day: bool = True
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

