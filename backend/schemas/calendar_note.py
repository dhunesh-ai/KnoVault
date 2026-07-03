from datetime import datetime, date
from pydantic import BaseModel


class CalendarNoteCreate(BaseModel):
    title: str
    content: str | None = None
    note_date: date


class CalendarNoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    note_date: date | None = None


class CalendarNoteResponse(BaseModel):
    id: int
    title: str
    content: str | None
    note_date: date
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
