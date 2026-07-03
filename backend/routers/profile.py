from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from database import get_db
from models.user import User
from models.note import Note
from models.goal import Goal
from schemas.auth import UserResponse, UserUpdate
from middleware.auth import get_current_user
from utils.auth import verify_password, hash_password

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


from utils.goals import calculate_goal_streak


@router.get("/stats", response_model=dict)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes_count = (await db.execute(
        select(func.count(Note.id)).where(Note.user_id == current_user.id)
    )).scalar() or 0

    goals_total = (await db.execute(
        select(func.count(Goal.id)).where(Goal.user_id == current_user.id)
    )).scalar() or 0

    goals_completed = (await db.execute(
        select(func.count(Goal.id)).where(
            Goal.user_id == current_user.id, Goal.completed == True
        )
    )).scalar() or 0

    # Correct formula: 0 if no goals, else integer round
    success_rate = round((goals_completed / goals_total * 100)) if goals_total > 0 else 0

    # Calculate real day streak
    streak = await calculate_goal_streak(db, current_user.id)

    # Added requested debug logs
    print(f"\n[PROFILE STATS]")
    print(f"totalGoals={goals_total}")
    print(f"completedGoals={goals_completed}")
    print(f"successRate={success_rate}")
    print(f"dayStreak={streak}\n")

    return {
        "total_notes": notes_count,
        "total_goals": goals_total,
        "completed_goals": goals_completed,
        "success_rate": success_rate,
        "day_streak": streak,
    }


class ChangePassword(BaseModel):
    new_password: str


