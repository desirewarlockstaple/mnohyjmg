"""Deterministic-but-realistic traffic state simulator.

This is the "digital twin" engine used by the demo API. It produces:

* A fixed corridor graph for HCMC inner ring, Hanoi Ring Road 3, and the
  Hà Nội ↔ Hải Phòng expressway.
* Time-varying congestion driven by a smooth diurnal + weekly cycle plus
  per-segment phase offsets and pinkish noise (deterministic seeded).
* Plausible incident detections that travel with congestion clusters.
* An ETA solver that walks the corridor graph segment-by-segment, sums
  segment-level travel times, then adds a conformal-prediction style
  uncertainty band scaled by the route's average congestion.

It is intentionally pure-Python, dependency-free and < 400 lines so that
the whole thing can be inspected during a pilot review.
"""

from __future__ import annotations

import hashlib
import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from .models import (
    Corridor,
    CorridorForecast,
    EtaResponse,
    ForecastPoint,
    Incident,
    Segment,
)

# ---------------------------------------------------------------------------
# Corridor definitions — anchor polylines for the three Build Week corridors
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CorridorSpec:
    id: str
    name: str
    city: str
    free_flow_kmh: float
    anchor: list[tuple[float, float]]
    branches: list[list[tuple[float, float]]]


CORRIDOR_SPECS: list[CorridorSpec] = [
    CorridorSpec(
        id="hcmc-inner-ring",
        name="HCMC inner ring",
        city="Ho Chi Minh City",
        free_flow_kmh=42.0,
        anchor=[
            (106.6230, 10.7720),  # An Lac
            (106.6480, 10.7560),
            (106.6720, 10.7480),
            (106.6930, 10.7570),  # Quận 5
            (106.7050, 10.7620),
            (106.7180, 10.7660),  # Cầu Calmette
            (106.7350, 10.7720),  # Quận 1
            (106.7480, 10.7820),  # Bến Vân Đồn
            (106.7620, 10.7910),
            (106.7740, 10.8020),  # Quận 2
            (106.7850, 10.8060),
        ],
        branches=[
            [
                (106.7050, 10.7620),
                (106.7000, 10.7800),
                (106.6940, 10.7960),
                (106.6920, 10.8090),
            ],  # Cộng Hoà → Tân Bình
            [(106.6720, 10.7480), (106.6600, 10.7350), (106.6480, 10.7220)],  # Phú Lâm
            [(106.7480, 10.7820), (106.7560, 10.7960), (106.7610, 10.8090)],  # Bình Thạnh
            [(106.7180, 10.7660), (106.7220, 10.7800), (106.7270, 10.7930)],  # Quận 3 ↑
        ],
    ),
    CorridorSpec(
        id="hanoi-rr3",
        name="Hanoi Ring Road 3",
        city="Hanoi",
        free_flow_kmh=55.0,
        anchor=[
            (105.7560, 21.0150),  # Mỹ Đình
            (105.7720, 21.0200),
            (105.7900, 21.0260),  # Khuất Duy Tiến
            (105.8060, 21.0300),
            (105.8230, 21.0370),  # Pháp Vân
            (105.8380, 21.0410),
            (105.8500, 21.0440),
            (105.8640, 21.0460),
            (105.8800, 21.0470),  # Cầu Vĩnh Tuy
            (105.8950, 21.0490),
        ],
        branches=[
            [(105.7900, 21.0260), (105.7960, 21.0420), (105.8020, 21.0570)],  # Cầu Giấy ↑
            [(105.8230, 21.0370), (105.8230, 21.0220), (105.8240, 21.0080)],  # Pháp Vân ↓
            [(105.8500, 21.0440), (105.8530, 21.0290), (105.8560, 21.0150)],  # Long Biên ↓
            [(105.8640, 21.0460), (105.8730, 21.0610), (105.8800, 21.0750)],  # Đông Anh ↑
        ],
    ),
    CorridorSpec(
        id="hanoi-haiphong-cT04",
        name="Hà Nội ↔ Hải Phòng expressway",
        city="Hà Nội / Hưng Yên / Hải Dương / Hải Phòng",
        free_flow_kmh=100.0,
        anchor=[
            (105.8900, 21.0480),  # Hà Nội (Vĩnh Tuy ramp)
            (105.9700, 20.9900),
            (106.0500, 20.9700),  # Hưng Yên
            (106.1700, 20.9450),
            (106.2800, 20.9200),  # Hải Dương
            (106.4000, 20.9100),
            (106.5100, 20.9000),
            (106.6200, 20.8950),
            (106.6900, 20.8920),  # Hải Phòng entrance
        ],
        branches=[
            [(106.0500, 20.9700), (106.0700, 21.0000), (106.0800, 21.0300)],  # Hưng Yên N
            [(106.2800, 20.9200), (106.3100, 20.9450), (106.3300, 20.9700)],  # Hải Dương N
            [(106.5100, 20.9000), (106.5300, 20.8750), (106.5500, 20.8500)],  # Quốc lộ 10
        ],
    ),
]


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SegmentSpec:
    id: str
    corridor_id: str
    name: str
    coords: tuple[tuple[float, float], ...]
    length_km: float
    free_flow_kmh: float


