"""Inference service for TideGuard PINN model.

Loads a trained checkpoint and generates concentration forecasts
over a spatial grid for a given time horizon.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch

from tideguard_ml.pinn import PINN


@dataclass
class ForecastResult:
    """Grid of predicted debris concentration."""

    lons: np.ndarray
    lats: np.ndarray
    times: np.ndarray
    concentration: np.ndarray  # shape (n_times, n_lat, n_lon)


class PINNInferenceService:
    """Load a trained PINN checkpoint and run inference."""

    def __init__(self, checkpoint_path: str, device: str = "cpu"):
        self.device = device
        self.model = PINN(hidden=128, depth=6, num_freq=8)
        ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model.eval()
        self.model.to(device)

    @torch.no_grad()
    def predict(
        self,
        lon_min: float,
        lon_max: float,
        lat_min: float,
        lat_max: float,
        horizon_days: int = 7,
        resolution: int = 50,
    ) -> ForecastResult:
        """Generate forecast grid.

        Args:
            lon_min, lon_max, lat_min, lat_max: bounding box in degrees
            horizon_days: forecast horizon in days (1-14)
            resolution: grid resolution (points per axis)

        Returns:
            ForecastResult with concentration predictions
        """
        lons = np.linspace(lon_min, lon_max, resolution)
        lats = np.linspace(lat_min, lat_max, resolution)
        times = np.linspace(0, horizon_days / 14.0, horizon_days)

        concentration = np.zeros((horizon_days, resolution, resolution), dtype=np.float32)

        for ti, t_val in enumerate(times):
            xx, yy = np.meshgrid(
                np.linspace(0, 1, resolution),
                np.linspace(0, 1, resolution),
            )
            x_t = torch.tensor(xx.ravel(), dtype=torch.float32, device=self.device)
            y_t = torch.tensor(yy.ravel(), dtype=torch.float32, device=self.device)
            t_t = torch.full_like(x_t, t_val)

            C = self.model(x_t, y_t, t_t).cpu().numpy()
            concentration[ti] = C.reshape(resolution, resolution)

        return ForecastResult(
            lons=lons,
            lats=lats,
            times=np.arange(horizon_days),
            concentration=np.clip(concentration, 0, None),
        )
