/**
 * PulseGrid digital-twin simulator — TypeScript port of `backend/app/twin.py`.
 *
 * Deterministic-but-realistic traffic state generator used as a client-side
 * fallback when the production REST API is unreachable. Output matches the
 * FastAPI response shapes exactly, so the demo works standalone.
 */

import type { Corridor, CorridorForecast, EtaResponse, Incident, Segment, Stats } from "./api";

// ---------------------------------------------------------------------------
// Corridor anchor polylines (lon, lat)
// ---------------------------------------------------------------------------

type CorridorSpec = {
  id: string;
  name: string;
  city: string;
  freeFlowKmh: number;
  anchor: [number, number][];
  branches: [number, number][][];
};

const SPECS: CorridorSpec[] = [
  {
    id: "hcmc-inner-ring",
    name: "HCMC inner ring",
    city: "Ho Chi Minh City",
    freeFlowKmh: 42,
    anchor: [
      [106.6230, 10.7720], [106.6480, 10.7560], [106.6720, 10.7480], [106.6930, 10.7570],
      [106.7050, 10.7620], [106.7180, 10.7660], [106.7350, 10.7720], [106.7480, 10.7820],
      [106.7620, 10.7910], [106.7740, 10.8020], [106.7850, 10.8060],
    ],
    branches: [
      [[106.7050, 10.7620], [106.7000, 10.7800], [106.6940, 10.7960], [106.6920, 10.8090]],
      [[106.6720, 10.7480], [106.6600, 10.7350], [106.6480, 10.7220]],
      [[106.7480, 10.7820], [106.7560, 10.7960], [106.7610, 10.8090]],
      [[106.7180, 10.7660], [106.7220, 10.7800], [106.7270, 10.7930]],
    ],
  },
  {
    id: "hanoi-rr3",
    name: "Hanoi Ring Road 3",
    city: "Hanoi",
    freeFlowKmh: 55,
    anchor: [
      [105.7560, 21.0150], [105.7720, 21.0200], [105.7900, 21.0260], [105.8060, 21.0300],
      [105.8230, 21.0370], [105.8380, 21.0410], [105.8500, 21.0440], [105.8640, 21.0460],
      [105.8800, 21.0470], [105.8950, 21.0490],
    ],
    branches: [
      [[105.7900, 21.0260], [105.7960, 21.0420], [105.8020, 21.0570]],
      [[105.8230, 21.0370], [105.8230, 21.0220], [105.8240, 21.0080]],
      [[105.8500, 21.0440], [105.8530, 21.0290], [105.8560, 21.0150]],
      [[105.8640, 21.0460], [105.8730, 21.0610], [105.8800, 21.0750]],
    ],
  },
  {
    id: "hanoi-haiphong-cT04",
    name: "Hà Nội ↔ Hải Phòng expressway",
    city: "Hà Nội / Hưng Yên / Hải Dương / Hải Phòng",
    freeFlowKmh: 100,
    anchor: [
      [105.8900, 21.0480], [105.9700, 20.9900], [106.0500, 20.9700], [106.1700, 20.9450],
      [106.2800, 20.9200], [106.4000, 20.9100], [106.5100, 20.9000], [106.6200, 20.8950],
      [106.6900, 20.8920],
    ],
    branches: [
      [[106.0500, 20.9700], [106.0700, 21.0000], [106.0800, 21.0300]],
      [[106.2800, 20.9200], [106.3100, 20.9450], [106.3300, 20.9700]],
      [[106.5100, 20.9000], [106.5300, 20.8750], [106.5500, 20.8500]],
    ],
  },
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function haversineKm(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180;
  const lon1 = a[0] * r, lat1 = a[1] * r, lon2 = b[0] * r, lat2 = b[1] * r;
  const dlat = lat2 - lat1, dlon = lon2 - lon1;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function interpolate(a: [number, number], b: [number, number], n: number): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => [
    a[0] + (b[0] - a[0]) * (i / n),
    a[1] + (b[1] - a[1]) * (i / n),
  ] as [number, number]);
}

function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Build segment graph for each corridor
// ---------------------------------------------------------------------------

type SegmentSpec = {
  id: string;
  corridorId: string;
  name: string;
  coords: [[number, number], [number, number]];
  lengthKm: number;
  freeFlowKmh: number;
};

