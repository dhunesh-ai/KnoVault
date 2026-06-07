import asyncio
from database.connection import engine, Base
from models.note import NoteCategory

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Categories schema updated successfully")

if __name__ == "__main__":
    asyncio.run(init_models())
