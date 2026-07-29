import json
import pytest
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from models.important_day import ImportantDay
from services.ai_service import ai_service

@pytest.mark.asyncio
async def test_all_special_days_query_variations(db_session: AsyncSession, test_user: dict):
    user_id = test_user["id"]

    # Seed Special Day: Rakshith (Raax) Birthday
    sd = ImportantDay(
        user_id=user_id,
        title="Rakshith (Raax)",
        type="Birthday",
        date=date(2027, 7, 5),
        notes="Friend, turning 21",
        contact_relationship="Friend",
        email_enabled=True,
    )
    db_session.add(sd)
    await db_session.commit()
    await db_session.refresh(sd)

    queries = [
        "What are my special days?",
        "Show my special days",
        "List my special days",
        "What are the details in my Special Days section?",
        "Do I have any birthdays?",
        "Upcoming birthdays",
        "Events",
        "Celebrations",
        "Who is Raax?",
        "What category is Raax?",
    ]

    for q in queries:
        raw_ctx = await ai_service.get_user_context(db_session, user_id, user_message=q)
        parsed = json.loads(raw_ctx)

        # 1. Assert special_days array is NOT empty
        assert "special_days" in parsed
        assert len(parsed["special_days"]) >= 1, f"Query '{q}' returned empty special_days context!"

        item = parsed["special_days"][0]
        # 2. Assert Title & Category exact match
        assert item["title"] == "Rakshith (Raax)", f"Query '{q}' returned wrong title: {item['title']}"
        assert item["category"] == "Birthday", f"Query '{q}' returned wrong category: {item['category']}"
        assert item["turning"] == 21, f"Query '{q}' returned wrong turning age: {item['turning']}"
        assert item["date"] == "2027-07-05", f"Query '{q}' returned wrong date: {item['date']}"

        # 3. Assert matched_entities contains the record
        assert len(parsed["matched_entities"]) >= 1, f"Query '{q}' returned empty matched_entities!"
        assert parsed["matched_entities"][0]["title"] == "Rakshith (Raax)"
