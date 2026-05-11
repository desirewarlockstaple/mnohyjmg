import type { Konspekt, QuizQuestion } from '../game/common/types';

interface RawQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  explanation?: string;
}

const BANKS: Record<string, RawQuestion[]> = {
  'k-bio-cell': [
    {
      text: 'Какая органелла отвечает за выработку энергии в клетке?',
      options: ['Рибосома', 'Митохондрия', 'Лизосома', 'Ядро'],
      correctIndex: 1,
      difficulty: 1,
      explanation: 'Митохондрия — «энергетическая станция» клетки, синтезирует АТФ.',
    },
    {
      text: 'Что окружает растительную клетку снаружи мембраны?',
      options: ['Цитоплазма', 'Клеточная стенка', 'Ядрышко', 'Хлоропласт'],
      correctIndex: 1,
      difficulty: 1,
      explanation: 'Клеточная стенка из целлюлозы — отличительный признак растительной клетки.',
    },
    {
      text: 'В какой органелле происходит фотосинтез?',
      options: ['Митохондрии', 'Эндоплазматическая сеть', 'Хлоропласт', 'Аппарат Гольджи'],
      correctIndex: 2,
      difficulty: 2,
      explanation: 'Хлоропласты содержат хлорофилл и проводят фотосинтез.',
    },
    {
      text: 'Где синтезируются белки в клетке?',
      options: ['В лизосомах', 'На рибосомах', 'В ядрышке', 'В вакуолях'],
      correctIndex: 1,
      difficulty: 2,
      explanation: 'Рибосомы — место сборки белков из аминокислот.',
    },
    {
      text: 'Какая структура регулирует, что входит и выходит из клетки?',
      options: ['Цитоскелет', 'Плазматическая мембрана', 'Хроматин', 'Центриоль'],
      correctIndex: 1,
      difficulty: 2,
    },
    {
      text: 'Что хранится в ядре клетки?',
      options: ['АТФ', 'ДНК', 'Холестерин', 'Гликоген'],
      correctIndex: 1,
      difficulty: 1,
    },
    {
      text: 'Какой процесс расщепляет глюкозу с выделением энергии?',
      options: ['Транскрипция', 'Митоз', 'Клеточное дыхание', 'Трансляция'],
      correctIndex: 2,
      difficulty: 3,
    },
    {
      text: 'Что такое цитоплазма?',
      options: [
        'Жидкость внутри клетки с органеллами',
        'Жёсткая оболочка',
        'Часть мембраны',
        'Хромосома',
      ],
      correctIndex: 0,
      difficulty: 1,
    },
  ],
  'k-hist-rus': [
    {
      text: 'Какой князь крестил Русь в 988 году?',
      options: ['Олег', 'Игорь', 'Владимир', 'Ярослав Мудрый'],
      correctIndex: 2,
      difficulty: 1,
    },
    {
      text: 'Кто был первым князем варяжского происхождения по летописи?',
      options: ['Рюрик', 'Кий', 'Святослав', 'Игорь'],
      correctIndex: 0,
      difficulty: 1,
    },
    {
      text: 'Какой свод законов связан с именем Ярослава Мудрого?',
      options: ['Соборное уложение', 'Русская правда', 'Судебник', 'Жалованная грамота'],
      correctIndex: 1,
      difficulty: 2,
    },
    {
      text: 'Какой город стал столицей Древнерусского государства?',
      options: ['Новгород', 'Владимир', 'Киев', 'Москва'],
      correctIndex: 2,
      difficulty: 1,
    },
    {
      text: 'Кто разгромил Хазарский каганат в X веке?',
      options: ['Святослав', 'Олег', 'Владимир Мономах', 'Ярослав'],
      correctIndex: 0,
      difficulty: 3,
    },
    {
      text: 'В каком году Олег объединил Новгород и Киев?',
      options: ['862', '882', '907', '988'],
      correctIndex: 1,
      difficulty: 3,
    },
    {
      text: 'Как называлась дань, которую князь собирал с подвластных племён?',
      options: ['Тягло', 'Полюдье', 'Барщина', 'Оброк'],
      correctIndex: 1,
      difficulty: 2,
    },
  ],
  'k-phys-mech': [
    {
      text: 'Сформулируйте первый закон Ньютона',
      options: [
        'F = m·a',
        'Тело сохраняет покой или равномерное движение, если на него не действуют силы',
        'Каждому действию есть равное и противоположное противодействие',
        'Закон всемирного тяготения',
      ],
      correctIndex: 1,
      difficulty: 1,
    },
    {
      text: 'Какова единица силы в СИ?',
      options: ['Джоуль', 'Паскаль', 'Ньютон', 'Ватт'],
      correctIndex: 2,
      difficulty: 1,
    },
    {
      text: 'Импульс тела равен:',
      options: ['m·v', 'm·a', 'F·t', 'm·g·h'],
      correctIndex: 0,
      difficulty: 2,
    },
    {
      text: 'Что описывает второй закон Ньютона?',
      options: [
        'Связь силы, массы и ускорения',
        'Сохранение энергии',
        'Закон Гука',
        'Принцип относительности',
      ],
      correctIndex: 0,
      difficulty: 1,
    },
    {
      text: 'Какая величина измеряется в джоулях?',
      options: ['Сила', 'Работа', 'Импульс', 'Ускорение'],
      correctIndex: 1,
      difficulty: 1,
    },
    {
      text: 'Чему равно ускорение свободного падения у поверхности Земли (приближённо)?',
      options: ['1.6 м/с²', '5 м/с²', '9.8 м/с²', '20 м/с²'],
      correctIndex: 2,
      difficulty: 2,
    },
    {
      text: 'Что такое инерция?',
      options: [
        'Способность тела сохранять состояние движения',
        'Сила тяготения',
        'Свойство жидкости',
        'Электрическое поле',
      ],
      correctIndex: 0,
      difficulty: 1,
    },
  ],
  'k-geo-eu': [
    {
      text: 'Столица Франции?',
      options: ['Лион', 'Марсель', 'Париж', 'Ницца'],
      correctIndex: 2,
      difficulty: 1,
    },
    {
      text: 'Самая длинная река Европы?',
      options: ['Дунай', 'Рейн', 'Волга', 'Эльба'],
      correctIndex: 2,
      difficulty: 2,
    },
    {
      text: 'Какая страна имеет столицу Лиссабон?',
      options: ['Испания', 'Португалия', 'Италия', 'Греция'],
      correctIndex: 1,
      difficulty: 1,
    },
    {
      text: 'Через сколько стран протекает Дунай?',
      options: ['3', '6', '10', '15'],
      correctIndex: 2,
      difficulty: 3,
    },
    {
      text: 'Самая маленькая страна Европы?',
      options: ['Монако', 'Ватикан', 'Лихтенштейн', 'Сан-Марино'],
      correctIndex: 1,
      difficulty: 2,
    },
    {
      text: 'Столица Норвегии?',
      options: ['Стокгольм', 'Осло', 'Копенгаген', 'Хельсинки'],
      correctIndex: 1,
      difficulty: 1,
    },
  ],
};

