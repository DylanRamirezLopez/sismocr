"""Quick test: poll USGS, dedup, insert, verify."""
import asyncio
from app.database import async_session_factory, engine
from app.models.earthquake import Base
from app.services.ingestor import IngestorService, RawQuakeData
from app.services.deduplicator import DeduplicatorService


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        ingestor = IngestorService(db)
        dedup = DeduplicatorService(db)

        print("Polling USGS...")
        quakes = await ingestor.poll_usgs()
        print(f"  Got {len(quakes)} events")

        new_quakes = []
        for q in quakes:
            existing = await dedup.is_duplicate(q)
            if existing:
                merged = await dedup.merge(existing, q)
                new_quakes.append(merged)
                print(f"  Merged: {q.external_id}")
            else:
                new_quakes.append(q)

        raw_new = [q for q in new_quakes if isinstance(q, RawQuakeData)]
        print(f"  New to insert: {len(raw_new)}")

        if raw_new:
            inserted = await ingestor.bulk_insert(raw_new)
            print(f"  Inserted {len(inserted)} earthquakes")
            for eq in inserted:
                print(f"    {eq.id}: {eq.magnitude}M {eq.location_description}")
        else:
            print("  No new earthquakes to insert")

    async with async_session_factory() as db:
        from sqlalchemy import select, func
        from app.models.earthquake import Earthquake
        result = await db.execute(select(func.count(Earthquake.id)))
        count = result.scalar()
        print(f"\nTotal in DB: {count}")

    await engine.dispose()


asyncio.run(main())
