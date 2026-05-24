import json
import uuid
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models.user import User
from models.note import Note, ChecklistItem, FieldNote
from models.goal import Goal
from models.reminder import Reminder
from models.important_day import ImportantDay
from middleware.auth import get_current_user
from schemas.note import NoteResponse
from schemas.goal import GoalResponse
from schemas.reminder import ReminderResponse
from schemas.important_day import ImportantDayResponse

router = APIRouter(prefix="/api/backup", tags=["Backup & Restore"])


@router.get("/export", response_model=dict)
async def export_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes_result = await db.execute(
        select(Note).where(Note.user_id == current_user.id)
        .options(selectinload(Note.checklist_items), selectinload(Note.field_notes))
    )
    notes = [NoteResponse.model_validate(n).model_dump(mode="json") for n in notes_result.scalars().unique().all()]

    goals_result = await db.execute(select(Goal).where(Goal.user_id == current_user.id))
    goals = [GoalResponse.model_validate(g).model_dump(mode="json") for g in goals_result.scalars().all()]

    reminders_result = await db.execute(select(Reminder).where(Reminder.user_id == current_user.id))
    reminders = [ReminderResponse.model_validate(r).model_dump(mode="json") for r in reminders_result.scalars().all()]

    important_days_result = await db.execute(select(ImportantDay).where(ImportantDay.user_id == current_user.id))
    important_days = [ImportantDayResponse.model_validate(b).model_dump(mode="json") for b in important_days_result.scalars().all()]

    return {
        "version": "1.0",
        "notes": notes,
        "goals": goals,
        "reminders": reminders,
        "important_days": important_days,
        "special_days": important_days,  # For legacy client imports
        "birthdays": important_days,  # For legacy client imports
    }


@router.post("/import", response_model=dict)
async def import_data(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    data = json.loads(content)
    imported = {"notes": 0, "goals": 0, "reminders": 0, "important_days": 0}

    for note_data in data.get("notes", []):
        note = Note(
            title=note_data["title"],
            content=note_data.get("content"),
            category=note_data.get("category", "General"),
            is_secure=note_data.get("is_secure", False),
            note_type=note_data.get("note_type", "general"),
            user_id=current_user.id,
        )
        db.add(note)
        await db.flush()
        for item in note_data.get("checklist_items", []):
            db.add(ChecklistItem(note_id=note.id, text=item["text"], completed=item.get("completed", False)))
        for field in note_data.get("field_notes", []):
            db.add(FieldNote(note_id=note.id, label=field["label"], value=field["value"]))
        imported["notes"] += 1

    for goal_data in data.get("goals", []):
        db.add(Goal(title=goal_data["title"], completed=goal_data.get("completed", False), user_id=current_user.id))
        imported["goals"] += 1

    for rem_data in data.get("reminders", []):
        from datetime import datetime
        db.add(Reminder(
            title=rem_data["title"], description=rem_data.get("description"),
            type=rem_data.get("type", "custom"), reminder_date=datetime.fromisoformat(rem_data["reminder_date"]),
            user_id=current_user.id,
        ))
        imported["reminders"] += 1

    imported_titles = set()

    # Import important_days
    for sd_data in data.get("important_days", []):
        from datetime import date
        title = sd_data.get("title")
        if not title:
            continue
        db.add(ImportantDay(
            title=title,
            date=date.fromisoformat(sd_data["date"]),
            type=sd_data.get("type", "Birthday"),
            is_recurring=sd_data.get("is_recurring", True),
            custom_type=sd_data.get("custom_type"),
            notes=sd_data.get("notes"),
            gift_ideas=sd_data.get("gift_ideas"),
            celebration_plans=sd_data.get("celebration_plans"),
            reminder_notes=sd_data.get("reminder_notes"),
            message_draft=sd_data.get("message_draft"),
            user_id=current_user.id,
        ))
        imported_titles.add(title)
        imported["important_days"] += 1

    # Fallback legacy import special_days
    for sd_data in data.get("special_days", []):
        from datetime import date
        title = sd_data.get("title")
        if not title or title in imported_titles:
            continue
        db.add(ImportantDay(
            title=title,
            date=date.fromisoformat(sd_data["date"]),
            type=sd_data.get("type", "Birthday"),
            is_recurring=sd_data.get("is_recurring", True),
            custom_type=sd_data.get("custom_type"),
            notes=sd_data.get("notes"),
            gift_ideas=sd_data.get("gift_ideas"),
            celebration_plans=sd_data.get("celebration_plans"),
            reminder_notes=sd_data.get("reminder_notes"),
            message_draft=sd_data.get("message_draft"),
            user_id=current_user.id,
        ))
        imported_titles.add(title)
        imported["important_days"] += 1

    # Fallback legacy import birthdays
    for bd_data in data.get("birthdays", []):
        from datetime import date
        title = bd_data.get("title") or bd_data.get("person_name")
        date_str = bd_data.get("date") or bd_data.get("birth_date")
        if not title or not date_str:
            continue
        if title in imported_titles:
            continue
        
        db.add(ImportantDay(
            title=title,
            date=date.fromisoformat(date_str) if isinstance(date_str, str) else date_str,
            type=bd_data.get("type", "Birthday"),
            is_recurring=bd_data.get("is_recurring", True),
            custom_type=bd_data.get("custom_type"),
            notes=bd_data.get("notes"),
            gift_ideas=bd_data.get("gift_ideas"),
            celebration_plans=bd_data.get("celebration_plans"),
            reminder_notes=bd_data.get("reminder_notes"),
            message_draft=bd_data.get("message_draft"),
            user_id=current_user.id,
        ))
        imported["important_days"] += 1

    return {"message": "Import successful", "imported": imported}
