import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Migrating daily_goals table to add extended fields...")
        try:
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS repeat_schedule VARCHAR(50) DEFAULT 'daily'"))
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium'"))
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium'"))
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#6D4CFF'"))
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS icon VARCHAR(20) DEFAULT '🎯'"))
            await conn.execute(text("ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL"))
            print("Successfully added extended columns to daily_goals table.")
        except Exception as e:
            print(f"Error migrating daily_goals table: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
