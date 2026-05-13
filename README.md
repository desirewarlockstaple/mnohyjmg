# PulseGrid — Vietnam's roads, decoded

A live digital twin of Vietnamese road traffic, exposed as a commercial B2B SaaS REST API.
This repo contains the full startup deliverable for the Skolkovo × TASCO Smart Mobility Challenge 2026
(Track #4 — Digital Twin of Urban Traffic).

> "A live digital twin of Vietnamese traffic — without a single license plate."

---

## What's in this repo

| Path | What it is |
|------|------------|
| [`backend/`](./backend/) | FastAPI service powering the digital twin (`/v1/corridors`, `/v1/segments`, `/v1/eta`, `/v1/incidents`, `/v1/forecast`, `/v1/stats`). Includes the 400-line traffic simulator that drives the demo. |
| [`frontend/`](./frontend/) | Vite + React + TypeScript + Tailwind app: landing page, interactive 7-slide pitch deck, live demo dashboard, REST API docs, pricing, and a bilingual (EN/RU) executive one-pager. |

## Routes

| Page | Description |
|------|-------------|
| `/` | Marketing landing page — hero, problem, solution, synergy moats, architecture, Build Week pilot metrics, six target verticals, legal posture. |
| `/deck` | Interactive 7-slide pitch deck (← → keyboard nav). |
| `/demo` | Live demo dashboard — three Vietnamese corridors as a clickable digital twin, click two segments to compute a calibrated ETA via the API. |
| `/docs` | Developer reference for every endpoint, with cURL / Python / JavaScript samples. |
| `/pricing` | Pricing tiers and anchor pilot customers. |
| `/summary` | Bilingual (EN / RU) executive one-pager. |

## Running locally

```bash
# Backend
cd backend
uv sync && uv pip install -e ".[dev]"
uv run uvicorn pulsegrid_api.main:app --reload --port 8000

# Frontend (in another shell)
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.development
npm run dev
```

Then open <http://localhost:5173>.

Backend Swagger UI: <http://localhost:8000/docs>.

## Tests

```bash
cd backend
uv run pytest -q       # 11 tests covering corridors, segments, ETA, incidents, forecast, stats
uv run ruff check
uv run ruff format --check
```

```bash
cd frontend
npm run build           # tsc -b && vite build — zero TS errors
```

## Privacy & compliance

The platform is constructively restricted to anonymized and aggregated data:

- **No PII**: no license plates, no facial data, no individual vehicle tracks.
- **No government data**: no traffic-light or emergency-service integration.
- **k-anonymity ≥ 50** and **differential privacy ε ≤ 1.0** enforced by construction.
- **Vietnam PDPL** (Law 13/2023/QH15) and GDPR-equivalent best practice.
- Pure commercial B2B SaaS analytics — **no government license required**.

See <https://pulsegrid.vn/summary> for the full data contract.
