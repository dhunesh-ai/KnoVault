import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from database.connection import Base
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=True)

async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(
                text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE")
            )
        except Exception as e:
            print("start_date:", e)

        try:
            await conn.execute(
                text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE")
            )
        except Exception as e:
            print("end_date:", e)

        try:
            await conn.execute(
                text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS timing_label VARCHAR(100)")
            )
        except Exception as e:
            print("timing_label:", e)

        try:
            await conn.execute(
                text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS dose_index INTEGER")
            )
        except Exception as e:
            print("dose_index:", e)

        try:
            await conn.execute(
                text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS course_day INTEGER")
            )
        except Exception as e:
            print("course_day:", e)

        try:
            await conn.execute(
                text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS notification_id VARCHAR(200)")
            )
        except Exception as e:
            print("notification_id:", e)

        try:
            await conn.execute(
                text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE NOT NULL")
            )
        except Exception as e:
            print("is_completed:", e)

        try:
            await conn.execute(
                text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS series_id VARCHAR(200)")
            )
        except Exception as e:
            print("series_id:", e)

asyncio.run(migrate())
