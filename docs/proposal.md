# TideGuard AI — competition proposal

Submission package for: GEEP Youth Innovation Challenge 2026, MIT Solve Global Challenge,
STIRworld Young Climate Prize, RELX Environmental Challenge 2026, Zayed Sustainability Prize
(Global High Schools / Water), Stockholm Junior Water Prize.

---

## 1. The problem

Every year, an estimated 8–14 million tonnes of plastic enter the ocean. Coastal communities
in East and Southeast Asia — particularly around the **Taiwan Strait**, where currents from
the Yangtze, Pearl, Mekong and several smaller river basins converge — bear a
disproportionate share of the load. The same coast is cleaned by volunteers month after
month with no progress on prediction or prevention; on average, the time between a
*known* upstream rain event and *visible* coastal debris is 48–72 hours, which is exactly
the window in which a well-targeted cleanup would intercept the most material.

The same physics applies to the **Persian Gulf**, the **Mediterranean** and the
**North-East Atlantic** — three regions explicitly named as priorities by the Zayed
Sustainability Prize, the Mediterranean MoU and the OSPAR Convention respectively.
TideGuard is regionally portable: the same architecture re-trained on local currents
generalises.

## 2. The solution — TideGuard AI

TideGuard combines **forecasting** with **community action** in a single open-source
platform:

1. A **Physics-Informed Neural Network** (PyTorch) that predicts surface debris
   concentration 1–14 days in advance over an arbitrary bbox at ~5 km resolution.
   Three physical parameters — windage `α`, diffusion `K`, and beaching rate `λ` —
   are *learned* directly from observation/citizen data, not pre-set. This is the
   "AI + physics" idea jurors of MIT Solve, RELX and Stockholm Water reward.
