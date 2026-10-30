"""Regresiones de los bugs encontrados en la auditoría."""
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.database import async_session_factory
from app.main import app
from app.models.earthquake import Earthquake, SourceEnum
from app.services import alert_manager as alert_module
from app.services.alert_manager import AlertManager
from app.services.geocoder import get_province
from app.services.ingestor import IngestorService, RawQuakeData
from app.workers import ingestion_worker
from app.workers.ingestion_worker import process_quake_batch

OVSICORI_HTML = (
    "L.marker([10.6978,-86.0418],{icon:x}).bindPopup('<table>"
    "<tr><td>Magnitud:</td> <td>2.4</td></tr>"
    "<tr><td>Prof. [km]:</td> <td>10</td></tr>"
    "<tr><td>Fecha y Hora Local:</td> <td>2026-10-16 01:05:52</td></tr>"
    "<tr><td>Ubicacion:</td> <td>Sardinal</td></tr>"
    "<a href=x?eqid=123>x</a></table>',{minWidth:300}).addTo(eq);"
)


def raw(external_id="usgs-1", magnitude=5.0, lat=9.5, minutes_ago=1, source=SourceEnum.usgs):
    return RawQuakeData(
        external_id, magnitude, 10.0, lat, -84.0,
        datetime.now(timezone.utc) - timedelta(minutes=minutes_ago),
        "lugar", source=source,
    )


@pytest.fixture
def sent(monkeypatch):
    messages = []

    async def spy(payload):
        messages.append(payload)

    monkeypatch.setattr(ingestion_worker.alert_manager, "broadcast", spy)
    return messages


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


async def count_rows(db):
    return (await db.execute(select(func.count(Earthquake.id)))).scalar()


class TestAlerts:
    async def test_repeated_poll_alerts_once_and_keeps_source(self, sent):
        async with async_session_factory() as db:
            for _ in range(3):
                await process_quake_batch([raw()], db)
            assert len(sent) == 1
            source = (await db.execute(select(Earthquake.source))).scalar()
        assert source == SourceEnum.usgs

    async def test_small_or_old_quakes_do_not_alert(self, sent):
        async with async_session_factory() as db:
            await process_quake_batch(
                [raw("a", magnitude=2.0), raw("b", lat=10.5, minutes_ago=120)], db
            )
            assert await count_rows(db) == 2
        assert sent == []

    async def test_cross_source_merge_does_not_realert(self, sent):
        async with async_session_factory() as db:
            await process_quake_batch([raw()], db)
            await process_quake_batch([raw("rsn-1", source=SourceEnum.rsn)], db)
            assert await count_rows(db) == 1
        assert len(sent) == 1

    async def test_revised_event_does_not_lose_batch(self, sent):
        async with async_session_factory() as db:
            await process_quake_batch([raw()], db)
            revised = raw(lat=10.8)
            await process_quake_batch([revised, raw("usgs-2", lat=8.5)], db)
            assert await count_rows(db) == 2


class TestOvsicori:
    async def test_longitude_and_local_time(self, monkeypatch):
        real_client = httpx.AsyncClient
        transport = httpx.MockTransport(lambda request: httpx.Response(200, text=OVSICORI_HTML))
        monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: real_client(transport=transport, **kw))

        quakes = await IngestorService(None).scrape_ovsicori()

        assert len(quakes) == 1
        assert quakes[0].longitude == -86.0418
        assert quakes[0].occurred_at == datetime(2026, 10, 16, 7, 5, 52, tzinfo=timezone.utc)

    def test_unparseable_date_is_rejected(self):
        with pytest.raises(ValueError):
            IngestorService(None)._parse_datetime_ovsicori("ayer")