def _haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lon1, lat1 = math.radians(a[0]), math.radians(a[1])
    lon2, lat2 = math.radians(b[0]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def _interpolate(a: tuple[float, float], b: tuple[float, float], n: int) -> list[tuple[float, float]]:
    return [(a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n)) for i in range(n + 1)]


def _build_corridor_segments(
    spec: CorridorSpec,
) -> tuple[list[SegmentSpec], list[tuple[float, float, float, float]]]:
    segments: list[SegmentSpec] = []
    bbox_pts: list[tuple[float, float]] = []
    seg_idx = 0
    rng = random.Random(spec.id)

    def add_segments(pts: list[tuple[float, float]], label_prefix: str) -> None:
        nonlocal seg_idx
        for i in range(len(pts) - 1):
            length = _haversine_km(pts[i], pts[i + 1])
            steps = max(2, int(length / 0.35) + 1)
            seg_pts = _interpolate(pts[i], pts[i + 1], steps)
            for j in range(len(seg_pts) - 1):
                a, b = seg_pts[j], seg_pts[j + 1]
                seg_len = _haversine_km(a, b)
                free_flow = spec.free_flow_kmh * (0.85 + 0.3 * rng.random())
                segments.append(
                    SegmentSpec(
                        id=f"{spec.id}:seg-{seg_idx:03d}",
                        corridor_id=spec.id,
                        name=f"{label_prefix} · km{seg_idx * 0.4:.1f}",
                        coords=(a, b),
                        length_km=seg_len,
                        free_flow_kmh=free_flow,
                    )
                )
                bbox_pts.extend([a, b])
                seg_idx += 1

    add_segments(spec.anchor, f"{spec.name} main")
    for k, br in enumerate(spec.branches):
        add_segments(br, f"{spec.name} branch {chr(ord('A') + k)}")

    lons = [p[0] for p in bbox_pts]
    lats = [p[1] for p in bbox_pts]
    bbox = (min(lons) - 0.01, min(lats) - 0.01, max(lons) + 0.01, max(lats) + 0.01)
    center = (sum(lons) / len(lons), sum(lats) / len(lats))
    return segments, [(bbox[0], bbox[1], bbox[2], bbox[3])] + [(center[0], center[1], 0, 0)]


CORRIDOR_GRAPH: dict[str, list[SegmentSpec]] = {}
CORRIDOR_BBOX: dict[str, tuple[float, float, float, float]] = {}
CORRIDOR_CENTER: dict[str, tuple[float, float]] = {}

for spec in CORRIDOR_SPECS:
    segs, meta = _build_corridor_segments(spec)
    CORRIDOR_GRAPH[spec.id] = segs
    CORRIDOR_BBOX[spec.id] = meta[0]
    CORRIDOR_CENTER[spec.id] = (meta[1][0], meta[1][1])


