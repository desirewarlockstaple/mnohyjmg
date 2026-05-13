# pulsegrid-api

FastAPI service powering the PulseGrid digital-twin demo. Produces deterministic-but-realistic
"VETC-grade" traffic state, ETA estimates with conformal intervals, congestion forecasts and
incident detections.

## Run locally

```bash
uv sync
uv run uvicorn pulsegrid_api.main:app --reload --port 8000
```

Interactive Swagger UI: <http://localhost:8000/docs>

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/corridors` | Active digital-twin corridors |
| GET | `/v1/corridors/{id}/segments` | Live road-segment state |
| GET | `/v1/incidents` | Active anomaly / incident detections |
| GET | `/v1/eta` | Calibrated ETA with conformal P10/P50/P90 intervals |
| GET | `/v1/forecast` | Corridor-level congestion forecast |
| GET | `/v1/stats` | Platform telemetry |
