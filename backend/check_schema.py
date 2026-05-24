import asyncio
from sqlalchemy import text
from database.connection import engine

async def check_schema():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'notes'"))
        for row in result:
            print(row)

if __name__ == "__main__":
    asyncio.run(check_schema())
