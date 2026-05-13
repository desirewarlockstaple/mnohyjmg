from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import twin
from .models import (
    Corridor,
    CorridorForecast,
    EtaResponse,
    Incident,
    Segment,
    Stats,
)

app = FastAPI(
    title="PulseGrid API",
    version="0.9.0",
    description=(
        "PulseGrid REST API — a live digital twin of Vietnamese road traffic. "
        "Built on VETC ground truth (Tier A) plus on-device federated GPS aggregates (Tier B). "
        "Outputs include calibrated ETA with conformal P10/P50/P90 intervals, congestion forecasts, "
        "and anomaly / incident detections — all without any personally identifiable data."
    ),
    contact={"name": "PulseGrid", "url": "https://pulsegrid.vn", "email": "pilots@pulsegrid.vn"},
    license_info={"name": "Commercial · contact sales", "url": "mailto:sales@pulsegrid.vn"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {
        "service": "pulsegrid-api",
        "version": "0.9.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "endpoints": [
            "/v1/corridors",
            "/v1/corridors/{id}/segments",
            "/v1/incidents",
            "/v1/eta",
            "/v1/forecast",
            "/v1/stats",
            "/healthz",
        ],
    }


@app.get("/healthz", include_in_schema=False)
def healthz() -> dict:
    return {"ok": True}


@app.get("/v1/corridors", response_model=list[Corridor], tags=["corridors"])
def get_corridors() -> list[Corridor]:
    """List active digital-twin corridors (Build Week scope)."""
    return twin.list_corridors()


@app.get(
    "/v1/corridors/{corridor_id}/segments",
    response_model=list[Segment],
    tags=["corridors"],
)
def get_segments(corridor_id: str) -> list[Segment]:
    """Return live road-segment state for a corridor.

    Updated every 15 s in production from the VETC stream pipeline.
    """
    segs = twin.list_segments(corridor_id)
    if not segs:
        raise HTTPException(status_code=404, detail=f"Unknown corridor: {corridor_id}")
    return segs


@app.get("/v1/incidents", response_model=list[Incident], tags=["incidents"])
def get_incidents(
    corridor_id: str | None = Query(default=None, description="Optional corridor filter"),
) -> list[Incident]:
    """Return active anomaly / incident detections.

    Detection pipeline = CUSUM on segment flow + density-based outlier scoring,
    cross-checked with corridor-wide LLM-tagged event correlation.
    """
    return twin.list_incidents(corridor_id)


def _parse_lonlat(value: str, name: str) -> tuple[float, float]:
    try:
        a, b = value.split(",")
        return (float(a), float(b))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid {name}; expected 'lon,lat'") from None


@app.get("/v1/eta", response_model=EtaResponse, tags=["routing"])
def get_eta(
    origin: str = Query(description="lon,lat — e.g. 106.70,10.77"),
    destination: str = Query(description="lon,lat — e.g. 106.76,10.81"),
    mode: str = Query(default="car", pattern="^(car|motorcycle)$"),
) -> EtaResponse:
    """Calibrated ETA with conformal P10/P50/P90 intervals.

    Returns a single P50 ETA, the matching conformal 90% interval, expected MAPE, and a
    comparison against the Google Maps baseline for Vietnam.
    """
    o = _parse_lonlat(origin, "origin")
    d = _parse_lonlat(destination, "destination")
    r = twin.eta(o, d, mode=mode)
    if r is None:
        raise HTTPException(status_code=404, detail="No route candidates in active corridors")
    return r


@app.get("/v1/forecast", response_model=CorridorForecast, tags=["forecasting"])
def get_forecast(
    corridor_id: str = Query(description="Corridor ID, e.g. hcmc-inner-ring"),
    horizon_minutes: int = Query(default=60, ge=15, le=180),
) -> CorridorForecast:
    """Corridor-level congestion forecast at 5-minute resolution.

    Output is the corridor-aggregated GNN forecast — the same model that powers
    the segment-level forecasts under the hood.
    """
    f = twin.forecast(corridor_id, horizon_minutes)
    if f is None:
        raise HTTPException(status_code=404, detail=f"Unknown corridor: {corridor_id}")
    return f


@app.get("/v1/stats", response_model=Stats, tags=["telemetry"])
def get_stats() -> Stats:
    """Platform-wide telemetry (uptime, MAPE, daily passages)."""
    return Stats(**twin.stats())
