import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AnswerEvent,
  GameLaunchContext,
  GameResult,
} from '../common/types';
import { PauseMenu } from '../common/PauseMenu';
import { ResultsScreen } from '../common/ResultsScreen';
import { LoreQuestEngine } from './engine';
import { DEFAULT_CONFIG } from './config';
import type { LoreQuestHud } from './types';
import { Hud } from './Hud';
import { EncounterOverlay } from './EncounterOverlay';
import './styles.css';

interface LoreQuestProps {
  context: GameLaunchContext;
}

const INITIAL_HUD: LoreQuestHud = {
  status: 'EXPLORING',
  playerHp: 100,
  playerHpMax: 100,
  zoneName: '',
  realmName: '',
  questionsAsked: 0,
  questionsCorrect: 0,
  coins: 0,
  gems: 0,
  xp: 0,
  encountersCompleted: 0,
  encountersRequired: 0,
  bossDefeated: false,
  encounter: undefined,
  hint: undefined,
};

export function LoreQuest({ context }: LoreQuestProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<LoreQuestEngine | null>(null);
  const [hud, setHud] = useState<LoreQuestHud>(INITIAL_HUD);
  const [intro, setIntro] = useState(true);
  const [result, setResult] = useState<GameResult | null>(null);
  const [runToken, setRunToken] = useState(0);
  const answersRef = useRef<AnswerEvent[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    answersRef.current = [];
    const engine = new LoreQuestEngine({
      canvas,
      config: DEFAULT_CONFIG,
      konspekt: context.konspekt,
      questions: context.questions,
      fetchMoreQuestions: context.callbacks.onRequestExtraQuestions,
      reducedMotion: context.settings.reducedMotion,
      handlers: {
        onHudChange: (h) => setHud(h),
        onAnswer: (a) => {
          answersRef.current.push(a);
          context.callbacks.onAnswer?.(a);
        },
        onFinished: (summary) => {
          const r: GameResult = {
            gameId: 'lore-quest',
            konspektId: context.konspekt.id,
            durationMs: summary.durationMs,
            score: summary.score,
            coinsEarned: summary.coins,
            xpEarned: summary.xp,
            questionsAsked: summary.questionsAsked,
            questionsCorrect: summary.questionsCorrect,
            perQuestion: summary.perQuestion,
            highlights: summary.highlights,
          };
          setResult(r);
          context.callbacks.onResult(r);
        },
      },
    });
    engineRef.current = engine;
    if (!intro) engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken]);

  const handleStart = useCallback(() => {
    setIntro(false);
    setTimeout(() => engineRef.current?.start(), 0);
  }, []);
  const handleResume = useCallback(() => engineRef.current?.resume(), []);
  const handlePause = useCallback(() => engineRef.current?.pause(), []);
  const handleExit = useCallback(() => {
    context.callbacks.onExit('user');
  }, [context.callbacks]);
  const handleRestart = useCallback(() => {
    setResult(null);
    setHud({ ...INITIAL_HUD });
    setIntro(false);
    setRunToken((t) => t + 1);
  }, []);
  const handleAnswerChoice = useCallback((optionId: string) => {
    engineRef.current?.answerCurrentQuestion(optionId);
  }, []);
  const handleFinishEarly = useCallback(() => {
    engineRef.current?.endNow('user');
  }, []);

  return (
    <div className="lq-root">
      <canvas ref={canvasRef} className="lq-canvas" />
      {!intro && !result && (
        <Hud
          hud={hud}
          konspektTitle={context.konspekt.title}
          onPause={handlePause}
          onExit={handleExit}
          onFinish={handleFinishEarly}
        />
      )}
      {!intro && !result && hud.encounter && (
        <EncounterOverlay hud={hud} onAnswer={handleAnswerChoice} />
      )}
      {intro && (
        <div className="lq-intro">
          <div className="card">
            <div className="title-1">Lore Quest</div>
            <div className="muted">
              Исследуйте мир «{context.konspekt.title}», сражайтесь с существами-стражами знаний и побеждайте босса зоны.
            </div>
            <div className="lq-controls-hint">
              <span className="kbd">WASD / стрелки</span>
              <span>Перемещение</span>
              <span className="kbd">E / Space</span>
              <span>Взаимодействие, начать встречу</span>
              <span className="kbd">1 / 2 / 3 / 4</span>
              <span>Ответы в бою</span>
              <span className="kbd">Esc</span>
              <span>Пауза / меню</span>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Подойдите к существу и нажмите <span className="kbd">E</span>, чтобы начать встречу. Правильные ответы — удары по противнику, неправильные — урон вам.
            </p>
            <div className="row">
              <button className="btn primary" onClick={handleStart}>
                Войти в мир
              </button>
              <button className="btn ghost" onClick={handleExit}>
                К конспекту
              </button>
            </div>
          </div>
        </div>
      )}
      {hud.status === 'PAUSED' && !result && (
        <PauseMenu
          onResume={handleResume}
          onRestart={handleRestart}
          onExit={handleExit}
        />
      )}
      {result && (
        <ResultsScreen
          result={result}
          onRestart={handleRestart}
          onExit={handleExit}
        />
      )}
    </div>
  );
}
