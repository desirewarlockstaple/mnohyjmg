"""Pydantic schemas for forecast responses."""

from __future__ import annotations

from pydantic import BaseModel


class ForecastCell(BaseModel):
    lat: float
    lng: float
    concentration: float


class ForecastDay(BaseModel):
    day: int  # D+0, D+1, ...
    cells: list[ForecastCell]


class ForecastResponse(BaseModel):
    model_version: str
    bbox: list[float]  # [lon_min, lat_min, lon_max, lat_max]
    horizon_days: int
    days: list[ForecastDay]
