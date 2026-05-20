import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const GITHUB = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/desirewarlockstaple/mnohyjmg";

type CleanupStats = {
  cleanups: number;
  kg_collected: number;
  participants: number;
};

type PublicKPI = {
  users: number;
  reports_total: number;
  reports_approved: number;
  cleanups: number;
  kg_collected: number;
  schools: number;
  lessons_completed: number;
};

async function fetchCleanupStats(): Promise<CleanupStats | null> {
  try {
    const res = await fetch(`${API}/cleanups/stats`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchPublicKPI(): Promise<PublicKPI | null> {
  try {
    const res = await fetch(`${API}/admin/kpi_public`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatInt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  if (n === 0) return "0";
  return n.toLocaleString("en-US");
}

export default async function HomePage() {
  const [cleanupStats, kpi] = await Promise.all([fetchCleanupStats(), fetchPublicKPI()]);
  const isLive =
    !!cleanupStats && cleanupStats.cleanups > 0 && kpi && kpi.users > 0;

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-700 via-teal-600 to-ocean-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <p className="uppercase tracking-widest text-sand-100 text-sm mb-4">
              Physics-Informed AI for our oceans
            </p>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              AI that predicts plastic before it pollutes.
            </h1>
            <p className="text-lg md:text-xl text-sand-50 max-w-2xl mb-10">
              TideGuard AI combines Sentinel imagery, ocean currents and citizen reports
              with a Physics-Informed Neural Network to forecast marine debris hotspots
              up to 14 days in advance — and turns predictions into community action.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/map"
                aria-label="Open the live forecast map"
                className="px-6 py-3 bg-white text-teal-700 font-semibold rounded-lg hover:bg-sand-50 transition"
              >
                Try the map
              </Link>
              <Link
                href="/learn"
                aria-label="Open the environmental education lessons"
                className="px-6 py-3 border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                Explore EE lessons
              </Link>
              <Link
                href="/method"
                aria-label="See how the physics-informed model works"
                className="px-6 py-3 border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                How the model works
              </Link>
              <a
                href={GITHUB}
                aria-label="Open the open-source GitHub repository"
                className="px-6 py-3 border border-white/30 rounded-lg hover:bg-white/10 transition"
              >
                Open-source repo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Impact counters — live from /cleanups/stats + /admin/kpi_public */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold">Live community impact</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {isLive
              ? "Numbers below are the actual counts in the production database. They update every minute."
              : "Pilot launching. The counters below reflect the real state of the platform — we report zero until our first cleanup."}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <ImpactCard label="cleanups logged" value={formatInt(cleanupStats?.cleanups ?? 0)} />
          <ImpactCard label="kg collected" value={formatInt(Math.round(cleanupStats?.kg_collected ?? 0))} />
          <ImpactCard label="cleanup volunteers" value={formatInt(cleanupStats?.participants ?? 0)} />
          <ImpactCard label="lessons completed" value={formatInt(kpi?.lessons_completed ?? 0)} />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-sand-50/50 dark:bg-zinc-900/40 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">How TideGuard works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Step
              n={1}
              title="Fuse data"
              body="Sentinel-2/3, CMEMS currents, ERA5 wind, citizen reports — all flow into one feature store."
            />
            <Step
              n={2}
              title="Predict with physics"
              body="A PINN solves the 2D advection-diffusion equation while learning windage (α), diffusion (K) and beaching (λ)."
            />
            <Step
              n={3}
              title="Mobilize community"
              body="Schools and NGOs see hotspots on the map, get cleanup missions, learn through 10 EE lessons, earn badges."
            />
          </div>
          <div className="text-center mt-10">
            <Link href="/method" className="text-teal-700 font-medium underline">
              Read the full method →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-teal-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2">Founded by youth, for the planet.</h3>
            <p className="text-sand-100">
              Submitted to: MIT Solve · GEEP YIC · Young Climate Prize · RELX · Zayed Sustainability · Stockholm Junior Water.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/leaderboard" className="px-5 py-3 bg-white text-teal-700 font-semibold rounded-lg">
              Community leaderboard
            </Link>
            <Link href="/admin" className="px-5 py-3 border border-white/30 rounded-lg hover:bg-white/10">
              Impact KPI
            </Link>
          </div>
        </div>
      </section>

      <footer className="text-center text-sm text-zinc-500 py-8">
        © 2026 TideGuard AI · MIT-licensed code · CC-BY-4.0 content · contact@tideguard.app
      </footer>
    </main>
  );
}

function ImpactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="text-3xl md:text-4xl font-bold text-teal-600">{value}</div>
      <div className="text-sm text-zinc-500 mt-2 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="text-teal-600 text-xl font-bold mb-2 inline-flex items-center gap-2">
        <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-teal-100 text-teal-700">
          {n}
        </span>
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}
