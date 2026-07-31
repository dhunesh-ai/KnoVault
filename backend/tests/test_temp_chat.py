import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.ai_chat import AIChat

@pytest.mark.asyncio
async def test_temporary_chat_zero_db_inserts(db_session: AsyncSession, test_user: dict):
    user_id = test_user["id"]

    # Initial count of chats in database
    result = await db_session.execute(select(AIChat).where(AIChat.user_id == user_id))
    initial_chats = result.scalars().all()
    initial_count = len(initial_chats)

    # Import router / service and call with is_temporary=True
    from schemas.ai_chat import AIChatRequest
    from routers.ai_chat import chat
    from unittest.mock import patch, MagicMock

    req = AIChatRequest(message="What is my name?", context="Name is Tester", is_temporary=True)
    
    # Mock LLM response
    with patch("services.ai_service.ai_service.chat_with_ai", return_value="Your name is Tester."):
        mock_user = MagicMock()
        mock_user.id = user_id
        
        mock_req = MagicMock()
        mock_req.headers = {}
        resp = await chat(data=req, request=mock_req, db=db_session, current_user=mock_user)
        assert resp.response == "Your name is Tester."

    # Verify zero inserts into database
    result_after = await db_session.execute(select(AIChat).where(AIChat.user_id == user_id))
    after_chats = result_after.scalars().all()
    assert len(after_chats) == initial_count, "Temporary chat inserted rows into database!"
