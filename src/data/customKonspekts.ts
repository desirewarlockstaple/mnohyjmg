import type { Konspekt, QuizQuestion } from '../game/common/types';
import { loadJSON, saveJSON } from '../game/common/storage';

export interface CustomKonspekt extends Konspekt {
  questions: QuizQuestion[];
  source: 'user';
  createdAt: number;
}

const STORAGE_KEY = 'mnoh-custom-konspekts';

export function loadCustomKonspekts(): CustomKonspekt[] {
  return loadJSON<CustomKonspekt[]>(STORAGE_KEY, []);
}

export function saveCustomKonspekts(list: CustomKonspekt[]): void {
  saveJSON(STORAGE_KEY, list);
}

export function addCustomKonspekt(k: CustomKonspekt): CustomKonspekt[] {
  const list = loadCustomKonspekts();
  const filtered = list.filter((x) => x.id !== k.id);
  const next = [k, ...filtered];
  saveCustomKonspekts(next);
  return next;
}

export function removeCustomKonspekt(id: string): CustomKonspekt[] {
  const list = loadCustomKonspekts().filter((x) => x.id !== id);
  saveCustomKonspekts(list);
  return list;
}

export function newCustomKonspektId(): string {
  return `k-user-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}
