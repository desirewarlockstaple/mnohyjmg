"""Forecast inference service.

Loads the trained PINN checkpoint and serves predictions through the API.
Falls back to a deterministic mock when no checkpoint is available so the
API and Web demo work end-to-end without training.
"""

from __future__ import annotations

import math
import os
from datetime import UTC, datetime

import numpy as np

from tideguard_api.schemas.forecast import ForecastCell, ForecastDay, ForecastResponse
from tideguard_api.settings import get_settings

_settings = get_settings()
_model = None


def _load_model():
    global _model
    if _model is not None:
        return _model
    ckpt_path = _settings.pinn_checkpoint_path
    if not os.path.exists(ckpt_path):
        return None
    try:
        from tideguard_ml.inference import PINNInferenceService

        _model = PINNInferenceService(ckpt_path)
        return _model
    except Exception as exc:  # noqa: BLE001
        print(f"[inference] failed to load PINN checkpoint: {exc}")
        return None


def _mock_forecast(
    lon_min: float,
    lon_max: float,
    lat_min: float,
    lat_max: float,
    horizon_days: int,
    resolution: int = 24,
) -> ForecastResponse:
    """Deterministic mock forecast: a Gaussian hotspot that drifts NE over time."""
    days: list[ForecastDay] = []
    seed = int(datetime.now(UTC).strftime("%Y%m%d"))
    rng = np.random.RandomState(seed)
    lon_center0 = (lon_min + lon_max) / 2 - 0.5
    lat_center0 = (lat_min + lat_max) / 2 - 0.3

    for d in range(horizon_days):
        cells: list[ForecastCell] = []
        drift_lon = 0.06 * d
        drift_lat = 0.04 * d
        sigma = 0.4 + 0.05 * d

        for i in range(resolution):
            for j in range(resolution):
                lon = lon_min + (lon_max - lon_min) * (i + 0.5) / resolution
                lat = lat_min + (lat_max - lat_min) * (j + 0.5) / resolution
                c = math.exp(
                    -((lon - lon_center0 - drift_lon) ** 2 + (lat - lat_center0 - drift_lat) ** 2) / (2 * sigma**2)
                )
                noise = rng.uniform(-0.02, 0.02)
                cells.append(ForecastCell(lat=lat, lng=lon, concentration=max(0.0, c + noise)))
        days.append(ForecastDay(day=d, cells=cells))

    return ForecastResponse(
        model_version="mock-v0.1",
        bbox=[lon_min, lat_min, lon_max, lat_max],
        horizon_days=horizon_days,
        days=days,
    )


def predict_forecast(
    lon_min: float,
    lon_max: float,
    lat_min: float,
    lat_max: float,
    horizon_days: int = 7,
) -> ForecastResponse:
    """Predict concentration over a bbox for the given horizon."""
    horizon_days = max(1, min(14, horizon_days))
    model = _load_model()
    if model is None:
        return _mock_forecast(lon_min, lon_max, lat_min, lat_max, horizon_days)

    grid = model.predict(lon_min, lon_max, lat_min, lat_max, horizon_days=horizon_days, resolution=24)
    days: list[ForecastDay] = []
    for ti in range(grid.concentration.shape[0]):
        cells: list[ForecastCell] = []
        for j, lat in enumerate(grid.lats):
            for i, lon in enumerate(grid.lons):
                cells.append(
                    ForecastCell(lat=float(lat), lng=float(lon), concentration=float(grid.concentration[ti, j, i]))
                )
        days.append(ForecastDay(day=ti, cells=cells))

    return ForecastResponse(
        model_version="pinn-v1",
        bbox=[lon_min, lat_min, lon_max, lat_max],
        horizon_days=horizon_days,
        days=days,
    )
