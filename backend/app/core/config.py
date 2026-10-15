from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Bangladesh Real Estate ERP"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database (MySQL 8.0 Async)
    DATABASE_URL: str = "mysql+asyncmy://erp_user:erp_secure_password@localhost:3306/erp_realestate_db"
    DB_POOL_SIZE: int = 25
    DB_MAX_OVERFLOW: int = 50
    DB_POOL_RECYCLE: int = 1800
    
    # Redis Cache & Locking
    REDIS_URL: str = "redis://localhost:6379/0"
    LOOKUP_CACHE_TTL: int = 86400  # 24 hours
    
    # Security
    JWT_SECRET: str = "super_secret_production_key_bangladesh_realestate_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12 # 12 hours
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
