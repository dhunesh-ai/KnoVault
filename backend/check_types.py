import asyncio
import json
from database.connection import engine
from sqlalchemy import text

async def query():
    async with engine.connect() as conn:
        res = await conn.execute(text('SELECT type, COUNT(*) as c FROM reminders GROUP BY type'))
        data = [dict(r._mapping) for r in res.fetchall()]
        print(json.dumps(data, indent=2))

asyncio.run(query())