# ---------------------------------------------------------------------------
# Time-varying state
# ---------------------------------------------------------------------------


_VN_OFFSET = timedelta(hours=7)


def _vn_local(now: datetime) -> datetime:
    """Vietnam local time (Indochina Time, UTC+7)."""
    if now.tzinfo is None:
        return now + _VN_OFFSET
    return now.astimezone(UTC) + _VN_OFFSET


def _diurnal(now: datetime) -> float:
    """Vietnamese-shape diurnal congestion curve in [0, 1]."""
    local = _vn_local(now)
    minutes = local.hour * 60 + local.minute
    am_peak = math.exp(-((minutes - 7 * 60 - 30) ** 2) / (2 * 60**2))
    pm_peak = math.exp(-((minutes - 17 * 60 - 45) ** 2) / (2 * 75**2))
    lunch_dip = -0.15 * math.exp(-((minutes - 12 * 60) ** 2) / (2 * 40**2))
    base = 0.30 + 0.65 * (0.6 * am_peak + 0.95 * pm_peak) + lunch_dip
    return max(0.0, min(1.0, base))


def _weekend_factor(now: datetime) -> float:
    return 0.82 if _vn_local(now).weekday() >= 5 else 1.0


def _seg_phase(seg: SegmentSpec) -> float:
    h = hashlib.md5(seg.id.encode()).digest()
    return ((h[0] << 8) | h[1]) / 65535.0


def _seg_severity(seg: SegmentSpec) -> float:
    h = hashlib.md5(seg.id.encode()).digest()
    return 0.45 + 0.55 * (h[2] / 255.0)


def _segment_state(seg: SegmentSpec, now: datetime) -> tuple[float, float, float, float]:
    diurnal = _diurnal(now) * _weekend_factor(now)
    phase = _seg_phase(seg)
    sev = _seg_severity(seg)
    t = now.timestamp()
    minute_wave = 0.07 * math.sin(t / 60.0 / 13.0 + phase * 6.28)
    sub_wave = 0.04 * math.sin(t / 60.0 / 4.7 + phase * 12.56)
    cong = diurnal * sev + minute_wave + sub_wave + 0.05 * phase
    cong = max(0.02, min(0.98, cong))

    speed = max(4.0, seg.free_flow_kmh * (1.0 - 0.92 * cong))
    flow = (seg.free_flow_kmh * (1.0 - cong) * (1.0 + 1.8 * cong)) * 28.0
    occupancy = min(0.96, 0.15 + 0.85 * cong)
    return cong, speed, flow, occupancy


def _seg_to_segment(seg: SegmentSpec, now: datetime) -> Segment:
    cong, speed, flow, occ = _segment_state(seg, now)
    vetc = 1 + (int(hashlib.md5(seg.id.encode()).digest()[3]) % 4)
    return Segment(
        id=seg.id,
        corridor_id=seg.corridor_id,
        name=seg.name,
        coordinates=[seg.coords[0], seg.coords[1]],
        length_km=seg.length_km,
        speed_kmh=round(speed, 2),
        free_flow_kmh=round(seg.free_flow_kmh, 1),
        congestion=round(cong, 3),
        flow_vph=round(flow, 1),
        occupancy=round(occ, 3),
        vetc_sensors=vetc,
    )


# ---------------------------------------------------------------------------
# Public API: corridors, segments
# ---------------------------------------------------------------------------


def list_corridors() -> list[Corridor]:
    result: list[Corridor] = []
    for spec in CORRIDOR_SPECS:
        segs = CORRIDOR_GRAPH[spec.id]
        bbox = CORRIDOR_BBOX[spec.id]
        total_km = sum(s.length_km for s in segs)
        result.append(
            Corridor(
                id=spec.id,
                name=spec.name,
                city=spec.city,
                length_km=round(total_km, 1),
                segments=len(segs),
                bbox=bbox,
                center=CORRIDOR_CENTER[spec.id],
            )
        )
    return result


