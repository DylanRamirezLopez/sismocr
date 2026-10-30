from app.database import normalize_database_url


def test_neon_url_is_adapted_to_asyncpg():
    url = normalize_database_url(
        "postgresql://u:p@ep-x.neon.tech/db?sslmode=require&channel_binding=require"
    )
    assert url.drivername == "postgresql+asyncpg"
    assert dict(url.query) == {"ssl": "require"}


def test_render_url_gets_async_driver():
    assert normalize_database_url("postgres://u:p@host/db").drivername == "postgresql+asyncpg"
    assert normalize_database_url("postgresql://u:p@host/db").drivername == "postgresql+asyncpg"


def test_other_drivers_are_untouched():
    sqlite = "sqlite+aiosqlite:///./sismocr.db"
    assert normalize_database_url(sqlite).render_as_string() == sqlite
