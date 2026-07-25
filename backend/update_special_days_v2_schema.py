import asyncio
from database.connection import engine
from sqlalchemy import text

async def update_schema():
    columns_to_add = [
        ("location", "VARCHAR(200)"),
        ("emoji", "VARCHAR(10)"),
        ("event_image", "TEXT"),
        ("favorite_color", "VARCHAR(50)"),
        ("checklist", "TEXT"),
        ("budget", "VARCHAR(100)"),
        ("links", "TEXT"),
        ("attachments", "TEXT"),
    ]

    async with engine.begin() as conn:
        for col_name, col_type in columns_to_add:
            try:
                await conn.execute(text(f"ALTER TABLE important_days ADD COLUMN {col_name} {col_type}"))
                print(f"[SCHEMA UPDATE] Added column '{col_name}' to important_days")
            except Exception as e:
                err_str = str(e).lower()
                if "already exists" in err_str or "duplicate column" in err_str:
                    print(f"[SCHEMA UPDATE] Column '{col_name}' already exists.")
                else:
                    print(f"[SCHEMA UPDATE] Warning adding '{col_name}': {e}")

if __name__ == "__main__":
    asyncio.run(update_schema())
