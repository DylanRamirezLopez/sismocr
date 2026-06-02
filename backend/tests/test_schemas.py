from datetime import datetime, timezone

from app.schemas.earthquake import (
    EarthquakeAlertPayload,
    EarthquakeCreate,
    EarthquakeResponse,
    EarthquakeListResponse,
    ErrorResponse,
)


class TestEarthquakeCreate:
    def test_valid(self):
        data = EarthquakeCreate(
            external_id="test-1",
            magnitude=3.5,
            depth_km=10,
            latitude=9.5,
            longitude=-84.0,
            occurred_at=datetime.now(timezone.utc),
        )
        assert data.magnitude == 3.5

    def test_invalid_magnitude_too_high(self):
        import pydantic

        try:
            EarthquakeCreate(
                external_id="test-2",
                magnitude=15,
                depth_km=10,
                latitude=9.5,
                longitude=-84.0,
                occurred_at=datetime.now(timezone.utc),
            )
            assert False
        except pydantic.ValidationError:
            pass

    def test_invalid_latitude(self):
        import pydantic

        try:
            EarthquakeCreate(
                external_id="test-3",
                magnitude=3,
                depth_km=10,
                latitude=200,
                longitude=-84.0,
                occurred_at=datetime.now(timezone.utc),
            )
            assert False
        except pydantic.ValidationError:
            pass


class TestEarthquakeAlertPayload:
    def test_valid(self):
        payload = EarthquakeAlertPayload(
            id="abc-123",
            magnitude=5.2,
            depth_km=30,
            latitude=10,
            longitude=-85,
            source="usgs",
            occurred_at=datetime.now(timezone.utc),
        )
        assert payload.event == "NEW_QUAKE_ALERT"
        assert payload.magnitude == 5.2


class TestErrorResponse:
    def test_minimal(self):
        err = ErrorResponse(detail="Not found")
        assert err.detail == "Not found"
        assert err.code is None

    def test_with_code(self):
        err = ErrorResponse(detail="Rate limited", code="RATE_LIMITED")
        assert err.code == "RATE_LIMITED"
