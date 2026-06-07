import asyncio
import asyncpg
import httpx
from config import get_settings

async def main():
    settings = get_settings()
    
    # 1. Test Database
    print("--- Database Test ---")
    try:
        db_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
        conn = await asyncpg.connect(db_url)
        rows = await conn.fetch('SELECT id, email, is_verified, firebase_uid FROM users LIMIT 10')
        print("Users in DB:")
        for r in rows:
            print(dict(r))
        await conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

    # 2. Test Brevo API
    print("\n--- Brevo API Test ---")
    try:
        sender_email = getattr(settings, 'BREVO_SENDER_EMAIL', getattr(settings, 'SMTP_USER', 'noreply@knovault.app'))
        sender_name = getattr(settings, 'BREVO_SENDER_NAME', 'KnoVault')
        api_key = settings.BREVO_API_KEY
        
        print(f"Sender Email: {sender_email}")
        print(f"Sender Name: {sender_name}")
        print(f"API Key Starts with: {api_key[:10] if api_key else 'None'}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "accept": "application/json",
                    "api-key": api_key,
                    "content-type": "application/json"
                },
                json={
                    "sender": {"name": sender_name, "email": sender_email},
                    "to": [{"email": "test@knovault.app"}],
                    "subject": "Test Email",
                    "htmlContent": "<p>Test</p>"
                }
            )
            print(f"Brevo Status: {response.status_code}")
            print(f"Brevo Response: {response.text}")
    except Exception as e:
        print(f"Brevo Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
