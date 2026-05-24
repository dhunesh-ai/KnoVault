import asyncio
from sqlalchemy import text
from database.connection import engine

async def update_schema():
    async with engine.begin() as conn:
        print("Checking/adding is_favorite column in notes table...")
        await conn.execute(text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE"))
        print("Schema updated successfully.")

if __name__ == "__main__":
    asyncio.run(update_schema())
