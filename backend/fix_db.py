import asyncio
from sqlalchemy import text
from database.connection import engine, Base
import models  # noqa

async def fix_database():
    async with engine.begin() as conn:
        print("Dropping tables with mismatched foreign keys...")
        tables_to_drop = [
            "checklist_items", "field_notes", "voice_notes", "notes",
            "special_days", "goals", "daily_goals", "project_tasks", "reminders", "ai_chats"
        ]

        for table in tables_to_drop:
            await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
        
        print("Recreating database schema...")
        await conn.run_sync(Base.metadata.create_all)
        print("Database schema fixed successfully.")

if __name__ == "__main__":
    asyncio.run(fix_database())
