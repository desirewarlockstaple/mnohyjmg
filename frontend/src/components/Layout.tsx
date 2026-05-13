import { NavLink, Outlet, Link, useLocation } from "react-router-dom";

const nav = [
  { to: "/", label: "Overview" },
  { to: "/deck", label: "Pitch deck" },
  { to: "/demo", label: "Live demo" },
  { to: "/docs", label: "API docs" },
  { to: "/pricing", label: "Pricing" },
  { to: "/summary", label: "One-pager" },
];

export default function Layout() {
  const loc = useLocation();
  const isDemo = loc.pathname === "/demo";
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-semibold tracking-tight">PulseGrid</span>
            <span className="hidden md:inline tag">Vietnam · v0.9 preview</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md transition-colors ${
                    isActive ? "text-white bg-white/8" : "text-ink-300 hover:text-white hover:bg-white/5"
                  }`
                }
                end={n.to === "/"}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <a className="btn btn-ghost" href="https://github.com/desirewarlockstaple/mnohyjmg" target="_blank" rel="noreferrer">GitHub</a>
            <Link className="btn btn-primary" to="/demo">Open live demo</Link>
          </div>
        </div>
      </header>
      <main className={isDemo ? "flex-1" : "flex-1"}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="max-w-7xl mx-auto px-5 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-2"><Logo /><span className="font-semibold">PulseGrid</span></div>
          <p className="text-ink-400 leading-relaxed">
            The commercial mobility-intelligence layer for Southeast Asia. Built on VETC ground truth, privacy-preserving by design.
          </p>
        </div>
        <FooterCol title="Product" items={[
          { label: "Live demo", to: "/demo" },
          { label: "API docs", to: "/docs" },
          { label: "Pricing", to: "/pricing" },
        ]} />
        <FooterCol title="Company" items={[
          { label: "Pitch deck", to: "/deck" },
          { label: "One-pager", to: "/summary" },
          { label: "Contact: pilots@pulsegrid.vn", to: "mailto:pilots@pulsegrid.vn", external: true },
        ]} />
        <FooterCol title="Compliance" items={[
          { label: "k-anonymity ≥ 50", to: "/summary" },
          { label: "Differential privacy ε ≤ 1.0", to: "/summary" },
          { label: "Vietnam PDPL 13/2023/QH15", to: "/summary" },
        ]} />
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 py-4 text-xs text-ink-500 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} PulseGrid Technologies Pte. Ltd. · Hanoi · Singapore</span>
          <span>Skolkovo × TASCO Smart Mobility Challenge 2026 — Track #4 Digital Twin</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; to: string; external?: boolean }[] }) {
  return (
    <div>
      <div className="text-ink-200 font-semibold mb-2">{title}</div>
      <ul className="space-y-1.5 text-ink-400">
        {items.map((it) => (
          <li key={it.label}>
            {it.external ? (
              <a href={it.to} className="hover:text-white">{it.label}</a>
            ) : (
              <Link to={it.to} className="hover:text-white">{it.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0f141d" />
      <path d="M10 40 L22 40 L26 28 L32 48 L38 18 L42 36 L54 36" fill="none" stroke="url(#lg)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="54" cy="36" r="3.5" fill="#22d3ee" />
    </svg>
  );
}
