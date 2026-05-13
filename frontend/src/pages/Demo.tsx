import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Corridor, type Segment, type Incident, type EtaResponse, type CorridorForecast } from "../lib/api";

export default function Demo() {
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [active, setActive] = useState<string>("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [forecast, setForecast] = useState<CorridorForecast | null>(null);
  const [eta, setEta] = useState<EtaResponse | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [mode, setMode] = useState<"car" | "motorcycle">("car");
  const [pick, setPick] = useState<{ origin?: [number, number]; dest?: [number, number] }>({});
  const [hovered, setHovered] = useState<Segment | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.corridors().then((c) => {
      setCorridors(c);
      if (c.length) setActive(c[0].id);
    }).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!active) return;
    setError(null);
    Promise.all([
      api.segments(active),
      api.incidents(active),
      api.forecast(active, 90),
    ]).then(([s, i, f]) => {
      setSegments(s); setIncidents(i); setForecast(f);
    }).catch((e) => setError(String(e)));
  }, [active, tick]);

  useEffect(() => {
    setPick({});
    setEta(null);
  }, [active]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  const corridor = useMemo(() => corridors.find((c) => c.id === active) || null, [corridors, active]);

  const summary = useMemo(() => {
    if (!segments.length) return null;
    const avg = segments.reduce((a, s) => a + s.congestion, 0) / segments.length;
    const free = segments.filter((s) => s.congestion < 0.2).length;
    const mod = segments.filter((s) => s.congestion >= 0.2 && s.congestion < 0.55).length;
    const heavy = segments.filter((s) => s.congestion >= 0.55 && s.congestion < 0.8).length;
    const grid = segments.filter((s) => s.congestion >= 0.8).length;
    return { avg, free, mod, heavy, grid };
  }, [segments]);

  const onSegmentClick = async (s: Segment) => {
    const mid = midpoint(s.coordinates);
    if (!pick.origin) {
      setPick({ origin: mid });
      setEta(null);
    } else if (!pick.dest) {
      const next = { ...pick, dest: mid };
      setPick(next);
      setEtaLoading(true);
      try {
        const r = await api.eta(next.origin!, mid, mode);
        setEta(r);
      } catch (e) { setError(String(e)); }
      finally { setEtaLoading(false); }
    } else {
      setPick({ origin: mid });
      setEta(null);
    }
  };

  const reset = () => { setPick({}); setEta(null); };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="pulse-dot" />
            <span className="text-xs uppercase tracking-wider text-accent-400 font-semibold">Live digital twin · sandbox</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">PulseGrid demo dashboard</h1>
          <p className="text-ink-400 text-sm mt-1">
            Click two road segments on the map to get a calibrated ETA. Data refreshes every 15s. All values driven by the PulseGrid API.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-400">Corridor</span>
          <select
            className="bg-ink-900 border border-white/10 rounded-md text-sm px-3 py-2 text-ink-100 focus:outline-none focus:border-accent-500"
            value={active}
            onChange={(e) => setActive(e.target.value)}
          >
            {corridors.map((c) => (<option key={c.id} value={c.id}>{c.name} · {c.city}</option>))}
          </select>
          <div className="flex items-center gap-1 ml-2 p-0.5 bg-ink-900 border border-white/10 rounded-md">
            {(["car", "motorcycle"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setEta(null); setPick({}); }}
                className={`px-2.5 py-1 text-xs rounded ${mode === m ? "bg-accent-500 text-white" : "text-ink-300 hover:text-white"}`}>
                {m === "car" ? "Car" : "Motorcycle"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-pulse-500/40 bg-pulse-500/5 text-sm text-pulse-400 mb-4">
          <div className="font-semibold mb-1">API unreachable</div>
          <div className="text-ink-300">
            {error}. Make sure the PulseGrid API is running (default <span className="kbd">http://localhost:8000</span> in dev,
            <span className="kbd"> https://pulsegrid-api.fly.dev</span> in prod).
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="card p-3">
          <div className="flex items-center justify-between px-2 pt-1 pb-3">
            <div className="text-xs text-ink-400">
              {corridor ? `${corridor.length_km.toFixed(1)} km · ${segments.length} segments · ${incidents.length} active incidents` : "Loading corridor…"}
            </div>
            <Legend />
          </div>
          <MapView
            corridor={corridor}
            segments={segments}
            incidents={incidents}
            pick={pick}
            hovered={hovered}
            setHovered={setHovered}
            onSegmentClick={onSegmentClick}
            tick={tick}
          />
          <div className="flex items-center justify-between mt-3 px-2 text-xs text-ink-400">
            <div>
              {pick.origin && !pick.dest && <span>Origin selected · click a second segment for destination</span>}
              {!pick.origin && <span>Click any road segment to place an origin pin</span>}
              {pick.origin && pick.dest && <span className="text-accent-400">Route computed via GNN + conformal layer</span>}
            </div>
            <button className="btn btn-ghost text-xs px-2 py-1" onClick={reset}>Reset</button>
          </div>
        </div>

        <div className="space-y-4">
          <SummaryCard summary={summary} corridor={corridor} />
          <EtaCard eta={eta} loading={etaLoading} mode={mode} pick={pick} />
          <IncidentsCard incidents={incidents} />
          <ForecastCard forecast={forecast} />
        </div>
      </div>

      {hovered && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 card p-3 text-xs flex items-center gap-3">
          <span className="kbd">{hovered.id}</span>
          <span className="text-ink-200">{hovered.name}</span>
          <span>{hovered.speed_kmh.toFixed(0)} km/h</span>
          <span>flow {hovered.flow_vph.toFixed(0)} v/h</span>
          <span style={{ color: speedColor(hovered.congestion) }}>{(hovered.congestion * 100).toFixed(0)}% congestion</span>
        </div>
      )}
    </div>
  );
}

function MapView({ corridor, segments, incidents, pick, hovered, setHovered, onSegmentClick, tick }: {
  corridor: Corridor | null;
  segments: Segment[];
  incidents: Incident[];
  pick: { origin?: [number, number]; dest?: [number, number] };
  hovered: Segment | null;
  setHovered: (s: Segment | null) => void;
  onSegmentClick: (s: Segment) => void;
  tick: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  if (!corridor) {
    return <div className="aspect-[16/9] flex items-center justify-center text-ink-500 text-sm">Loading…</div>;
  }
  const [w, h] = [1200, 700];
  const pad = 50;
  const [lonMin, latMin, lonMax, latMax] = corridor.bbox;
  const sx = (lon: number) => pad + ((lon - lonMin) / (lonMax - lonMin || 1)) * (w - 2 * pad);
  const sy = (lat: number) => pad + ((latMax - lat) / (latMax - latMin || 1)) * (h - 2 * pad);

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto bg-ink-950 rounded-lg border border-white/5"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <pattern id="mapgrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" />
          </pattern>
          <linearGradient id="cityHaze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <rect width={w} height={h} fill="#070a10" />
        <rect width={w} height={h} fill="url(#cityHaze)" />
        <rect width={w} height={h} fill="url(#mapgrid)" />

        {segments.map((s) => {
          const isHover = hovered?.id === s.id;
          const stroke = speedColor(s.congestion);
          const points = s.coordinates.map(([lon, lat]) => `${sx(lon)},${sy(lat)}`).join(" ");
          return (
            <g key={s.id}>
              <polyline
                points={points}
                fill="none"
                stroke="#0a0f17"
                strokeWidth={isHover ? 11 : 9}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: "none" }}
              />
              <polyline
                points={points}
                fill="none"
                stroke={stroke}
                strokeWidth={isHover ? 6 : 4.5}
                strokeOpacity={isHover ? 1 : 0.85}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: "none", transition: "stroke-width 0.15s" }}
              />
              {/* invisible wide hit-area for easier clicking */}
              <polyline
                points={points}
                fill="none"
                stroke="transparent"
                strokeWidth={22}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSegmentClick(s)}
              />
            </g>
          );
        })}

        {incidents.map((inc) => {
          const [lon, lat] = inc.location;
          const r = inc.severity === "high" ? 11 : inc.severity === "medium" ? 8 : 6;
          const col = inc.severity === "high" ? "#ef4444" : inc.severity === "medium" ? "#f59e0b" : "#eab308";
          return (
            <g key={inc.id} transform={`translate(${sx(lon)},${sy(lat)})`} style={{ pointerEvents: "none" }}>
              <circle r={r + 5} fill={col} fillOpacity="0.15">
                <animate attributeName="r" values={`${r};${r + 8};${r}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r={r} fill={col} fillOpacity="0.85" stroke="#fff" strokeWidth="1.5" />
              <text y="3" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">!</text>
            </g>
          );
        })}

        {pick.origin && <Pin x={sx(pick.origin[0])} y={sy(pick.origin[1])} label="A" color="#22d3ee" />}
        {pick.dest && <Pin x={sx(pick.dest[0])} y={sy(pick.dest[1])} label="B" color="#f97316" />}
        {pick.origin && pick.dest && (
          <line
            x1={sx(pick.origin[0])} y1={sy(pick.origin[1])}
            x2={sx(pick.dest[0])} y2={sy(pick.dest[1])}
            stroke="#22d3ee" strokeWidth="2" strokeDasharray="6 5" strokeOpacity="0.6"
          />
        )}

        <g transform={`translate(${w - 230}, 20)`}>
          <rect width="210" height="50" rx="6" fill="rgba(15,20,29,0.85)" stroke="rgba(255,255,255,0.08)" />
          <text x="14" y="20" fontSize="10" fill="#7d8ba0" letterSpacing="0.05em">LAST REFRESH</text>
          <text x="14" y="38" fontSize="13" fontWeight="600" fill="#eceff3">
            {new Date().toLocaleTimeString()} · update #{tick + 1}
          </text>
        </g>

        <g transform={`translate(20, ${h - 36})`}>
          <text x="0" y="0" fontSize="10" fill="#7d8ba0">
            Bounds: {lonMin.toFixed(3)}°E, {latMin.toFixed(3)}°N → {lonMax.toFixed(3)}°E, {latMax.toFixed(3)}°N
          </text>
        </g>
      </svg>
    </div>
  );
}

function Pin({ x, y, label, color }: { x: number; y: number; label: string; color: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M 0 -30 C 12 -30 18 -22 18 -14 C 18 -5 0 6 0 6 C 0 6 -18 -5 -18 -14 C -18 -22 -12 -30 0 -30 Z" fill={color} stroke="#0a0f17" strokeWidth="2" />
      <circle cx="0" cy="-15" r="6" fill="#0a0f17" />
      <text y="-12" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>{label}</text>
    </g>
  );
}

function Legend() {
  const steps = [
    { c: "#22c55e", l: "Free flow" },
    { c: "#eab308", l: "Moderate" },
    { c: "#f97316", l: "Heavy" },
    { c: "#ef4444", l: "Gridlock" },
  ];
  return (
    <div className="flex items-center gap-2 text-xs text-ink-400">
      {steps.map((s) => (
        <span key={s.l} className="flex items-center gap-1">
          <span className="inline-block w-3 h-1.5 rounded-full" style={{ background: s.c }} />
          {s.l}
        </span>
      ))}
    </div>
  );
}

function SummaryCard({ summary, corridor }: { summary: { avg: number; free: number; mod: number; heavy: number; grid: number } | null; corridor: Corridor | null }) {
  if (!corridor || !summary) return <div className="card p-4 text-sm text-ink-400">Loading…</div>;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">{corridor.name}</div>
        <span className="tag">{corridor.city}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat l="Avg congestion" v={`${(summary.avg * 100).toFixed(0)}%`} c={speedColor(summary.avg)} />
        <Stat l="Free flow" v={summary.free.toString()} c="#22c55e" />
        <Stat l="Moderate" v={summary.mod.toString()} c="#eab308" />
        <Stat l="Heavy" v={summary.heavy.toString()} c="#f97316" />
        <Stat l="Gridlock" v={summary.grid.toString()} c="#ef4444" />
        <Stat l="Total segments" v={(summary.free + summary.mod + summary.heavy + summary.grid).toString()} />
      </div>
    </div>
  );
}

function Stat({ l, v, c }: { l: string; v: string; c?: string }) {
  return (
    <div className="bg-ink-900/60 rounded-md p-2.5 border border-white/5">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{l}</div>
      <div className="text-base font-bold mt-0.5" style={{ color: c || "#eceff3" }}>{v}</div>
    </div>
  );
}

function EtaCard({ eta, loading, mode, pick }: { eta: EtaResponse | null; loading: boolean; mode: "car" | "motorcycle"; pick: { origin?: [number, number]; dest?: [number, number] } }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">ETA estimate</div>
        <span className="tag">{mode === "car" ? "car" : "motorcycle"} · v0.9</span>
      </div>
      {loading && <div className="text-sm text-ink-400 py-4 text-center">Computing through GNN + conformal layer…</div>}
      {!loading && !eta && (
        <div className="text-sm text-ink-400 py-4 leading-relaxed">
          {pick.origin
            ? "Origin pin placed (A). Click a second road segment to set the destination (B)."
            : "Click any road segment on the map to place an origin pin."}
        </div>
      )}
      {!loading && eta && (
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400">PulseGrid ETA (P50)</div>
            <div className="text-3xl font-bold text-accent-400">{formatMinutes(eta.eta_minutes)}</div>
            <div className="text-xs text-ink-400 mt-1">
              90% conformal: {formatMinutes(eta.conformal_low_minutes)} → {formatMinutes(eta.conformal_high_minutes)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat l="Distance" v={`${eta.distance_km.toFixed(1)} km`} />
            <Stat l="Confidence" v={`${(eta.confidence * 100).toFixed(0)}%`} c="#22d3ee" />
            <Stat l="Expected MAPE" v={`${eta.mape_expected.toFixed(1)}%`} c="#a3e635" />
            <Stat l="Tiers used" v={eta.used_tiers.join(" + ")} c="#67e8f9" />
          </div>
          <div className="bg-ink-900/60 rounded-md p-3 border border-white/5">
            <div className="text-xs text-ink-400">Google Maps baseline (VN)</div>
            <div className="text-lg font-semibold text-ink-200 line-through opacity-70">{formatMinutes(eta.baseline_google_minutes)}</div>
            <div className="text-xs text-accent-400 font-semibold mt-1">▼ {Math.abs(eta.improvement_pct).toFixed(0)}% tighter than baseline</div>
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentsCard({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Active incidents</div>
        <span className="text-xs text-ink-400">{incidents.length} total</span>
      </div>
      {incidents.length === 0 ? (
        <div className="text-sm text-ink-400 py-3">All clear on this corridor.</div>
      ) : (
        <ul className="space-y-2 max-h-56 overflow-y-auto scroll-area">
          {incidents.map((inc) => (
            <li key={inc.id} className="bg-ink-900/60 rounded-md p-2.5 border border-white/5">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm">
                  <span className="font-semibold capitalize">{inc.type}</span>
                  <span className="text-ink-400"> · {inc.severity}</span>
                </div>
                <span className="text-[11px] text-ink-500 font-mono">P({(inc.probability * 100).toFixed(0)}%)</span>
              </div>
              <div className="text-xs text-ink-300 mt-1 leading-relaxed">{inc.description}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ForecastCard({ forecast }: { forecast: CorridorForecast | null }) {
  if (!forecast) return <div className="card p-4 text-sm text-ink-400">Loading forecast…</div>;
  const pts = forecast.points;
  const w = 320, h = 110, pad = 20;
  const minY = 0, maxY = 1;
  const px = (i: number) => pad + (i / (pts.length - 1)) * (w - 2 * pad);
  const py = (v: number) => pad + (1 - (v - minY) / (maxY - minY)) * (h - 2 * pad);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(p.congestion)}`).join(" ");
  const area = `${line} L ${px(pts.length - 1)} ${h - pad} L ${px(0)} ${h - pad} Z`;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Congestion forecast · next {forecast.horizon_minutes} min</div>
        <span className="text-xs text-ink-400">GNN · 5 min step</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="fcArea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={pad} x2={w - pad} y1={py(t)} y2={py(t)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        ))}
        <path d={area} fill="url(#fcArea)" />
        <path d={line} fill="none" stroke="#22d3ee" strokeWidth="1.8" />
        {pts.map((p, i) => i % 3 === 0 && (
          <circle key={i} cx={px(i)} cy={py(p.congestion)} r="2" fill="#22d3ee" />
        ))}
      </svg>
      <div className="flex items-center justify-between mt-1 text-[10px] text-ink-500">
        <span>now</span><span>+{Math.round(forecast.horizon_minutes / 2)}m</span><span>+{forecast.horizon_minutes}m</span>
      </div>
    </div>
  );
}

function speedColor(c: number) {
  if (c < 0.2) return "#22c55e";
  if (c < 0.55) return "#eab308";
  if (c < 0.8) return "#f97316";
  return "#ef4444";
}

function formatMinutes(m: number) {
  if (m < 1) return `${Math.round(m * 60)}s`;
  if (m < 60) return `${m.toFixed(1)} min`;
  const h = Math.floor(m / 60);
  const rem = Math.round(m - h * 60);
  return `${h}h ${rem}m`;
}

function midpoint(coords: [number, number][]): [number, number] {
  const i = Math.floor(coords.length / 2);
  return coords[i];
}
