import type { Konspekt } from '../game/common/types';

export const MOCK_KONSPEKTS: Konspekt[] = [
  {
    id: 'k-bio-cell',
    title: 'Строение клетки',
    subject: 'Биология',
    topicTags: ['клетка', 'органеллы', 'мембрана'],
  },
  {
    id: 'k-hist-rus',
    title: 'Древняя Русь IX–XII вв.',
    subject: 'История',
    topicTags: ['Рюрик', 'князья', 'Киев', 'крещение'],
  },
  {
    id: 'k-phys-mech',
    title: 'Основы механики',
    subject: 'Физика',
    topicTags: ['Ньютон', 'инерция', 'сила', 'импульс'],
  },
  {
    id: 'k-geo-eu',
    title: 'География Европы',
    subject: 'География',
    topicTags: ['страны', 'столицы', 'реки'],
  },
];
