import asyncio
import asyncpg
from config import get_settings

async def main():
    settings = get_settings()
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
    conn = await asyncpg.connect(db_url)
    rows = await conn.fetch('SELECT id, email, hashed_password FROM users LIMIT 3')
    for r in rows:
        print(dict(r))
    await conn.close()

asyncio.run(main())
