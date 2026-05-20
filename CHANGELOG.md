# Changelog

All notable changes to TideGuard AI. Format: [Keep a Changelog](https://keepachangelog.com/),
versioning loosely follows [SemVer](https://semver.org/).

## [Unreleased]

### Added

- **API**: proper HS256 JWT auth via `python-jose`; `/auth/dev_token` endpoint
  generates short-lived dev tokens; production verifies signed JWTs.
- **API**: `slowapi` rate limiting wired to write endpoints (60 req/min/IP by default).
- **API**: structured JSON logging via `structlog` with stdlib bridge.
- **API**: Sentry SDK auto-init when `SENTRY_DSN` is set.
- **API**: photo uploads validated (MIME whitelist, 10 MB size limit, Pillow `verify()`)
  and EXIF metadata stripped (children's privacy / GDPR Art. 8).
- **API**: badges service with three rules (`first-report`, `cleaner-5kg`, `educator-5lessons`)
  awarded automatically after the relevant action.
- **API**: leaderboard supports `scope=school&school_id=…` filtering.
- **API**: admin KPI uses distinct-user counts; new `lessons_completed_distinct`
  reflects the real intent.
- **API**: moderator queue endpoint `GET /reports/queue` returning the pending list.
- **API**: PATCH `/reports/{id}` now accepts a JSON body, not a query parameter.
- **API**: `get_settings()` memoised via `lru_cache`.
- **API**: CORS limited to specific origins; `credentials=true` only when origins
  are concrete and not wildcard.
- **API**: `GET /reports/mine` and `DELETE /reports/mine` for GDPR right-to-erasure.
- **ML**: `RealDataset` reads observations from CSV (`data/real/observations.csv`)
  or from a Zarr currents/wind store; `train.py --real --csv ...` now works end to end.
- **ML**: `apps/ml/src/tideguard_ml/baselines/persistence.py` and
  `lagrangian.py` provide transparent baselines; `benchmark.py` writes a JSON
  results table comparing all three.
- **ML**: 5-seed deep ensemble for uncertainty quantification
  (`apps/ml/src/tideguard_ml/uq.py`).
- **ML**: Optional `codecarbon` integration logs training CO₂e to
  `data/codecarbon/`.
- **ML**: `apps/ml/checkpoints/pinn_demo.pt` — a small pre-trained PINN demo
  checkpoint shipped in the repo so the API serves real model output, not
  a hand-coded Gaussian.
- **ML**: `inference.PINNInferenceService` uses a time normalisation that
  matches training (`t / EPOCH_DAYS`) and exposes the learned α / K / λ.
- **API tiles**: PNG tiles are now generated from the PINN inference (per-day
  forecast grid resampled into Mercator), cached in memory for 10 minutes.
- **Web**: landing page reads `/cleanups/stats` (and `/admin/kpi_public`)
  for KPIs and shows "pilot launching" instead of fabricated counts when zero.
- **Web**: `/admin/queue` moderator dashboard for approving / rejecting reports.
- **Web**: `/method` page explaining the PINN math with references for
  non-technical jurors.
- **Web**: forecast map now overlays approved citizen reports (orange pins)
  and cleanup polygons.
- **Web**: SEO metadata, `og:image`, accessibility (aria-labels), and the
  hard-coded `Authorization: Bearer admin@…` is removed in favour of
  `NEXT_PUBLIC_ADMIN_TOKEN`.
- **Mobile**: real multipart `POST /reports` from the report screen with
  loading + error states.
- **Mobile**: profile screen now reads `/me`, lists badges and exposes the
  certificate download.
- **Mobile**: map screen uses `flutter_map` to render the TideGuard tile
  endpoint.
- **Mobile**: quiz screen mirrors the web component.
- **Content**: each lesson has `sdg`, `grade`, `duration_min`, `learning_outcomes`
  metadata + a `### Practical task` block, plus a stub zh-TW translation.
- **Docs**: full rewrite of `founder_story.md` and `proposal.md` (no `[…]`
  placeholders); added `theory_of_change.md`, `sdg_mapping.md`,
  `research_paper.md`, `teacher_guide.md`, `curriculum_mapping.md`,
  `impact_report_template.md`, `letters_of_support_template.md`,
  `DATA_ETHICS.md`.
- **Repo**: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `ROADMAP.md`, `CHANGELOG.md`, `Makefile`.

### Changed

- **PINN inference time normalisation** is now consistent between training
  and inference (previously `horizon_days / 14` only at inference, breaking
  forecasts beyond 14 days).
- **README** clarifies the project status and removes the misleading
  `Doorphospigot4/tqtgfgpk` repo reference.

### Fixed

- **API**: `lifespan` was passing `app` to `create_all` even for non-sqlite
  DBs in some configurations; now skips schema bootstrap for Postgres.
- **API**: `cleanups.geom_wkt` validated as a real WKT string.

### Security

- **CRITICAL**: removed email-as-Bearer-token vulnerability (`deps.py`).
  Previously, `Authorization: Bearer admin@tideguard.app` was treated as a
  valid admin login.
- **CRITICAL**: removed hard-coded admin token from the web `/admin` page.
- Photo uploads no longer expose GPS / EXIF metadata (GDPR / COPPA compliance).
- CORS no longer combines wildcard methods/headers with `allow_credentials=true`.

## [0.1.0] — 2026-01-15

Initial public release as part of the TideGuard AI competition cycle.
