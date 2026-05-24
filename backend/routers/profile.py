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