def list_segments(corridor_id: str, now: datetime | None = None) -> list[Segment]:
    if corridor_id not in CORRIDOR_GRAPH:
        return []
    now = now or datetime.now(UTC)
    return [_seg_to_segment(s, now) for s in CORRIDOR_GRAPH[corridor_id]]


# ---------------------------------------------------------------------------
# Incidents — deterministic but rotates over the day
# ---------------------------------------------------------------------------


_INCIDENT_TYPES: list[tuple[str, str]] = [
    ("accident", "Sustained speed drop + density spike (CUSUM, segment ground-truth corroborated)"),
    ("construction", "Lane closure detected from sustained flow asymmetry over 25 min window"),
    ("weather", "Rainfall correlation with corridor-wide speed reduction"),
    ("event", "Anomalous arrival rate vs day-of-week baseline (likely venue egress)"),
    ("flood", "Flow ≈ 0, speed ≈ 0 sustained > 8 min — likely flooding"),
]


def list_incidents(corridor_id: str | None = None, now: datetime | None = None) -> list[Incident]:
    now = now or datetime.now(UTC)
    incidents: list[Incident] = []
    for cid, segs in CORRIDOR_GRAPH.items():
        if corridor_id and corridor_id != cid:
            continue
        bucket = int(now.timestamp() // 600)
        rng = random.Random(f"{cid}:{bucket}")
        n = rng.randint(1, 4)
        for k in range(n):
            seg = rng.choice(segs)
            cong, _, _, _ = _segment_state(seg, now)
            t_idx = rng.randint(0, len(_INCIDENT_TYPES) - 1)
            inc_type, descr = _INCIDENT_TYPES[t_idx]
            severity = "high" if cong > 0.75 else "medium" if cong > 0.5 else "low"
            probability = min(0.98, 0.55 + cong * 0.45 + rng.random() * 0.05)
            detected_offset = rng.randint(40, 540)
            incidents.append(
                Incident(
                    id=f"inc-{hashlib.md5(f'{cid}:{bucket}:{k}'.encode()).hexdigest()[:8]}",
                    corridor_id=cid,
                    segment_id=seg.id,
                    type=inc_type,  # type: ignore[arg-type]
                    severity=severity,  # type: ignore[arg-type]
                    detected_at=now - timedelta(seconds=detected_offset),
                    probability=round(probability, 3),
                    description=descr,
                    location=seg.coords[0],
                )
            )
    return incidents


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------


def forecast(
    corridor_id: str, horizon_minutes: int = 60, now: datetime | None = None
) -> CorridorForecast | None:
    if corridor_id not in CORRIDOR_GRAPH:
        return None
    horizon_minutes = max(15, min(180, horizon_minutes))
    now = now or datetime.now(UTC)
    points: list[ForecastPoint] = []
    segs = CORRIDOR_GRAPH[corridor_id]
    for step in range(0, horizon_minutes + 1, 5):
        t = now + timedelta(minutes=step)
        agg = [_segment_state(s, t) for s in segs]
        cong = sum(a[0] for a in agg) / len(agg)
        speed = sum(a[1] for a in agg) / len(agg)
        flow = sum(a[2] for a in agg) / len(agg)
        points.append(
            ForecastPoint(
                t=f"+{step:02d}m",
                congestion=round(cong, 3),
                speed_kmh=round(speed, 2),
                flow_vph=round(flow, 1),
            )
        )
    return CorridorForecast(corridor_id=corridor_id, horizon_minutes=horizon_minutes, points=points)


# ---------------------------------------------------------------------------
# ETA solver
# ---------------------------------------------------------------------------


def _nearest_segment(point: tuple[float, float]) -> SegmentSpec | None:
    best: SegmentSpec | None = None
    best_d = float("inf")
    for segs in CORRIDOR_GRAPH.values():
        for s in segs:
            mid = ((s.coords[0][0] + s.coords[1][0]) / 2, (s.coords[0][1] + s.coords[1][1]) / 2)
            d = _haversine_km(point, mid)
            if d < best_d:
                best_d = d
                best = s
    return best


def _route_between(origin: tuple[float, float], dest: tuple[float, float]) -> list[SegmentSpec]:
    s0 = _nearest_segment(origin)
    s1 = _nearest_segment(dest)
    if not s0 or not s1:
        return []
    if s0.corridor_id != s1.corridor_id:
        return [s0, s1]
    segs = CORRIDOR_GRAPH[s0.corridor_id]
    i0 = segs.index(s0)
    i1 = segs.index(s1)
    if i0 > i1:
        i0, i1 = i1, i0
    return segs[i0 : i1 + 1]


def eta(
    origin: tuple[float, float],
    destination: tuple[float, float],
    mode: str = "car",
    now: datetime | None = None,
) -> EtaResponse | None:
    now = now or datetime.now(UTC)
    route = _route_between(origin, destination)
    if not route:
        return None

    mode_speed_factor = 1.0 if mode == "car" else 1.12  # motorcycles weave faster in heavy congestion
    distance_km = 0.0
    travel_seconds = 0.0
    cong_sum = 0.0
    for seg in route:
        cong, speed, _, _ = _segment_state(seg, now)
        eff_speed = max(4.0, speed * mode_speed_factor)
        distance_km += seg.length_km
        travel_seconds += seg.length_km / eff_speed * 3600.0
        cong_sum += cong
    avg_cong = cong_sum / len(route)

    # Add origin/dest stub distances
    if route:
        stub = _haversine_km(origin, route[0].coords[0]) + _haversine_km(destination, route[-1].coords[1])
        distance_km += stub
        travel_seconds += stub / max(8.0, route[0].free_flow_kmh * 0.45 * mode_speed_factor) * 3600.0

    # Conformal-style interval: low congestion → tight, high → wide
    width_factor = 0.07 + avg_cong * 0.20
    low = travel_seconds * (1 - width_factor)
    high = travel_seconds * (1 + width_factor * 1.3)

    mape_expected = 4.5 + 6.0 * avg_cong  # 4.5–10.5%
    confidence = max(0.62, 0.97 - avg_cong * 0.30)

    baseline_minutes = (travel_seconds / 60.0) * (
        1.10 + avg_cong * 0.45 + (0.04 if mode == "motorcycle" else 0.0)
    )
    improvement_pct = (travel_seconds / 60.0 - baseline_minutes) / baseline_minutes * 100.0

    used_tiers: list[str] = ["A"]
    if any(s.corridor_id != "hanoi-haiphong-cT04" for s in route):
        used_tiers.append("B")

    return EtaResponse(
        origin=origin,
        destination=destination,
        distance_km=round(distance_km, 2),
        eta_seconds=round(travel_seconds, 1),
        eta_minutes=round(travel_seconds / 60.0, 2),
        conformal_low_seconds=round(low, 1),
        conformal_high_seconds=round(high, 1),
        conformal_low_minutes=round(low / 60.0, 2),
        conformal_high_minutes=round(high / 60.0, 2),
        confidence=round(confidence, 3),
        mape_expected=round(mape_expected, 2),
        baseline_google_minutes=round(baseline_minutes, 2),
        improvement_pct=round(improvement_pct, 2),
        route_segments=[s.id for s in route],
        used_tiers=used_tiers,  # type: ignore[arg-type]
    )


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


def stats(now: datetime | None = None) -> dict:
    now = now or datetime.now(UTC)
    total_segments = sum(len(s) for s in CORRIDOR_GRAPH.values())
    total_sensors = total_segments * 3
    incidents_n = sum(len(list_incidents(cid, now=now)) for cid in CORRIDOR_GRAPH)
    return {
        "daily_passages": 1_980_000 + int((now.timestamp() % 86400) / 86400 * 80_000),
        "active_segments": total_segments,
        "active_sensors": total_sensors,
        "active_incidents": incidents_n,
        "median_eta_mape": 6.7,
        "baseline_eta_mape": 18.0,
        "uptime_pct": 99.94,
        "generated_at": now,
    }
