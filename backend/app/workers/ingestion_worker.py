from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_factory
from app.models.earthquake import Earthquake
from app.schemas.earthquake import EarthquakeAlertPayload
from app.services.alert_manager import alert_manager
from app.services.deduplicator import DeduplicatorService
from app.services.ingestor import IngestorService, RawQuakeData

logger = logging.getLogger("sismocr.ingestion_worker")

worker_heartbeats: dict[str, datetime] = {}

ALERT_MAX_AGE = timedelta(minutes=15)
ALERT_MIN_MAGNITUDE = 4.0


def stamp_heartbeat(name: str):
    worker_heartbeats[name] = datetime.now(timezone.utc)


async def watchdog():
    expected = {
        "usgs": settings.usgs_poll_interval * 3,
        "ovsicori": settings.scrape_interval * 3,
        "rsn": settings.scrape_interval * 3,
    }
    while True:
        await asyncio.sleep(60)
        now = datetime.now(timezone.utc)
        for name, max_age in expected.items():
            last = worker_heartbeats.get(name)
            if last and (now - last).total_seconds() > max_age:
                logger.warning(
                    "Watchdog: worker '%s' stale — last heartbeat %.0fs ago",
                    name, (now - last).total_seconds(),
                )


async def process_quake_batch(quakes: list[RawQuakeData], db: AsyncSession):
    if not quakes:
        return

    ingestor = IngestorService(db)
    dedup = DeduplicatorService(db)

    # Un sondeo repite los mismos eventos: lo ya guardado no se reprocesa ni se realerta
    unique = {q.external_id: q for q in quakes}
    known = set(
        (await db.execute(select(Earthquake.external_id).where(Earthquake.external_id.in_(unique)))).scalars()
    )

    raw_new: list[RawQuakeData] = []
    merged_count = 0
    for quake in unique.values():
        if quake.external_id in known:
            continue
        existing = await dedup.is_duplicate(quake)
        if existing:
            await dedup.merge(existing, quake)
            merged_count += 1
        else:
            raw_new.append(quake)

    if raw_new:
        inserted = await ingestor.bulk_insert(raw_new)
        now = datetime.now(timezone.utc)
        for q, eq in zip(raw_new, inserted):
            if q.magnitude < ALERT_MIN_MAGNITUDE or now - q.occurred_at > ALERT_MAX_AGE:
                continue
            payload = EarthquakeAlertPayload(
                id=eq.id,
                magnitude=eq.magnitude,
                depth_km=eq.depth_km,
                latitude=eq.latitude,
                longitude=eq.longitude,
                location_description=eq.location_description,
                province=eq.province,
                source=eq.source.value,
                occurred_at=eq.occurred_at,
            )
            await alert_manager.broadcast(payload)

    logger.info(
        "Batch processed: %d new, %d merged",
        len(raw_new),
        merged_count,
    )


async def run_usgs_poll():
    logger.info("USGS poll worker started (interval=%ds)", settings.usgs_poll_interval)
    while True:
        try:
            async with async_session_factory() as db:
                ingestor = IngestorService(db)
                quakes = await ingestor.poll_usgs()
                await process_quake_batch(quakes, db)
            stamp_heartbeat("usgs")
        except Exception as exc:
            logger.exception("USGS poll cycle failed: %s", exc)
        await asyncio.sleep(settings.usgs_poll_interval)


async def run_ovsicori_scrape():
    logger.info(
        "OVSICORI scrape worker started (interval=%ds)", settings.scrape_interval
    )
    while True:
        try:
            async with async_session_factory() as db:
                ingestor = IngestorService(db)
                quakes = await ingestor.scrape_ovsicori()
                await process_quake_batch(quakes, db)
            stamp_heartbeat("ovsicori")
        except Exception as exc:
            logger.exception("OVSICORI scrape cycle failed: %s", exc)
        await asyncio.sleep(settings.scrape_interval)


async def run_rsn_scrape():
    logger.info("RSN scrape worker started (interval=%ds)", settings.scrape_interval)
    while True:
        try:
            async with async_session_factory() as db:
                ingestor = IngestorService(db)
                quakes = await ingestor.scrape_rsn()
                await process_quake_batch(quakes, db)
            stamp_heartbeat("rsn")
        except Exception as exc:
            logger.exception("RSN scrape cycle failed: %s", exc)
        await asyncio.sleep(settings.scrape_interval)


async def main():
    logger.setLevel(settings.log_level.upper())

    tasks = [
        asyncio.create_task(run_usgs_poll()),
        asyncio.create_task(run_ovsicori_scrape()),
        asyncio.create_task(run_rsn_scrape()),
        asyncio.create_task(alert_manager.heartbeat()),
        asyncio.create_task(watchdog()),
    ]

    logger.info("All ingestion workers started")
    await asyncio.gather(*tasks, return_exceptions=True)


if __name__ == "__main__":
    asyncio.run(main())
