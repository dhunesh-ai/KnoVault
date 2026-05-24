
import asyncio
from sqlalchemy import text
from database.connection import engine

async def update_schema():
    async with engine.begin() as conn:
        print("Checking for full_name column in otps table...")
        await conn.execute(text("ALTER TABLE otps ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)"))
        print("Schema updated successfully.")

if __name__ == "__main__":
    asyncio.run(update_schema())
