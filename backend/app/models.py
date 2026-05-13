from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Corridor(BaseModel):
    id: str
    name: str
    city: str
    length_km: float
    segments: int
    bbox: tuple[float, float, float, float] = Field(description="lon_min, lat_min, lon_max, lat_max")
    center: tuple[float, float]


class Segment(BaseModel):
    id: str
    corridor_id: str
    name: str
    coordinates: list[tuple[float, float]]
    length_km: float
    speed_kmh: float
    free_flow_kmh: float
    congestion: float = Field(ge=0.0, le=1.0)
    flow_vph: float
    occupancy: float = Field(ge=0.0, le=1.0)
    vetc_sensors: int


IncidentType = Literal["accident", "construction", "weather", "event", "flood"]
IncidentSeverity = Literal["low", "medium", "high"]


class Incident(BaseModel):
    id: str
    corridor_id: str
    segment_id: str
    type: IncidentType
    severity: IncidentSeverity
    detected_at: datetime
    probability: float = Field(ge=0.0, le=1.0)
    description: str
    location: tuple[float, float]


class EtaResponse(BaseModel):
    origin: tuple[float, float]
    destination: tuple[float, float]
    distance_km: float
    eta_seconds: float
    eta_minutes: float
    conformal_low_seconds: float
    conformal_high_seconds: float
    conformal_low_minutes: float
    conformal_high_minutes: float
    confidence: float = Field(ge=0.0, le=1.0)
    mape_expected: float = Field(description="Expected MAPE percent (0–100)")
    baseline_google_minutes: float
    improvement_pct: float = Field(description="Negative means PulseGrid is faster/tighter than baseline")
    route_segments: list[str]
    used_tiers: list[Literal["A", "B"]]


class ForecastPoint(BaseModel):
    t: str
    congestion: float
    speed_kmh: float
    flow_vph: float


class CorridorForecast(BaseModel):
    corridor_id: str
    horizon_minutes: int
    points: list[ForecastPoint]


class Stats(BaseModel):
    daily_passages: int
    active_segments: int
    active_sensors: int
    active_incidents: int
    median_eta_mape: float
    baseline_eta_mape: float
    uptime_pct: float
    generated_at: datetime
