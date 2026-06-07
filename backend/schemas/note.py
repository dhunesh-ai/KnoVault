import uuid
from datetime import datetime
from pydantic import BaseModel


class ChecklistItemCreate(BaseModel):
    text: str
    completed: bool = False
    order: int = 0


class ChecklistItemUpdate(BaseModel):
    text: str | None = None
    completed: bool | None = None
    order: int | None = None


class ChecklistItemResponse(BaseModel):
    id: int
    note_id: int
    text: str
    completed: bool
    order: int

    class Config:
        from_attributes = True


class FieldNoteCreate(BaseModel):
    label: str
    value: str
    order: int = 0


class FieldNoteUpdate(BaseModel):
    label: str | None = None
    value: str | None = None
    order: int | None = None


class FieldNoteResponse(BaseModel):
    id: int
    note_id: int
    label: str
    value: str
    order: int

    class Config:
        from_attributes = True


class VoiceNoteResponse(BaseModel):
    id: int
    note_id: int
    audio_path: str
    transcript: str | None = None

    class Config:
        from_attributes = True


class CategoryResponse(BaseModel):
    name: str
    count: int = 0
    is_custom: bool = False

class CategoryCreate(BaseModel):
    name: str

class CategoryRename(BaseModel):
    new_name: str



class NoteCreate(BaseModel):
    title: str
    content: str | None = None
    category: str = "General"
    is_secure: bool = False
    note_type: str = "standard"
    is_pinned: bool = False
    is_completed: bool = False
    is_favorite: bool = False
    checklist_items: list[ChecklistItemCreate] | None = None
    field_notes: list[FieldNoteCreate] | None = None


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    is_secure: bool | None = None
    note_type: str | None = None
    is_pinned: bool | None = None
    is_completed: bool | None = None
    is_favorite: bool | None = None
    checklist_items: list[ChecklistItemCreate] | None = None
    field_notes: list[FieldNoteCreate] | None = None


class NoteResponse(BaseModel):
    id: int
    title: str
    content: str | None = None
    category: str
    is_secure: bool
    note_type: str
    is_pinned: bool
    is_completed: bool
    is_favorite: bool
    user_id: int
    created_at: datetime
    updated_at: datetime
    is_deleted: bool = False
    checklist_items: list[ChecklistItemResponse] = []
    field_notes: list[FieldNoteResponse] = []
    voice_note: VoiceNoteResponse | None = None

    class Config:
        from_attributes = True
