from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from app.config import settings

# Render's fromDatabase returns postgresql:// without +asyncpg.
# Fix: ensure async driver is used for Postgres URLs.
_db_url = settings.database_url
if _db_url.startswith("postgresql://") and "+" not in _db_url.split("://")[0]:
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    _db_url,
    poolclass=NullPool,
    echo=settings.debug,
)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
