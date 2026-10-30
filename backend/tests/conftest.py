import os
import tempfile
from pathlib import Path

# Antes de importar la app: los tests borran filas, nunca deben tocar la BD real de .env
_default_db = Path(tempfile.gettempdir(), "sismocr_test.db").as_posix()
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", f"sqlite+aiosqlite:///{_default_db}")
os.environ["DEBUG"] = "false"

import pytest  # noqa: E402

from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.earthquake import Base, Earthquake  # noqa: E402
from app.redis_client import get_redis  # noqa: E402


def _clear_memory():
    get_redis()._store.clear()
    if hasattr(app.state, "_rate_limit_store"):
        app.state._rate_limit_store.clear()


# ASGITransport no ejecuta el lifespan: sin esto las tablas no existen
@pytest.fixture(autouse=True)
async def _schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(Earthquake.__table__.delete())
    _clear_memory()
    yield
    _clear_memory()
