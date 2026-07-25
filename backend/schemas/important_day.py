from datetime import date as dt_date, datetime
from pydantic import BaseModel, model_validator, Field
from typing import Any
import json

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
    # Email wish fields
    recipient_email: str | None = None
    phone_number: str | None = None
    contact_relationship: str | None = Field(default=None, alias="relationship")
    email_subject: str | None = None
    email_message: str | None = None
    email_enabled: bool = False
    delivery_type: str = "notification"
    send_time: str | None = "09:00"
    auto_send_email: bool = False
    email_send_time: str | None = "09:00"
    timezone: str | None = "UTC"
    email_status: str | None = "PENDING"
    email_retry_count: int = 0
    # Reminders (stored as JSON array)
    # Smart Reminder System
    reminder_enabled: bool = False
    reminder_type: str | None = None
    reminder_value: int | None = None
    reminder_unit: str | None = None
    reminder_time: str | None = None
    notification_ids: str | None = None
    schedule_for_tomorrow: bool = False
    # Extended planning fields
    location: str | None = None
    emoji: str | None = None
    event_image: str | None = None
    favorite_color: str | None = None
    checklist: str | None = None
    budget: str | None = None
    links: str | None = None
    attachments: str | None = None

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
    # Email wish fields
    recipient_email: str | None = None
    phone_number: str | None = None
    contact_relationship: str | None = Field(default=None, alias="relationship")
    email_subject: str | None = None
    email_message: str | None = None
    email_enabled: bool | None = None
    delivery_type: str | None = None
    send_time: str | None = None
    auto_send_email: bool | None = None
    email_send_time: str | None = None
    timezone: str | None = None
    email_status: str | None = None
    email_retry_count: int | None = None
    # Reminders
    # Smart Reminder System
    reminder_enabled: bool | None = None
    reminder_type: str | None = None
    reminder_value: int | None = None
    reminder_unit: str | None = None
    reminder_time: str | None = None
    notification_ids: str | None = None
    schedule_for_tomorrow: bool | None = False
    # Extended planning fields
    location: str | None = None
    emoji: str | None = None
    event_image: str | None = None
    favorite_color: str | None = None
    checklist: str | None = None
    budget: str | None = None
    links: str | None = None
    attachments: str | None = None
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
    # Email wish fields
    recipient_email: str | None = None
    phone_number: str | None = None
    contact_relationship: str | None = Field(default=None, alias="relationship")
    email_subject: str | None = None
    email_message: str | None = None
    email_enabled: bool = False
    delivery_type: str = "notification"
    send_time: str | None = "09:00"
    auto_send_email: bool = False
    email_send_time: str | None = "09:00"
    last_email_sent_at: datetime | None = None
    last_sent_year: int | None = None
    timezone: str | None = "UTC"
    email_status: str | None = "PENDING"
    email_retry_count: int = 0
    # Reminders
    # Smart Reminder System
    reminder_enabled: bool = False
    reminder_type: str | None = None
    reminder_value: int | None = None
    reminder_unit: str | None = None
    reminder_time: str | None = None
    notification_ids: str | None = None    
    # Extended planning fields
    location: str | None = None
    emoji: str | None = None
    event_image: str | None = None
    favorite_color: str | None = None
    checklist: str | None = None
    budget: str | None = None
    links: str | None = None
    attachments: str | None = None
    user_id: int
    created_at: datetime
    updated_at: datetime | None = None
    is_deleted: bool = False

    person_name: str | None = None
    birth_date: dt_date | None = None

    @classmethod
    def model_validate(cls, obj: Any, *args, **kwargs):
        # Parse reminders_json from model if present
        if hasattr(obj, 'reminders_json') and obj.reminders_json:
            try:
                obj_dict = {c.key: getattr(obj, c.key) for c in obj.__table__.columns}
                obj_dict['reminders'] = json.loads(obj.reminders_json)
            except (json.JSONDecodeError, AttributeError):
                obj_dict = {c.key: getattr(obj, c.key) for c in obj.__table__.columns}
                obj_dict['reminders'] = None
        elif hasattr(obj, '__table__'):
            obj_dict = {c.key: getattr(obj, c.key) for c in obj.__table__.columns}
            obj_dict['reminders'] = None
        else:
            obj_dict = obj
            
        validated = super().model_validate(obj_dict, *args, **kwargs)
        validated.person_name = validated.title
        validated.birth_date = validated.date
        return validated

    class Config:
        from_attributes = True
        populate_by_name = True
