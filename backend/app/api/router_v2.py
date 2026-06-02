"""
API v2 — coexists with v1 via separate APIRouter.
Why v2 separate from v1: Zero risk to v1 consumers. Deployed behind feature flag.
New in v2: GeoJSON output, richer stats, CSV/PDF export, push subscription.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.earthquake import Earthquake
from app.redis_client import get_redis
from app.schemas.earthquake import EarthquakeResponse, EarthquakeListResponse
from app.services.alert_manager import alert_manager
from app.services import earthquake_service as svc

logger = logging.getLogger("sismocr.api.v2")
router = APIRouter(prefix="/api/v2", tags=["earthquakes-v2"])


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: dict


@router.get("/earthquakes/recent", response_model=list[EarthquakeResponse])
async def get_recent(db: AsyncSession = Depends(get_db)):
    return [EarthquakeResponse.model_validate(q) for q in await svc.get_recent(db)]


@router.get("/earthquakes/history", response_model=EarthquakeListResponse)
async def get_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=500),
    min_magnitude: Optional[float] = Query(None, ge=0, le=10),
    max_magnitude: Optional[float] = Query(None, ge=0, le=10),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    province: Optional[str] = Query(None, max_length=100),
    sort_by: str = Query("occurred_at", pattern="^(occurred_at|magnitude|depth_km)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
):
    quakes, total = await svc.get_history(
        db, page, per_page, min_magnitude, max_magnitude,
        date_from, date_to, province, sort_by, sort_order,
    )
    return EarthquakeListResponse(
        data=[EarthquakeResponse.model_validate(q) for q in quakes],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=max(1, (total + per_page - 1) // per_page),
    )


@router.get("/earthquakes/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    return await svc.get_stats(db)


@router.get("/earthquakes/geojson")
async def get_geojson(db: AsyncSession = Depends(get_db)):
    """GeoJSON FeatureCollection — útil para leaflet.heat y carga directa en mapas."""
    quakes, _ = await svc.get_history(db, per_page=500)
    features = []
    for q in quakes:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [q.longitude, q.latitude]},
            "properties": {
                "id": q.id,
                "magnitude": q.magnitude,
                "depth": q.depth_km,
                "location": q.location_description,
                "time": q.occurred_at.isoformat(),
            },
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/export/csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    csv_data = await svc.export_csv(db)
    return PlainTextResponse(csv_data, media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=sismoscr.csv"})


@router.post("/push/subscribe")
async def push_subscribe(sub: PushSubscriptionIn, db: AsyncSession = Depends(get_db)):
    """Register a push subscription endpoint."""
    redis = get_redis()
    key = f"push:sub:{sub.endpoint}"
    redis.setex(key, 86400 * 30, json.dumps(sub.model_dump()))
    return {"status": "subscribed"}


@router.get("/export/pdf")
async def export_pdf(db: AsyncSession = Depends(get_db)):
    from app.services.pdf_export import generate_pdf
    pdf_data = await generate_pdf(db)
    return Response(pdf_data, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=sismoscr-reporte.pdf"})
