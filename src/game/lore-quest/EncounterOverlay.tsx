import type { LoreQuestHud } from './types';
import './styles.css';

interface EncounterOverlayProps {
  hud: LoreQuestHud;
  onAnswer: (optionId: string) => void;
}

export function EncounterOverlay({ hud, onAnswer }: EncounterOverlayProps) {
  if (!hud.encounter) return null;
  const enc = hud.encounter;
  const hpPct = Math.round((enc.creatureHp / enc.creatureHpMax) * 100);
  const timerPct = Math.round((enc.timerSec / enc.timerMaxSec) * 100);
  return (
    <div className="lq-encounter">
      <div className="lq-encounter-top">
        <div className="lq-creature-portrait" aria-hidden>
          <div className="lq-creature-eye" />
          <div className="lq-creature-eye" />
        </div>
        <div className="lq-creature-info">
          <div className="lq-creature-name">{enc.creatureName}</div>
          <div className="lq-bar lq-bar-creature">
            <div
              className="lq-bar-fill lq-bar-creature-fill"
              style={{ width: `${hpPct}%` }}
            />
            <div className="lq-bar-text">
              {enc.creatureHp}/{enc.creatureHpMax} HP
            </div>
          </div>
          <div className="lq-bar lq-bar-timer">
            <div
              className="lq-bar-fill lq-bar-timer-fill"
              style={{ width: `${timerPct}%` }}
            />
            <div className="lq-bar-text">
              {enc.timerSec.toFixed(1)} с
            </div>
          </div>
          {enc.comboCorrect > 1 && (
            <div className="lq-combo">Серия: ×{enc.comboCorrect}</div>
          )}
        </div>
      </div>

      <div className="lq-question">{enc.question.text}</div>
      <div className="lq-options">
        {enc.question.options.map((opt, i) => (
          <button
            key={opt.id}
            className="lq-option"
            onClick={() => onAnswer(opt.id)}
          >
            <span className="lq-option-key">{i + 1}</span>
            <span className="lq-option-text">{opt.text}</span>
          </button>
        ))}
      </div>
      {enc.lastResult && (
        <div className={`lq-result lq-result-${enc.lastResult}`}>
          {enc.lastResult === 'correct'
            ? 'Удар попал в цель!'
            : 'Промах — существо контратакует!'}
          {enc.lastExplanation && (
            <div className="lq-explanation">{enc.lastExplanation}</div>
          )}
        </div>
      )}
    </div>
  );
}
