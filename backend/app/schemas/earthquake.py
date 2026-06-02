from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class EarthquakeBase(BaseModel):
    external_id: str
    magnitude: float = Field(..., ge=0, le=10)
    depth_km: float = Field(..., ge=0)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_description: Optional[str] = None
    province: Optional[str] = None
    source: str = "usgs"
    occurred_at: datetime


class EarthquakeCreate(EarthquakeBase):
    pass


class EarthquakeResponse(EarthquakeBase):
    id: str
    ingested_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EarthquakeListResponse(BaseModel):
    data: List[EarthquakeResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class EarthquakeAlertPayload(BaseModel):
    event: str = "NEW_QUAKE_ALERT"
    id: str
    magnitude: float
    depth_km: float
    latitude: float
    longitude: float
    location_description: Optional[str] = None
    province: Optional[str] = None
    source: str
    occurred_at: datetime


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
