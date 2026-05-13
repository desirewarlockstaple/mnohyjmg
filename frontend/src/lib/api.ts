const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_BASE = (fromEnv && fromEnv.length > 0)
  ? fromEnv.replace(/\/$/, "")
  : "https://pulsegrid-api.fly.dev";

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

export const api = {
  corridors: () => get<Corridor[]>("/v1/corridors"),
  segments: (corridorId: string) => get<Segment[]>(`/v1/corridors/${corridorId}/segments`),
  incidents: (corridorId?: string) =>
    get<Incident[]>(`/v1/incidents${corridorId ? `?corridor_id=${corridorId}` : ""}`),
  eta: (origin: [number, number], destination: [number, number], mode: "car" | "motorcycle" = "car") =>
    get<EtaResponse>(
      `/v1/eta?origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&mode=${mode}`
    ),
  forecast: (corridorId: string, horizon = 90) =>
    get<CorridorForecast>(`/v1/forecast?corridor_id=${corridorId}&horizon_minutes=${horizon}`),
  stats: () => get<Stats>("/v1/stats"),
};
