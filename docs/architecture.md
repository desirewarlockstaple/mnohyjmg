# Architecture

```
                ┌──────────────────────────────────────────────────────────┐
                │                    Data sources                         │
                │  CMEMS currents · ERA5 wind · Sentinel-2 · Open-Meteo    │
                │              · Citizen reports (mobile app)             │
                └──────────────────────────┬───────────────────────────────┘
                                           ▼
                            ┌──────────────────────────┐
                            │  Ingest (apps/ml/ingest) │
                            │  → NetCDF → Zarr store   │
                            └──────────────┬───────────┘
                                           ▼
              ┌─────────────────────────────────────────────────┐
              │            PINN (apps/ml/pinn.py)              │
              │  Fourier features → 6×Dense(128,tanh) → C      │
              │  Loss = L_data + L_pde + L_bc + L_ic           │
              │  Learns α, K, λ                                │
              └──────────────────────────┬──────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────┐
                  │  Inference service (apps/api/...)   │
                  │  /forecast  /tiles/{z}/{x}/{y}.png  │
                  └──────────────────┬───────────────────┘
                                     ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                FastAPI backend (apps/api)                   │
        │  /reports  /cleanups  /education  /leaderboard  /admin/kpi  │
        │  PostgreSQL+PostGIS · Redis · Supabase Auth · R2 storage   │
        └────────────────┬──────────────────────────────┬─────────────┘
                         ▼                              ▼
              ┌──────────────────────┐       ┌──────────────────────┐
              │  Next.js 14 (web)    │       │  Flutter (mobile)    │
              │  MapLibre+deck.gl    │       │  Riverpod+go_router  │
              │  Tailwind + shadcn   │       │  image_picker + GPS  │
              └──────────────────────┘       └──────────────────────┘
```

## Deployment

| Layer | Where |
|-------|-------|
| API | Fly.io (Tokyo region for Taiwan latency) |
| Web | Vercel |
| DB | Supabase (PostgreSQL 16 + PostGIS) |
| Object storage | Cloudflare R2 (`tideguard-data`, `tideguard-photos`) |
| Background jobs | Prefect Cloud or fly-machines cron |
| Monitoring | Sentry + Grafana Cloud |

## Security

- Supabase Auth for end-user JWTs (email + Google).
- API JWT validation via Supabase JWKS in production; dev uses a fixed dev user.
- Photo uploads scanned for size limit (10 MB) + content-type check.
- Rate limiting (slowapi) at 60 req/min/IP on write endpoints.
- Citizen-report photos blur identifiable faces (planned).

## Cost (initial pilot, 1 month, <100 active users)

| Item | Monthly cost |
|------|--------------|
| Fly.io API (1× shared CPU, 256 MB) | ~$5 |
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Cloudflare R2 (10 GB) | ~$0.20 |
| CDS/CMEMS data | $0 |
| Sentry / Grafana Free | $0 |
| **Total** | **~$5/month** |
