import type { Konspekt, QuizQuestion, GameId } from './types';
import { generateMockQuestions } from '../../data/mockQuestions';
import { loadCustomKonspekts } from '../../data/customKonspekts';

// In a real deployment this would call
//   GET /api/konspekts/:id/quiz?game=...&count=N
// For the demo we first look up user-uploaded konspekts in localStorage,
// then fall back to the deterministic mock generator wrapped with realistic
// latency and an opt-in simulated failure rate so the ErrorScreen path is
// exercised.

export interface FetchQuestionsOptions {
  konspekt: Konspekt;
  gameId: GameId;
  count: number;
  difficulty?: 'auto' | 'easy' | 'normal' | 'hard';
  exclude?: string[];
  simulateFailureRate?: number;
}

export async function fetchQuestions(
  opts: FetchQuestionsOptions,
): Promise<QuizQuestion[]> {
  const latency = 200 + Math.random() * 400;
  await new Promise((r) => setTimeout(r, latency));

  const failRate = opts.simulateFailureRate ?? 0;
  if (failRate > 0 && Math.random() < failRate) {
    throw new Error('NETWORK_ERROR');
  }

  const custom = loadCustomKonspekts().find((k) => k.id === opts.konspekt.id);
  const excludeSet = new Set(opts.exclude ?? []);
  let pool: QuizQuestion[];
  if (custom) {
    pool = custom.questions.filter((q) => !excludeSet.has(q.id));
    if (pool.length === 0) {
      // Fall back to repeating the user's bank if it's smaller than count
      pool = custom.questions;
    }
  } else {
    const all = generateMockQuestions(
      opts.konspekt,
      opts.count + excludeSet.size,
    );
    pool = all.filter((q) => !excludeSet.has(q.id));
  }
  if (pool.length === 0) return [];

  // Cycle through the pool if the caller requests more than we have, so the
  // game can still run a meaningful round when the user supplies just a few
  // questions.
  const out: QuizQuestion[] = [];
  for (let i = 0; i < opts.count; i++) {
    out.push(pool[i % pool.length]);
  }
  return out;
}
