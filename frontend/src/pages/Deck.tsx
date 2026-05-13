import { useEffect, useState, useCallback, type ReactElement } from "react";

type Slide = {
  num: number;
  title: string;
  subtitle?: string;
  render: () => ReactElement;
};

const slides: Slide[] = [
  {
    num: 1, title: "PulseGrid — Vietnam's Roads, Decoded",
    subtitle: "A live digital twin of Vietnamese traffic — without a single license plate.",
    render: () => (
      <div className="space-y-6">
        <div className="text-2xl text-ink-200 italic">"A live digital twin of Vietnamese traffic — without a single license plate."</div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <Box label="Submission" value="Skolkovo × TASCO Smart Mobility Challenge 2026" />
          <Box label="Track" value="Digital Twin of Urban Traffic · with overlap to Navigation & Routing" />
          <Box label="HQ" value="Hanoi · Singapore" />
          <Box label="Founding team" value="ex-Grab · ex-VinAI · ex-DeepMind ML · ex-VETC platform lead" />
        </div>
        <div className="text-lg text-accent-400 font-semibold pt-2">
          The commercial mobility-intelligence layer for Southeast Asia, built on VETC.
        </div>
      </div>
    ),
  },
  {
    num: 2, title: "The Problem",
    subtitle: "Vietnam's mobility data is locked, fragmented, or wrong.",
    render: () => (
      <ul className="space-y-3 text-base text-ink-200 leading-relaxed">
        {[
          "Vietnam loses ~$6B/year to traffic inefficiency (World Bank, 2024); urban congestion grows ~9% YoY.",
          "90% of urban trips are motorcycles — Google/Apple Maps ETAs in VN are 15–25% off.",
          "Logistics & last-mile: 15–25% of delivery cost is route-time uncertainty and reattempts.",
          "Insurers cannot price road-segment risk — data is locked inside individual fleet apps.",
          "Ride-hail & food delivery: driver supply positioning and surge prediction are guesswork.",
          "No commercial-grade, Vietnam-native, motorcycle-aware traffic intelligence layer exists today.",
        ].map((t) => (
          <li key={t} className="flex gap-3"><span className="text-pulse-500 font-bold">▍</span>{t}</li>
        ))}
      </ul>
    ),
  },
  {
    num: 3, title: "Solution — PulseGrid",
    subtitle: "A probabilistic, real-time digital twin of Vietnam's road network, exposed as an API.",
    render: () => (
      <div className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <Tier title="Tier A — Ground truth" body="~2M daily VETC toll-gate passages = precise spatiotemporal flow sensors across expressways and BOT corridors." color="cyan" />
          <Tier title="Tier B — Urban / motorcycle depth" body="Opt-in, on-device federated GPS aggregates from the VETC app. Only gradients + k-anonymized tiles leave the device." color="violet" />
        </div>
        <div className="card p-5">
          <div className="font-semibold text-ink-100 mb-2">Deep-tech core</div>
          <div className="text-ink-300 text-sm">
            Spatiotemporal Graph Neural Network + conformal prediction for calibrated ETA uncertainty +
            differential privacy (ε ≤ 1.0) + vector-tile digital twin.
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Box label="Outputs" value="ETA · congestion heatmaps · incident probability · route options · demand forecasts" />
          <Box label="Target accuracy" value="ETA MAPE 5–8% (vs ~18% Google Maps baseline in VN)" />
        </div>
      </div>
    ),
  },
  {
    num: 4, title: "Unique Synergy with TASCO / VETC",
    subtitle: "Six moats — each individually defensible.",
    render: () => (
      <div className="grid md:grid-cols-2 gap-4">
        {[
          ["Data moat", "~75% of Vietnam's cars already pass VETC gates → unmatched, non-replicable ground truth."],
          ["Distribution moat", "30M+ VETC app users → instant federated sensor layer and free B2C 'Traffic Forecast' widget."],
          ["Monetization moat", "VETC payment rails → frictionless billing for B2C premium features and B2B credits."],
          ["Corridor advantage", "TASCO's BOT highway portfolio → first-party data on Vietnam's key intercity routes."],
          ["Joint GTM", "VETC enterprise relationships unlock Grab, J&T, Bao Viet, Vinamilk in weeks, not quarters."],
          ["Zero cold-start", "Model trained on 90 days of historical VETC data during Build Week."],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <div className="font-semibold text-accent-400">{t}</div>
            <div className="text-ink-300 mt-2 text-sm leading-relaxed">{d}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: 5, title: "Customers & Business Model",
    subtitle: "Pure B2B SaaS API + SDK; B2C is a flywheel, not a revenue line.",
    render: () => (
      <div className="space-y-5">
        <div className="card p-5">
          <div className="font-semibold mb-2">Pricing</div>
          <div className="text-ink-300 text-sm leading-relaxed">$0.20–$2.00 per 1,000 API calls · tiered enterprise contracts · data-licensing add-ons.</div>
        </div>
        <div className="font-semibold text-ink-200">Target verticals — Vietnam SAM ≈ $420M by 2028</div>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          {[
            ["Logistics & 3PL", "J&T, Ahamove, Lalamove, GHN, Best Express"],
            ["Ride-hailing & food", "Grab, Be, Xanh SM, ShopeeFood, GrabFood"],
            ["E-commerce last-mile", "Shopee Express, Lazada Logistics, Tiki"],
            ["Insurance", "Bao Viet, PVI, Bao Minh — road-segment UBI risk pricing"],
            ["FMCG distribution", "Vinamilk, Masan, Unilever VN, Circle K"],
            ["Tourism", "Vinpearl, Agoda, Klook — airport-transfer ETAs"],
          ].map(([t, d]) => (
            <div key={t} className="card p-3">
              <span className="text-ink-100 font-semibold">{t}: </span>
              <span className="text-ink-300">{d}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: 6, title: "Build Week Pilot — 6-Week MVP",
    subtitle: "Three live corridors. Three anchor partners. Hard, measurable metrics.",
    render: () => (
      <div className="space-y-5">
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {[
            "HCMC inner ring",
            "Hanoi Ring Road 3",
            "Hà Nội ↔ Hải Phòng expressway",
          ].map((c) => (
            <div key={c} className="card p-4"><div className="text-xs uppercase text-ink-400">Corridor</div><div className="font-semibold mt-0.5">{c}</div></div>
          ))}
        </div>
        <div className="card p-5">
          <div className="font-semibold mb-2">Deliverables</div>
          <div className="text-ink-300 text-sm">Ingestion pipeline on VETC APIs · GNN model v0 · REST API · ops dashboard · embeddable widget</div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            ["ETA MAPE ≤ 8%", "on pilot corridors"],
            ["Incident detection F1 ≥ 0.85", "latency ≤ 90s"],
            ["≥ 7% delivery-cost reduction", "for logistics anchor"],
            ["≥ 15% supply-positioning lift", "for ride-hail anchor"],
            ["≥ 12% UBI loss-ratio improvement", "in segment-risk pricing simulation"],
            ["3 anchor pilot partners", "1 logistics · 1 ride-hail or food · 1 insurer"],
          ].map(([t, d]) => (
            <div key={t} className="card p-3">
              <div className="text-accent-400 font-semibold">{t}</div>
              <div className="text-ink-400 text-xs mt-1">{d}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: 7, title: "Why Now · Why Us · Why Legal — and the Ask",
    subtitle: "All gates green. Time to ship.",
    render: () => (
      <div className="space-y-4 text-sm">
        <Box label="Why now" value="Motorcycle-EV transition + GenAI-ready ops teams + mature on-device federated ML in 2026." />
        <Box label="Why us" value="Only team combining VETC-grade data access, GNN/federated-ML depth, and SEA logistics GTM." />
        <Box label="Why legal" value="No PII · no plate recognition · no facial data · no individual vehicle tracks · no government data · no traffic-light or emergency-service integration. k-anonymity ≥ 50 · DP ε ≤ 1.0 · Vietnam PDPL (Law 13/2023/QH15) · GDPR-equivalent best practice. Pure commercial B2B SaaS." />
        <div className="card p-5 border-accent-500/30 bg-accent-500/5">
          <div className="font-semibold text-accent-400 mb-2">The ask</div>
          <ul className="space-y-1.5 text-ink-200">
            <li>▸ Build Week pilot slot</li>
            <li>▸ VETC sandboxed data access</li>
            <li>▸ Three TASCO-led intros to anchor B2B customers</li>
            <li>▸ Cash prize to fund the 6-week MVP team</li>
          </ul>
        </div>
        <Box label="Vision" value="By 2030, PulseGrid is the default mobility-intelligence layer for Southeast Asia — Vietnam first, then Indonesia, Thailand, the Philippines." />
      </div>
    ),
  },
];

export default function Deck() {
  const [i, setI] = useState(0);
  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))), []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "Home") setI(0);
      if (e.key === "End") setI(slides.length - 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go]);
  const s = slides[i];
  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-ink-400">Slide <span className="text-white font-semibold">{s.num}</span> / {slides.length}</div>
        <div className="flex items-center gap-2 text-xs text-ink-400">
          <span className="kbd">←</span><span className="kbd">→</span><span className="kbd">Space</span> to navigate
        </div>
      </div>

      <div className="card p-8 md:p-12 min-h-[560px] fade-in" key={i}>
        <div className="text-xs uppercase tracking-wider text-accent-400 font-semibold">Slide {s.num} of {slides.length}</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2">{s.title}</h1>
        {s.subtitle && <div className="text-ink-300 text-lg mt-2">{s.subtitle}</div>}
        <div className="mt-8">{s.render()}</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button className="btn btn-ghost" onClick={() => go(-1)} disabled={i === 0}>← Previous</button>
        <div className="flex gap-1.5">
          {slides.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} className={`h-1.5 w-8 rounded-full transition-all ${idx === i ? "bg-accent-400" : "bg-ink-700 hover:bg-ink-500"}`} aria-label={`Slide ${idx + 1}`} />
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => go(1)} disabled={i === slides.length - 1}>Next →</button>
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-1">{label}</div>
      <div className="text-ink-100 leading-relaxed">{value}</div>
    </div>
  );
}

function Tier({ title, body, color }: { title: string; body: string; color: "cyan" | "violet" }) {
  const ring = color === "cyan" ? "border-accent-500/40 bg-accent-500/5" : "border-violet-500/40 bg-violet-500/5";
  return (
    <div className={`card p-5 ${ring}`}>
      <div className="font-semibold text-ink-100">{title}</div>
      <div className="text-ink-300 mt-2 text-sm leading-relaxed">{body}</div>
    </div>
  );
}