const GENERIC: RawQuestion[] = [
  {
    text: 'Это вопрос-заполнитель: какой ответ выглядит правильным?',
    options: ['Левый', 'Средний', 'Правый', 'Никакой'],
    correctIndex: 1,
    difficulty: 1,
  },
  {
    text: 'Сколько будет 7 × 8?',
    options: ['54', '56', '58', '64'],
    correctIndex: 1,
    difficulty: 1,
  },
  {
    text: 'Какой газ преобладает в атмосфере Земли?',
    options: ['Кислород', 'Азот', 'Углекислый газ', 'Аргон'],
    correctIndex: 1,
    difficulty: 1,
  },
  {
    text: 'В каком веке писал А. С. Пушкин?',
    options: ['XVIII', 'XIX', 'XX', 'XVII'],
    correctIndex: 1,
    difficulty: 1,
  },
];

export function generateMockQuestions(
  konspekt: Konspekt,
  count: number,
): QuizQuestion[] {
  const base = BANKS[konspekt.id] ?? GENERIC;
  const out: QuizQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const raw = base[i % base.length];
    const qid = `${konspekt.id}-q${i + 1}`;
    const options = raw.options.map((text, idx) => ({
      id: `${qid}-o${idx + 1}`,
      text,
    }));
    out.push({
      id: qid,
      text: raw.text,
      options,
      correctOptionId: options[raw.correctIndex].id,
      explanation: raw.explanation,
      difficulty: raw.difficulty,
    });
  }
  return out;
}
