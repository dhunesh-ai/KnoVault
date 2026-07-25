from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.user import User
from models.daily_goal import DailyGoal
from schemas.daily_goal import DailyGoalCreate, DailyGoalUpdate, DailyGoalResponse
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/goals", tags=["Goals"])


@router.get("", response_model=list[DailyGoalResponse])
async def get_goals(
    date_str: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(DailyGoal).where(DailyGoal.user_id == current_user.id)

    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = date.today()
    
    query = query.where(DailyGoal.goal_date == target_date)
    query = query.order_by(DailyGoal.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    goals = result.scalars().all()
    return [DailyGoalResponse.model_validate(g) for g in goals]


@router.post("", response_model=DailyGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    data: DailyGoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = DailyGoal(
        title=data.title, 
        goal_date=data.goal_date or date.today(),
        daily_target=data.daily_target,
        target_unit=data.target_unit,
        start_date=data.start_date or date.today(),
        reminder_time=data.reminder_time,
        repeat_schedule=data.repeat_schedule,
        priority=data.priority,
        difficulty=data.difficulty,
        color=data.color,
        icon=data.icon,
        notes=data.notes,
        goal_type=data.goal_type,
        user_id=current_user.id
    )
    db.add(goal)
    await db.flush()
    await db.refresh(goal)
    return DailyGoalResponse.model_validate(goal)


@router.put("/{goal_id}", response_model=DailyGoalResponse)
async def update_goal(
    goal_id: int,
    data: DailyGoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DailyGoal).where(DailyGoal.id == goal_id, DailyGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)

    await db.flush()
    await db.refresh(goal)
    return DailyGoalResponse.model_validate(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DailyGoal).where(DailyGoal.id == goal_id, DailyGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)


@router.get("/stats", response_model=dict)
async def get_goal_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    
    # Today's goals (all active goals for the user for today)
    total_result = await db.execute(
        select(func.count(DailyGoal.id)).where(
            DailyGoal.user_id == current_user.id,
            DailyGoal.goal_date == today
        )
    )
    total_today = total_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(DailyGoal.id)).where(
            DailyGoal.user_id == current_user.id,
            DailyGoal.completed == True,
            DailyGoal.goal_date == today
        )
    )
    completed_today = completed_result.scalar() or 0

    # All-time stats
    all_total = await db.execute(
        select(func.count(DailyGoal.id)).where(DailyGoal.user_id == current_user.id)
    )
    all_completed = await db.execute(
        select(func.count(DailyGoal.id)).where(
            DailyGoal.user_id == current_user.id,
            DailyGoal.completed == True,
        )
    )

    total_all = all_total.scalar() or 0
    completed_all = all_completed.scalar() or 0
    success_rate = round((completed_all / total_all * 100)) if total_all > 0 else 0
    today_percentage = round((completed_today / total_today * 100)) if total_today > 0 else 0

    # Calculate streak
    from utils.goals import calculate_goal_streak
    streak = await calculate_goal_streak(db, current_user.id)

    # Logging for consistency
    print(f"\n[HOME STATS UPDATED]")
    print(f"totalAll={total_all}")
    print(f"completedAll={completed_all}")
    print(f"successRate={success_rate}")
    print(f"todayTotal={total_today}")
    print(f"todayCompleted={completed_today}")
    print(f"todayPercentage={today_percentage}")
    print(f"streak={streak}\n")

    return {
        "today_total": total_today,
        "today_completed": completed_today,
        "today_percentage": today_percentage,
        "all_total": total_all,
        "all_completed": completed_all,
        "success_rate": success_rate,
        "streak": streak,
    }
