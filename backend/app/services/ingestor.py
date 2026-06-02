from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.earthquake import Earthquake, SourceEnum
from app.schemas.earthquake import EarthquakeCreate
from app.services.geocoder import get_province as _get_province

logger = logging.getLogger("sismocr.ingestor")


class RawQuakeData:
    def __init__(
        self,
        external_id: str,
        magnitude: float,
        depth_km: float,
        latitude: float,
        longitude: float,
        occurred_at: datetime,
        location_description: Optional[str] = None,
        province: Optional[str] = None,
        source: SourceEnum = SourceEnum.usgs,
    ):
        self.external_id = external_id
        self.magnitude = magnitude
        self.depth_km = depth_km
        self.latitude = latitude
        self.longitude = longitude
        self.occurred_at = occurred_at
        self.location_description = location_description
        self.province = province
        self.source = source


class IngestorService:
    USGS_URL = (
        "https://earthquake.usgs.gov/fdsnws/event/1/query.geojson"
        "?format=geojson&minlatitude={lat_min}&maxlatitude={lat_max}"
        "&minlongitude={lon_min}&maxlongitude={lon_max}"
        "&minmagnitude=1&orderby=time&limit=200"
    )
    OVSICORI_URL = "https://www.ovsicori.una.ac.cr/sistemas/mapa_sismicidad/mapa_sismos.php"
    RSN_URL = "https://rsn.ucr.ac.cr/map/sismos.php"

    def __init__(self, db: AsyncSession):
        self.db = db

    async def poll_usgs(self) -> list[RawQuakeData]:
        url = self.USGS_URL.format(
            lat_min=settings.cr_bbox_lat_min,
            lat_max=settings.cr_bbox_lat_max,
            lon_min=settings.cr_bbox_lon_min,
            lon_max=settings.cr_bbox_lon_max,
        )
        logger.info("Polling USGS: %s", url)

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except httpx.RequestError as exc:
            logger.error("USGS polling failed: %s", exc)
            return []

        features = data.get("features", [])
        logger.info("USGS returned %d events", len(features))
        results: list[RawQuakeData] = []

        for feat in features:
            props = feat.get("properties", {})
            coords = feat.get("geometry", {}).get("coordinates", [0, 0, 0])

            try:
                raw = RawQuakeData(
                    external_id=f"usgs-{props.get('net', '')}{props.get('code', '')}",
                    magnitude=float(props.get("mag", 0)),
                    depth_km=float(coords[2]) if len(coords) > 2 else 0,
                    latitude=float(coords[1]),
                    longitude=float(coords[0]),
                    occurred_at=datetime.fromtimestamp(
                        props.get("time", 0) / 1000, tz=timezone.utc
                    ),
                    location_description=props.get("place"),
                    source=SourceEnum.usgs,
                )
                results.append(raw)
            except (TypeError, ValueError, IndexError) as exc:
                logger.warning("Skipping malformed USGS event: %s", exc)

        return results

    async def scrape_ovsicori(self) -> list[RawQuakeData]:
        """
        OVSICORI data is embedded as JS L.marker() calls in the PHP map page.
        Parse coordinates, magnitude, depth, date/location from marker popup HTML.
        """
        logger.info("Scraping OVSICORI JS map: %s", self.OVSICORI_URL)
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                resp = await client.get(self.OVSICORI_URL)
                resp.raise_for_status()
                html = resp.text
        except httpx.RequestError as exc:
            logger.error("OVSICORI request failed: %s", exc)
            return []

        import re

        results: list[RawQuakeData] = []
        seen_ids: set[str] = set()

        # Pattern: L.marker([lat,lng],{icon:...}).bindPopup('<div>...content...</div>',{minWidth:300}).addTo(eq);
        pattern = re.compile(
            r"L\.marker\(\[([\d.\-]+),([\d.\-]+)\].*?bindPopup\('(.*?)'",
            re.DOTALL
        )

        for match in pattern.finditer(html):
            try:
                lat_str, lon_str, popup_html = match.groups()
                lat, lon = float(lat_str), -float(lon_str)

                # Extract fields from popup HTML using simple patterns
                mag = re.search(r"Magnitud:</td>\s*<td[^>]*>([\d.]+)", popup_html)
                depth = re.search(r"Prof\.\s*\[km\]:</td>\s*<td[^>]*>([\d.]+)", popup_html)
                date_str = re.search(
                    r"Fecha y Hora Local:</td>\s*<td[^>]*>(.*?)</td>", popup_html
                )
                location = re.search(
                    r"Ubicacion:</td>\s*<td[^>]*>(.*?)</td>", popup_html
                )
                eqid = re.search(r"eqid=(\d+)", popup_html)

                if not (mag and depth and date_str):
                    continue

                eq_id = eqid.group(1) if eqid else f"{lat}-{lon}-{date_str.group(1)}"
                if eq_id in seen_ids:
                    continue
                seen_ids.add(eq_id)

                raw = RawQuakeData(
                    external_id=f"ovsi-{eq_id}",
                    magnitude=float(mag.group(1)),
                    depth_km=float(depth.group(1)),
                    latitude=lat,
                    longitude=lon,
                    occurred_at=self._parse_datetime_ovsicori(
                        date_str.group(1).strip()
                    ),
                    location_description=location.group(1).strip() if location else None,
                    source=SourceEnum.ovsicori,
                )
                results.append(raw)
            except (ValueError, IndexError, TypeError, AttributeError) as exc:
                logger.warning("OVSICORI event skipped: %s", exc)

        logger.info("OVSICORI JS map parsed %d events", len(results))
        return results

    async def scrape_rsn(self) -> list[RawQuakeData]:
        logger.info("Fetching RSN JSON API: %s", self.RSN_URL)
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(self.RSN_URL)
                resp.raise_for_status()
                data = resp.json()
        except httpx.RequestError as exc:
            logger.error("RSN API request failed: %s", exc)
            return []
        except ValueError as exc:
            logger.error("RSN API returned invalid JSON: %s", exc)
            return []

        if not isinstance(data, list):
            logger.warning("RSN API: expected array, got %s", type(data).__name__)
            return []

        results: list[RawQuakeData] = []
        for event in data:
            try:
                coords = event.get("geolocation", {}).get("coordinates", [0, 0])
                raw = RawQuakeData(
                    external_id=f"rsn-{event.get('id', '')}",
                    magnitude=float(event.get("magnitude", 0)),
                    depth_km=float(event.get("depth", 0)),
                    latitude=float(coords[1]) if len(coords) > 1 else 0,
                    longitude=float(coords[0]) if len(coords) > 0 else 0,
                    occurred_at=datetime.fromisoformat(
                        event.get("date", "").replace("Z", "+00:00")
                    ),
                    location_description=event.get("location"),
                    source=SourceEnum.rsn,
                )
                results.append(raw)
            except (TypeError, ValueError, IndexError, KeyError) as exc:
                logger.warning("RSN event skipped: %s", exc)

        logger.info("RSN API returned %d events", len(results))
        return results

    def _assign_province(self, q: RawQuakeData):
        """Set province from coordinates using offline geocoder."""
        if not q.province and q.latitude != 0 and q.longitude != 0:
            prov = _get_province(q.latitude, q.longitude)
            if prov:
                q.province = prov

    async def bulk_insert(self, quakes: list[RawQuakeData]) -> list[Earthquake]:
        if not quakes:
            return []

        orm_objects: list[Earthquake] = []
        for q in quakes:
            self._assign_province(q)
            eq = Earthquake(
                external_id=q.external_id,
                magnitude=q.magnitude,
                depth_km=q.depth_km,
                latitude=q.latitude,
                longitude=q.longitude,
                location_description=q.location_description,
                province=q.province,
                source=q.source,
                occurred_at=q.occurred_at,
            )
            self.db.add(eq)
            orm_objects.append(eq)

        await self.db.commit()
        for eq in orm_objects:
            await self.db.refresh(eq)
        logger.info("Bulk inserted %d earthquakes", len(orm_objects))
        return orm_objects

    def _parse_dms(self, raw: str) -> float:
        raw = raw.strip()
        if not raw:
            return 0.0
        try:
            return float(raw)
        except ValueError:
            pass
        return 0.0

    def _parse_datetime_ovsicori(self, raw: str) -> datetime:
        raw = raw.strip()
        # Try ISO format first (JS map data: "2026-05-19 00:15:03")
        for fmt in ["%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"]:
            try:
                dt = datetime.strptime(raw, fmt)
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        logger.warning("OVSICORI unparseable date: %s", raw)
        return datetime.now(timezone.utc)


