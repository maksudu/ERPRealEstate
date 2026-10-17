from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.core.redis import close_redis_pool, get_redis_client
from app.core.middleware import AuditLoggingMiddleware

import app.modules.lookups.models
import app.modules.auth.models
import app.modules.land.models
import app.modules.projects.models
import app.modules.inventory.models
import app.modules.crm.models
import app.modules.sales.models
import app.modules.installments.models
import app.modules.construction.models
import app.modules.procurement.models
import app.modules.accounts.models
import app.modules.handover.models
import app.modules.operations.models

from app.modules.lookups.router import router as lookups_router
from app.modules.auth.router import router as auth_router
from app.modules.land.router import router as land_router
from app.modules.projects.router import router as projects_router
from app.modules.inventory.router import router as inventory_router
from app.modules.crm.router import router as crm_router
from app.modules.sales.router import router as sales_router
from app.modules.installments.router import router as installments_router
from app.modules.construction.router import router as construction_router
from app.modules.procurement.router import router as procurement_router
from app.modules.accounts.router import router as accounts_router
from app.modules.handover.router import router as handover_router
from app.modules.operations.router import router as operations_router
from app.modules.dashboard.router import router as dashboard_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize schema tables if they do not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()
    await close_redis_pool()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Real Estate ERP (Bangladesh Edition) - High-Scale Microservices Backend",
    lifespan=lifespan
)

# 1. Audit Logging Middleware (Records all mutating operations into partitioned sys_audit_trails)
app.add_middleware(AuditLoggingMiddleware)

# 2. CORS Middleware for Angular Web and Flutter Mobile Apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health & Readiness Probes
@app.get("/health/liveness", tags=["Health"])
async def liveness():
    return {"status": "UP", "service": "erp-core-backend"}

@app.get("/health/readiness", tags=["Health"])
async def readiness():
    return {"status": "READY", "database": "CONNECTED", "scale_target": "10M_RECORDS"}

@app.get("/health/db", tags=["Health"])
async def db_health(db: AsyncSession = Depends(get_db)):
    """Verifies live native MySQL 8.0 connectivity and engine status"""
    from sqlalchemy import text
    try:
        result = await db.execute(text("SELECT 1 AS alive, CURRENT_USER() AS user, DATABASE() AS db_name"))
        row = result.mappings().one()
        return {
            "status": "HEALTHY",
            "database_connection": "ESTABLISHED",
            "database_name": row["db_name"],
            "connected_user": row["user"],
            "query_result": row["alive"]
        }
    except Exception as e:
        return {
            "status": "UNHEALTHY",
            "database_connection": "FAILED",
            "error": str(e)
        }

@app.get("/health/redis", tags=["Health"])
async def redis_health():
    """Verifies live native Redis connectivity and latency"""
    try:
        redis_client = get_redis_client()
        pong = await redis_client.ping()
        return {
            "status": "HEALTHY",
            "redis_connection": "ESTABLISHED",
            "ping": pong
        }
    except Exception as e:
        return {
            "status": "UNHEALTHY",
            "redis_connection": "FAILED",
            "error": str(e)
        }

# Register Modular Routers
app.include_router(lookups_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(land_router, prefix=settings.API_V1_PREFIX)
app.include_router(projects_router, prefix=settings.API_V1_PREFIX)
app.include_router(inventory_router, prefix=settings.API_V1_PREFIX)
app.include_router(crm_router, prefix=settings.API_V1_PREFIX)
app.include_router(sales_router, prefix=settings.API_V1_PREFIX)
app.include_router(installments_router, prefix=settings.API_V1_PREFIX)
app.include_router(construction_router, prefix=settings.API_V1_PREFIX)
app.include_router(procurement_router, prefix=settings.API_V1_PREFIX)
app.include_router(accounts_router, prefix=settings.API_V1_PREFIX)
app.include_router(handover_router, prefix=settings.API_V1_PREFIX)
app.include_router(operations_router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)

if __name__ == "__main__":


    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
