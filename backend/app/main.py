import asyncio
import logging
import os
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine
from app.models.earthquake import Base
from app.redis_client import init_redis, close_redis
from app.api.router import router
from app.api.router_v2 import router as router_v2
from app.services.alert_manager import alert_manager

os.makedirs("logs", exist_ok=True)

file_handler = RotatingFileHandler(
    "logs/sismoscr.log", maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(
    logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
)

root_logger = logging.getLogger("sismocr")
root_logger.addHandler(file_handler)

logger = logging.getLogger("sismocr")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SismosCR backend...")
    await init_redis()

    async with engine.begin() as conn:
        # Drop and recreate to pick up schema changes (safe while DB is empty)
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    asyncio.create_task(alert_manager.heartbeat())

    # Start ingestion workers as background tasks (free Render tier has no worker dyno)
    from app.workers.ingestion_worker import run_usgs_poll, run_ovsicori_scrape, run_rsn_scrape
    asyncio.create_task(run_usgs_poll())
    asyncio.create_task(run_ovsicori_scrape())
    asyncio.create_task(run_rsn_scrape())

    yield

    await close_redis()
    await engine.dispose()
    logger.info("SismosCR backend stopped.")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://sismoscr.app",
        "https://sismoscr.vercel.app",
        "https://sismoscr-git-main-portafolioddy.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

app.include_router(router)

# API v2 — feature-flagged via settings. Same business logic, no duplication.
if settings.enable_api_v2:
    app.include_router(router_v2)
    logger.info("API v2 enabled")


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_name, "version": "1.0.0"}


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = 60

    if not hasattr(app.state, "_rate_limit_store"):
        app.state._rate_limit_store = defaultdict(list)

    store = app.state._rate_limit_store[client_ip]
    while store and store[0] < now - window:
        store.pop(0)

    if len(store) >= settings.rate_limit_per_minute:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests", "code": "RATE_LIMITED"},
        )

    store.append(now)
    return await call_next(request)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
