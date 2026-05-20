# TideGuard AI

**AI that predicts plastic before it pollutes.**

TideGuard AI is an open-source citizen-science platform that combines a
Physics-Informed Neural Network with a community action layer to forecast,
report and prevent floating marine debris.

[![Code](https://img.shields.io/badge/Code-MIT-22c55e.svg)](LICENSE)
[![Content](https://img.shields.io/badge/Content-CC--BY--4.0-22c55e.svg)](content/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-22c55e.svg)](CONTRIBUTING.md)

- **Physics-Informed Neural Network** (PyTorch) — trained on the 2D
  advection-diffusion equation, **learns** windage `α`, diffusion `K` and
  beaching rate `λ` from data. Includes a 5-seed deep ensemble for
  uncertainty quantification. Persistence and Lagrangian baselines for
  honest benchmarking.
- **FastAPI** backend with HS256 JWT auth, slowapi rate limiting,
  structured logs, Sentry hook, EXIF-stripping photo uploads,
  PostGIS-ready geometries, Alembic migrations, badges service,
  moderator queue.
- **Next.js 14** web dashboard with MapLibre, live forecast/report/cleanup
  layers, an *honest* KPI section (`/cleanups/stats`), a moderator queue,
  and a `/method` page that explains the maths to non-technical jurors.
- **Flutter 3** mobile app with real photo+GPS report submission,
  `flutter_map` view of the forecast, offline lessons and a quiz screen.
- **Environmental Education module** — 10 markdown lessons + quizzes +
  SDG metadata + practical task + teacher guide + PDF certificate.

Built for the **GEEP Youth Innovation Challenge**, **MIT Solve**,
**STIRworld Young Climate Prize**, **RELX Environmental Challenge**,
**Zayed Sustainability Prize** and **Stockholm Junior Water Prize** cycles
in 2026.

## Live structure

```
tideguard/
├── apps/
│   ├── ml/          # PyTorch PINN, training, ingest, baselines, ensemble
│   ├── api/         # FastAPI + SQLAlchemy + Alembic + (PostGIS)
│   ├── web/         # Next.js 14 + MapLibre + Tailwind
│   └── mobile/      # Flutter 3 + Riverpod + go_router + flutter_map
├── content/lessons/ # 10 markdown lessons with embedded JSON quizzes
├── infra/           # Docker + docker-compose + fly.toml
├── docs/            # model card, proposal, founder story, research paper,
│                    # theory of change, SDG mapping, teacher guide, etc.
└── .github/workflows/  # CI for each app
```

## Quickstart

### 0. One-shot setup

```bash
make setup     # installs uv envs, pnpm install, flutter pub get
make demo      # trains a tiny PINN, seeds lessons, starts API + web
```

### 1. Backend (API)

```bash
cd apps/api
uv venv && uv pip install -e ".[dev]"
uv run pytest -q                       # all tests pass
uv run uvicorn tideguard_api.main:app --reload
# visit http://localhost:8000/docs
```

Seed the EE lessons:
```bash
curl -X POST http://localhost:8000/education/_seed
```

### 2. ML — train the PINN

```bash
cd apps/ml
uv venv && uv pip install -e ".[dev]"
uv run pytest -q
# Synthetic
uv run python -m tideguard_ml.train --synthetic --epochs 2000
# Real (requires data/real/observations.csv — see docs/research_paper.md)
uv run python -m tideguard_ml.train --real --csv data/real/observations.csv --epochs 2000
# Honest benchmark vs persistence + Lagrangian
uv run python -m tideguard_ml.baselines.benchmark --seeds 5
```

### 3. Web

```bash
pnpm install
pnpm --filter @tideguard/web dev
# visit http://localhost:3000
```

### 4. Mobile

```bash
cd apps/mobile
flutter pub get
flutter run
```

### 5. All-in-one via Docker

```bash
cd infra
docker compose -f docker-compose.dev.yml up --build
```

## The science

TideGuard's PINN solves the 2D advection-diffusion equation for surface debris concentration:

```
∂C/∂t + ∇·((u_ocean + α·u_wind) · C) − ∇·(K · ∇C) + λ · C = S(x,y,t)
```

with three **learnable physical parameters**:

- **α** — windage coefficient (≈ 0.03 for bottles; the model fine-tunes per debris type)
- **K** — diffusion coefficient (m²/s)
- **λ** — beaching rate (1/day)

See [`docs/model_card.md`](docs/model_card.md) for full architecture and
metrics, and [`docs/research_paper.md`](docs/research_paper.md) for the
IMRaD research note.

## Endpoints (selected)

| Method | Path                          | Purpose                              |
|-------:|-------------------------------|--------------------------------------|
| GET    | `/healthz`                    | Health check                         |
| GET    | `/me`                         | Current user profile                 |
| POST   | `/auth/dev_token`             | Issue a dev JWT (HS256) for testing  |
| GET    | `/forecast`                   | Predicted concentration grid         |
| GET    | `/tiles/{z}/{x}/{y}.png`      | Raster heatmap tile (from PINN)      |
| POST   | `/reports`                    | Submit a citizen report (photo+GPS)  |
| GET    | `/reports`                    | List approved reports in bbox        |
| GET    | `/reports/queue`              | Moderator queue (pending reports)    |
| PATCH  | `/reports/{id}`               | Moderator: approve/reject (JSON body)|
| GET    | `/reports/mine`               | Reports submitted by the caller      |
| DELETE | `/reports/mine`               | GDPR Art. 17 right-to-erasure        |
| POST   | `/cleanups`                   | Log a cleanup event (polygon + kg)   |
| GET    | `/cleanups/stats`             | Aggregate KPIs (public)              |
| GET    | `/education/lessons`          | List EE lessons                      |
| GET    | `/education/lessons/{slug}`   | Lesson body + quiz                   |
| POST   | `/education/progress`         | Record quiz progress, award XP       |
| GET    | `/education/certificate`      | Generate PDF certificate (≥5 done)   |
| GET    | `/leaderboard?scope=school&school_id=…` | Top users by XP             |
| GET    | `/badges/mine`                | Badges awarded to the caller         |
| GET    | `/admin/kpi`                  | Impact dashboard (admin only)        |

## Project documents

| File | What it is |
|------|------------|
| [`docs/founder_story.md`](docs/founder_story.md) | Personal narrative for STIRworld / YCP |
| [`docs/proposal.md`](docs/proposal.md) | Competition proposal (MIT Solve / RELX / GEEP) |
| [`docs/theory_of_change.md`](docs/theory_of_change.md) | Inputs → outputs → outcomes diagram |
| [`docs/sdg_mapping.md`](docs/sdg_mapping.md) | UN SDG alignment table |
| [`docs/research_paper.md`](docs/research_paper.md) | IMRaD research note for Stockholm |
| [`docs/model_card.md`](docs/model_card.md) | Model card (Google format) |
| [`docs/architecture.md`](docs/architecture.md) | System architecture |
| [`docs/curriculum_mapping.md`](docs/curriculum_mapping.md) | Taiwan 108 / IGCSE / AP / IB alignment |
| [`docs/teacher_guide.md`](docs/teacher_guide.md) | Educator guide |
| [`docs/impact_report_template.md`](docs/impact_report_template.md) | Quarterly impact report template |
| [`docs/letters_of_support_template.md`](docs/letters_of_support_template.md) | LoS templates |
| [`docs/DATA_ETHICS.md`](docs/DATA_ETHICS.md) | GDPR / COPPA-aligned data ethics policy |

## License

- Code: MIT (see [LICENSE](LICENSE))
- Lesson content: CC-BY-4.0

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
Security reports: [SECURITY.md](SECURITY.md).

## Acknowledgements

Built independently by a youth-led team for the 2026 climate prize cycle.
PINN methodology inspired by Raissi et al. (2019) and Biermann et al. (2020).
Ocean current data: Copernicus Marine Service (CMEMS). Wind reanalysis: ECMWF ERA5.

— Contact: contact@tideguard.app
