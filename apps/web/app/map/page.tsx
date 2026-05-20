"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

const ForecastMap = dynamic(() => import("@/components/Map/ForecastMap"), { ssr: false });

export default function MapPage() {
  const [day, setDay] = useState(0);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-teal-700 text-white px-6 py-4 flex justify-between items-center">
        <Link href="/" className="font-bold text-lg">TideGuard AI</Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/map" className="opacity-90 hover:opacity-100">Map</Link>
          <Link href="/learn" className="opacity-90 hover:opacity-100">Learn</Link>
          <Link href="/leaderboard" className="opacity-90 hover:opacity-100">Leaderboard</Link>
        </nav>
      </header>

      <section className="flex-1 relative">
        <ForecastMap day={day} />

        <aside className="absolute top-4 right-4 bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-4 w-72 z-10">
          <h2 className="font-semibold mb-2">Forecast horizon</h2>
          <input
            type="range"
            min={0}
            max={13}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="w-full accent-teal-600"
          />
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">D + {day}</div>
          <hr className="my-3 border-zinc-200 dark:border-zinc-800" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Concentration
          </h3>
          <div className="h-3 rounded-full bg-gradient-to-r from-ocean-500 via-yellow-400 to-red-500" />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>low</span>
            <span>high</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
