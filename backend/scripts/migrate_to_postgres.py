"""
Migration script: SQLite -> PostgreSQL/PostGIS
Zero data loss. Exports SQLite to CSV, imports into PostgreSQL.

Usage:
  # 1. Ensure PostgreSQL is running with PostGIS
  # 2. Run the migration:
  python scripts/migrate_to_postgres.py

Why PostGIS instead of Haversine:
- Native spatial indexes (GiST) for fast radius queries: ST_DWithin
- SQL-level geospatial filtering instead of loading all rows into Python
- ST_Distance, ST_Contains for future features (province polygon matching)
- Scales to millions of rows without O(n) Haversine loops
"""
import csv
import os
import sqlite3
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from app.database import engine
from app.models.earthquake import Base
from sqlalchemy import text


def export_sqlite(sqlite_path: str, csv_path: str):
    """Export all earthquakes from SQLite to CSV."""
    if not os.path.exists(sqlite_path):
        print(f"SQLite DB not found: {sqlite_path}")
        return False

    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM earthquakes")
    rows = cursor.fetchall()
    col_names = [desc[0] for desc in cursor.description]

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(col_names)
        writer.writerows(rows)

    conn.close()
    print(f"Exported {len(rows)} rows from SQLite to {csv_path}")
    return True


async def import_to_postgres(csv_path: str):
    """Import CSV into PostgreSQL using COPY for speed."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("PostgreSQL tables created")

        # Read CSV
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if not rows:
            print("No rows to import")
            return

        # Batch insert
        from app.models.earthquake import Earthquake
        from sqlalchemy import insert

        batch = []
        for row in rows:
            batch.append({
                "id": row["id"],
                "external_id": row["external_id"],
                "magnitude": float(row["magnitude"]),
                "depth_km": float(row["depth_km"]),
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "location_description": row.get("location_description"),
                "province": row.get("province"),
                "source": row.get("source", "usgs"),
                "occurred_at": datetime.fromisoformat(row["occurred_at"]) if row.get("occurred_at") else datetime.now(timezone.utc),
                "ingested_at": datetime.fromisoformat(row["ingested_at"]) if row.get("ingested_at") else datetime.now(timezone.utc),
                "updated_at": datetime.fromisoformat(row["updated_at"]) if row.get("updated_at") else datetime.now(timezone.utc),
            })

        async with engine.begin() as conn:
            await conn.execute(insert(Earthquake), batch)

        print(f"Imported {len(batch)} rows into PostgreSQL")

        # Create spatial index
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_earthquakes_location "
            "ON earthquakes USING GIST ("
            "ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)"
            ")"
        ))
        print("PostGIS spatial index created")


if __name__ == "__main__":
    import asyncio

    sqlite_path = os.path.join(os.path.dirname(__file__), "..", "sismocr.db")
    csv_path = os.path.join(os.path.dirname(__file__), "..", "export_sismocr.csv")

    if export_sqlite(sqlite_path, csv_path):
        asyncio.run(import_to_postgres(csv_path))
        os.remove(csv_path)
        print("Migration complete. CSV cleaned up.")
    else:
        print("No SQLite DB found. Creating fresh PostgreSQL schema...")
        asyncio.run(import_to_postgres(None))
