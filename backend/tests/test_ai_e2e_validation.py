import json
import pytest
from datetime import date
from unittest.mock import patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models.important_day import ImportantDay
from services.ai_service import ai_service

@pytest.mark.asyncio
async def test_end_to_end_ai_pipeline_validation(db_session: AsyncSession, test_user: dict):
    user_id = test_user["id"]

    # 1. DATABASE STAGE: Seed exact test record
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

    # Validate DB Record
    assert sd.id is not None
    assert sd.title == "Rakshith (Raax)"
    assert sd.type == "Birthday"
    assert str(sd.date) == "2027-07-05"

    queries = [
        "What are my Special Days?",
        "Show my Special Days.",
        "What are the details in my Special Days section?",
        "List my birthdays.",
        "Upcoming birthdays.",
        "Who is Raax?",
        "What category is Raax?",
        "Tell me about Rakshith.",
        "Any celebrations?",
        "Any upcoming events?",
    ]

    for q in queries:
        # 2. CONTEXT RETRIEVAL STAGE
        raw_ctx = await ai_service.get_user_context(db_session, user_id, user_message=q)
        parsed = json.loads(raw_ctx)

        assert "special_days" in parsed
        assert len(parsed["special_days"]) >= 1, f"Query '{q}' returned empty special_days context!"
        assert len(parsed["matched_entities"]) >= 1, f"Query '{q}' returned empty matched_entities!"

        item = parsed["special_days"][0]
        assert item["title"] == "Rakshith (Raax)"
        assert item["category"] == "Birthday"
        assert item["date"] == "2027-07-05"
        assert item["turning"] == 21

        # 3. PROMPT & LLM EXECUTION STAGE
        def mock_groq_impl(messages, temperature=0.7, max_tokens=1024):
            sys_content = " ".join([m["content"] for m in messages if m["role"] == "system"])
            assert "Rakshith (Raax)" in sys_content
            assert "Birthday" in sys_content
            assert "2027-07-05" in sys_content
            return "You have 1 Birthday marked in Special Days: Rakshith (Raax) on July 5, 2027 (Turning 21). Category: Birthday."

        with patch.object(ai_service, "_call_groq", side_effect=mock_groq_impl) as mock_groq:
            # We execute real prompt assembly
            response_text = await ai_service.chat_with_ai(
                message=q,
                context=raw_ctx,
                history=[
                    {"role": "user", "content": "Hello"},
                    {"role": "assistant", "content": "You don't have any special days marked."} # Intentionally inject stale history
                ]
            )

            # Inspect Groq prompt payload
            assert mock_groq.called
            called_messages = mock_groq.call_args[0][0]
            
            # Ground-truth context must be present in messages
            system_msgs = [m["content"] for m in called_messages if m["role"] == "system"]
            combined_system = " ".join(system_msgs)
            assert "Rakshith (Raax)" in combined_system
            assert "Birthday" in combined_system
            assert "2027-07-05" in combined_system

            # 4. LLM & BACKEND RESPONSE VALIDATION
            lower_resp = response_text.lower()
            assert "you don't have any special days" not in lower_resp, f"Query '{q}' hallucinated no special days!"
            assert "no special days" not in lower_resp, f"Query '{q}' hallucinated no special days!"
            assert "anniversary" not in lower_resp or "wedding anniversary" in lower_resp, f"Query '{q}' converted Birthday into Anniversary!"
            assert "rakshith" in lower_resp or "raax" in lower_resp or "birthday" in lower_resp
