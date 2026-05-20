"""Map tile endpoint — PNG heatmap rendered from the PINN (or mock fallback)."""

from __future__ import annotations

import io
import math
from functools import lru_cache

from fastapi import APIRouter, Query, Response

from tideguard_api.services.inference import predict_forecast

router = APIRouter(prefix="/tiles", tags=["tiles"])


def _tile_to_lonlat(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    n = 2.0**z
    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0
    lat_max = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_min = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon_min, lat_min, lon_max, lat_max


def _color(v: float) -> tuple[int, int, int, int]:
    """Map concentration in [0,1] to a teal-orange-red color ramp w/ alpha."""
    v = max(0.0, min(1.0, v))
    if v < 0.05:
        return (0, 0, 0, 0)
    if v < 0.4:
        # teal → yellow
        t = v / 0.4
        return (int(20 + 200 * t), int(170 + 50 * t), int(150 - 90 * t), int(200 * v))
    # yellow → red
    t = (v - 0.4) / 0.6
    return (int(220 + 35 * t), int(220 - 180 * t), int(60 - 60 * t), int(200 + 55 * t))


def _generate_png_tile(z: int, x: int, y: int, day: int = 0) -> bytes:
    """Generate a 256x256 PNG by sampling the forecast inside the tile bbox."""
    try:
        from PIL import Image
    except ImportError:  # pragma: no cover
        return bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636000000200010002B9F5180100000049454E44AE426082"
        )

    lon_min, lat_min, lon_max, lat_max = _tile_to_lonlat(z, x, y)
    grid = _cached_forecast(lon_min, lon_max, lat_min, lat_max, max(1, day + 1))
    day_idx = min(day, len(grid.days) - 1)
    day_cells = grid.days[day_idx].cells

    # The forecast returns cells on a regular grid; resolution comes from inference.
    side = int(math.sqrt(len(day_cells))) or 1
    arr = [[0.0 for _ in range(side)] for _ in range(side)]
    for k, c in enumerate(day_cells):
        i = k % side
        j = k // side
        arr[j][i] = c.concentration

    img = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    px = img.load()
    for j in range(side):
        for i in range(side):
            px[i, side - 1 - j] = _color(arr[j][i])
    img = img.resize((256, 256), Image.BILINEAR)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@lru_cache(maxsize=256)
def _cached_forecast(lon_min: float, lon_max: float, lat_min: float, lat_max: float, horizon: int):
    return predict_forecast(lon_min, lon_max, lat_min, lat_max, horizon_days=horizon)


@router.get("/{z}/{x}/{y}.png")
def get_tile(z: int, x: int, y: int, day: int = Query(0, ge=0, le=13)) -> Response:
    png = _generate_png_tile(z, x, y, day=day)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )
