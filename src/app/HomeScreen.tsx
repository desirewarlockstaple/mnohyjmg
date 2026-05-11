import { useState } from 'react';
import type { GameId, Konspekt, User } from '../game/common/types';
import './home.css';

interface HomeScreenProps {
  user: User;
  konspekts: Konspekt[];
  onLaunch: (konspekt: Konspekt, gameId: GameId) => void;
}

const GAME_META: Record<GameId, { title: string; tag: string; desc: string; tone: string }> = {
  'brain-dash': {
    title: 'Brain Dash',
    tag: 'Раннер',
    desc:
      'Бесконечный 3D-забег. Каждые ~220 метров выбирай полосу с правильным ответом. 2–4 минуты на раунд.',
    tone: 'linear-gradient(135deg, #6c5ce7, #ff5470)',
  },
  'lore-quest': {
    title: 'Lore Quest',
    tag: 'Исследование',
    desc:
      'Лёгкая RPG: исследуй мир конспекта, сражайся с существами знаний и побеждай босса зоны. 10–25 минут на сессию.',
    tone: 'linear-gradient(135deg, #00b894, #6c5ce7)',
  },
};

export function HomeScreen({ user, konspekts, onLaunch }: HomeScreenProps) {
  const [selected, setSelected] = useState<Konspekt>(konspekts[0]);

  return (
    <div className="home-root">
      <header className="home-header">
        <div>
          <div className="home-eyebrow">учебное приложение · демо игр</div>
          <h1 className="home-title">Привет, {user.displayName}!</h1>
          <div className="home-stats">
            <span>Уровень {user.level}</span>
            <span>·</span>
            <span>{user.xp} XP</span>
            <span>·</span>
            <span>⦿ {user.coins}</span>
          </div>
        </div>
        <div className="home-blurb">
          Выбери конспект и игру. Перед запуском подгружаются вопросы — если сеть подведёт,
          увидишь экран «Не удалось загрузить вопросы».
        </div>
      </header>

      <section className="home-section">
        <h2 className="home-section-title">Конспекты</h2>
        <div className="konspekt-grid">
          {konspekts.map((k) => (
            <button
              key={k.id}
              className={`konspekt-card${selected.id === k.id ? ' selected' : ''}`}
              onClick={() => setSelected(k)}
              type="button"
            >
              <div className="konspekt-subject">{k.subject ?? 'Без предмета'}</div>
              <div className="konspekt-title">{k.title}</div>
              <div className="konspekt-tags">
                {k.topicTags?.slice(0, 4).map((t) => (
                  <span key={t} className="konspekt-tag">
                    {t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section-title">Игры по «{selected.title}»</h2>
        <div className="game-grid">
          {(Object.keys(GAME_META) as GameId[]).map((gid) => {
            const meta = GAME_META[gid];
            return (
              <div key={gid} className="game-card" style={{ backgroundImage: meta.tone }}>
                <div className="game-card-tag">{meta.tag}</div>
                <div className="game-card-title">{meta.title}</div>
                <div className="game-card-desc">{meta.desc}</div>
                <div className="game-card-actions">
                  <button
                    className="btn primary"
                    onClick={() => onLaunch(selected, gid)}
                  >
                    Играть
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="home-footer muted">
        Демо реализовано по техническому заданию <code>games_spec.md</code>. Вопросы
        генерируются локально по выбранному конспекту, очки/монеты сохраняются только в
        пределах сессии. Анти-чит и серверные эндпоинты описаны в ТЗ.
      </footer>
    </div>
  );
}
