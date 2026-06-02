"""
Reverse geocoding for Costa Rica provinces using a static GeoJSON file.
No external API calls — runs entirely offline.
Uses Ray Casting algorithm for point-in-polygon.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

logger = logging.getLogger("sismocr.geocoder")

_geo_data: Optional[dict] = None
_province_polygons: Optional[list[tuple[str, list[list[float]]]]] = None


def _load_geo():
    global _geo_data, _province_polygons
    path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "provincias_cr.geojson")
    if not os.path.exists(path):
        logger.warning("GeoJSON not found at %s", path)
        _province_polygons = []
        return
    with open(path, encoding="utf-8") as f:
        _geo_data = json.load(f)
    polygons = []
    for feat in _geo_data.get("features", []):
        name = feat.get("properties", {}).get("provincia", "")
        geom = feat.get("geometry", {})
        if geom.get("type") == "Polygon":
            # GeoJSON coords are [lon, lat]
            rings = geom["coordinates"]
            polygons.append((name, rings))
    _province_polygons = polygons
    logger.info("Loaded %d province polygons", len(polygons))


def _point_in_polygon(lat: float, lon: float, ring: list) -> bool:
    """
    Ray casting algorithm: count intersections of a horizontal ray
    from (lon, lat) going east. Odd count = inside.
    """
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        # Check if the point is between the segment's y-range
        if ((y1 > lat) != (y2 > lat)):
            # Compute x-intersection of the ray with the segment
            x_intersect = x1 + (lat - y1) * (x2 - x1) / (y2 - y1)
            if lon < x_intersect:
                inside = not inside
    return inside


def get_province(lat: float, lon: float) -> Optional[str]:
    """
    Returns province name for given lat/lon, or None if not found.
    Uses offline GeoJSON lookup — zero external calls.
    """
    if _province_polygons is None:
        _load_geo()

    if not _province_polygons:
        return None

    for name, rings in _province_polygons:
        # Check outer ring
        outer = rings[0]
        if _point_in_polygon(lat, lon, outer):
            # Check if point is in a hole (inner ring)
            inside = True
            for hole in rings[1:]:
                if _point_in_polygon(lat, lon, hole):
                    inside = False
                    break
            if inside:
                return name
    return None
