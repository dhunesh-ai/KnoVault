import json
import pytest
from datetime import date
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models.important_day import ImportantDay
from services.ai_service import ai_service

@pytest.mark.asyncio
async def test_ai_chat_endpoint(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    with patch("services.ai_service.ai_service.chat_with_ai", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = "Hello! I am KnoVault AI. How can I assist you today?"
        res = await client.post("/api/ai/chat", headers=headers, json={
            "message": "Summarize my goals"
        })
        assert res.status_code in (200, 201)
        assert "response" in res.json()


@pytest.mark.asyncio
async def test_ai_user_context_json_serialization(db_session: AsyncSession, test_user: dict):
    user_id = test_user["id"]
    
    # Create Special Day (Rakshith Raax Birthday)
    special_day = ImportantDay(
        user_id=user_id,
        title="Rakshith (Raax)",
        type="Birthday",
        date=date(2027, 7, 5),
        notes="Friend, turning 21",
        email_enabled=True,
    )
    db_session.add(special_day)
    await db_session.commit()
    await db_session.refresh(special_day)

    # Fetch context
    raw_context = await ai_service.get_user_context(db_session, user_id, user_message="Who is Raax?")
    parsed = json.loads(raw_context)

    assert "special_days" in parsed
    assert len(parsed["special_days"]) >= 1
    
    matched = [d for d in parsed["special_days"] if "Rakshith" in d["title"]]
    assert len(matched) == 1
    target = matched[0]
    
    assert target["title"] == "Rakshith (Raax)"
    assert target["category"] == "Birthday"
    assert target["date"] == "2027-07-05"
    assert target["turning"] == 21
    
    # Entity matching check
    assert len(parsed["matched_entities"]) >= 1
    assert parsed["matched_entities"][0]["title"] == "Rakshith (Raax)"

