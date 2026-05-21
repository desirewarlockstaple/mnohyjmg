"""Training script for TideGuard PINN.

Usage::

    python -m tideguard_ml.train --synthetic --epochs 5000
    python -m tideguard_ml.train --real --reports data/reports.csv \\
        --forcing data/forcing.npz --epochs 5000
    python -m tideguard_ml.train --synthetic --epochs 5000 --seed-ensemble 5
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass, replace

import torch

from tideguard_ml.data import RealDataset, SyntheticDataset
from tideguard_ml.pinn import PINN, pde_residual


@dataclass
class TrainConfig:
    epochs: int = 5000
    lr: float = 1e-3
    n_collocation: int = 4096
    n_obs_batch: int = 1024
    w_data: float = 1.0
    w_pde: float = 0.1
    w_bc: float = 1.0
    w_ic: float = 1.0
    device: str = "cpu"


def train(
    model: PINN,
    dataset: SyntheticDataset | RealDataset,
    cfg: TrainConfig,
    *,
    verbose: bool = True,
) -> PINN:
    """Train PINN with combined data + physics loss."""
    device = cfg.device
    model.to(device)
    opt = torch.optim.Adam(model.parameters(), lr=cfg.lr)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=max(1, cfg.epochs))

    for step in range(cfg.epochs):
        opt.zero_grad()

        obs = dataset.sample_obs(cfg.n_obs_batch, device)
        C_pred = model(obs.x, obs.y, obs.t)
        loss_data = ((C_pred - obs.C) ** 2).mean()

        col = dataset.sample_collocation(cfg.n_collocation, device)
        r = pde_residual(model, col.x, col.y, col.t, col.u_o, col.v_o, col.u_w, col.v_w)
        loss_pde = (r**2).mean()

        loss_ic = dataset.ic_loss(model)
        loss_bc = dataset.bc_loss(model)

        loss = cfg.w_data * loss_data + cfg.w_pde * loss_pde + cfg.w_bc * loss_bc + cfg.w_ic * loss_ic
        loss.backward()
        opt.step()
        sched.step()

        if verbose and step % 200 == 0:
            print(
                f"step={step:5d}  loss={loss.item():.4f}  "
                f"data={loss_data.item():.4f}  pde={loss_pde.item():.4f}  "
                f"alpha={model.alpha.item():.4f}  K={model.K.item():.2e}  "
                f"lam={model.lam.item():.2e}"
            )

    return model


def _save_checkpoint(model: PINN, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "alpha": model.alpha.item(),
            "K": model.K.item(),
            "lam": model.lam.item(),
        },
        path,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Train TideGuard PINN")
    parser.add_argument("--synthetic", action="store_true", help="Use synthetic Gaussian-bump data")
    parser.add_argument("--real", action="store_true", help="Use RealDataset (--reports + --forcing)")
    parser.add_argument("--reports", type=str, default=None, help="CSV of citizen reports")
    parser.add_argument("--forcing", type=str, default=None, help="NPZ of ocean/wind forcings")
    parser.add_argument(
        "--bbox",
        type=str,
        default="119,23,123,26",
        help="lon_min,lat_min,lon_max,lat_max (used only with --real)",
    )
    parser.add_argument("--epochs", type=int, default=2000)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--device", type=str, default="cpu")
    parser.add_argument("--save", type=str, default="checkpoints/pinn_demo.pt")
    parser.add_argument(
        "--seed-ensemble",
        type=int,
        default=0,
        help="If > 0, train N independent models with different seeds and save as pinn_demo_seed{i}.pt",
    )
    args = parser.parse_args()

    if args.real:
        if not args.reports:
            raise SystemExit("--real requires --reports CSV")
        bbox = tuple(float(x) for x in args.bbox.split(","))
        if len(bbox) != 4:
            raise SystemExit("--bbox must be lon_min,lat_min,lon_max,lat_max")
        dataset = RealDataset(reports_csv=args.reports, forcing_npz=args.forcing, bbox=bbox)  # type: ignore[arg-type]
    elif args.synthetic:
        dataset = SyntheticDataset(n_obs=5000, seed=42)
    else:
        raise SystemExit("Pass either --synthetic or --real")

    base_cfg = TrainConfig(epochs=args.epochs, lr=args.lr, device=args.device)
    print(f"Training PINN: epochs={base_cfg.epochs} lr={base_cfg.lr} device={base_cfg.device}")

    if args.seed_ensemble > 0:
        base, ext = os.path.splitext(args.save)
        for s in range(args.seed_ensemble):
            torch.manual_seed(s)
            model = PINN(hidden=128, depth=6, num_freq=8)
            cfg = replace(base_cfg)
            print(f"-- ensemble member {s + 1}/{args.seed_ensemble}")
            model = train(model, dataset, cfg)
            _save_checkpoint(model, f"{base}_seed{s}{ext}")
        print(f"Saved {args.seed_ensemble} ensemble members to {base}_seed*{ext}")
    else:
        model = PINN(hidden=128, depth=6, num_freq=8)
        model = train(model, dataset, base_cfg)
        _save_checkpoint(model, args.save)
        print(f"Model saved to {args.save}")


if __name__ == "__main__":
    main()
