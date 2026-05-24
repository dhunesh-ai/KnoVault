from datetime import date as dt_date, datetime
from pydantic import BaseModel, model_validator
from typing import Any

class ImportantDayCreate(BaseModel):
    title: str | None = None
    date: dt_date | None = None
    type: str = "Birthday"
    is_recurring: bool = True
    custom_type: str | None = None
    notes: str | None = None
    gift_ideas: str | None = None
    celebration_plans: str | None = None
    reminder_notes: str | None = None
    message_draft: str | None = None

    @model_validator(mode='before')
    @classmethod
    def handle_legacy_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "person_name" in data and not data.get("title"):
                data["title"] = data["person_name"]
            if "birth_date" in data and not data.get("date"):
                data["date"] = data["birth_date"]
        return data

class ImportantDayUpdate(BaseModel):
    title: str | None = None
    date: dt_date | None = None
    type: str | None = None
    is_recurring: bool | None = None
    custom_type: str | None = None
    notes: str | None = None
    gift_ideas: str | None = None
    celebration_plans: str | None = None
    reminder_notes: str | None = None
    message_draft: str | None = None

    @model_validator(mode='before')
    @classmethod
    def handle_legacy_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "person_name" in data and not data.get("title"):
                data["title"] = data["person_name"]
            if "birth_date" in data and not data.get("date"):
                data["date"] = data["birth_date"]
        return data

class ImportantDayResponse(BaseModel):
    id: int
    title: str
    date: dt_date
    type: str
    is_recurring: bool
    custom_type: str | None = None
    notes: str | None = None
    gift_ideas: str | None = None
    celebration_plans: str | None = None
    reminder_notes: str | None = None
    message_draft: str | None = None
    user_id: int
    created_at: datetime

    person_name: str | None = None
    birth_date: dt_date | None = None

    @classmethod
    def model_validate(cls, obj: Any, *args, **kwargs):
        validated = super().model_validate(obj, *args, **kwargs)
        validated.person_name = validated.title
        validated.birth_date = validated.date
        return validated

    class Config:
        from_attributes = True
        populate_by_name = True
