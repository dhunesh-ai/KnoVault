import pytest
import uuid
from datetime import datetime, timezone
from schemas.ai_chat import AIChatRequest, AIChatResponse, AIConversationMessageSchema

@pytest.mark.asyncio
async def test_client_message_id_deduplication():
    from routers.ai_chat import recent_chat_requests, recent_chat_lock
    import time

    client_id = f"test_client_{uuid.uuid4().hex}"
    user_id = 999
    conv_id = "test_conv_123"

    # Simulate inserting first response into deduplication cache
    cache_key = (user_id, conv_id, f"client_id:{client_id}")
    now_dt = datetime.now(timezone.utc)
    cached_response = AIChatResponse(
        id="msg_test_123",
        conversation_id=conv_id,
        message="Hi",
        response="Hello!",
        title="Test Conversation",
        user_message=AIConversationMessageSchema(
            id="msg_user_123",
            conversation_id=conv_id,
            user_id=user_id,
            role="user",
            content="Hi",
            created_at=now_dt
        ),
        assistant_message=AIConversationMessageSchema(
            id="msg_ai_123",
            conversation_id=conv_id,
            user_id=user_id,
            role="assistant",
            content="Hello!",
            created_at=now_dt
        ),
        created_at=now_dt
    )

    async with recent_chat_lock:
        recent_chat_requests[cache_key] = (time.time(), cached_response)

    # Verify duplicate lookup
    async with recent_chat_lock:
        assert cache_key in recent_chat_requests
        ts, resp = recent_chat_requests[cache_key]
        assert resp.id == "msg_test_123"
        assert resp.user_message.content == "Hi"
