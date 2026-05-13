import {
  mockCorridors,
  mockEta,
  mockForecast,
  mockIncidents,
  mockSegments,
  mockStats,
} from "./twin";

const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_BASE = (fromEnv && fromEnv.length > 0)
  ? fromEnv.replace(/\/$/, "")
  : "";

const HAS_REMOTE = API_BASE.length > 0;

export type Corridor = {
  id: string;
  name: string;
  city: string;
  length_km: number;
  segments: number;
  bbox: [number, number, number, number];
  center: [number, number];
};

export type Segment = {
  id: string;
  corridor_id: string;
  name: string;
  coordinates: [number, number][];
  length_km: number;
  speed_kmh: number;
  free_flow_kmh: number;
  congestion: number;
  flow_vph: number;
  occupancy: number;
  vetc_sensors: number;
};

export type Incident = {
  id: string;
  corridor_id: string;
  segment_id: string;
  type: "accident" | "construction" | "weather" | "event" | "flood";
  severity: "low" | "medium" | "high";
  detected_at: string;
  probability: number;
  description: string;
  location: [number, number];
};

export type EtaResponse = {
  origin: [number, number];
  destination: [number, number];
  distance_km: number;
  eta_seconds: number;
  eta_minutes: number;
  conformal_low_seconds: number;
  conformal_high_seconds: number;
  conformal_low_minutes: number;
  conformal_high_minutes: number;
  confidence: number;
  mape_expected: number;
  baseline_google_minutes: number;
  improvement_pct: number;
  route_segments: string[];
  used_tiers: ("A" | "B")[];
};

export type ForecastPoint = { t: string; congestion: number; speed_kmh: number; flow_vph: number };
export type CorridorForecast = { corridor_id: string; horizon_minutes: number; points: ForecastPoint[] };

export type Stats = {
  daily_passages: number;
  active_segments: number;
  active_sensors: number;
  active_incidents: number;
  median_eta_mape: number;
  baseline_eta_mape: number;
  uptime_pct: number;
  generated_at: string;
};

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) throw new Error(`API ${path} -> ${r.status}`);
  return r.json() as Promise<T>;
}

async function withFallback<T>(remote: () => Promise<T>, mock: () => T | null): Promise<T> {
  if (HAS_REMOTE) {
    try {
      return await remote();
    } catch {
      const m = mock();
      if (m !== null) return m;
      throw new Error("API unreachable and mock unavailable");
    }
  }
  const m = mock();
  if (m === null) throw new Error("Mock unavailable");
  return m;
}

export const api = {
  corridors: () =>
    withFallback(() => get<Corridor[]>("/v1/corridors"), () => mockCorridors()),
  segments: (corridorId: string) =>
    withFallback(
      () => get<Segment[]>(`/v1/corridors/${corridorId}/segments`),
      () => mockSegments(corridorId),
    ),
  incidents: (corridorId?: string) =>
    withFallback(
      () => get<Incident[]>(`/v1/incidents${corridorId ? `?corridor_id=${corridorId}` : ""}`),
      () => mockIncidents(corridorId),
    ),
  eta: (origin: [number, number], destination: [number, number], mode: "car" | "motorcycle" = "car") =>
    withFallback(
      () =>
        get<EtaResponse>(
          `/v1/eta?origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&mode=${mode}`,
        ),
      () => mockEta(origin, destination, mode),
    ),
  forecast: (corridorId: string, horizon = 90) =>
    withFallback(
      () => get<CorridorForecast>(`/v1/forecast?corridor_id=${corridorId}&horizon_minutes=${horizon}`),
      () => mockForecast(corridorId, horizon),
    ),
  stats: () => withFallback(() => get<Stats>("/v1/stats"), () => mockStats()),
};
