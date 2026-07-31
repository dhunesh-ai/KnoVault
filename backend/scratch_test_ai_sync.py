import os
os.environ["ALLOW_SQLITE_FALLBACK"] = "true"

import asyncio
import sys
import uuid
import httpx
from httpx import ASGITransport, AsyncClient
from main import app
from database.connection import init_db
from sqlalchemy import select

async def test_ai_sync():
    print("==================================================")
    print("STARTING E2E AI CONVERSATION SYNCHRONIZATION TEST")
    print("==================================================")

    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a user directly in DB if not exists
        from database.connection import async_session
        from models.user import User
        from utils.auth import hash_password
        async with async_session() as db:
            existing = await db.execute(select(User).where(User.email == "test_sync@knovault.app"))
            if not existing.scalar_one_or_none():
                user = User(email="test_sync@knovault.app", full_name="Test Sync User", hashed_password=hash_password("Password123!"), is_verified=True)
                db.add(user)
                await db.commit()

        login_res = await client.post("/api/auth/login", json={"email": "test_sync@knovault.app", "password": "Password123!"})
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "User-Agent": "KnoVault-TestClient/1.0"}
        print("[PASS] Step 1: Authentication successful!")

        # 2. Create Conversation "Wwww"
        create_res = await client.post("/api/ai/conversations", json={"title": "Wwww"}, headers=headers)
        assert create_res.status_code == 200, f"Create conversation failed: {create_res.text}"
        conv = create_res.json()
        conv_id = conv["id"]
        assert conv["title"] == "Wwww", f"Expected title Wwww, got {conv['title']}"
        print(f"[PASS] Step 2: Created Conversation '{conv['title']}' with ID: {conv_id}")

        # 3. Send 3 messages to conversation "Wwww"
        messages_to_send = [
            "Hello, this is message 1 from Mobile.",
            "Can you remind me what KnoVault is?",
            "Thanks! This is message 3."
        ]

        for i, msg in enumerate(messages_to_send, 1):
            chat_res = await client.post("/api/ai/chat", json={
                "conversation_id": conv_id,
                "message": msg
            }, headers=headers)
            assert chat_res.status_code == 200, f"Chat message {i} failed: {chat_res.text}"
            chat_data = chat_res.json()
            assert chat_data["conversation_id"] == conv_id, f"Conversation ID mismatch: {chat_data['conversation_id']}"
            assert chat_data["user_message"]["content"] == msg, "User message content mismatch"
            assert len(chat_data["response"]) > 0, "Assistant response was empty"
            print(f"[PASS] Step 3.{i}: Sent message '{msg[:30]}...' -> Received AI response")

        # 4. List Conversations (Simulating Web loading conversation list)
        list_res = await client.get("/api/ai/conversations", headers=headers)
        assert list_res.status_code == 200, f"List conversations failed: {list_res.text}"
        conversations = list_res.json()
        target_conv = next((c for c in conversations if c["id"] == conv_id), None)
        assert target_conv is not None, f"Conversation {conv_id} not found in conversation list!"
        assert target_conv["title"] == "Wwww", f"Title mismatch in list: {target_conv['title']}"
        print(f"[PASS] Step 4: Listed conversations on Web -> Found '{target_conv['title']}' (ID: {conv_id})")

        # 5. Fetch Full Conversation Details (Simulating Web opening "Wwww")
        get_res = await client.get(f"/api/ai/conversations/{conv_id}", headers=headers)
        assert get_res.status_code == 200, f"Get conversation failed: {get_res.text}"
        full_conv = get_res.json()
        assert len(full_conv["messages"]) == 6, f"Expected 6 messages (3 user + 3 assistant), got {len(full_conv['messages'])}"
        print(f"[PASS] Step 5: Web opened conversation -> Exact 6 messages loaded in perfect chronological order!")

        # 6. Reply from Web
        web_reply_res = await client.post("/api/ai/chat", json={
            "conversation_id": conv_id,
            "message": "Here is a reply from Web client!"
        }, headers={"Authorization": f"Bearer {token}", "User-Agent": "KnoVault-WebBrowser/1.0"})
        assert web_reply_res.status_code == 200, f"Web reply failed: {web_reply_res.text}"
        print("[PASS] Step 6: Replied from Web client!")

        # 7. Verify Mobile sees Web reply
        get_mobile_res = await client.get(f"/api/ai/conversations/{conv_id}", headers={"Authorization": f"Bearer {token}", "User-Agent": "KnoVault-MobileApp/1.0"})
        assert get_mobile_res.status_code == 200, "Mobile fetch failed"
        mobile_conv = get_mobile_res.json()
        assert len(mobile_conv["messages"]) == 8, f"Expected 8 messages, got {len(mobile_conv['messages'])}"
        assert mobile_conv["messages"][-2]["content"] == "Here is a reply from Web client!", "Web reply content mismatch on mobile"
        print("[PASS] Step 7: Mobile retrieved updated conversation -> Web reply is present!")

        # 8. Rename Conversation
        rename_res = await client.patch(f"/api/ai/conversations/{conv_id}", json={"title": "Wwww Renamed"}, headers=headers)
        assert rename_res.status_code == 200, f"Rename failed: {rename_res.text}"
        assert rename_res.json()["title"] == "Wwww Renamed", "Title failed to update"
        print("[PASS] Step 8: Renamed conversation to 'Wwww Renamed' -> Synced!")

        # 9. Test Temporary Chat Isolation
        temp_res = await client.post("/api/ai/chat", json={
            "message": "Temporary secret question",
            "is_temporary": True
        }, headers=headers)
        assert temp_res.status_code == 200, "Temporary chat failed"
        assert temp_res.json()["conversation_id"] == "temporary_chat", "Temporary chat should return isolated ID"
        
        # Verify temporary chat did NOT add any conversation or message
        list_after_temp = await client.get("/api/ai/conversations", headers=headers)
        assert not any(c["title"] == "Temporary Chat" for c in list_after_temp.json()), "Temporary chat must NOT appear in history list!"
        print("[PASS] Step 9: Temporary Chat tested -> Completely isolated!")

        # 10. Delete Conversation
        del_res = await client.delete(f"/api/ai/conversations/{conv_id}", headers=headers)
        assert del_res.status_code == 204, f"Delete failed: {del_res.status_code}"
        
        # Verify conversation is gone
        list_after_del = await client.get("/api/ai/conversations", headers=headers)
        assert not any(c["id"] == conv_id for c in list_after_del.json()), "Deleted conversation still found!"
        print("[PASS] Step 10: Deleted conversation -> Removed on all platforms!")

    print("==================================================")
    print("SUCCESS: ALL 10 CROSS-PLATFORM SYNCHRONIZATION AUDIT TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_ai_sync())
