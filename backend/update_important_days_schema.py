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
        "ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(200)",
        "ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50)",
        "ADD COLUMN IF NOT EXISTS contact_relationship VARCHAR(100)",
        "ADD COLUMN IF NOT EXISTS email_subject VARCHAR(500)",
        "ADD COLUMN IF NOT EXISTS email_message TEXT",
        "ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT FALSE NOT NULL",
        "ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'notification' NOT NULL",
        "ADD COLUMN IF NOT EXISTS send_time VARCHAR(10) DEFAULT '09:00'",
        "ADD COLUMN IF NOT EXISTS reminders_json TEXT",
    ]
    
    async with engine.begin() as conn:
        for col in columns:
            try:
                await conn.execute(text(f"ALTER TABLE important_days {col}"))
                print(f"Success: {col}")
            except Exception as e:
                print(f"Failed {col}: {e}")

asyncio.run(migrate())