const GRAPH = new Map<string, SegmentSpec[]>();
const BBOX = new Map<string, [number, number, number, number]>();
const CENTER = new Map<string, [number, number]>();

for (const spec of SPECS) {
  const segs: SegmentSpec[] = [];
  const bboxPts: [number, number][] = [];
  let segIdx = 0;
  const rng = mulberry32(strHash(spec.id));

  const addSegments = (pts: [number, number][], labelPrefix: string) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const length = haversineKm(pts[i], pts[i + 1]);
      const steps = Math.max(2, Math.floor(length / 0.35) + 1);
      const segPts = interpolate(pts[i], pts[i + 1], steps);
      for (let j = 0; j < segPts.length - 1; j++) {
        const a = segPts[j], b = segPts[j + 1];
        const segLen = haversineKm(a, b);
        const freeFlow = spec.freeFlowKmh * (0.85 + 0.3 * rng());
        segs.push({
          id: `${spec.id}:seg-${String(segIdx).padStart(3, "0")}`,
          corridorId: spec.id,
          name: `${labelPrefix} · km${(segIdx * 0.4).toFixed(1)}`,
          coords: [a, b],
          lengthKm: segLen,
          freeFlowKmh: freeFlow,
        });
        bboxPts.push(a, b);
        segIdx++;
      }
    }
  };

  addSegments(spec.anchor, `${spec.name} main`);
  spec.branches.forEach((br, k) => addSegments(br, `${spec.name} branch ${String.fromCharCode(65 + k)}`));

  const lons = bboxPts.map((p) => p[0]);
  const lats = bboxPts.map((p) => p[1]);
  GRAPH.set(spec.id, segs);
  BBOX.set(spec.id, [Math.min(...lons) - 0.01, Math.min(...lats) - 0.01, Math.max(...lons) + 0.01, Math.max(...lats) + 0.01]);
  CENTER.set(spec.id, [lons.reduce((s, x) => s + x, 0) / lons.length, lats.reduce((s, x) => s + x, 0) / lats.length]);
}

// ---------------------------------------------------------------------------
// Time-varying state
// ---------------------------------------------------------------------------

function vnLocal(now: Date): { hour: number; minute: number; weekday: number } {
  const ms = now.getTime() + 7 * 3600 * 1000;
  const d = new Date(ms);
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes(), weekday: d.getUTCDay() };
}

function diurnal(now: Date): number {
  const { hour, minute } = vnLocal(now);
  const minutes = hour * 60 + minute;
  const amPeak = Math.exp(-((minutes - 7 * 60 - 30) ** 2) / (2 * 60 ** 2));
  const pmPeak = Math.exp(-((minutes - 17 * 60 - 45) ** 2) / (2 * 75 ** 2));
  const lunchDip = -0.15 * Math.exp(-((minutes - 12 * 60) ** 2) / (2 * 40 ** 2));
  const base = 0.30 + 0.65 * (0.6 * amPeak + 0.95 * pmPeak) + lunchDip;
  return Math.max(0, Math.min(1, base));
}

function weekendFactor(now: Date): number {
  const wd = vnLocal(now).weekday;
  return wd === 0 || wd === 6 ? 0.82 : 1.0;
}

function segPhase(seg: SegmentSpec): number {
  return (strHash(seg.id) % 65536) / 65535;
}

function segSeverity(seg: SegmentSpec): number {
  return 0.45 + 0.55 * ((strHash(seg.id + ":sev") % 256) / 255);
}

function segmentState(seg: SegmentSpec, now: Date): { cong: number; speed: number; flow: number; occ: number } {
  const d = diurnal(now) * weekendFactor(now);
  const phase = segPhase(seg);
  const sev = segSeverity(seg);
  const t = now.getTime() / 1000;
  const minuteWave = 0.07 * Math.sin(t / 60 / 13 + phase * 6.28);
  const subWave = 0.04 * Math.sin(t / 60 / 4.7 + phase * 12.56);
  let cong = d * sev + minuteWave + subWave + 0.05 * phase;
  cong = Math.max(0.02, Math.min(0.98, cong));
  const speed = Math.max(4, seg.freeFlowKmh * (1 - 0.92 * cong));
  const flow = (seg.freeFlowKmh * (1 - cong) * (1 + 1.8 * cong)) * 28;
  const occ = Math.min(0.96, 0.15 + 0.85 * cong);
  return { cong, speed, flow, occ };
}

