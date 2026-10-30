import pytest

from app.database import engine
from app.models.earthquake import Base


# ASGITransport no ejecuta el lifespan: sin esto las tablas no existen
@pytest.fixture(autouse=True)
async def _schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
