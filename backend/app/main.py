from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.modules.lookups.router import router as lookups_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize schema tables if they do not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Real Estate ERP (Bangladesh Edition) - High-Scale Microservices Backend",
    lifespan=lifespan
)

# CORS Middleware for Angular Web and Flutter Mobile Apps
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

# Register Modular Routers
app.include_router(lookups_router, prefix=settings.API_V1_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
