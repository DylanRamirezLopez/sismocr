from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.engine import URL, make_url
from sqlalchemy.pool import NullPool
from app.config import settings


def normalize_database_url(raw: str) -> URL:
    """Adapta URLs de proveedores (Render, Neon) al driver asyncpg."""
    url = make_url(raw)
    if url.drivername in ("postgres", "postgresql"):
        url = url.set(drivername="postgresql+asyncpg")
    if url.drivername == "postgresql+asyncpg":
        # asyncpg usa `ssl` y no reconoce los parámetros libpq que traen estas URLs
        query = dict(url.query)
        query.pop("channel_binding", None)
        sslmode = query.pop("sslmode", None)
        if sslmode:
            query["ssl"] = sslmode
        url = url.set(query=query)
    return url


engine = create_async_engine(
    normalize_database_url(settings.database_url),
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
