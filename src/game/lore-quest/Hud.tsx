import type { LoreQuestHud } from './types';
import './styles.css';

interface HudProps {
  hud: LoreQuestHud;
  konspektTitle: string;
  onPause: () => void;
  onExit: () => void;
  onFinish: () => void;
}

export function Hud({ hud, konspektTitle, onPause, onExit, onFinish }: HudProps) {
  const hpPct = Math.round((hud.playerHp / hud.playerHpMax) * 100);
  const progressPct =
    hud.encountersRequired > 0
      ? Math.round((hud.encountersCompleted / hud.encountersRequired) * 100)
      : 0;
  return (
    <>
      <div className="lq-hud-top">
        <div className="lq-hud-block">
          <div className="lq-hud-label">Здоровье</div>
          <div className="lq-bar">
            <div className="lq-bar-fill" style={{ width: `${hpPct}%` }} />
            <div className="lq-bar-text">
              {hud.playerHp}/{hud.playerHpMax}
            </div>
          </div>
        </div>
        <div className="lq-hud-block">
          <div className="lq-hud-label">Прогресс зоны</div>
          <div className="lq-bar">
            <div
              className="lq-bar-fill lq-bar-progress"
              style={{ width: `${progressPct}%` }}
            />
            <div className="lq-bar-text">
              {hud.encountersCompleted}/{hud.encountersRequired}
              {hud.bossDefeated ? ' · Босс' : ''}
            </div>
          </div>
        </div>
        <div className="lq-hud-block">
          <div className="lq-hud-label">Монеты</div>
          <div className="lq-hud-value">⦿ {hud.coins}</div>
        </div>
        <div className="lq-hud-block">
          <div className="lq-hud-label">Самоцветы</div>
          <div className="lq-hud-value">◇ {hud.gems}</div>
        </div>
        <div className="lq-hud-block">
          <div className="lq-hud-label">Опыт</div>
          <div className="lq-hud-value">+{hud.xp}</div>
        </div>
        <div className="lq-hud-spacer" />
        <button className="btn ghost" onClick={onPause}>
          Меню
        </button>
        <button className="btn ghost" onClick={onFinish}>
          Завершить
        </button>
        <button className="btn ghost" onClick={onExit}>
          К конспекту
        </button>
      </div>

      <div className="lq-realm-tag">
        <span>{hud.realmName}</span>
        <span className="lq-zone">{hud.zoneName}</span>
        <span className="lq-konspekt">· {konspektTitle}</span>
      </div>

      {hud.hint && <div className="lq-hint">{hud.hint}</div>}
    </>
  );
}
