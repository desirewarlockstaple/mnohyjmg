import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Lesson = { id: string; slug: string; title: string; xp_reward: number; order: number };

async function fetchLessons(): Promise<Lesson[]> {
  try {
    const res = await fetch(`${API}/education/lessons`, { next: { revalidate: 60 } });
    if (!res.ok) return FALLBACK_LESSONS;
    return await res.json();
  } catch {
    return FALLBACK_LESSONS;
  }
}

const FALLBACK_LESSONS: Lesson[] = [
  { id: "1", slug: "marine-plastic", title: "What is marine plastic and why it matters", xp_reward: 50, order: 1 },
  { id: "2", slug: "lifecycle", title: "The lifecycle of plastic in the ocean", xp_reward: 50, order: 2 },
  { id: "3", slug: "microplastic-food", title: "Microplastic and the food chain", xp_reward: 50, order: 3 },
  { id: "4", slug: "read-the-map", title: "How to read the TideGuard map", xp_reward: 50, order: 4 },
  { id: "5", slug: "good-report", title: "How to make a quality citizen report", xp_reward: 50, order: 5 },
  { id: "6", slug: "safety", title: "Safety during a cleanup", xp_reward: 50, order: 6 },
  { id: "7", slug: "organize-cleanup", title: "Organizing a local cleanup event", xp_reward: 50, order: 7 },
  { id: "8", slug: "sort-waste", title: "Sorting collected waste", xp_reward: 50, order: 8 },
  { id: "9", slug: "reduce-reuse", title: "Reduce / Reuse / Recycle for teens", xp_reward: 50, order: 9 },
  { id: "10", slug: "lead-school", title: "Becoming a leader in your school", xp_reward: 50, order: 10 },
];

export default async function LearnPage() {
  const lessons = await fetchLessons();
  return (
    <main className="min-h-screen max-w-4xl mx-auto px-6 py-12">
      <Link href="/" className="text-teal-700 text-sm">← Back home</Link>
      <h1 className="text-4xl font-bold mt-2 mb-3">Environmental Education</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl">
        10 lessons (~5 minutes each). Each ends with a 5-question quiz and a practical task.
        Complete 5 lessons to unlock your TideGuard certificate.
      </p>

      <ol className="space-y-3">
        {lessons.map((l) => (
          <li
            key={l.slug}
            className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex justify-between items-center bg-white dark:bg-zinc-900"
          >
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500">Lesson {l.order}</div>
              <Link href={`/learn/${l.slug}`} className="text-lg font-semibold hover:text-teal-700">
                {l.title}
              </Link>
            </div>
            <div className="text-sm text-teal-700 font-medium">+{l.xp_reward} XP</div>
          </li>
        ))}
      </ol>
    </main>
  );
}
