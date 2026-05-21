"""Uncertainty quantification — 5-seed ensemble inference.

We train independent models with different RNG seeds and report mean +
standard deviation per spatial cell. This is the cheapest, most widely
accepted UQ technique for PINNs (see Karniadakis et al. 2021, fig. 4) and
gives the map a "we don't know where" colourway in addition to the usual
"we predict X kg/km^2".
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from tideguard_ml.inference import PINNInferenceService


@dataclass
class EnsembleResult:
    lons: np.ndarray
    lats: np.ndarray
    mean: np.ndarray  # (horizon, ny, nx)
    std: np.ndarray  # (horizon, ny, nx)
    members: int


class PINNEnsemble:
    """Load several checkpoints and aggregate their predictions."""

    def __init__(self, checkpoint_paths: list[str | Path], device: str = "cpu"):
        if not checkpoint_paths:
            raise ValueError("PINNEnsemble requires at least one checkpoint")
        self.services = [PINNInferenceService(str(p), device=device) for p in checkpoint_paths]

    def predict(
        self,
        lon_min: float,
        lon_max: float,
        lat_min: float,
        lat_max: float,
        horizon_days: int = 7,
        resolution: int = 24,
    ) -> EnsembleResult:
        outputs = []
        lons = lats = None
        for svc in self.services:
            res = svc.predict(lon_min, lon_max, lat_min, lat_max, horizon_days, resolution)
            outputs.append(res.concentration)
            lons, lats = res.lons, res.lats
        stack = np.stack(outputs, axis=0)
        return EnsembleResult(
            lons=lons,  # type: ignore[arg-type]
            lats=lats,  # type: ignore[arg-type]
            mean=stack.mean(axis=0),
            std=stack.std(axis=0),
            members=len(self.services),
        )


def carbon_estimate(epochs: int, n_params: int, gpu_seconds_per_step: float = 0.0) -> float:
    """Tiny CPU-only estimate (kg CO2e). Conservative; production runs should
    use ``codecarbon`` for real measurements.
    """
    # Approximate energy: 25 W * epochs * 0.005s/epoch baseline + GPU time
    energy_kwh = (25.0 * epochs * 0.005 + 200.0 * gpu_seconds_per_step) / (1000.0 * 3600.0)
    # Average world grid intensity ~ 0.475 kg CO2e/kWh (Our World in Data 2024)
    return energy_kwh * 0.475 * max(1.0, n_params / 1e6)
