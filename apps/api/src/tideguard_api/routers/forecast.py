"""Forecast endpoint — serves PINN predictions (or mock fallback)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from tideguard_api.schemas.forecast import ForecastResponse
from tideguard_api.services.inference import predict_forecast

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("", response_model=ForecastResponse)
def get_forecast(
    bbox: str = Query("119,23,123,26", description="lon_min,lat_min,lon_max,lat_max"),
    horizon: int = Query(7, ge=1, le=14, description="Forecast horizon in days (1-14)"),
) -> ForecastResponse:
    """Return concentration forecast for the given bbox + horizon."""
    try:
        lon_min, lat_min, lon_max, lat_max = map(float, bbox.split(","))
    except Exception as exc:
        raise HTTPException(400, f"Invalid bbox: {exc}") from exc

    if lon_min >= lon_max or lat_min >= lat_max:
        raise HTTPException(400, "Invalid bbox ordering")

    return predict_forecast(lon_min, lon_max, lat_min, lat_max, horizon_days=horizon)
