import { useState } from "react";
import { API_BASE } from "../lib/api";

const endpoints = [
  {
    method: "GET", path: "/v1/corridors",
    summary: "List active corridors in the digital twin (Build Week scope).",
    response: `[
  {
    "id": "hcmc-inner-ring",
    "name": "HCMC inner ring",
    "city": "Ho Chi Minh City",
    "length_km": 47.8,
    "segments": 220,
    "bbox": [106.62, 10.72, 106.78, 10.82],
    "center": [106.70, 10.77]
  }
]`,
  },
  {
    method: "GET", path: "/v1/corridors/{id}/segments",
    summary: "Live segment-level state. Updated every 15s from the VETC pipeline.",
    response: `[
  {
    "id": "hcmc-inner-ring:seg-007",
    "name": "Võ Văn Kiệt @ Cầu Calmette",
    "coordinates": [[106.704, 10.764], [106.706, 10.766]],
    "length_km": 0.31,
    "speed_kmh": 18.4,
    "free_flow_kmh": 60.0,
    "congestion": 0.69,
    "flow_vph": 1820,
    "occupancy": 0.55,
    "vetc_sensors": 3
  }
]`,
  },
  {
    method: "GET", path: "/v1/eta",
    summary: "Calibrated ETA with conformal P10/P50/P90 intervals.",
    params: [
      ["origin", "lon,lat — e.g. 106.70,10.77"],
      ["destination", "lon,lat"],
      ["mode", "car | motorcycle (default: car)"],
    ],
    response: `{
  "origin": [106.700, 10.770],
  "destination": [106.760, 10.810],
  "distance_km": 8.7,
  "eta_minutes": 18.2,
  "conformal_low_minutes": 16.1,
  "conformal_high_minutes": 21.4,
  "confidence": 0.91,
  "mape_expected": 6.8,
  "baseline_google_minutes": 24.3,
  "improvement_pct": -25.1,
  "route_segments": ["...:seg-002", "...:seg-007", "..."],
  "used_tiers": ["A", "B"]
}`,
  },
  {
    method: "GET", path: "/v1/incidents",
    summary: "Active incidents detected on the road graph. Filter by corridor_id.",
    params: [["corridor_id", "optional corridor filter"]],
    response: `[
  {
    "id": "inc-3f2a",
    "type": "accident",
    "severity": "medium",
    "segment_id": "hanoi-rr3:seg-041",
    "probability": 0.84,
    "description": "Sustained speed drop + density spike (CUSUM, t=14:23)",
    "detected_at": "2026-05-13T14:23:11Z",
    "location": [105.823, 21.041]
  }
]`,
  },
  {
    method: "GET", path: "/v1/forecast",
    summary: "Corridor-level congestion forecast (5-minute resolution).",
    params: [
      ["corridor_id", "required"],
      ["horizon_minutes", "default 60, max 180"],
    ],
    response: `{
  "corridor_id": "hcmc-inner-ring",
  "horizon_minutes": 90,
  "points": [
    {"t": "+00m", "congestion": 0.42, "speed_kmh": 28.1, "flow_vph": 1620},
    {"t": "+05m", "congestion": 0.45, "speed_kmh": 26.9, "flow_vph": 1655}
  ]
}`,
  },
  {
    method: "GET", path: "/v1/stats",
    summary: "Platform-wide telemetry (uptime, MAPE, daily passages).",
    response: `{
  "daily_passages": 2014332,
  "active_segments": 12440,
  "active_sensors": 4180,
  "active_incidents": 9,
  "median_eta_mape": 6.7,
  "baseline_eta_mape": 18.0,
  "uptime_pct": 99.94
}`,
  },
];

