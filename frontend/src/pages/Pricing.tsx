const tiers = [
  {
    name: "Sandbox",
    price: "Free",
    sub: "for evaluation & pilots",
    items: [
      "10,000 API calls / month",
      "1 corridor of choice",
      "60-minute forecasts",
      "Community Slack",
      "No SLA",
    ],
    cta: "Start in sandbox",
    href: "/demo",
    accent: false,
  },
  {
    name: "Growth",
    price: "$0.40 / 1k calls",
    sub: "logistics, ride-hail, retail",
    items: [
      "Tiered volume pricing (≥ 5M calls)",
      "All Vietnam corridors",
      "Up to 180-minute forecasts",
      "99.5% SLA · email support",
      "Incident webhooks",
      "Embedded B2C widget",
    ],
    cta: "Talk to sales",
    href: "mailto:sales@pulsegrid.vn",
    accent: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "insurers, mega-fleets, OEMs",
    items: [
      "Dedicated tenant · VPC peering",
      "Custom GNN fine-tuning",
      "Road-segment UBI scoring",
      "99.95% SLA · 24/7 on-call",
      "Co-marketing with VETC",
      "Data-licensing add-ons",
    ],
    cta: "Request RFP",
    href: "mailto:enterprise@pulsegrid.vn",
    accent: false,
  },
];

const anchorCustomers = [
  {
    vertical: "Logistics & 3PL",
    name: "J&T Express Vietnam",
    use: "Last-mile route ETAs, depot dispatch, reattempt risk",
    impact: "≥ 7% cost reduction on 50-vehicle Hanoi fleet pilot",
    color: "from-cyan-500/20",
  },
  {
    vertical: "Ride-hailing & food",
    name: "Be (or Xanh SM)",
    use: "Driver supply positioning, motorcycle ETAs, surge prediction",
    impact: "≥ 15% supply-positioning lift across HCMC inner ring",
    color: "from-amber-500/20",
  },
  {
    vertical: "Insurance",
    name: "Bao Viet",
    use: "Road-segment UBI risk pricing — no individual vehicle tracking",
    impact: "≥ 12% loss-ratio improvement in segment-risk pricing simulation",
    color: "from-violet-500/20",
  },
];

export default function Pricing() {
  return (
    <div className="max-w-7xl mx-auto px-5 py-12">
      <div className="text-center mb-12">
        <div className="text-xs uppercase tracking-wider text-accent-400 font-semibold">Pricing</div>
        <h1 className="text-4xl font-bold tracking-tight mt-2">Pure B2B SaaS. Pay per call, with volume tiers.</h1>
        <p className="text-ink-400 mt-3 max-w-2xl mx-auto">
          B2C consumer features are a distribution flywheel powered by VETC payment rails — never a revenue line for the API tier.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div key={t.name} className={`card p-6 flex flex-col ${t.accent ? "border-accent-500/40 bg-accent-500/5" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold">{t.name}</div>
              {t.accent && <span className="tag">Most popular</span>}
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold">{t.price}</div>
              <div className="text-sm text-ink-400 mt-1">{t.sub}</div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-ink-200 flex-1">
              {t.items.map((i) => (<li key={i} className="flex gap-2"><span className="text-accent-400">✓</span>{i}</li>))}
            </ul>
            <a className={`btn mt-6 ${t.accent ? "btn-primary" : "btn-ghost"}`} href={t.href}>{t.cta}</a>
          </div>
        ))}
      </div>

      <section className="mt-20">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-wider text-accent-400 font-semibold">Build Week anchor pilots</div>
          <h2 className="text-3xl font-bold tracking-tight mt-2">Three signed letters of intent, three measurable outcomes.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {anchorCustomers.map((c) => (
            <div key={c.name} className={`card p-6 bg-gradient-to-br ${c.color} to-ink-900/0`}>
              <div className="text-xs uppercase tracking-wider text-accent-400 font-semibold">{c.vertical}</div>
              <div className="text-xl font-bold mt-2">{c.name}</div>
              <div className="text-ink-300 text-sm mt-3">{c.use}</div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-[11px] uppercase tracking-wider text-ink-400">Target outcome</div>
                <div className="text-accent-400 font-semibold mt-1">{c.impact}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <div className="card p-8 text-center bg-gradient-to-br from-accent-500/10 to-ink-900/0 border-accent-500/30">
          <div className="text-xs uppercase tracking-wider text-accent-400 font-semibold">FAQ snippet</div>
          <h3 className="text-2xl font-bold mt-2 max-w-2xl mx-auto">
            Why pay per call instead of fixed seats?
          </h3>
          <p className="text-ink-300 mt-3 max-w-2xl mx-auto leading-relaxed">
            Mobility APIs are infrastructure, not productivity tools. Our customers want predictable unit economics per
            shipment, ride, or quote — pay-per-call maps cleanly onto their P&L.
          </p>
        </div>
      </section>
    </div>
  );
}
