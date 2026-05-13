import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, type Stats } from "../lib/api";

export default function Landing() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let alive = true;
    api.stats().then((s) => alive && setStats(s)).catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <div>
      <Hero stats={stats} />
      <LogosStrip />
      <Problem />
      <Solution />
      <Synergy />
      <Architecture />
      <Pilot />
      <Customers />
      <Legal />
      <FinalCTA />
    </div>
  );
}

function Hero({ stats }: { stats: Stats | null }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-5 pt-20 pb-24">
        <div className="flex items-center gap-2 mb-6">
          <span className="tag"><span className="pulse-dot" /> Live · v0.9 preview</span>
          <span className="tag" style={{ color: "#fde68a", background: "rgba(253,224,71,.08)", borderColor: "rgba(253,224,71,.25)" }}>
            Skolkovo × TASCO 2026
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] max-w-4xl">
          Vietnam's roads, <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-400 to-pulse-400">decoded</span>.
        </h1>
        <p className="mt-5 text-lg md:text-xl text-ink-300 max-w-2xl leading-relaxed">
          A live digital twin of Vietnamese traffic — without a single license plate.
          Calibrated ETAs, congestion forecasts and incident detection via REST API,
          built on the country's largest commercial transport dataset.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn btn-primary text-base px-5 py-3" to="/demo">Open live demo →</Link>
          <Link className="btn btn-ghost text-base px-5 py-3" to="/deck">View pitch deck</Link>
          <Link className="btn btn-ghost text-base px-5 py-3" to="/docs">Read API docs</Link>
        </div>
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
          <Stat label="VETC passages / day" value={stats ? compactNum(stats.daily_passages) : "~2.0M"} accent />
          <Stat label="Active road segments" value={stats ? compactNum(stats.active_segments) : "12,400+"} />
          <Stat label="ETA MAPE (target)" value="5–8%" sub="vs ~18% Google Maps" accent />
          <Stat label="Differential privacy ε" value="≤ 1.0" sub="k-anonymity ≥ 50" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-1.5">{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-accent-400" : "text-white"}`}>{value}</div>
      {sub && <div className="text-xs text-ink-400 mt-1">{sub}</div>}
    </div>
  );
}

function compactNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function LogosStrip() {
  const customers = [
    "J&T Express", "Grab", "Ahamove", "Shopee Express", "Be", "Xanh SM",
    "Lazada Logistics", "Giao Hang Nhanh", "Bao Viet", "Vinpearl",
  ];
  return (
    <section className="border-y border-white/5 bg-ink-900/40">
      <div className="max-w-7xl mx-auto px-5 py-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-ink-400">
        <span className="text-xs uppercase tracking-wider text-ink-500">Target enterprise customers</span>
        {customers.map((c) => <span key={c} className="font-medium text-ink-200/90">{c}</span>)}
      </div>
    </section>
  );
}

function Problem() {
  const items = [
    { k: "$6B/year", v: "lost by Vietnam to traffic inefficiency (World Bank, 2024) — urban congestion grows ~9% YoY." },
    { k: "90%", v: "of urban trips are motorcycles. Google/Apple Maps ETAs in VN are 15–25% off." },
    { k: "15–25%", v: "of last-mile delivery cost is route-time uncertainty and reattempts." },
    { k: "0", v: "commercial-grade, motorcycle-aware, Vietnam-native traffic intelligence layers exist today." },
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <SectionHeader eyebrow="The problem" title="Vietnam's mobility data is locked, fragmented, or wrong." />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
        {items.map((it) => (
          <div key={it.k} className="card p-5">
            <div className="text-3xl font-extrabold text-pulse-400">{it.k}</div>
            <div className="text-ink-300 mt-2 leading-relaxed text-sm">{it.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <SectionHeader eyebrow="The solution" title="A probabilistic, real-time digital twin — exposed as an API." />
      <div className="grid lg:grid-cols-3 gap-5 mt-10">
        <Feature title="Tier A · Ground truth" desc="~2M daily VETC toll-gate passages act as high-precision spatiotemporal flow sensors across Vietnam's expressways and corridors." badge="VETC" />
        <Feature title="Tier B · Urban depth" desc="Opt-in, on-device federated GPS aggregates from the VETC app — only gradients and k-anonymized tiles leave the device." badge="Federated · On-device" />
        <Feature title="Deep-tech core" desc="Spatiotemporal Graph Neural Network + conformal prediction for calibrated ETA uncertainty intervals. Differential privacy ε ≤ 1.0." badge="GNN · Conformal" />
      </div>
      <div className="card p-6 mt-6">
        <div className="grid lg:grid-cols-4 gap-6 text-sm">
          <BulletList title="Outputs" items={["ETA with calibrated intervals", "Congestion heatmaps", "Incident probability", "Route alternatives", "Demand & supply forecasts"]} />
          <BulletList title="Coverage" items={["67 provinces — VETC gates", "HCMC + Hanoi metros", "Hà Nội ↔ Hải Phòng", "BOT highway corridors", "Tier-2 cities via Tier B"]} />
          <BulletList title="Accuracy" items={["ETA MAPE 5–8% (target)", "vs ~18% Google Maps VN", "Incident F1 ≥ 0.85", "Detection latency ≤ 90s"]} />
          <BulletList title="Privacy by design" items={["No license plates", "No facial / PII data", "k-anonymity ≥ 50", "DP ε ≤ 1.0", "PDPL 13/2023/QH15 compliant"]} />
        </div>
      </div>
    </section>
  );
}

function Feature({ title, desc, badge }: { title: string; desc: string; badge: string }) {
  return (
    <div className="card p-6">
      <span className="tag">{badge}</span>
      <h3 className="text-xl font-semibold mt-3">{title}</h3>
      <p className="text-ink-300 mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-ink-200 font-semibold mb-2">{title}</div>
      <ul className="space-y-1.5 text-ink-300">
        {items.map((i) => (<li key={i} className="flex gap-2"><span className="text-accent-400 mt-1">▸</span>{i}</li>))}
      </ul>
    </div>
  );
}

function Synergy() {
  const moats = [
    { t: "Data moat", d: "~75% of Vietnam's cars already pass VETC gates → non-replicable ground truth.", icon: "◉" },
    { t: "Distribution moat", d: "30M+ VETC app users → instant federated sensor layer & free B2C 'Traffic Forecast' widget.", icon: "↗" },
    { t: "Monetization moat", d: "VETC payment rails → frictionless billing for B2C premium and B2B credits.", icon: "₫" },
    { t: "Corridor advantage", d: "TASCO BOT highway portfolio → first-party data on Vietnam's key intercity routes.", icon: "⊟" },
    { t: "Joint GTM", d: "VETC enterprise relationships unlock Grab, J&T, Bao Viet, Vinamilk in weeks, not quarters.", icon: "⇄" },
    { t: "Zero cold-start", d: "Model trained on 90 days of historical VETC data during Build Week.", icon: "▶" },
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <SectionHeader eyebrow="Synergy" title="Why TASCO/VETC × PulseGrid is unique and unreplicable." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
        {moats.map((m) => (
          <div key={m.t} className="card p-5">
            <div className="flex items-center gap-2 text-accent-400 text-2xl font-bold">{m.icon}</div>
            <div className="font-semibold mt-1.5">{m.t}</div>
            <div className="text-ink-300 mt-1.5 text-sm leading-relaxed">{m.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Architecture() {
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <SectionHeader eyebrow="Architecture" title="From edge devices and toll gates to a single API." />
      <div className="card p-6 mt-10 overflow-x-auto">
        <ArchitectureDiagram />
      </div>
    </section>
  );
}

function ArchitectureDiagram() {
  return (
    <svg viewBox="0 0 1100 360" className="w-full h-auto">
      <defs>
        <linearGradient id="pipe" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.7" />
        </linearGradient>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#22d3ee" />
        </marker>
      </defs>

      {[120, 200, 280].map((y) => (
        <line key={y} x1="190" y1={y} x2="370" y2={y} stroke="url(#pipe)" strokeWidth="2" markerEnd="url(#arrow)" />
      ))}
      {[120, 200, 280].map((y) => (
        <line key={`m${y}`} x1="490" y1={y} x2="670" y2={y} stroke="url(#pipe)" strokeWidth="2" markerEnd="url(#arrow)" />
      ))}
      {[120, 200, 280].map((y) => (
        <line key={`o${y}`} x1="790" y1={y} x2="970" y2={y} stroke="url(#pipe)" strokeWidth="2" markerEnd="url(#arrow)" />
      ))}

      <ArchBlock x={20} y={92} w={170} title="VETC toll gates" subtitle="Tier A · ground truth" detail="~2M passages/day, 67 provinces, BOT corridors" tone="cyan" />
      <ArchBlock x={20} y={172} w={170} title="VETC mobile app" subtitle="Tier B · federated" detail="30M+ users · on-device aggregation, DP noise" tone="cyan" />
      <ArchBlock x={20} y={252} w={170} title="Partner fleet APIs" subtitle="Optional B2B" detail="Anonymized fleet pings (logistics, ride-hail)" tone="cyan" />

      <ArchBlock x={370} y={92} w={120} title="Ingestion" subtitle="Kafka · Flink" detail="Stream compaction, schema-on-write" tone="slate" />
      <ArchBlock x={370} y={172} w={120} title="DP aggregator" subtitle="k-anon ≥ 50" detail="ε ≤ 1.0, k-tile gating" tone="slate" />
      <ArchBlock x={370} y={252} w={120} title="Map matcher" subtitle="OSRM · HMM" detail="Snap to segment graph" tone="slate" />

      <ArchBlock x={670} y={92} w={120} title="GNN model" subtitle="Spatiotemporal" detail="ST-GAT · 15 min horizon" tone="violet" />
      <ArchBlock x={670} y={172} w={120} title="Conformal layer" subtitle="Calibrated UQ" detail="P10/P50/P90 intervals" tone="violet" />
      <ArchBlock x={670} y={252} w={120} title="Incident detector" subtitle="CUSUM + LLM" detail="Latency ≤ 90s" tone="violet" />

      <ArchBlock x={970} y={92} w={120} title="REST API" subtitle="/v1/eta · /forecast" detail="OAuth2, 99.9% SLA" tone="amber" />
      <ArchBlock x={970} y={172} w={120} title="Vector tiles" subtitle="Digital twin" detail="MapLibre, MBTiles" tone="amber" />
      <ArchBlock x={970} y={252} w={120} title="VETC widget" subtitle="B2C flywheel" detail="Embedded in VETC app" tone="amber" />

      <text x="105" y="335" textAnchor="middle" fontSize="11" fill="#7d8ba0">Edge & sources</text>
      <text x="430" y="335" textAnchor="middle" fontSize="11" fill="#7d8ba0">Ingestion & privacy</text>
      <text x="730" y="335" textAnchor="middle" fontSize="11" fill="#7d8ba0">Models & UQ</text>
      <text x="1030" y="335" textAnchor="middle" fontSize="11" fill="#7d8ba0">Products & APIs</text>

      <text x="105" y="50" textAnchor="middle" fontSize="13" fill="#eceff3" fontWeight="600">1. Data tiers</text>
      <text x="430" y="50" textAnchor="middle" fontSize="13" fill="#eceff3" fontWeight="600">2. Stream pipeline</text>
      <text x="730" y="50" textAnchor="middle" fontSize="13" fill="#eceff3" fontWeight="600">3. ML core</text>
      <text x="1030" y="50" textAnchor="middle" fontSize="13" fill="#eceff3" fontWeight="600">4. Distribution</text>
    </svg>
  );
}

function ArchBlock({ x, y, w, title, subtitle, detail, tone }: {
  x: number; y: number; w: number; title: string; subtitle: string; detail: string;
  tone: "cyan" | "slate" | "violet" | "amber";
}) {
  const colors = {
    cyan:   { bg: "#082f3e", stroke: "#22d3ee", subColor: "#67e8f9" },
    slate:  { bg: "#0f1722", stroke: "#475567", subColor: "#aeb8c6" },
    violet: { bg: "#1c1a3b", stroke: "#8b5cf6", subColor: "#c4b5fd" },
    amber:  { bg: "#2a1e0a", stroke: "#f59e0b", subColor: "#fcd34d" },
  }[tone];
  return (
    <g>
      <rect x={x} y={y} width={w} height={60} rx={8} fill={colors.bg} stroke={colors.stroke} strokeOpacity="0.6" />
      <text x={x + 10} y={y + 18} fontSize="12" fontWeight="700" fill="#eceff3">{title}</text>
      <text x={x + 10} y={y + 33} fontSize="10" fill={colors.subColor}>{subtitle}</text>
      <text x={x + 10} y={y + 50} fontSize="9.5" fill="#aeb8c6">{detail}</text>
    </g>
  );
}

function Pilot() {
  const metrics = [
    { v: "≤ 8%", l: "ETA MAPE on pilot corridors" },
    { v: "≥ 0.85", l: "Congestion-event detection F1" },
    { v: "≤ 90s", l: "Incident detection latency" },
    { v: "≥ 7%", l: "Delivery cost reduction (logistics)" },
    { v: "≥ 15%", l: "Supply positioning lift (ride-hail)" },
    { v: "≥ 12%", l: "UBI loss-ratio improvement (insurer)" },
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <SectionHeader eyebrow="Build Week pilot · 6 weeks" title="Three live corridors. Three anchor partners. Hard metrics." />
      <div className="grid lg:grid-cols-3 gap-5 mt-10">
        {[
          { c: "HCMC inner ring", k: "Vành đai 2 + Võ Văn Kiệt", n: "≈ 48 km · 220 segments" },
          { c: "Hanoi Ring Road 3", k: "Đường vành đai 3", n: "≈ 52 km · 240 segments" },
          { c: "Hà Nội ↔ Hải Phòng expressway", k: "CT.04", n: "≈ 105 km · 180 segments" },
        ].map((p) => (
          <div key={p.c} className="card p-5">
            <div className="text-xs uppercase tracking-wider text-ink-400">Corridor</div>
            <div className="font-semibold text-lg">{p.c}</div>
            <div className="text-ink-300 mt-1">{p.k}</div>
            <div className="text-ink-500 text-sm mt-2 font-mono">{p.n}</div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {metrics.map((m) => (
          <div key={m.l} className="card p-4">
            <div className="text-2xl font-bold text-accent-400">{m.v}</div>
            <div className="text-xs text-ink-400 mt-1.5 leading-relaxed">{m.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Customers() {
  const verticals = [
    { t: "Logistics & 3PL", c: ["J&T Express", "Ahamove", "Lalamove", "GHN", "Best Express"], v: "Route ETAs, reattempt risk, depot dispatch optimization." },
    { t: "Ride-hailing & food", c: ["Grab", "Be", "Xanh SM", "ShopeeFood", "GrabFood"], v: "Driver supply positioning, surge prediction, motorcycle ETAs." },
    { t: "E-commerce last-mile", c: ["Shopee Express", "Lazada Logistics", "Tiki"], v: "SLA compliance, time-window prediction, hub balancing." },
    { t: "Insurance", c: ["Bao Viet", "PVI", "Bao Minh"], v: "Road-segment UBI risk pricing — no individual tracking." },
    { t: "FMCG distribution", c: ["Vinamilk", "Masan", "Unilever VN", "Circle K"], v: "Replenishment routing, retail-window planning." },
    { t: "Tourism", c: ["Vinpearl", "Agoda", "Klook"], v: "Airport-transfer ETAs, demand forecasting." },
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <SectionHeader eyebrow="Customers" title="Six verticals. One API. Vietnam SAM ≈ $420M by 2028." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
        {verticals.map((v) => (
          <div key={v.t} className="card p-5">
            <div className="font-semibold text-lg">{v.t}</div>
            <div className="text-ink-300 mt-1.5 text-sm leading-relaxed">{v.v}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {v.c.map((name) => (<span key={name} className="kbd">{name}</span>))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Legal() {
  const points = [
    "No PII, no license plates, no facial data, no individual vehicle tracks.",
    "No government data, no traffic-light or emergency-service integration.",
    "k-anonymity ≥ 50 and differential privacy ε ≤ 1.0 enforced by construction.",
    "Vietnam PDPL (Law 13/2023/QH15) and GDPR-equivalent best practice.",
    "Pure commercial B2B SaaS — no government license required.",
    "VETC data used under the existing commercial-platform user agreement.",
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <SectionHeader eyebrow="Why legal" title="A B2B SaaS analytics layer — by construction, not by promise." />
      <div className="card p-6 mt-10">
        <ul className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-ink-200">
          {points.map((p) => (<li key={p} className="flex gap-3"><span className="text-accent-400">✓</span>{p}</li>))}
        </ul>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <div className="card p-8 lg:p-12 bg-gradient-to-br from-accent-600/20 to-ink-900/0 border-accent-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div>
            <div className="tag mb-3">The ask</div>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Build Week pilot slot + VETC sandboxed data access.</h3>
            <p className="text-ink-300 mt-3 max-w-2xl">
              Three TASCO-led intros to anchor B2B customers. Cash prize funds the 6-week MVP team.
              By 2030, PulseGrid is the default mobility-intelligence layer for Southeast Asia.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link className="btn btn-primary text-base px-5 py-3" to="/demo">Open live demo</Link>
            <Link className="btn btn-ghost text-base px-5 py-3" to="/deck">View pitch deck</Link>
            <a className="btn btn-ghost text-base px-5 py-3" href="mailto:pilots@pulsegrid.vn">pilots@pulsegrid.vn</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-3xl">
      <div className="text-xs uppercase tracking-wider text-accent-400 font-semibold">{eyebrow}</div>
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">{title}</h2>
    </div>
  );
}