export default function Docs() {
  const [lang, setLang] = useState<"curl" | "py" | "js">("curl");
  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent-400 font-semibold">Developer docs</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">PulseGrid REST API · v1</h1>
          <p className="text-ink-400 text-sm mt-1 max-w-2xl">
            Stateless JSON REST API. Authenticated via OAuth2 / API key (omitted in sandbox).
            Base URL: <span className="kbd">{API_BASE}</span>.
            OpenAPI spec at <a className="text-accent-400 hover:underline" href={`${API_BASE}/openapi.json`} target="_blank" rel="noreferrer">/openapi.json</a>.
            Interactive Swagger at <a className="text-accent-400 hover:underline" href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">/docs</a>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400">Language</span>
          <div className="flex items-center gap-1 p-0.5 bg-ink-900 border border-white/10 rounded-md">
            {(["curl", "py", "js"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-xs rounded ${lang === l ? "bg-accent-500 text-white" : "text-ink-300 hover:text-white"}`}>
                {l === "curl" ? "cURL" : l === "py" ? "Python" : "JavaScript"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {endpoints.map((ep) => (
          <Endpoint key={ep.path} ep={ep} lang={lang} />
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold mb-3">Quickstart</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <CodeSample title="Install" code={`pip install pulsegrid
# or
npm i @pulsegrid/sdk`} />
          <CodeSample title="Authenticate" code={`# header
Authorization: Bearer pg_live_xxxxx
X-PulseGrid-Tenant: my-fleet`} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold mb-3">Privacy contract</h2>
        <div className="card p-5 text-sm text-ink-200 leading-relaxed">
          The API never returns or accepts: license plates, individual vehicle identifiers, raw GPS tracks, facial data,
          or any government / law-enforcement data. All Tier B aggregates are produced by on-device
          federated averaging with differential privacy (ε ≤ 1.0) and k-anonymity ≥ 50 enforced at the tile level.
          See the <a className="text-accent-400 hover:underline" href="/summary">one-pager</a> for the full data contract.
        </div>
      </section>
    </div>
  );
}

function Endpoint({ ep, lang }: { ep: typeof endpoints[number]; lang: "curl" | "py" | "js" }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
        <span className="text-xs font-mono font-bold text-accent-400 bg-accent-500/10 px-2 py-1 rounded">{ep.method}</span>
        <span className="font-mono text-sm">{ep.path}</span>
        <span className="text-ink-400 text-sm hidden md:inline">— {ep.summary}</span>
      </div>
      <div className="p-5 grid lg:grid-cols-2 gap-5">
        <div>
          <div className="text-ink-400 text-sm mb-3 lg:hidden">{ep.summary}</div>
          {ep.params && (
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wider text-ink-400 mb-1.5">Query parameters</div>
              <ul className="text-sm space-y-1">
                {ep.params.map(([n, d]) => (
                  <li key={n}><span className="kbd">{n}</span> <span className="text-ink-300">{d}</span></li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-400 mb-1.5">Example request</div>
            <pre className="code-block"><code>{exampleRequest(ep, lang)}</code></pre>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 mb-1.5">Example response</div>
          <pre className="code-block"><code>{ep.response}</code></pre>
        </div>
      </div>
    </div>
  );
}

function exampleRequest(ep: { method: string; path: string; params?: string[][] }, lang: "curl" | "py" | "js") {
  const exampleUrl = ep.path === "/v1/eta"
    ? `${API_BASE}/v1/eta?origin=106.70,10.77&destination=106.76,10.81&mode=car`
    : ep.path === "/v1/incidents"
    ? `${API_BASE}/v1/incidents?corridor_id=hcmc-inner-ring`
    : ep.path === "/v1/forecast"
    ? `${API_BASE}/v1/forecast?corridor_id=hcmc-inner-ring&horizon_minutes=90`
    : ep.path === "/v1/corridors/{id}/segments"
    ? `${API_BASE}/v1/corridors/hcmc-inner-ring/segments`
    : `${API_BASE}${ep.path}`;
  if (lang === "curl") {
    return `curl -H "Authorization: Bearer pg_live_xxxxx" \\\n     "${exampleUrl}"`;
  }
  if (lang === "py") {
    return `from pulsegrid import PulseGrid
pg = PulseGrid(api_key="pg_live_xxxxx")
print(pg.${ep.path === "/v1/eta" ? "eta(origin=(106.70, 10.77), destination=(106.76, 10.81), mode='car')" : routeToMethod(ep.path)})`;
  }
  return `import { PulseGrid } from "@pulsegrid/sdk";
const pg = new PulseGrid({ apiKey: "pg_live_xxxxx" });
console.log(await pg.${ep.path === "/v1/eta" ? "eta({origin:[106.70,10.77], destination:[106.76,10.81], mode:'car'})" : routeToMethod(ep.path)});`;
}

function routeToMethod(path: string) {
  if (path === "/v1/corridors") return "corridors()";
  if (path === "/v1/corridors/{id}/segments") return "segments('hcmc-inner-ring')";
  if (path === "/v1/incidents") return "incidents({ corridorId: 'hcmc-inner-ring' })";
  if (path === "/v1/forecast") return "forecast({ corridorId: 'hcmc-inner-ring', horizonMinutes: 90 })";
  if (path === "/v1/stats") return "stats()";
  return "request()";
}

function CodeSample({ title, code }: { title: string; code: string }) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">{title}</div>
      <pre className="code-block"><code>{code}</code></pre>
    </div>
  );
}