@router.post("/change-password")
async def change_password(
    data: ChangePassword,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.hashed_password = hash_password(data.new_password)
    await db.flush()
    return {"message": "Password changed successfully"}


from models.support import BugReport, FeatureSuggestion

class BugReportCreate(BaseModel):
    title: str
    description: str
    steps_to_reproduce: str
    screenshot_url: str | None = None
    device_info: str
    app_version: str


class FeatureSuggestionCreate(BaseModel):
    title: str
    description: str
    expected_benefit: str
    priority: str


@router.post("/bug-report")
async def create_bug_report(
    data: BugReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bug = BugReport(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        steps_to_reproduce=data.steps_to_reproduce,
        screenshot_url=data.screenshot_url,
        device_info=data.device_info,
        app_version=data.app_version,
    )
    db.add(bug)
    await db.flush()

    # Log/mock sending to email
    print(f"\n[SUPPORT EMAIL MOCK DISPATCH]")
    print(f"To: thinkgood24hrs@gmail.com")
    print(f"From: {current_user.email}")
    print(f"Subject: [KnoVault Bug Report] {bug.title}")
    print(f"Body:\nUser Email: {current_user.email}\nApp Version: {bug.app_version}\nDevice Info: {bug.device_info}\nDescription:\n{bug.description}\nSteps to Reproduce:\n{bug.steps_to_reproduce}\nScreenshot URL: {bug.screenshot_url or 'None'}\n")

    return {"message": "Thank you! Your bug report has been submitted."}


@router.post("/feature-request")
async def create_feature_suggestion(
    data: FeatureSuggestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.priority not in ["Low", "Medium", "High"]:
        raise HTTPException(status_code=400, detail="Priority must be Low, Medium, or High")

    suggestion = FeatureSuggestion(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        expected_benefit=data.expected_benefit,
        priority=data.priority,
    )
    db.add(suggestion)
    await db.flush()

    return {"message": "Thank you for your suggestion."}


# ── STORAGE QUOTA CALCULATION ───────────────────────────────────────

import os
import re
from models.reminder import Reminder
from models.important_day import ImportantDay
from models.calendar_note import CalendarNote
from models.note import ChecklistItem, FieldNote, VoiceNote

async def get_user_storage_usage(db: AsyncSession, user_id: int) -> int:
    db_size = 0
    file_paths = []
    
    def add_rows(rows):
        nonlocal db_size
        for r in rows:
            for key, val in r.__dict__.items():
                if key.startswith('_'):
                    continue
                if val is None:
                    continue
                if isinstance(val, str):
                    db_size += len(val)
                    if "uploads/" in val:
                        matches = re.findall(r'uploads/[^\s\'"()\]]+', val)
                        for m in matches:
                            m_clean = m.rstrip('.,;!?')
                            if m_clean not in file_paths:
                                file_paths.append(m_clean)
                elif isinstance(val, (int, float)):
                    db_size += 8
                elif isinstance(val, bool):
                    db_size += 1
                else:
                    db_size += len(str(val))
                    
            if hasattr(r, 'audio_path') and getattr(r, 'audio_path'):
                path = getattr(r, 'audio_path')
                if path not in file_paths:
                    file_paths.append(path)
            if hasattr(r, 'screenshot_url') and getattr(r, 'screenshot_url'):
                path = getattr(r, 'screenshot_url')
                if path not in file_paths:
                    file_paths.append(path)

    # 1. Notes (and relationships)
    notes_query = await db.execute(select(Note).where(Note.user_id == user_id))
    notes = notes_query.scalars().all()
    add_rows(notes)
    
    for note in notes:
        checklists_query = await db.execute(select(ChecklistItem).where(ChecklistItem.note_id == note.id))
        add_rows(checklists_query.scalars().all())
        fields_query = await db.execute(select(FieldNote).where(FieldNote.note_id == note.id))
        add_rows(fields_query.scalars().all())
        voice_query = await db.execute(select(VoiceNote).where(VoiceNote.note_id == note.id))
        vn = voice_query.scalar_one_or_none()
        if vn:
            add_rows([vn])

    # 2. Goals
    goals_query = await db.execute(select(Goal).where(Goal.user_id == user_id))
    add_rows(goals_query.scalars().all())
    
    # 3. Reminders
    reminders_query = await db.execute(select(Reminder).where(Reminder.user_id == user_id))
    add_rows(reminders_query.scalars().all())
    
    # 4. Important Days
    days_query = await db.execute(select(ImportantDay).where(ImportantDay.user_id == user_id))
    add_rows(days_query.scalars().all())
    
    # 5. Calendar Notes
    calendar_query = await db.execute(select(CalendarNote).where(CalendarNote.user_id == user_id))
    add_rows(calendar_query.scalars().all())
    
    # 6. Bug reports and feature requests
    bugs_query = await db.execute(select(BugReport).where(BugReport.user_id == user_id))
    add_rows(bugs_query.scalars().all())
    
    features_query = await db.execute(select(FeatureSuggestion).where(FeatureSuggestion.user_id == user_id))
    add_rows(features_query.scalars().all())
    
    # 7. User model
    user_query = await db.execute(select(User).where(User.id == user_id))
    user = user_query.scalar_one_or_none()
    if user:
        add_rows([user])
        
    # Calculate file sizes on disk
    file_size = 0
    for path in file_paths:
        if path.startswith("uploads/"):
            full_path = os.path.abspath(path)
            if os.path.exists(full_path) and os.path.isfile(full_path):
                file_size += os.path.getsize(full_path)
                
    return db_size + file_size


class StorageResponse(BaseModel):
    used_bytes: int
    limit_bytes: int
    remaining_bytes: int
    percent_used: float


@router.get("/storage", response_model=StorageResponse)
async def get_storage_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    limit_bytes = 5 * 1024 * 1024  # 5 MB
    used_bytes = await get_user_storage_usage(db, current_user.id)
    remaining_bytes = max(0, limit_bytes - used_bytes)
    percent_used = (used_bytes / limit_bytes) * 100
    
    return {
        "used_bytes": used_bytes,
        "limit_bytes": limit_bytes,
        "remaining_bytes": remaining_bytes,
        "percent_used": percent_used
    }


async def check_storage_quota(db: AsyncSession, user_id: int):
    limit_bytes = 5 * 1024 * 1024  # 5 MB
    used_bytes = await get_user_storage_usage(db, user_id)
    if used_bytes >= limit_bytes:
        raise HTTPException(
            status_code=403,
            detail="CLOUD_STORAGE_FULL"
        )