2. A **FastAPI backend** with PostGIS geometries, JWT auth (HS256), photo upload
   with EXIF stripping (children's privacy: GDPR Art. 8 + COPPA compliant), rate
   limiting (slowapi 60 req/min), structured logging (`structlog`), and an admin
   moderator queue.
3. A **Next.js 14 web dashboard** with MapLibre, three live data layers (PINN
   forecast tiles, citizen reports, cleanup polygons), a time slider, an honest
   KPI section that reads from `/cleanups/stats` (no fabricated counts), a
   moderator queue at `/admin/queue` and a `/method` page that explains the
   maths to non-technical jurors.
4. A **Flutter mobile app** with a real `POST /reports` flow (multipart upload to
   `/reports`), live profile (`FutureBuilder<api.me()>`), offline lessons cached in
   `shared_preferences`, and a `flutter_map`-based view of the same forecast
   tiles.
5. An **Environmental Education (EE) module**: ten markdown lessons, ten quizzes,
   teacher guide rendered to PDF, SDG mapping in each lesson's front matter,
   and a PDF certificate of completion issued by the API once five lessons are
   done. SDGs explicitly addressed: 4 (Quality Education), 6 (Clean Water),
   13 (Climate Action), 14 (Life Below Water), 17 (Partnerships).

### Closed feedback loop

```
citizen report  ->  approved by moderator  ->  appended to training set
        ^                                                |
        |                                                v
visible hotspot on map  <-  weekly retraining of PINN <-+
```

Every report a teenager submits with their phone becomes a training point. The
more the community uses TideGuard, the smarter the model gets — and the more
useful the map becomes for the next cleanup.

## 3. Why us, why now

- **Why now**: 2025–2034 is the UN Decade of Ocean Science. Open data (CMEMS,
  ERA5, Sentinel-2) is more accessible than ever, and a single PyTorch laptop
  can now train a PINN that needed an academic lab a decade ago.
- **Why us**: a youth-led team. The cohort most affected by the next 50 years
  of ocean health is leading. We are deliberately open-source because the
  problem is bigger than any one team.

## 4. Pilot plan (12 weeks)

| Week | Milestone | Status |
|-----:|-----------|--------|
| 1–2 | Bootstrap monorepo, scaffolding, CI per app | Done |
| 3–4 | PINN trained on synthetic data; FastAPI + web MVP | Done |
| 5–6 | Real auth, slowapi, EXIF strip, demo checkpoint shipped | Done |
| 7–8 | Pilot launch with online partner school (East Asia, Discord-coordinated) | In progress |
| 9–10 | First measured cleanups (target: 20 kg, 1 event, 5 students) | Planned |
| 11–12 | Public demo + submission packages for all 7 prizes | Planned |

## 5. Impact KPIs (12-month targets — honest, achievable)

| Metric | 12-mo target | Comment |
|--------|--------------|---------|
| Active citizen reporters | **150+** | revised down from the original 1,000+; tied to the size of the pilot school |
| Approved reports | **750+** | 5 per reporter per year is realistic |
| Cleanup events run | **6+** | one every two months at the pilot school |
| Mass collected | **300+ kg** | conservative; one well-run cleanup typically yields 30–80 kg |
| Partner schools | **3+** | one anchor school + two online via GEEP regional centres |
| Lessons completed (distinct user-lessons) | **400+** | |
| Countries served | **2+** | anchor school + one online partner |

> We have **deliberately revised these numbers downward** from the previous draft
> (1,000+ reporters, 5,000+ kg). RELX, MIT Solve and Stockholm Water jurors
> penalise inflated numbers; under-promising and over-delivering wins.

## 6. Team

- **Eleanora** — student lead, PINN architecture, FastAPI backend, web dashboard.
  <!-- <verify>full name + school + age at submission</verify> -->
- **Co-leads** — research, partnerships, community management
  <!-- <verify>up to 3 names, ages, school affiliations</verify> -->
- **Mentors** —
  <!-- <verify>one marine biologist, one ML researcher, one NGO partner; letters of support attached -->
  (We will attach LoS at submission; templates are in `docs/letters_of_support_template.md`.)

## 7. Budget (USD, first 12 months)

Revised from the previous $1,150 ask, which jurors flagged as unrealistically low.

| Line item | Cost (USD) | Co-funding source |
|-----------|-----------:|-------------------|
| Cloud — Fly.io API hosting (3 machines × 12 mo) | $360 | Self |
| Cloud — Cloudflare R2 storage (10 GB photos + 5 GB data) | $100 | Self |
| Database — Supabase Pro tier (Postgres + auth) | $300 | Grant |
| MapTiler Ocean tiles (free tier OK; paid for ≥100K tiles/mo) | $120 | Grant |
| Domain + TLS certificates | $40 | Self |
| Pilot cleanup materials (gloves, bags, scales, first-aid kit × 6 events) | $600 | Local NGO in-kind |
| Travel to/from pilot school (8 site visits) | $400 | School in-kind |
| Print materials — teacher guide, lesson workbooks (60 students) | $200 | Grant |
| Web hosting + CDN — Vercel hobby tier | $0 | Self |
| Sentry / structured logging — free tier | $0 | Self |
| Mentor honoraria (3 mentors × 4 hours × $50) | $600 | Grant |
| Contingency (15%) | $466 | Grant |
| **Total ask** | **$3,186** | |
| Of which in-kind / co-funded | $1,000 | |
| **Net cash requested** | **$2,186** | |

This is intentionally lean. The platform is designed to run on free / near-free
tiers; the grant primarily covers materials, mentor honoraria and a small
contingency.

## 8. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Model under-performs in new geography | Med | Med | Active-learning loop; transfer-learning from Taiwan baseline; `apps/ml/baselines/` includes persistence + Lagrangian for honest comparison |
| Low citizen engagement | Med | High | School-led EE module + gamification; partnership-first growth; LoS commitments from each partner |
| CMEMS/ERA5 outage | Low | Med | 30-day local cache; persistence baseline as automatic fallback |
| Mis-reporting / vandalism | Med | Med | Moderator queue at `/admin/queue`; community flagging; min severity rating from 2 reporters before publishing |
| Photos of minors leak metadata | Low | High | EXIF auto-stripped at upload (`piexif.remove`); MIME + size validation; signed URLs only |
| Founder burnout (1-person project) | High | High | Active recruitment of two co-leads; mentor weekly check-ins; sprint plan in `docs/roadmap.md` |

## 9. Theory of Change

A full diagram with inputs → activities → outputs → outcomes → impact is at
[`docs/theory_of_change.md`](theory_of_change.md). Summary:

- **Inputs**: open ocean data, citizen reports, school partnerships, $2,186 grant.
- **Activities**: train PINN, run cleanups, deliver EE module, publish open data.
- **Outputs**: predicted hotspot map, 300+ kg cleaned, 60+ certified students.
- **Outcomes**: targeted cleanups become 3× more effective; students lead local
  policy conversations.
- **Impact**: a replicable youth-led model for prediction-driven coastal
  stewardship in any vulnerable coastline (Taiwan Strait, Persian Gulf,
  Mediterranean, North-East Atlantic).

## 10. SDG mapping

Detailed alignment table in [`docs/sdg_mapping.md`](sdg_mapping.md). Primary
targets: SDG 14.1 (marine pollution reduction), SDG 4.7 (education for
sustainable development), SDG 13.3 (climate education), SDG 6.6 (water-related
ecosystems), SDG 17.16 (multi-stakeholder partnerships).

## 11. Replicability & open-source

- **Code**: MIT-licensed, public on GitHub. Every prediction is reproducible
  from a fresh clone via `make demo` (provided in `Makefile`).
- **Content**: lessons CC-BY-4.0; translations into zh-TW, vi and ar are
  shipping (zh-TW already stubbed at `content/lessons/zh-TW/`).
- **Data**: citizen reports are versioned via Git LFS in `data/exports/`
  (anonymised after moderator approval).
- **Carbon**: training is logged with `codecarbon`; results published in
  `docs/model_card.md` and `docs/impact_report_template.md`.

## 12. Scaling plan (12 / 24 / 36 months)

- **12 months** — anchor school + 2 online partners; 1 region (Taiwan Strait).
- **24 months** — 10 schools across 3 countries; second region (Persian Gulf
  via Zayed-aligned partner); first peer-reviewed preprint on PINN performance.
- **36 months** — 50 schools across 5 countries; integration with GEEP regional
  centre network; sustainable revenue from the optional **TideGuard Pro**
  enterprise tier for municipalities (the open-source core remains free).

## 13. References

- Raissi, M., Perdikaris, P. & Karniadakis, G. E. (2019). *Physics-informed
  neural networks: A deep learning framework for solving forward and inverse
  problems involving nonlinear partial differential equations.* J. Comp.
  Phys. **378**, 686–707.
- Biermann, L., Clewley, D., Martinez-Vicente, V. & Topouzelis, K. (2020).
  *Finding plastic patches in coastal waters using optical satellite data.*
  Sci. Rep. **10**, 5364.
- Maximenko, N., Hafner, J. & Niiler, P. (2012). *Pathways of marine debris
  derived from trajectories of Lagrangian drifters.* Mar. Pollut. Bull. **65**,
  51–62.
- Copernicus Marine Service (CMEMS). *Global Ocean Physics Analysis and
  Forecast.* https://marine.copernicus.eu/.
- ECMWF. *ERA5 reanalysis dataset.* https://cds.climate.copernicus.eu/.
- Lebreton, L., Slat, B., Ferrari, F. *et al.* (2018). *Evidence that the
  Great Pacific Garbage Patch is rapidly accumulating plastic.* Sci. Rep.
  **8**, 4666.

---

*Contact: contact@tideguard.app · Open-source: this repository · Submitter: see
README and `docs/founder_story.md`.*
