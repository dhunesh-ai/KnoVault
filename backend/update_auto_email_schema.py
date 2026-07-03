import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=True)

async def migrate():
    important_columns = [
        "ADD COLUMN IF NOT EXISTS auto_send_email BOOLEAN DEFAULT FALSE NOT NULL",
        "ADD COLUMN IF NOT EXISTS email_send_time VARCHAR(10) DEFAULT '09:00'",
        "ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP WITH TIME ZONE",
        "ADD COLUMN IF NOT EXISTS last_sent_year INTEGER",
    ]
    
    special_columns = [
        "ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(200)",
        "ADD COLUMN IF NOT EXISTS auto_send_email BOOLEAN DEFAULT FALSE NOT NULL",
        "ADD COLUMN IF NOT EXISTS email_subject VARCHAR(500)",
        "ADD COLUMN IF NOT EXISTS email_message TEXT",
        "ADD COLUMN IF NOT EXISTS email_send_time VARCHAR(10) DEFAULT '09:00'",
        "ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP WITH TIME ZONE",
        "ADD COLUMN IF NOT EXISTS last_sent_year INTEGER",
    ]
    
    for col in important_columns:
        async with engine.begin() as conn:
            try:
                await conn.execute(text(f"ALTER TABLE important_days {col}"))
                print(f"Success important_days: {col}")
            except Exception as e:
                print(f"Failed important_days {col}: {e}")
                
    for col in special_columns:
        async with engine.begin() as conn:
            try:
                await conn.execute(text(f"ALTER TABLE special_days {col}"))
                print(f"Success special_days: {col}")
            except Exception as e:
                print(f"Failed special_days {col}: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
