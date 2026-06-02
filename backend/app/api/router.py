import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.earthquake import Earthquake
from app.redis_client import get_redis
from app.schemas.earthquake import EarthquakeResponse, EarthquakeListResponse, ErrorResponse
from app.services.alert_manager import alert_manager

logger = logging.getLogger("sismocr.api")
router = APIRouter(prefix="/api/v1", tags=["earthquakes"])


@router.get("/earthquakes/recent", response_model=list[EarthquakeResponse])
async def get_recent_earthquakes(db: AsyncSession = Depends(get_db)):
    redis = get_redis()
    cache_key = "earthquakes:recent"
    cached = redis.get(cache_key)
    if cached:
        return [EarthquakeResponse(**item) for item in json.loads(cached)]

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    stmt = (
        select(Earthquake)
        .where(Earthquake.occurred_at >= since)
        .order_by(Earthquake.occurred_at.desc())
        .limit(100)
    )
    result = await db.execute(stmt)
    quakes = result.scalars().all()

    data = [EarthquakeResponse.model_validate(q).model_dump(mode="json") for q in quakes]
    redis.setex(cache_key, 30, json.dumps(data, default=str))
    return data


@router.get("/earthquakes/history", response_model=EarthquakeListResponse)
async def get_earthquake_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=200),
    min_magnitude: Optional[float] = Query(None, ge=0, le=10),
    max_magnitude: Optional[float] = Query(None, ge=0, le=10),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    province: Optional[str] = Query(None, max_length=100),
    sort_by: str = Query("occurred_at", pattern="^(occurred_at|magnitude|depth_km)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    if min_magnitude is not None:
        conditions.append(Earthquake.magnitude >= min_magnitude)
    if max_magnitude is not None:
        conditions.append(Earthquake.magnitude <= max_magnitude)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            conditions.append(Earthquake.occurred_at >= dt_from)
        except ValueError:
            raise HTTPException(400, detail="Invalid date_from format. Use ISO8601.")
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            conditions.append(Earthquake.occurred_at <= dt_to)
        except ValueError:
            raise HTTPException(400, detail="Invalid date_to format. Use ISO8601.")
    if province:
        conditions.append(Earthquake.province.ilike(f"%{province}%"))

    where_clause = and_(*conditions) if conditions else True

    count_stmt = select(func.count(Earthquake.id)).where(where_clause)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    sort_column = getattr(Earthquake, sort_by, Earthquake.occurred_at)
    order_fn = sort_column.desc if sort_order == "desc" else sort_column.asc

    stmt = (
        select(Earthquake)
        .where(where_clause)
        .order_by(order_fn())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    quakes = result.scalars().all()

    return EarthquakeListResponse(
        data=[EarthquakeResponse.model_validate(q) for q in quakes],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=max(1, (total + per_page - 1) // per_page),
    )


@router.get("/earthquakes/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    redis = get_redis()
    cache_key = "earthquakes:stats"
    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)

    total_q = select(func.count(Earthquake.id))
    total = (await db.execute(total_q)).scalar() or 0

    max_mag_q = select(func.max(Earthquake.magnitude))
    max_mag = (await db.execute(max_mag_q)).scalar() or 0

    avg_mag_q = select(func.avg(Earthquake.magnitude))
    avg_mag = round((await db.execute(avg_mag_q)).scalar() or 0, 2)

    # Last 24h count
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_q = select(func.count(Earthquake.id)).where(Earthquake.occurred_at >= since)
    recent = (await db.execute(recent_q)).scalar() or 0

    # Count per source
    from sqlalchemy import literal_column
    sources_q = select(
        Earthquake.source, func.count(Earthquake.id).label("cnt")
    ).group_by(Earthquake.source)
    sources_raw = await db.execute(sources_q)
    by_source = {row.source: row.cnt for row in sources_raw}

    # Top 5 magnitudes
    top_q = (
        select(Earthquake.magnitude, Earthquake.location_description, Earthquake.occurred_at)
        .order_by(Earthquake.magnitude.desc())
        .limit(5)
    )
    top_raw = await db.execute(top_q)
    top = [
        {"magnitude": r.magnitude, "location": r.location_description, "occurred_at": r.occurred_at.isoformat()}
        for r in top_raw
    ]

    data = {
        "total": total,
        "max_magnitude": max_mag,
        "avg_magnitude": avg_mag,
        "recent_24h": recent,
        "by_source": by_source,
        "top_5": top,
    }
    redis.setex(cache_key, 60, json.dumps(data, default=str))
    return data


@router.get(
    "/earthquakes/{earthquake_id}",
    response_model=EarthquakeResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_earthquake_detail(
    earthquake_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Earthquake).where(Earthquake.id == earthquake_id)
    )
    quake = result.scalar_one_or_none()
    if not quake:
        raise HTTPException(404, detail="Earthquake not found")
    return EarthquakeResponse.model_validate(quake)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await alert_manager.register(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("WS error: %s", exc)
    finally:
        await alert_manager.unregister(websocket)
