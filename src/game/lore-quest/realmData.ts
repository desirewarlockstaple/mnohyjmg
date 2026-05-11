import type { Konspekt } from '../common/types';

export interface CreatureDef {
  id: string;
  name: string;
  color: number;
  emissive: number;
  scale: number;
  isBoss?: boolean;
}

export interface RealmDef {
  realmId: string;
  realmName: string;
  zoneName: string;
  ambientColor: number;
  groundColor: number;
  skyColor: number;
  scenery: 'forest' | 'ruins' | 'lab' | 'glacier';
  creatures: CreatureDef[];
  boss: CreatureDef;
}

const REALMS: Record<string, RealmDef> = {
  'Биология': {
    realmId: 'forest-of-biology',
    realmName: 'Лес Биологии',
    zoneName: 'Поляна Клеток',
    ambientColor: 0xb6cf86,
    groundColor: 0x2f5b34,
    skyColor: 0x0c1e1a,
    scenery: 'forest',
    creatures: [
      { id: 'cellbeast', name: 'Клеткозавр', color: 0x4cd964, emissive: 0x0a2f15, scale: 1.0 },
      { id: 'organellum', name: 'Органеллум', color: 0xfff97f, emissive: 0x3d3700, scale: 0.9 },
      { id: 'mitochondrix', name: 'Митоходрикс', color: 0xff8c69, emissive: 0x4d1c10, scale: 1.05 },
    ],
    boss: { id: 'great-mitochondrion', name: 'Великая Митохондрия', color: 0xff5470, emissive: 0x550a1f, scale: 1.7, isBoss: true },
  },
  'История': {
    realmId: 'ruins-of-history',
    realmName: 'Руины Истории',
    zoneName: 'Древние Стены',
    ambientColor: 0xa7a09c,
    groundColor: 0x5d4b3a,
    skyColor: 0x171110,
    scenery: 'ruins',
    creatures: [
      { id: 'scribe', name: 'Призрак Летописца', color: 0xc9b78a, emissive: 0x3a2c10, scale: 1.0 },
      { id: 'tribute-spirit', name: 'Дух Дани', color: 0x9d70ff, emissive: 0x2e1c5a, scale: 0.95 },
      { id: 'crow-of-doubt', name: 'Ворон Сомнения', color: 0x3a3a3a, emissive: 0x111111, scale: 0.85 },
    ],
    boss: { id: 'old-prince', name: 'Тень Великого Князя', color: 0xffd34a, emissive: 0x553800, scale: 1.7, isBoss: true },
  },
  'Физика': {
    realmId: 'lab-of-mechanics',
    realmName: 'Лаборатория Механики',
    zoneName: 'Зал Векторов',
    ambientColor: 0xa6b7d8,
    groundColor: 0x2a3148,
    skyColor: 0x0a0d18,
    scenery: 'lab',
    creatures: [
      { id: 'inertia', name: 'Сгусток Инерции', color: 0x67c5ff, emissive: 0x0d2945, scale: 1.0 },
      { id: 'impulsoid', name: 'Импульсоид', color: 0xff79c6, emissive: 0x4b1a3a, scale: 0.95 },
      { id: 'frictor', name: 'Тёрка-Фриктор', color: 0xffa500, emissive: 0x4a2d00, scale: 1.0 },
    ],
    boss: { id: 'newton-titan', name: 'Титан Ньютона', color: 0xeeeeee, emissive: 0x222222, scale: 1.8, isBoss: true },
  },
  'География': {
    realmId: 'atlas-of-europe',
    realmName: 'Атлас Европы',
    zoneName: 'Долина Столиц',
    ambientColor: 0xa6d9c5,
    groundColor: 0x3a6b5e,
    skyColor: 0x0a181e,
    scenery: 'glacier',
    creatures: [
      { id: 'cartograph', name: 'Картограф', color: 0x6c5ce7, emissive: 0x1f1748, scale: 1.0 },
      { id: 'river-spirit', name: 'Дух Реки', color: 0x4cd964, emissive: 0x143b1f, scale: 0.95 },
      { id: 'mountain-troll', name: 'Тролль Гор', color: 0x8a8a8a, emissive: 0x1e1e1e, scale: 1.1 },
    ],
    boss: { id: 'monarch-europa', name: 'Монарх Европы', color: 0xffd34a, emissive: 0x4d3700, scale: 1.8, isBoss: true },
  },
};

const DEFAULT_REALM: RealmDef = {
  realmId: 'realm-default',
  realmName: 'Мир Знаний',
  zoneName: 'Первая Поляна',
  ambientColor: 0xb6cf86,
  groundColor: 0x244a35,
  skyColor: 0x0b0f1a,
  scenery: 'forest',
  creatures: [
    { id: 'unknown-1', name: 'Знаниежор', color: 0x6c5ce7, emissive: 0x1f1748, scale: 1.0 },
    { id: 'unknown-2', name: 'Лор-голем', color: 0x00b894, emissive: 0x0d3b34, scale: 1.0 },
    { id: 'unknown-3', name: 'Эхо Сомнения', color: 0xffb547, emissive: 0x4a3300, scale: 1.0 },
  ],
  boss: { id: 'boss-default', name: 'Босс Знаний', color: 0xff5470, emissive: 0x4a112a, scale: 1.8, isBoss: true },
};

export function realmForKonspekt(konspekt: Konspekt): RealmDef {
  if (konspekt.subject && REALMS[konspekt.subject]) {
    return REALMS[konspekt.subject];
  }
  return DEFAULT_REALM;
}
