import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os
import json

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Starting DB migration for Goals architecture...")
        
        # 1. Add missing columns to daily_goals
        try:
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS daily_target INTEGER DEFAULT 1"))
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS target_unit VARCHAR(50) DEFAULT 'times'"))
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE"))
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS reminder_time VARCHAR(20) DEFAULT NULL"))
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20) DEFAULT 'daily_goal'"))
            print("Added daily_goal configuration columns.")
        except Exception as e:
            print(f"Error adding columns to daily_goals: {e}")

        # 2. Add missing columns to project_tasks
        try:
            await conn.execute(text("ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20) DEFAULT 'project'"))
            print("Added goal_type to project_tasks.")
        except Exception as e:
            print(f"Error adding columns to project_tasks: {e}")

        # 3. Data Migration: If goal contains milestones -> project, If no milestones -> daily_goal
        # Find all project_tasks with no milestones (subtasks is null or empty '[]')
        result = await conn.execute(text("SELECT id, title, completed, user_id, created_at, subtasks FROM project_tasks"))
        projects = result.fetchall()
        
        migrated_count = 0
        for p in projects:
            subtasks = p[5]
            has_milestones = False
            if subtasks:
                if isinstance(subtasks, str):
                    try:
                        parsed = json.loads(subtasks)
                        has_milestones = len(parsed) > 0
                    except:
                        pass
                elif isinstance(subtasks, list):
                    has_milestones = len(subtasks) > 0
                    
            if not has_milestones:
                # Migrate to daily_goals
                try:
                    await conn.execute(
                        text("INSERT INTO daily_goals (title, completed, user_id, goal_date, created_at, goal_type) VALUES (:title, :completed, :user_id, CURRENT_DATE, :created_at, 'daily_goal')"),
                        {"title": p[1], "completed": p[2], "user_id": p[3], "created_at": p[4]}
                    )
                    # Delete from project_tasks
                    await conn.execute(text("DELETE FROM project_tasks WHERE id = :id"), {"id": p[0]})
                    migrated_count += 1
                except Exception as e:
                    print(f"Failed to migrate project_task {p[0]}: {e}")
                    
        print(f"Successfully migrated {migrated_count} orphaned projects into daily_goals.")
        
    await engine.dispose()

asyncio.run(migrate())
