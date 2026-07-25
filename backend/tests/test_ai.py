import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient

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
