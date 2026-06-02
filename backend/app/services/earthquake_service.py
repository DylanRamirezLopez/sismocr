"""
Shared business logic for API v1 and v2.
v1 router remains 100% intact; v2 routes through here.
Why: Prevents logic duplication — both versions call the same service.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.earthquake import Earthquake
from app.redis_client import get_redis

logger = logging.getLogger("sismocr.service")


async def get_recent(db: AsyncSession, hours: int = 24) -> list[Earthquake]:
    redis = get_redis()
    cache_key = f"earthquakes:recent:{hours}"
    cached = redis.get(cache_key)
    if cached:
        return [Earthquake(**item) for item in json.loads(cached)]

    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(Earthquake)
        .where(Earthquake.occurred_at >= since)
        .order_by(Earthquake.occurred_at.desc())
        .limit(100)
    )
    result = await db.execute(stmt)
    quakes = list(result.scalars().all())
    redis.setex(cache_key, 30, json.dumps([q.__dict__ for q in quakes], default=str))
    return quakes


async def get_history(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    min_magnitude: Optional[float] = None,
    max_magnitude: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    province: Optional[str] = None,
    sort_by: str = "occurred_at",
    sort_order: str = "desc",
) -> tuple[list[Earthquake], int]:
    conditions = []
    if min_magnitude is not None:
        conditions.append(Earthquake.magnitude >= min_magnitude)
    if max_magnitude is not None:
        conditions.append(Earthquake.magnitude <= max_magnitude)
    if date_from:
        dt_from = datetime.fromisoformat(date_from)
        conditions.append(Earthquake.occurred_at >= dt_from)
    if date_to:
        dt_to = datetime.fromisoformat(date_to)
        conditions.append(Earthquake.occurred_at <= dt_to)
    if province:
        conditions.append(Earthquake.province.ilike(f"%{province}%"))

    where_clause = and_(*conditions) if conditions else True

    count_stmt = select(func.count(Earthquake.id)).where(where_clause)
    total = (await db.execute(count_stmt)).scalar() or 0

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
    return list(result.scalars().all()), total


async def get_stats(db: AsyncSession) -> dict:
    redis = get_redis()
    cached = redis.get("earthquakes:stats")
    if cached:
        return json.loads(cached)

    total = (await db.execute(select(func.count(Earthquake.id)))).scalar() or 0
    max_mag = (await db.execute(select(func.max(Earthquake.magnitude)))).scalar() or 0
    avg_mag = round((await db.execute(select(func.avg(Earthquake.magnitude)))).scalar() or 0, 2)

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent = (
        await db.execute(
            select(func.count(Earthquake.id)).where(Earthquake.occurred_at >= since)
        )
    ).scalar() or 0

    sources_raw = await db.execute(
        select(Earthquake.source, func.count(Earthquake.id).label("cnt")).group_by(
            Earthquake.source
        )
    )
    by_source = {str(row.source): row.cnt for row in sources_raw}

    top_raw = await db.execute(
        select(Earthquake.magnitude, Earthquake.location_description, Earthquake.occurred_at)
        .order_by(Earthquake.magnitude.desc())
        .limit(5)
    )
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
    redis.setex("earthquakes:stats", 60, json.dumps(data, default=str))
    return data


async def export_csv(db: AsyncSession) -> str:
    """Returns CSV string of all earthquakes for PDF/export engine."""
    result = await db.execute(select(Earthquake).order_by(Earthquake.occurred_at.desc()))
    quakes = result.scalars().all()
    import io
    import csv

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "magnitude", "depth_km", "latitude", "longitude",
                      "location", "province", "source", "occurred_at"])
    for q in quakes:
        writer.writerow([q.id, q.magnitude, q.depth_km, q.latitude, q.longitude,
                         q.location_description, q.province, q.source.value, q.occurred_at.isoformat()])
    return output.getvalue()
