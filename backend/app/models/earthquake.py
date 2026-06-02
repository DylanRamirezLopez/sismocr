import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncAttrs
import enum


class Base(AsyncAttrs, DeclarativeBase):
    pass


class SourceEnum(str, enum.Enum):
    usgs = "usgs"
    ovsicori = "ovsicori"
    rsn = "rsn"
    merged = "merged"


class Earthquake(Base):
    __tablename__ = "earthquakes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    external_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    magnitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    depth_km: Mapped[float] = mapped_column(Float, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    province: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source: Mapped[SourceEnum] = mapped_column(SAEnum(SourceEnum), nullable=False, default=SourceEnum.usgs)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, index=True)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<Earthquake {self.magnitude}M {self.location_description} @{self.occurred_at}>"
