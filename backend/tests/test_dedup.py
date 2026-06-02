from datetime import datetime, timezone

from app.services.deduplicator import haversine_km, MAX_DISTANCE_KM, MAX_TIME_DELTA_SECONDS
from app.services.ingestor import RawQuakeData
from app.models.earthquake import SourceEnum


class TestHaversine:
    def test_same_point(self):
        assert haversine_km(9.7489, -83.7534, 9.7489, -83.7534) == 0

    def test_known_distance(self):
        d = haversine_km(9.7489, -83.7534, 10.0, -84.0)
        assert 35 < d < 45

    def test_zero_distance(self):
        assert haversine_km(0, 0, 0, 0) == 0


class TestMaxConstants:
    def test_max_distance(self):
        assert MAX_DISTANCE_KM == 15

    def test_max_time_delta(self):
        assert MAX_TIME_DELTA_SECONDS == 60


class TestRawQuakeData:
    def test_minimal(self):
        q = RawQuakeData(
            external_id="test-1",
            magnitude=3.5,
            depth_km=10,
            latitude=9.5,
            longitude=-84.0,
            occurred_at=datetime.now(timezone.utc),
        )
        assert q.external_id == "test-1"
        assert q.magnitude == 3.5
        assert q.source == SourceEnum.usgs

    def test_full(self):
        q = RawQuakeData(
            external_id="test-2",
            magnitude=4.2,
            depth_km=20,
            latitude=10.0,
            longitude=-85.0,
            occurred_at=datetime.now(timezone.utc),
            location_description="Costa Rica",
            province="San José",
            source=SourceEnum.rsn,
        )
        assert q.location_description == "Costa Rica"
        assert q.province == "San José"
        assert q.source == SourceEnum.rsn
