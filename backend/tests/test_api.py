import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["service"] == "SismosCR"


@pytest.mark.asyncio
async def test_history_default_pagination(client):
    r = await client.get("/api/v1/earthquakes/history")
    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_history_per_page(client):
    r = await client.get("/api/v1/earthquakes/history?per_page=5")
    assert r.status_code == 200
    data = r.json()
    assert data["per_page"] == 5


@pytest.mark.asyncio
async def test_history_per_page_too_high(client):
    r = await client.get("/api/v1/earthquakes/history?per_page=999")
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_recent_earthquakes(client):
    r = await client.get("/api/v1/earthquakes/recent")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_earthquake_not_found(client):
    r = await client.get("/api/v1/earthquakes/nonexistent-id")
    assert r.status_code == 404
    assert r.json()["detail"] == "Earthquake not found"


@pytest.mark.asyncio
async def test_history_filter_magnitude(client):
    r = await client.get("/api/v1/earthquakes/history?min_magnitude=3&max_magnitude=5")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_history_sort(client):
    r = await client.get("/api/v1/earthquakes/history?sort_by=magnitude&sort_order=desc")
    assert r.status_code == 200
    data = r.json()
    if data["data"]:
        magnitudes = [e["magnitude"] for e in data["data"]]
        assert magnitudes == sorted(magnitudes, reverse=True)


@pytest.mark.asyncio
async def test_stats(client):
    r = await client.get("/api/v1/earthquakes/stats")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "max_magnitude" in data
    assert "avg_magnitude" in data
    assert "recent_24h" in data
    assert "by_source" in data
    assert "top_5" in data
    assert isinstance(data["total"], int)
    assert isinstance(data["max_magnitude"], (int, float))
    assert isinstance(data["by_source"], dict)
