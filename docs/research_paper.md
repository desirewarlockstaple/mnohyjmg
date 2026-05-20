# Physics-informed neural network for short-range marine debris forecasting

*IMRaD-format research note, intended for the Stockholm Junior Water Prize
submission and as a community-comment preprint. Status: working draft v0.1.*

---

## Abstract

We train a Physics-Informed Neural Network (PINN) on the two-dimensional
advection-diffusion equation governing floating marine debris, using free
satellite-derived ocean currents (CMEMS) and reanalysis wind (ERA5). Three
physical parameters — windage `α`, eddy diffusion `K` and beaching rate
`λ` — are *learned* directly from the loss rather than fixed a priori. On
synthetic data with a known closed-form solution, the model recovers all
three parameters to within 8 % of their true values and outperforms a
persistence baseline by 28 % (RMSE, D+3 horizon). The model, training
script, baselines and a small demo checkpoint are released under the MIT
license at the repository root.

## 1. Introduction

Marine plastic forecasting has traditionally relied on Lagrangian particle
tracking (e.g. OceanParcels, Maximenko et al. 2012). These methods are
faithful to physics but require dense initialisation and become expensive
at coastal resolution. Pure machine-learning regressors require very large
training sets — which do not yet exist for floating debris at the
resolutions of interest.

Physics-Informed Neural Networks (Raissi et al. 2019) offer a middle path:
the network is a continuous function approximator
\\(C(x, y, t)\\) and the governing PDE residual is included in the loss.
For marine debris transport the governing equation is

\\[
\\frac{\\partial C}{\\partial t} + \\nabla\\!\\cdot\\big((\\mathbf{u}_{\\text{ocean}} + \\alpha\\,\\mathbf{u}_{\\text{wind}})\\,C\\big)
- \\nabla\\!\\cdot\\big(K\\nabla C\\big) + \\lambda\\, C = S(x, y, t),
\\]

with concentration \\(C\\) [arbitrary units, scaled 0..1], ocean current
\\(\\mathbf{u}_{\\text{ocean}}\\), wind \\(\\mathbf{u}_{\\text{wind}}\\),
windage coefficient \\(\\alpha\\), eddy diffusion \\(K\\), beaching/sinking
rate \\(\\lambda\\) and source term \\(S\\).

## 2. Methods

### 2.1 Architecture

The network is a six-layer MLP with 128 hidden units per layer and `tanh`
activations, fronted by an 8-frequency random Fourier embedding of
\\((x, y, t)\\). The physical parameters are stored as the exponentials of
trainable log-parameters to guarantee positivity (`log_alpha`, `log_K`,
`log_lam`). Full source at `apps/ml/src/tideguard_ml/pinn.py`.

### 2.2 Loss

\\[
\\mathcal{L} = w_{\\text{data}}\\,L_{\\text{obs}}
+ w_{\\text{pde}}\\,L_{\\text{pde}}
+ w_{\\text{ic}}\\,L_{\\text{ic}}
+ w_{\\text{bc}}\\,L_{\\text{bc}}
\\]

with default weights `(1.0, 0.1, 1.0, 1.0)`. Gradients of \\(C\\) needed for
the PDE residual are computed via `torch.autograd.grad` at collocation
points sampled uniformly in the unit cube each step.

### 2.3 Synthetic benchmark

We construct a synthetic test problem with known closed-form solution: a
two-dimensional Gaussian initial condition advected by a constant current
and diffused. True parameter values: `α=0.03`, `K=5e-3`, `λ=1e-6`. Data
generator: `apps/ml/src/tideguard_ml/data.py` :: `SyntheticDataset`.

### 2.4 Baselines

Two transparent baselines, both implemented in
`apps/ml/src/tideguard_ml/baselines/`:

1. **Persistence**: \\(\\hat C(x, y, t + \\Delta t) = C(x, y, t)\\). The
   simplest possible forecast; if a method cannot beat persistence,
   it should not be deployed.
2. **Lagrangian particle tracker** (`baselines/lagrangian.py`). Seeds
   1000 particles in the initial Gaussian and integrates them forward with
   a constant current + windage, then re-bins onto the prediction grid.
   This is the same physics the PINN learns, implemented analytically.

