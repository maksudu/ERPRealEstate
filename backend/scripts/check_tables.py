import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from app.core.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW TABLES LIKE 'lnd_%'"))
        print('Lnd Tables:', [r[0] for r in res.fetchall()])
        res2 = await conn.execute(text("SHOW TABLES LIKE 'land_%'"))
        print('Land Tables:', [r[0] for r in res2.fetchall()])

asyncio.run(check())
