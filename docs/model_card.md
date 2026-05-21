# Model Card — TideGuard PINN v1

## Model details

| Field | Value |
|-------|-------|
| Name | TideGuard PINN v1 |
| Architecture | Physics-Informed Neural Network (Raissi et al. 2019 style) |
| Inputs | (x, y, t) — normalized longitude, latitude, time |
| Output | C(x, y, t) — debris concentration (relative units, 0..1) |
| Hidden layers | 6 × Dense(128) with tanh activation |
| Positional encoding | 8 random Fourier features per (x, y, t) |
| Learnable physics | log_α (windage), log_K (diffusion), log_λ (beaching) |
| Optimizer | Adam (lr=1e-3) + CosineAnnealingLR |
| Loss | w_data · L_obs + w_pde · L_pde + w_bc · L_bc + w_ic · L_ic |

## Training data

- **Synthetic Gaussian advection-diffusion**: a Gaussian bump initial condition advected by a constant current and diffused, used for unit tests and warm-start training.
- **Real data (production)**:
  - Ocean surface currents — [Copernicus Marine Service (CMEMS)](https://marine.copernicus.eu/) global analysis & forecast (0.083°, 6-hourly)
  - 10-m wind — [ERA5 reanalysis](https://cds.climate.copernicus.eu/) (0.25°, hourly)
  - Floating debris detection — [Sentinel-2 L2A](https://sentinels.copernicus.eu/) (Biermann et al. 2020 FDI/NDVI method)
  - Citizen reports — collected via the TideGuard app, manually approved

## Evaluation

| Metric | Value (synthetic) | Target (real) |
|--------|-------------------|---------------|
| L_data (MSE) | <1e-3 after 5000 epochs | <0.05 |
| L_pde (residual MSE) | <1e-3 | <0.01 |
| Forecast skill vs persistence baseline | +N/A | RMSE improvement >25% at D+3 |
| Calibration | Reliability diagram (post-deployment) | TBD |

Reproduce with:

```bash
cd apps/ml
uv run pytest tests/test_pinn.py -q          # smoke: loss decreases
uv run python -m tideguard_ml.train --synthetic --epochs 5000
```

## Intended use & limitations

**Intended**: decision support for cleanup organizers, schools, NGOs and municipalities. Day-scale (1–14 d) prediction of surface debris concentration.

**Not intended**:
- Sub-hourly storm-driven forecasts (no wave dynamics yet).
- Sub-surface debris (column-integrated model only).
- Microplastic concentration directly (we model floating macroplastic transport; microplastic is inferred indirectly).
- Search-and-rescue (uncertainty too large).

## Known biases & caveats

- **Geographic bias**: initial training/validation focuses on Taiwan Strait. Other regions need additional citizen data + retraining.
- **Photo verification bias**: citizen reports are collected via a smartphone app — users with newer phones / better cellular coverage are over-represented.
- **Severity rating subjectivity**: 1–5 severity is self-reported; we mitigate via moderator review.

## Carbon footprint

| Phase | Compute | kWh estimate | CO₂e (US grid avg) |
|-------|---------|---------------|---------------------|
| Synthetic warm-start | CPU laptop, ~5 min | <0.01 | <5 g |
| Daily retraining (planned) | 1 × A10 GPU, 30 min | ~0.5 | ~200 g |
| 1 year operation | Daily retrain + inference | ~365 × 0.5 ≈ 180 kWh | ~70 kg |

For comparison, a single short-haul flight emits ~150 kg CO₂e per passenger. We estimate TideGuard's annual training footprint to be smaller than two flights, while preventing kg-scale plastic from entering the ocean per cleanup event.

## Ethics

- All training data either comes from public-domain Earth observation or from user reports collected with explicit consent.
- Citizen-report photos are stripped of faces before being made public on the map.
- The leaderboard is opt-in.
- Code: MIT; lesson content: CC-BY-4.0.

## Citation

If you use TideGuard in research or media, please cite:

> TideGuard AI Team (2026). *TideGuard: a Physics-Informed Neural Network for marine debris forecasting and community action.* Open-source release v0.1. https://github.com/desirewarlockstaple/mnohyjmg
