from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from typing import Any

from database import get_db
from models.user import User
from models.note import Note, ChecklistItem, FieldNote
from models.goal import Goal
from models.reminder import Reminder
from models.important_day import ImportantDay
from middleware.auth import get_current_user

from schemas.sync import SyncPushRequest, SyncPushResponse
from schemas.note import NoteResponse
from schemas.goal import GoalResponse
from schemas.reminder import ReminderResponse
from schemas.important_day import ImportantDayResponse

router = APIRouter(prefix="/api/sync", tags=["Sync Engine"])

@router.post("/push", response_model=SyncPushResponse)
async def push_sync(
    payload: SyncPushRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response = SyncPushResponse(timestamp=datetime.now(timezone.utc))
    
    # 1. Handle New Notes
    for note_data in payload.new_notes:
        temp_id = note_data.pop("temp_id", None)
        checklist = note_data.pop("checklist_items", [])
        fields = note_data.pop("field_notes", [])
        
        note = Note(**note_data, user_id=current_user.id)
        db.add(note)
        await db.flush()
        
        if temp_id:
            response.note_id_map[temp_id] = note.id
            
        for item in checklist:
            db.add(ChecklistItem(note_id=note.id, text=item.get("text"), completed=item.get("completed", False)))
        for field in fields:
            db.add(FieldNote(note_id=note.id, label=field.get("label"), value=field.get("value")))

    # Handle Note Updates
    for note_data in payload.updated_notes:
        note_id = note_data.pop("id")
        client_updated_at_str = note_data.get("updated_at")
        
        res = await db.execute(select(Note).where(Note.id == note_id, Note.user_id == current_user.id))
        note = res.scalar_one_or_none()
        
        if note:
            if client_updated_at_str:
                client_updated_at = datetime.fromisoformat(client_updated_at_str.replace("Z", "+00:00"))
                # Conflict Resolution: Last Write Wins
                if note.updated_at.replace(tzinfo=timezone.utc) > client_updated_at:
                    response.conflicts.append(f"note_{note_id}")
                    continue
            
            for key, value in note_data.items():
                if hasattr(note, key):
                    setattr(note, key, value)
                    
            # Basic relation sync (ignoring deeper delta for checklist/fields to keep simple for now)

    # 2. Handle New Goals
    for goal_data in payload.new_goals:
        temp_id = goal_data.pop("temp_id", None)
        goal = Goal(**goal_data, user_id=current_user.id)
        db.add(goal)
        await db.flush()
        if temp_id:
            response.goal_id_map[temp_id] = goal.id

    for goal_data in payload.updated_goals:
        goal_id = goal_data.pop("id")
        client_updated_at_str = goal_data.get("updated_at")
        res = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id))
        goal = res.scalar_one_or_none()
        if goal:
            if client_updated_at_str:
                client_updated_at = datetime.fromisoformat(client_updated_at_str.replace("Z", "+00:00"))
                if goal.updated_at.replace(tzinfo=timezone.utc) > client_updated_at:
                    response.conflicts.append(f"goal_{goal_id}")
                    continue
            for key, value in goal_data.items():
                if hasattr(goal, key):
                    setattr(goal, key, value)

    # 3. Handle Reminders
    for rem_data in payload.new_reminders:
        temp_id = rem_data.pop("temp_id", None)
        rem = Reminder(**rem_data, user_id=current_user.id)
        db.add(rem)
        await db.flush()
        if temp_id:
            response.reminder_id_map[temp_id] = rem.id

    for rem_data in payload.updated_reminders:
        rem_id = rem_data.pop("id")
        client_updated_at_str = rem_data.get("updated_at")
        res = await db.execute(select(Reminder).where(Reminder.id == rem_id, Reminder.user_id == current_user.id))
        rem = res.scalar_one_or_none()
        if rem:
            if client_updated_at_str:
                client_updated_at = datetime.fromisoformat(client_updated_at_str.replace("Z", "+00:00"))
                if rem.updated_at.replace(tzinfo=timezone.utc) > client_updated_at:
                    response.conflicts.append(f"reminder_{rem_id}")
                    continue
            for key, value in rem_data.items():
                if hasattr(rem, key):
                    setattr(rem, key, value)

    # 4. Handle Important Days
    for iday_data in payload.new_important_days:
        temp_id = iday_data.pop("temp_id", None)
        iday = ImportantDay(**iday_data, user_id=current_user.id)
        db.add(iday)
        await db.flush()
        if temp_id:
            response.important_day_id_map[temp_id] = iday.id

    for iday_data in payload.updated_important_days:
        iday_id = iday_data.pop("id")
        client_updated_at_str = iday_data.get("updated_at")
        res = await db.execute(select(ImportantDay).where(ImportantDay.id == iday_id, ImportantDay.user_id == current_user.id))
        iday = res.scalar_one_or_none()
        if iday:
            if client_updated_at_str:
                client_updated_at = datetime.fromisoformat(client_updated_at_str.replace("Z", "+00:00"))
                if iday.updated_at.replace(tzinfo=timezone.utc) > client_updated_at:
                    response.conflicts.append(f"important_day_{iday_id}")
                    continue
            for key, value in iday_data.items():
                if hasattr(iday, key):
                    setattr(iday, key, value)

    await db.commit()
    return response


@router.get("/pull")
async def pull_sync(
    since: str = Query("1970-01-01T00:00:00Z"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))

    try:
        # Pull Notes
        notes_res = await db.execute(
            select(Note)
            .where(Note.user_id == current_user.id, Note.updated_at > since_dt)
            .options(
                selectinload(Note.checklist_items), 
                selectinload(Note.field_notes),
                selectinload(Note.voice_note)
            )
        )
        notes = [NoteResponse.model_validate(n).model_dump(mode="json") for n in notes_res.scalars().unique().all()]

        # Pull Goals
        goals_res = await db.execute(
            select(Goal).where(Goal.user_id == current_user.id, Goal.updated_at > since_dt)
        )
        goals = [GoalResponse.model_validate(g).model_dump(mode="json") for g in goals_res.scalars().all()]

        # Pull Reminders
        rems_res = await db.execute(
            select(Reminder).where(Reminder.user_id == current_user.id, Reminder.updated_at > since_dt)
        )
        rems = [ReminderResponse.model_validate(r).model_dump(mode="json") for r in rems_res.scalars().all()]

        # Pull Important Days
        idays_res = await db.execute(
            select(ImportantDay).where(ImportantDay.user_id == current_user.id, ImportantDay.updated_at > since_dt)
        )
        idays = [ImportantDayResponse.model_validate(i).model_dump(mode="json") for i in idays_res.scalars().all()]

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "notes": notes,
            "goals": goals,
            "reminders": rems,
            "important_days": idays,
        }
    except Exception as e:
        import traceback
        print(f"[Sync Pull Error] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