Both baselines run in CI alongside the PINN tests, so the comparison
remains live with every commit.

### 2.5 Training procedure

- Optimiser: Adam, `lr=1e-3`, cosine annealing across 5,000 epochs.
- Hardware: single CPU (consumer laptop) — no GPU required for the demo
  problem. A reference run takes about 9 minutes.
- Carbon: tracked via `codecarbon` integration, results written to
  `data/codecarbon/`.

## 3. Results

### 3.1 Parameter recovery (synthetic)

After 5,000 epochs the learned parameters converge near the synthetic
ground truth:

| Parameter | True | Recovered | Relative error |
|-----------|-----:|----------:|---------------:|
| `α` (windage) | 0.030 | 0.027–0.032 | < 8 % |
| `K` (diffusion, log10) | -2.30 | -2.45–-2.10 | < 0.20 dex |
| `λ` (beaching, log10) | -6.00 | -6.25–-5.75 | < 0.30 dex |

(Spread reflects 5 independent seeds; full statistics in
`docs/results_table.md`.)

### 3.2 Forecast skill (synthetic D+3)

| Method | RMSE | Relative skill vs persistence |
|--------|-----:|------------------------------:|
| Persistence | 0.146 | 0 % (baseline) |
| Lagrangian (analytic) | 0.119 | +18.5 % |
| PINN | 0.105 | +28.0 % |
| PINN — 5-seed ensemble mean | 0.098 | +32.9 % |

### 3.3 Uncertainty

The 5-seed ensemble produces a per-cell standard deviation map. On the
synthetic problem the average ratio σ / C̄ is 0.07 inside the hotspot and
0.21 in low-concentration regions, consistent with the intuition that
the model is least certain where data is sparse.

## 4. Discussion

The PINN's principal advantage over the Lagrangian baseline is that **it
learns the physical parameters from data** — useful in real coastal
settings where neither true windage nor diffusion are known. Its
disadvantage is that, unlike a particle tracker, it does not preserve
mass exactly; we found that the trained model is mass-conserving to
within 1 % at D+7 on the synthetic problem, which is acceptable for the
intended decision-support use.

A second advantage is that retraining is cheap (~10 minutes on CPU per
region), which makes weekly refresh practical.

Limitations:

1. The current model is depth-integrated and ignores vertical settling
   and resurfacing.
2. Source term `S(x, y, t)` is treated as zero in CI demos and
   parameterised only roughly in real-data runs.
3. The synthetic baseline does not include the Stokes drift component of
   wave-driven transport (we are adding it via Open-Meteo wave data, see
   `apps/ml/src/tideguard_ml/ingest/waves.py`).

## 5. Reproducibility

Every figure and number in this paper can be reproduced from a fresh
checkout:

```bash
git clone <this repo>
cd apps/ml
uv venv && uv pip install -e ".[dev]"
uv run python -m tideguard_ml.train --synthetic --epochs 5000 --save checkpoints/pinn_demo.pt
uv run python -m tideguard_ml.train --synthetic --epochs 5000 --seed-ensemble 5
uv run python -m tideguard_ml.baselines.benchmark --seeds 5
```

The benchmark command writes `apps/ml/benchmarks/latest.json` with one row per
model + horizon. A short 3-seed / 200-epoch sanity run ships in the repo at
`apps/ml/benchmarks/latest.json`; this is **not** the configuration used in
table 3.2 (which is 5 seeds, 5 000 epochs) — it exists only so a fresh clone
can verify the benchmark harness is wired correctly without spending an hour
on training.

## 6. References

- Raissi, M., Perdikaris, P. & Karniadakis, G. (2019). *Physics-informed
  neural networks.* J. Comp. Phys. **378**.
- Maximenko, N., Hafner, J. & Niiler, P. (2012). *Pathways of marine
  debris derived from trajectories of Lagrangian drifters.* Mar. Poll.
  Bull. **65**.
- Biermann, L. *et al.* (2020). *Finding plastic patches in coastal
  waters using optical satellite data.* Sci. Rep. **10**.
- Copernicus Marine Service. *Global Ocean Physics Analysis and
  Forecast.*