class TestApi:
    async def test_negative_depth_does_not_break_listing(self, client):
        async with async_session_factory() as db:
            db.add(Earthquake(external_id="neg", magnitude=3, depth_km=-1.2, latitude=9, longitude=-84,
                              source=SourceEnum.usgs, occurred_at=datetime.now(timezone.utc)))
            await db.commit()
        assert (await client.get("/api/v1/earthquakes/history")).status_code == 200
        assert (await client.get("/api/v1/earthquakes/recent")).status_code == 200

    async def test_v2_recent_twice(self, client):
        assert (await client.get("/api/v2/earthquakes/recent")).status_code == 200
        assert (await client.get("/api/v2/earthquakes/recent")).status_code == 200

    async def test_v2_invalid_date(self, client):
        r = await client.get("/api/v2/earthquakes/history?date_from=basura")
        assert r.status_code == 400

    async def test_stats_source_keys(self, client):
        async with async_session_factory() as db:
            await process_quake_batch([raw("a", magnitude=2.0)], db)
        r = await client.get("/api/v1/earthquakes/stats")
        assert r.json()["by_source"] == {"usgs": 1}


class TestRateLimit:
    async def test_429_has_cors_and_health_is_exempt(self, client, monkeypatch):
        monkeypatch.setattr("app.main.settings.rate_limit_per_minute", 1)
        headers = {"Origin": "https://sismoscr.vercel.app"}
        assert (await client.get("/api/v1/earthquakes/nope", headers=headers)).status_code == 404
        limited = await client.get("/api/v1/earthquakes/nope", headers=headers)
        assert limited.status_code == 429
        assert limited.headers["access-control-allow-origin"] == headers["Origin"]
        assert (await client.get("/health")).status_code == 200


class FakeSocket:
    def __init__(self, origin=None, hang=False, fail=False):
        self.headers = {"origin": origin} if origin else {}
        self.hang, self.fail = hang, fail
        self.accepted = False
        self.closed_with = None
        self.received = []

    async def accept(self):
        self.accepted = True

    async def close(self, code):
        self.closed_with = code

    async def send_text(self, text):
        if self.fail:
            raise RuntimeError("cerrado")
        if self.hang:
            import asyncio

            await asyncio.sleep(60)
        self.received.append(text)


class TestWebSockets:
    async def test_foreign_origin_rejected(self):
        ws = FakeSocket(origin="https://evil.example")
        assert await AlertManager().register(ws) is False
        assert ws.closed_with == 1008 and not ws.accepted

    async def test_connection_limit(self, monkeypatch):
        monkeypatch.setattr("app.services.alert_manager.settings.ws_max_connections", 1)
        manager = AlertManager()
        assert await manager.register(FakeSocket()) is True
        rejected = FakeSocket()
        assert await manager.register(rejected) is False
        assert rejected.closed_with == 1013

    async def test_slow_and_dead_clients_do_not_block_others(self, monkeypatch):
        monkeypatch.setattr(alert_module, "SEND_TIMEOUT_SECONDS", 0.05)
        manager = AlertManager()
        healthy, slow, dead = FakeSocket(), FakeSocket(hang=True), FakeSocket(fail=True)
        for ws in (healthy, slow, dead):
            await manager.register(ws)

        await manager._fan_out("hola")

        assert healthy.received == ["hola"]
        assert manager.connection_count == 1


@pytest.mark.parametrize(
    "lat,lon,expected",
    [
        (9.933, -84.08, "San José"),
        (10.016, -84.214, "Alajuela"),
        (9.998, -84.117, "Heredia"),
        (9.864, -83.919, "Cartago"),
        (10.635, -85.437, "Guanacaste"),
        (10.148, -85.452, "Guanacaste"),
        (9.976, -84.838, "Puntarenas"),
        (9.431, -84.161, "Puntarenas"),
        (8.64, -83.166, "Puntarenas"),
        (9.99, -83.033, "Limón"),
        (10.215, -83.785, "Limón"),
        (10.324, -84.43, "Alajuela"),
        (9.37, -83.70, "San José"),
    ],
)
def test_geocoder_real_cities(lat, lon, expected):
    assert get_province(lat, lon) == expected
