import redis.asyncio as aioredis
from typing import Optional
from app.core.config import settings

redis_pool: Optional[aioredis.ConnectionPool] = None

def get_redis_pool() -> aioredis.ConnectionPool:
    global redis_pool
    if redis_pool is None:
        redis_pool = aioredis.ConnectionPool.from_url(
            settings.REDIS_URL,
            protocol=2,  # Compatible with native Windows Redis (RESP2)
            max_connections=50,
            decode_responses=True
        )
    return redis_pool

def get_redis_client() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=get_redis_pool())

async def close_redis_pool():
    global redis_pool
    if redis_pool is not None:
        await redis_pool.disconnect()
        redis_pool = None
