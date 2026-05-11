import type { Konspekt, QuizQuestion, GameId } from './types';
import { generateMockQuestions } from '../../data/mockQuestions';

// In a real deployment this would call
//   GET /api/konspekts/:id/quiz?game=...&count=N
// For the demo we wrap the deterministic mock generator with realistic
// latency and a 10% simulated failure rate so the ErrorScreen path is
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
  const latency = 350 + Math.random() * 600;
  await new Promise((r) => setTimeout(r, latency));

  const failRate = opts.simulateFailureRate ?? 0;
  if (failRate > 0 && Math.random() < failRate) {
    throw new Error('NETWORK_ERROR');
  }

  const all = generateMockQuestions(opts.konspekt, opts.count + (opts.exclude?.length ?? 0));
  const excludeSet = new Set(opts.exclude ?? []);
  const filtered = all.filter((q) => !excludeSet.has(q.id));
  return filtered.slice(0, opts.count);
}