function segToSegment(seg: SegmentSpec, now: Date): Segment {
  const { cong, speed, flow, occ } = segmentState(seg, now);
  const vetc = 1 + (strHash(seg.id + ":vetc") % 4);
  return {
    id: seg.id,
    corridor_id: seg.corridorId,
    name: seg.name,
    coordinates: [seg.coords[0], seg.coords[1]],
    length_km: seg.lengthKm,
    speed_kmh: +speed.toFixed(2),
    free_flow_kmh: +seg.freeFlowKmh.toFixed(1),
    congestion: +cong.toFixed(3),
    flow_vph: +flow.toFixed(1),
    occupancy: +occ.toFixed(3),
    vetc_sensors: vetc,
  };
}

// ---------------------------------------------------------------------------
// Public mock API
// ---------------------------------------------------------------------------

export function mockCorridors(): Corridor[] {
  return SPECS.map((spec) => {
    const segs = GRAPH.get(spec.id)!;
    const totalKm = segs.reduce((s, x) => s + x.lengthKm, 0);
    return {
      id: spec.id,
      name: spec.name,
      city: spec.city,
      length_km: +totalKm.toFixed(1),
      segments: segs.length,
      bbox: BBOX.get(spec.id)!,
      center: CENTER.get(spec.id)!,
    };
  });
}

export function mockSegments(corridorId: string, now: Date = new Date()): Segment[] {
  const segs = GRAPH.get(corridorId);
  if (!segs) return [];
  return segs.map((s) => segToSegment(s, now));
}

const INCIDENT_TYPES: { type: Incident["type"]; description: string }[] = [
  { type: "accident", description: "Sustained speed drop + density spike (CUSUM, segment ground-truth corroborated)" },
  { type: "construction", description: "Lane closure detected from sustained flow asymmetry over 25 min window" },
  { type: "weather", description: "Rainfall correlation with corridor-wide speed reduction" },
  { type: "event", description: "Anomalous arrival rate vs day-of-week baseline (likely venue egress)" },
  { type: "flood", description: "Flow ≈ 0, speed ≈ 0 sustained > 8 min — likely flooding" },
];

export function mockIncidents(corridorId?: string, now: Date = new Date()): Incident[] {
  const result: Incident[] = [];
  for (const [cid, segs] of GRAPH) {
    if (corridorId && corridorId !== cid) continue;
    const bucket = Math.floor(now.getTime() / 1000 / 600);
    const rng = mulberry32(strHash(`${cid}:${bucket}`));
    const n = 1 + Math.floor(rng() * 4);
    for (let k = 0; k < n; k++) {
      const seg = segs[Math.floor(rng() * segs.length)];
      const { cong } = segmentState(seg, now);
      const tIdx = Math.floor(rng() * INCIDENT_TYPES.length);
      const info = INCIDENT_TYPES[tIdx];
      const severity: Incident["severity"] = cong > 0.75 ? "high" : cong > 0.5 ? "medium" : "low";
      const probability = Math.min(0.98, 0.55 + cong * 0.45 + rng() * 0.05);
      const offset = 40 + Math.floor(rng() * 500);
      const detected = new Date(now.getTime() - offset * 1000);
      result.push({
        id: `inc-${strHash(`${cid}:${bucket}:${k}`).toString(16).slice(0, 8)}`,
        corridor_id: cid,
        segment_id: seg.id,
        type: info.type,
        severity,
        detected_at: detected.toISOString(),
        probability: +probability.toFixed(3),
        description: info.description,
        location: seg.coords[0],
      });
    }
  }
  return result;
}

export function mockForecast(corridorId: string, horizonMinutes = 60, now: Date = new Date()): CorridorForecast | null {
  const segs = GRAPH.get(corridorId);
  if (!segs) return null;
  const h = Math.max(15, Math.min(180, horizonMinutes));
  const points = [] as CorridorForecast["points"];
  for (let step = 0; step <= h; step += 5) {
    const t = new Date(now.getTime() + step * 60 * 1000);
    const agg = segs.map((s) => segmentState(s, t));
    const cong = agg.reduce((s, x) => s + x.cong, 0) / agg.length;
    const speed = agg.reduce((s, x) => s + x.speed, 0) / agg.length;
    const flow = agg.reduce((s, x) => s + x.flow, 0) / agg.length;
    points.push({
      t: `+${String(step).padStart(2, "0")}m`,
      congestion: +cong.toFixed(3),
      speed_kmh: +speed.toFixed(2),
      flow_vph: +flow.toFixed(1),
    });
  }
  return { corridor_id: corridorId, horizon_minutes: h, points };
}

