import asyncio
from database.connection import engine
from sqlalchemy import text

async def query_db():
    print("Connecting using app engine...")
    async with engine.begin() as conn:
        print("Connected.")
        result = await conn.execute(text("SELECT email, code, purpose, expires_at, created_at FROM otps ORDER BY created_at DESC LIMIT 5"))
        rows = result.fetchall()
        for row in rows:
            print(dict(row._mapping))

if __name__ == "__main__":
    asyncio.run(query_db())
