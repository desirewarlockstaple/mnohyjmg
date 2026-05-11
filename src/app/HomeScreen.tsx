import { useEffect, useMemo, useState } from 'react';
import type { GameId, Konspekt, User } from '../game/common/types';
import {
  loadCustomKonspekts,
  removeCustomKonspekt,
  type CustomKonspekt,
} from '../data/customKonspekts';
import { AddKonspektModal, DeleteKonspektDialog } from './AddKonspektModal';
import './home.css';

interface HomeScreenProps {
  user: User;
  builtInKonspekts: Konspekt[];
  onLaunch: (konspekt: Konspekt, gameId: GameId) => void;
}

const GAME_META: Record<GameId, { title: string; tag: string; desc: string; tone: string }> = {
  'brain-dash': {
    title: 'Brain Dash',
    tag: 'Раннер',
    desc:
      'Бесконечный 3D-забег. Каждые ~110 м встречай ворота с 3 вариантами ответа — вбегай в правильный, +10 очков. Раунд из 3 вопросов.',
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

export function HomeScreen({ user, builtInKonspekts, onLaunch }: HomeScreenProps) {
  const [customs, setCustoms] = useState<CustomKonspekt[]>(() => loadCustomKonspekts());
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<CustomKonspekt | null>(null);

  const allKonspekts = useMemo<Konspekt[]>(
    () => [...customs, ...builtInKonspekts],
    [customs, builtInKonspekts],
  );
  const [selectedId, setSelectedId] = useState<string>(
    () => allKonspekts[0]?.id ?? '',
  );
  const selected = allKonspekts.find((k) => k.id === selectedId) ?? allKonspekts[0];

  useEffect(() => {
    if (!allKonspekts.find((k) => k.id === selectedId)) {
      setSelectedId(allKonspekts[0]?.id ?? '');
    }
  }, [allKonspekts, selectedId]);

  const handleSaved = (k: CustomKonspekt) => {
    setCustoms((prev) => [k, ...prev.filter((x) => x.id !== k.id)]);
    setSelectedId(k.id);
    setShowAdd(false);
  };
  const handleDeleteConfirm = () => {
    if (!deleting) return;
    const list = removeCustomKonspekt(deleting.id);
    setCustoms(list);
    setDeleting(null);
  };

  return (
    <div className="home-root">
      <header className="home-header">
        <div>
          <div className="home-eyebrow">учебное приложение · игры по конспектам</div>
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
          Выбери конспект и игру. Можно использовать готовые примеры или загрузить
          свой — например, по филологии: впиши «Что такое филология?» и три варианта
          ответа, отметив правильный звёздочкой <span className="kbd">*</span>.
        </div>
      </header>

      <section className="home-section">
        <div className="home-section-row">
          <h2 className="home-section-title">Мои конспекты</h2>
          <button className="btn primary home-add-btn" onClick={() => setShowAdd(true)}>
            + Загрузить конспект
          </button>
        </div>
        {customs.length === 0 ? (
          <div className="empty-custom">
            Ещё нет своих конспектов. Нажмите «Загрузить конспект» и впишите
            вопросы — например, по филологии или любой своей теме.
          </div>
        ) : (
          <div className="konspekt-grid">
            {customs.map((k) => (
              <div
                key={k.id}
                className={`konspekt-card konspekt-card-custom${selected?.id === k.id ? ' selected' : ''}`}
              >
                <button
                  className="konspekt-card-body"
                  type="button"
                  onClick={() => setSelectedId(k.id)}
                >
                  <div className="konspekt-subject">
                    {k.subject ?? 'Свой конспект'} · {k.questions.length} вопр.
                  </div>
                  <div className="konspekt-title">{k.title}</div>
                </button>
                <button
                  className="konspekt-delete"
                  title="Удалить"
                  type="button"
                  onClick={() => setDeleting(k)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <h2 className="home-section-title">Готовые конспекты</h2>
        <div className="konspekt-grid">
          {builtInKonspekts.map((k) => (
            <button
              key={k.id}
              className={`konspekt-card${selected?.id === k.id ? ' selected' : ''}`}
              onClick={() => setSelectedId(k.id)}
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

      {selected && (
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
      )}

      <footer className="home-footer muted">
        Демо по техническому заданию <code>games_spec.md</code>. Свои конспекты
        сохраняются в браузере (localStorage) и доступны на этом устройстве.
      </footer>

      {showAdd && (
        <AddKonspektModal
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <DeleteKonspektDialog
          konspekt={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
