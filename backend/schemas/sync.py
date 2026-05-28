from typing import Any
from pydantic import BaseModel
from datetime import datetime

class SyncPushRequest(BaseModel):
    # Dictionaries of {temp_id: data} for new creations
    new_notes: list[dict[str, Any]] = []
    new_goals: list[dict[str, Any]] = []
    new_reminders: list[dict[str, Any]] = []
    new_important_days: list[dict[str, Any]] = []
    
    # Dictionaries of {id: data} for updates (including soft deletes via is_deleted=True)
    updated_notes: list[dict[str, Any]] = []
    updated_goals: list[dict[str, Any]] = []
    updated_reminders: list[dict[str, Any]] = []
    updated_important_days: list[dict[str, Any]] = []

class SyncPushResponse(BaseModel):
    # Mapping of {temp_id: real_id} so the client can update its local DB
    note_id_map: dict[str, int] = {}
    goal_id_map: dict[str, int] = {}
    reminder_id_map: dict[str, int] = {}
    important_day_id_map: dict[str, int] = {}
    
    # Any server-side conflicts that the client needs to re-pull
    conflicts: list[str] = []
    
    timestamp: datetime
