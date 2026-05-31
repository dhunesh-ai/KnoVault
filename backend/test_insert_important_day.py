import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models.important_day import ImportantDay
from datetime import date
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test_insert():
    payload = {
        "title": "Dhuneshwaran",
        "type": "Birthday",
        "date": "2005-06-01",
        "gift_ideas": "Watch ⌚",
        "celebration_plans": "Dinner party",
        "reminder_notes": "Buy cake 🎂 2 days before",
        "message_draft": "Happy Birthday 🥳",
        "notes": "Be happy 😊",
        "is_recurring": True
    }
    
    async with AsyncSessionLocal() as db:
        important_day = ImportantDay(
            title=payload["title"], 
            date=date(2005, 6, 1),
            type=payload["type"],
            is_recurring=payload["is_recurring"],
            notes=payload["notes"],
            gift_ideas=payload["gift_ideas"],
            celebration_plans=payload["celebration_plans"],
            reminder_notes=payload["reminder_notes"],
            message_draft=payload["message_draft"],
            user_id=1, # Mock user_id for test
        )
        try:
            db.add(important_day)
            await db.flush()
            print("Successfully inserted ImportantDay!")
            await db.rollback() # Rollback so we don't pollute the db
        except Exception as e:
            print(f"Insertion failed: {e}")

asyncio.run(test_insert())