function nearestSegment(point: [number, number]): SegmentSpec | null {
  let best: SegmentSpec | null = null;
  let bestD = Infinity;
  for (const segs of GRAPH.values()) {
    for (const s of segs) {
      const mid: [number, number] = [(s.coords[0][0] + s.coords[1][0]) / 2, (s.coords[0][1] + s.coords[1][1]) / 2];
      const d = haversineKm(point, mid);
      if (d < bestD) { bestD = d; best = s; }
    }
  }
  return best;
}

function routeBetween(origin: [number, number], dest: [number, number]): SegmentSpec[] {
  const s0 = nearestSegment(origin);
  const s1 = nearestSegment(dest);
  if (!s0 || !s1) return [];
  if (s0.corridorId !== s1.corridorId) return [s0, s1];
  const segs = GRAPH.get(s0.corridorId)!;
  let i0 = segs.indexOf(s0);
  let i1 = segs.indexOf(s1);
  if (i0 > i1) [i0, i1] = [i1, i0];
  return segs.slice(i0, i1 + 1);
}

export function mockEta(origin: [number, number], dest: [number, number], mode: "car" | "motorcycle" = "car", now: Date = new Date()): EtaResponse | null {
  const route = routeBetween(origin, dest);
  if (!route.length) return null;
  const modeFactor = mode === "car" ? 1.0 : 1.12;
  let distance = 0;
  let secs = 0;
  let congSum = 0;
  for (const seg of route) {
    const { cong, speed } = segmentState(seg, now);
    const effSpeed = Math.max(4, speed * modeFactor);
    distance += seg.lengthKm;
    secs += seg.lengthKm / effSpeed * 3600;
    congSum += cong;
  }
  const avgCong = congSum / route.length;
  const stub = haversineKm(origin, route[0].coords[0]) + haversineKm(dest, route[route.length - 1].coords[1]);
  distance += stub;
  secs += stub / Math.max(8, route[0].freeFlowKmh * 0.45 * modeFactor) * 3600;

  const widthFactor = 0.07 + avgCong * 0.20;
  const low = secs * (1 - widthFactor);
  const high = secs * (1 + widthFactor * 1.3);
  const mape = 4.5 + 6 * avgCong;
  const confidence = Math.max(0.62, 0.97 - avgCong * 0.30);
  const baselineMinutes = (secs / 60) * (1.10 + avgCong * 0.45 + (mode === "motorcycle" ? 0.04 : 0));
  const improvement = (secs / 60 - baselineMinutes) / baselineMinutes * 100;
  const usedTiers: ("A" | "B")[] = ["A"];
  if (route.some((s) => s.corridorId !== "hanoi-haiphong-cT04")) usedTiers.push("B");

  return {
    origin, destination: dest,
    distance_km: +distance.toFixed(2),
    eta_seconds: +secs.toFixed(1),
    eta_minutes: +(secs / 60).toFixed(2),
    conformal_low_seconds: +low.toFixed(1),
    conformal_high_seconds: +high.toFixed(1),
    conformal_low_minutes: +(low / 60).toFixed(2),
    conformal_high_minutes: +(high / 60).toFixed(2),
    confidence: +confidence.toFixed(3),
    mape_expected: +mape.toFixed(2),
    baseline_google_minutes: +baselineMinutes.toFixed(2),
    improvement_pct: +improvement.toFixed(2),
    route_segments: route.map((s) => s.id),
    used_tiers: usedTiers,
  };
}

export function mockStats(now: Date = new Date()): Stats {
  const totalSegments = Array.from(GRAPH.values()).reduce((s, x) => s + x.length, 0);
  const sensors = totalSegments * 3;
  const incidents = Array.from(GRAPH.keys()).reduce((s, cid) => s + mockIncidents(cid, now).length, 0);
  return {
    daily_passages: 1_980_000 + Math.floor((now.getTime() / 1000 % 86400) / 86400 * 80_000),
    active_segments: totalSegments,
    active_sensors: sensors,
    active_incidents: incidents,
    median_eta_mape: 6.7,
    baseline_eta_mape: 18.0,
    uptime_pct: 99.94,
    generated_at: now.toISOString(),
  };
}
