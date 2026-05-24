
import asyncio
from sqlalchemy import text
from database.connection import engine

async def debug_auth():
    async with engine.connect() as conn:
        print("--- RECENT USERS ---")
        result = await conn.execute(text("SELECT email, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT 5"))
        for row in result:
            print(row)
            
        print("\n--- RECENT OTPS ---")
        result = await conn.execute(text("SELECT email, code, purpose, created_at FROM otps ORDER BY created_at DESC LIMIT 5"))
        for row in result:
            print(row)

if __name__ == "__main__":
    asyncio.run(debug_auth())
