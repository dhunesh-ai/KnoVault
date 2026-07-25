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
        print("Migrating calendar_notes table...")
        
        # 1. Create table if not exists
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS calendar_notes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                note_date DATE NOT NULL,
                color VARCHAR(30) DEFAULT '#6D4CFF',
                is_pinned BOOLEAN DEFAULT FALSE,
                is_all_day BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        
        # 2. Add columns IF NOT EXISTS if table already existed without them
        try:
            await conn.execute(text("ALTER TABLE calendar_notes ADD COLUMN IF NOT EXISTS color VARCHAR(30) DEFAULT '#6D4CFF'"))
            await conn.execute(text("ALTER TABLE calendar_notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE"))
            await conn.execute(text("ALTER TABLE calendar_notes ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT TRUE"))
            print("Successfully added extended columns to calendar_notes table.")
        except Exception as e:
            print(f"Error migrating calendar_notes table: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
