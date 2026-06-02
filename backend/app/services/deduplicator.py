from __future__ import annotations

import logging
from datetime import timedelta, timezone
from math import cos, radians
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.earthquake import Earthquake, SourceEnum
from app.services.ingestor import RawQuakeData

logger = logging.getLogger("sismocr.deduplicator")

MAX_TIME_DELTA_SECONDS = 60
MAX_DISTANCE_KM = 15

CR_LAT_CENTER = 9.7489


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import asin, sin, sqrt

    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    )
    return R * 2 * asin(sqrt(a))


class DeduplicatorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def is_duplicate(self, quake: RawQuakeData) -> Optional[Earthquake]:
        time_lower = quake.occurred_at - timedelta(seconds=MAX_TIME_DELTA_SECONDS)
        time_upper = quake.occurred_at + timedelta(seconds=MAX_TIME_DELTA_SECONDS)

        stmt = select(Earthquake).where(
            and_(
                Earthquake.occurred_at >= time_lower,
                Earthquake.occurred_at <= time_upper,
            )
        )
        result = await self.db.execute(stmt)
        candidates = result.scalars().all()

        for candidate in candidates:
            dist = haversine_km(
                quake.latitude, quake.longitude,
                candidate.latitude, candidate.longitude,
            )
            if dist <= MAX_DISTANCE_KM:
                logger.info(
                    "Duplicate found: new=%.3fM %.1fkm vs existing=%s %.3fM %.1fkm (dist=%.1fkm)",
                    quake.magnitude, quake.depth_km,
                    candidate.external_id, candidate.magnitude, candidate.depth_km,
                    dist,
                )
                return candidate

        return None

    async def merge(
        self, existing: Earthquake, incoming: RawQuakeData
    ) -> Earthquake:
        if incoming.depth_km > 0 and existing.depth_km == 0:
            existing.depth_km = incoming.depth_km
        if incoming.location_description and not existing.location_description:
            existing.location_description = incoming.location_description
        if incoming.province and not existing.province:
            existing.province = incoming.province

        if incoming.source == SourceEnum.ovsicori and existing.source != SourceEnum.ovsicori:
            existing.magnitude = incoming.magnitude
            existing.source = SourceEnum.merged
        elif incoming.source == SourceEnum.rsn and existing.source == SourceEnum.usgs:
            existing.magnitude = incoming.magnitude
            existing.source = SourceEnum.merged
        elif existing.source == SourceEnum.usgs:
            existing.magnitude = max(existing.magnitude, incoming.magnitude)
            existing.source = SourceEnum.merged

        await self.db.commit()
        await self.db.refresh(existing)
        logger.info(
            "Merged earthquake %s (final mag=%.2f, source=%s)",
            existing.external_id, existing.magnitude, existing.source.value,
        )
        return existing
