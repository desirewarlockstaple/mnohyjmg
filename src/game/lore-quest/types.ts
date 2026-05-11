import type { QuizQuestion } from '../common/types';

export type LoreQuestStatus =
  | 'EXPLORING'
  | 'DIALOG'
  | 'ENCOUNTER'
  | 'LOOT'
  | 'PAUSED'
  | 'RESULTS';

export interface EncounterHud {
  creatureId: string;
  creatureName: string;
  creatureHp: number;
  creatureHpMax: number;
  question: QuizQuestion;
  questionStartedAtMs: number;
  timerSec: number;
  timerMaxSec: number;
  comboCorrect: number;
  lastResult?: 'correct' | 'wrong' | null;
  lastExplanation?: string;
}

export interface LoreQuestHud {
  status: LoreQuestStatus;
  playerHp: number;
  playerHpMax: number;
  zoneName: string;
  realmName: string;
  questionsAsked: number;
  questionsCorrect: number;
  coins: number;
  gems: number;
  xp: number;
  encountersCompleted: number;
  encountersRequired: number;
  bossDefeated: boolean;
  encounter?: EncounterHud;
  hint?: string;
}
