import asyncio
import asyncpg
import httpx
from config import get_settings

async def test_flow():
    settings = get_settings()
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
    
    email = "test_reset@knovault.app"
    
    print("--- 1. Trigger Forgot Password ---")
    async with httpx.AsyncClient() as client:
        # First ensure user exists in DB to prevent 404
        # We will directly insert a dummy user for testing
        conn = await asyncpg.connect(db_url, timeout=10)
        await conn.execute("INSERT INTO users (email, hashed_password, full_name, is_verified) VALUES ($1, 'dummy', 'Test User', true) ON CONFLICT DO NOTHING", email)
        
        resp = await client.post("http://127.0.0.1:8000/api/auth/forgot-password", json={"email": email})
        print(f"Forgot Password Status: {resp.status_code}")
        print(f"Forgot Password Body: {resp.text}")

    print("\n--- 2. Read DB for OTP ---")
    rows = await conn.fetch("SELECT * FROM otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1", email)
    if not rows:
        print("No OTP found!")
        await conn.close()
        return
        
    otp_record = dict(rows[0])
    print(f"OTP Record: {otp_record}")
    code = otp_record["code"]
    
    print("\n--- 3. Trigger Reset Password ---")
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://127.0.0.1:8000/api/auth/reset-password", json={
            "email": email,
            "code": code,
            "new_password": "new_secure_password123"
        })
        print(f"Reset Password Status: {resp.status_code}")
        print(f"Reset Password Body: {resp.text}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(test_flow())
