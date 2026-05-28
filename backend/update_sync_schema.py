import asyncio
from database.connection import engine, Base
import models
from sqlalchemy import text

async def update_tables():
    async with engine.begin() as conn:
        try:
            print("Adding is_deleted to notes...")
            await conn.execute(text("ALTER TABLE notes ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;"))
        except Exception as e:
            print(f"Notes error (might already exist): {e}")

        try:
            print("Adding sync fields to goals...")
            await conn.execute(text("ALTER TABLE goals ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            await conn.execute(text("ALTER TABLE goals ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;"))
        except Exception as e:
            print(f"Goals error (might already exist): {e}")

        try:
            print("Adding sync fields to reminders...")
            await conn.execute(text("ALTER TABLE reminders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            await conn.execute(text("ALTER TABLE reminders ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;"))
        except Exception as e:
            print(f"Reminders error (might already exist): {e}")

        try:
            print("Adding sync fields to important_days...")
            await conn.execute(text("ALTER TABLE important_days ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
            await conn.execute(text("ALTER TABLE important_days ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;"))
        except Exception as e:
            print(f"ImportantDays error (might already exist): {e}")
            
    print("Database sync schema update complete.")

if __name__ == "__main__":
    asyncio.run(update_tables())
