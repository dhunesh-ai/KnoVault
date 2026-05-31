import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=True)

async def migrate():
    columns = [
        "ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE NOT NULL",
        "ADD COLUMN IF NOT EXISTS reminder_type VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS reminder_value INTEGER",
        "ADD COLUMN IF NOT EXISTS reminder_unit VARCHAR(20)",
        "ADD COLUMN IF NOT EXISTS reminder_time VARCHAR(10)",
        "ADD COLUMN IF NOT EXISTS notification_ids TEXT",
    ]
    
    async with engine.begin() as conn:
        for col in columns:
            try:
                await conn.execute(text(f"ALTER TABLE important_days {col}"))
                print(f"Success: {col}")
            except Exception as e:
                print(f"Failed {col}: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
