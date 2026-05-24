from datetime import date, datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.daily_goal import DailyGoal

async def calculate_goal_streak(db: AsyncSession, user_id: int) -> int:
    # Fetch all daily goals for the user
    result = await db.execute(
        select(DailyGoal).where(DailyGoal.user_id == user_id)
    )
    all_goals = result.scalars().all()
    
    if not all_goals:
        return 0
        
    # Group goals by date using the goal_date column
    goals_by_date = {}
    for g in all_goals:
        g_date = g.goal_date
        if g_date not in goals_by_date:
            goals_by_date[g_date] = []
        goals_by_date[g_date].append(g)
        
    # Helper to check if a day is fully completed
    def is_day_fully_completed(d: date) -> bool:
        day_goals = goals_by_date.get(d, [])
        if not day_goals:
            return False
        return all(g.completed for g in day_goals)
        
    # Helper to check if a day has zero goals
    def has_zero_goals(d: date) -> bool:
        return d not in goals_by_date or len(goals_by_date[d]) == 0

    today = date.today()
    yesterday = today - timedelta(days=1)
    
    # Calculate streak starting from today if today's goals are fully completed, otherwise yesterday.
    if is_day_fully_completed(today):
        start_date = today
    else:
        start_date = yesterday
        
    streak = 0
    current_date = start_date
    min_date = min(goals_by_date.keys())
    
    while current_date >= min_date:
        if has_zero_goals(current_date):
            current_date -= timedelta(days=1)
            continue
            
        if is_day_fully_completed(current_date):
            streak += 1
            current_date -= timedelta(days=1)
        else:
            break
            
    return streak
