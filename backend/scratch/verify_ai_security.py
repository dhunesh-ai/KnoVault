import asyncio
import os
import sys

# Ensure backend root is in PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from database import SessionLocal, init_db
from models.user import User
from models.note import Note
from models.ai_chat import AIChat
from routers.notes import create_note, get_notes, get_note
from routers.ai_chat import chat
from schemas.note import NoteCreate
from schemas.ai_chat import AIChatRequest
from utils.auth import hash_password
from sqlalchemy import select, delete
from utils.encryption import encrypt_text

async def run_security_test():
    print("Initializing Database...")
    await init_db()
    
    async with SessionLocal() as db:
        # Setup Test User
        test_email = "ai_security_test_user@knovault.app"
        await db.execute(delete(User).where(User.email == test_email))
        await db.commit()
        
        user = User(email=test_email, full_name="AI Security User", hashed_password=hash_password("password"), is_verified=True)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"Test user created with ID: {user.id}")
        
        try:
            # 1. Create a Secure Note
            print("\n--- 1. Creating a Secure Note ---")
            note_data = NoteCreate(title="Secret Password List", content="MyPassword123", is_secure=True)
            created_note = await create_note(data=note_data, db=db, current_user=user)
            print(f"Created secure note with ID: {created_note.id}")
            
            # 2. Get note list (GET /api/notes equivalent)
            print("\n--- 2. Verifying List Endpoint keeps Note Encrypted & Empties Metadata ---")
            notes_list = await get_notes(skip=0, limit=50, db=db, current_user=user)
            assert len(notes_list) == 1, "Should find the created note"
            list_note = notes_list[0]
            print(f"List Note content: {list_note.content}")
            assert list_note.content != "MyPassword123", "List note content should be encrypted"
            assert len(list_note.checklist_items) == 0, "Checklist items should be cleared"
            assert len(list_note.field_notes) == 0, "Field notes should be cleared"
            print("[OK] List endpoint behaves securely.")
            
            # 3. Test AI pre-flight blocking on secure notes title
            print("\n--- 3. Testing AI Chat Interception by Title ---")
            request = AIChatRequest(message="What is inside my Secret Password List note?")
            response = await chat(data=request, db=db, current_user=user)
            print(f"User query: '{request.message}'")
            print(f"AI response: '{response.response}'")
            assert "For your privacy, Secure Notes are protected" in response.response, "AI did not block secure note query by title"
            print("[OK] AI blocked secure note query by title.")
            
            # 4. Test AI pre-flight blocking on keywords
            print("\n--- 4. Testing AI Chat Interception by Keywords ---")
            request = AIChatRequest(message="Can you list my secure notes?")
            response = await chat(data=request, db=db, current_user=user)
            print(f"User query: '{request.message}'")
            print(f"AI response: '{response.response}'")
            assert "For your privacy, Secure Notes are protected" in response.response, "AI did not block secure note query by keyword"
            print("[OK] AI blocked secure note query by keyword.")
            
            print("\n[SUCCESS] ALL AI CHAT PRIVACY TESTS PASSED!")
            
        finally:
            # Cleanup
            print("\n--- Cleaning Up ---")
            await db.execute(delete(Note).where(Note.user_id == user.id))
            await db.execute(delete(AIChat).where(AIChat.user_id == user.id))
            await db.execute(delete(User).where(User.id == user.id))
            await db.commit()
            print("[OK] Test cleanup complete.")

if __name__ == "__main__":
    asyncio.run(run_security_test())
