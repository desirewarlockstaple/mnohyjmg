"""PINN for marine debris transport (2D advection-diffusion).

Physics equation:
    dC/dt + div((u_ocean + alpha*u_wind)*C) - div(K*grad(C)) + lambda*C = S(x,y,t)

Learnable parameters: alpha (windage), K (diffusion), lambda (beaching rate).
"""

from __future__ import annotations

import math

import torch
import torch.nn as nn


def fourier_features(coords: torch.Tensor, num_freq: int = 8) -> torch.Tensor:
    """Random Fourier features for spatial coordinates."""
    freqs = 2.0 ** torch.arange(num_freq, device=coords.device).float()
    angles = coords.unsqueeze(-1) * freqs * math.pi
    return torch.cat([angles.sin(), angles.cos()], dim=-1).flatten(start_dim=-2)


class PINN(nn.Module):
    """Physics-Informed Neural Network for 2D advection-diffusion of marine debris.

    Architecture: Fourier Feature Embedding -> 6 x Dense(128, tanh) -> Dense(1)
    Input: (x, y, t) + context tensors (ocean currents, wind, bathymetry)
    Output: C_hat(x, y, t) — predicted debris concentration
    """

    def __init__(self, hidden: int = 128, depth: int = 6, num_freq: int = 8):
        super().__init__()
        in_dim = (2 + 1) * 2 * num_freq  # (x, y, t) -> sin+cos -> num_freq
        layers: list[nn.Module] = [nn.Linear(in_dim, hidden), nn.Tanh()]
        for _ in range(depth - 1):
            layers += [nn.Linear(hidden, hidden), nn.Tanh()]
        layers += [nn.Linear(hidden, 1)]
        self.net = nn.Sequential(*layers)
        self.log_alpha = nn.Parameter(torch.tensor(math.log(0.03)))
        self.log_K = nn.Parameter(torch.tensor(math.log(100.0)))
        self.log_lam = nn.Parameter(torch.tensor(math.log(1e-6)))
        self.num_freq = num_freq

    @property
    def alpha(self) -> torch.Tensor:
        """Windage coefficient (typically 0.02-0.04)."""
        return torch.exp(self.log_alpha)

    @property
    def K(self) -> torch.Tensor:
        """Diffusion coefficient (m^2/s)."""
        return torch.exp(self.log_K)

    @property
    def lam(self) -> torch.Tensor:
        """Beaching / sinking rate (1/s)."""
        return torch.exp(self.log_lam)

    def forward(self, x: torch.Tensor, y: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
        coords = torch.stack([x, y, t], dim=-1)
        h = fourier_features(coords, self.num_freq)
        return self.net(h).squeeze(-1)


def pde_residual(
    model: PINN,
    x: torch.Tensor,
    y: torch.Tensor,
    t: torch.Tensor,
    u_ocean: torch.Tensor,
    v_ocean: torch.Tensor,
    u_wind: torch.Tensor,
    v_wind: torch.Tensor,
) -> torch.Tensor:
    """Compute advection-diffusion PDE residual at sampled collocation points."""
    x = x.requires_grad_(True)
    y = y.requires_grad_(True)
    t = t.requires_grad_(True)
    C = model(x, y, t)

    grad = torch.autograd.grad(C.sum(), [x, y, t], create_graph=True)
    Cx, Cy, Ct = grad[0], grad[1], grad[2]
    Cxx = torch.autograd.grad(Cx.sum(), x, create_graph=True)[0]
    Cyy = torch.autograd.grad(Cy.sum(), y, create_graph=True)[0]

    u = u_ocean + model.alpha * u_wind
    v = v_ocean + model.alpha * v_wind
    adv = u * Cx + v * Cy
    diff = model.K * (Cxx + Cyy)
    res = Ct + adv - diff + model.lam * C
    return res
