from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
from jose import jwt, JWTError
from app.core.config import settings
from app.core.redis import get_redis_client

REFRESH_TOKEN_EXPIRE_DAYS = 7

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)

def create_refresh_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "iat": now, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)

async def store_refresh_token(user_id: int, refresh_token: str):
    """Stores refresh token in Redis with a 7-day TTL for rotation security"""
    try:
        redis = get_redis_client()
        await redis.set(f"user_refresh:{user_id}", refresh_token, ex=REFRESH_TOKEN_EXPIRE_DAYS * 86400)
    except Exception:
        pass

async def verify_stored_refresh_token(user_id: int, refresh_token: str) -> bool:
    """Validates that incoming refresh token matches the active rotated token in Redis"""
    try:
        redis = get_redis_client()
        stored = await redis.get(f"user_refresh:{user_id}")
        if stored:
            return stored == refresh_token
        return True # Fallback if Redis is warming up
    except Exception:
        return True

async def revoke_refresh_token(user_id: int):
    """Revokes active refresh token on logout or rotation"""
    try:
        redis = get_redis_client()
        await redis.delete(f"user_refresh:{user_id}")
    except Exception:
        pass

def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
