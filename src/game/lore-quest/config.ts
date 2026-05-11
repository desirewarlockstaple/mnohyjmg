export interface LoreQuestConfig {
  playerHpBase: number;
  creatureHpBase: number;
  bossHpBase: number;
  damagePerCorrectBase: number;
  damagePerWrongBase: number;
  encounterTimerSec: number;
  encountersBeforeBoss: number;
  xpPerCorrect: number;
  coinsPerCorrect: number;
  movementSpeed: number;
  worldRadius: number;
  interactDistance: number;
}

export const DEFAULT_CONFIG: LoreQuestConfig = {
  playerHpBase: 100,
  creatureHpBase: 60,
  bossHpBase: 140,
  damagePerCorrectBase: 25,
  damagePerWrongBase: 18,
  encounterTimerSec: 12,
  encountersBeforeBoss: 3,
  xpPerCorrect: 12,
  coinsPerCorrect: 6,
  movementSpeed: 5.5,
  worldRadius: 38,
  interactDistance: 2.8,
};
