import asyncio
import asyncpg
from config import get_settings
from datetime import datetime, timezone

async def main():
    settings = get_settings()
    try:
        db_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
        conn = await asyncpg.connect(db_url, timeout=10)
        
        print("--- Latest OTP Codes ---")
        rows = await conn.fetch('SELECT id, email, code, purpose, expires_at, created_at FROM otps ORDER BY created_at DESC LIMIT 5')
        
        now = datetime.now(timezone.utc)
        print(f"Current Time (UTC): {now}")
        
        for r in rows:
            record = dict(r)
            expires_at = record['expires_at']
            is_expired = now > expires_at if expires_at.tzinfo else now > expires_at.replace(tzinfo=timezone.utc)
            record['is_expired'] = is_expired
            print(record)
            
        await conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
