import asyncio
import os
import sys

# Ensure backend root is in PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession
from database import SessionLocal, init_db
from models.user import User
from models.note import Note
from routers.notes import create_note, get_note, update_note
from schemas.note import NoteCreate, NoteUpdate
from utils.auth import hash_password
from sqlalchemy import select, delete
from utils.encryption import encrypt_text, decrypt_text

async def test_encryption():
    print("Initializing Database...")
    await init_db()
    
    async with SessionLocal() as db:
        # 1. Verify utility functions
        print("\n--- 1. Testing Utility Functions ---")
        plain = "Super secret password!"
        encrypted = encrypt_text(plain)
        print(f"Plaintext: {plain}")
        print(f"Encrypted: {encrypted}")
        assert encrypted.startswith("gAAAAAB"), "Encryption did not return valid Fernet token"
        decrypted = decrypt_text(encrypted)
        assert plain == decrypted, "Decryption mismatch"
        print("[OK] Utility functions passed.")
        
        # 2. Setup Test User
        print("\n--- 2. Setting Up Test User ---")
        test_email = "encryption_test_user@knovault.app"
        await db.execute(delete(User).where(User.email == test_email))
        await db.commit()
        
        user = User(email=test_email, full_name="Test User", hashed_password=hash_password("password"), is_verified=True)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"Test user created with ID: {user.id}")
        
        try:
            # 3. Create Secure Note via API router function
            print("\n--- 3. Creating Secure Note ---")
            note_data = NoteCreate(title="Test Secure Note", content="My secret data", is_secure=True)
            created_note = await create_note(data=note_data, db=db, current_user=user)
            note_id = created_note.id
            print(f"Created secure note with ID: {note_id}")
            
            # 4. Verify DB stores encrypted string directly
            print("\n--- 4. Verifying Database Storage ---")
            result = await db.execute(select(Note).where(Note.id == note_id))
            raw_note = result.scalar_one()
            print(f"Raw DB Content: {raw_note.content}")
            assert raw_note.content.startswith("gAAAAAB"), "DB did not store ciphertext"
            assert raw_note.content != "My secret data", "DB stored plaintext"
            print("[OK] DB explicitly stores ciphertext.")
            
            # 5. Fetch via API router function
            print("\n--- 5. Fetching Note via API ---")
            fetched_note = await get_note(note_id=note_id, db=db, current_user=user)
            print(f"Fetched Note Content: {fetched_note.content}")
            assert fetched_note.content == "My secret data", "API did not decrypt"
            print("[OK] API decrypts successfully.")
            
            # 6. Update Note
            print("\n--- 6. Updating Secure Note ---")
            update_data = NoteUpdate(content="Updated secret data")
            updated_note = await update_note(note_id=note_id, data=update_data, db=db, current_user=user)
            
            # Verify update is encrypted in DB
            await db.refresh(raw_note)
            print(f"Updated Raw DB Content: {raw_note.content}")
            assert raw_note.content.startswith("gAAAAAB"), "Update did not encrypt"
            assert raw_note.content != "Updated secret data"
            assert updated_note.content == "Updated secret data"
            print("[OK] Update API handles encryption successfully.")

            # 7. Test Toggle Security
            print("\n--- 7. Toggling Security OFF ---")
            make_insecure = NoteUpdate(is_secure=False)
            insecure_note = await update_note(note_id=note_id, data=make_insecure, db=db, current_user=user)
            await db.refresh(raw_note)
            print(f"Insecure Raw DB Content: {raw_note.content}")
            assert raw_note.content == "Updated secret data", "Disabling secure did not decrypt DB content"
            print("[OK] Toggling security OFF decrypts DB content.")
            
            print("\n--- 8. Toggling Security ON ---")
            make_secure = NoteUpdate(is_secure=True)
            secure_note = await update_note(note_id=note_id, data=make_secure, db=db, current_user=user)
            await db.refresh(raw_note)
            print(f"Secure Raw DB Content: {raw_note.content}")
            assert raw_note.content.startswith("gAAAAAB"), "Enabling secure did not encrypt DB content"
            print("[OK] Toggling security ON encrypts DB content.")
            
            # 8. Test invalid token (simulating an old unencrypted secure note)
            print("\n--- 9. Testing Old Unencrypted Secure Note Fallback ---")
            # Directly modify DB to plaintext but keep is_secure=True
            raw_note.content = "Old unencrypted data"
            await db.commit()
            
            # Fetch via API
            fallback_note = await get_note(note_id=note_id, db=db, current_user=user)
            print(f"Fetched Old Unencrypted Content: {fallback_note.content}")
            assert fallback_note.content == "Old unencrypted data", "Fallback for unencrypted secure note failed"
            print("[OK] Migration-safe handling for old unencrypted secure notes passed.")
            
            print("\n[SUCCESS] ALL ENCRYPTION TESTS PASSED!")
            
        finally:
            # Cleanup
            print("\n--- Cleaning Up ---")
            await db.execute(delete(Note).where(Note.user_id == user.id))
            await db.execute(delete(User).where(User.id == user.id))
            await db.commit()
            print("[OK] Test cleanup complete.")

if __name__ == "__main__":
    asyncio.run(test_encryption())
