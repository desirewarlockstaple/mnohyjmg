import { useCallback, useMemo, useState } from 'react';
import { HomeScreen } from './app/HomeScreen';
import { GameHost } from './game/GameHost';
import { MOCK_KONSPEKTS } from './data/mockKonspekts';
import type { GameId, GameResult, Konspekt, User } from './game/common/types';

interface LaunchState {
  konspekt: Konspekt;
  gameId: GameId;
  runToken: number;
}

const DEFAULT_USER: User = {
  id: 'demo-user',
  displayName: 'Игрок',
  level: 4,
  xp: 320,
  coins: 145,
};

export default function App() {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [launch, setLaunch] = useState<LaunchState | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  const handleLaunch = useCallback(
    (konspekt: Konspekt, gameId: GameId) => {
      setLaunch({ konspekt, gameId, runToken: Date.now() });
    },
    [],
  );

  const handleExit = useCallback(() => {
    setLaunch(null);
  }, []);

  const handlePersisted = useCallback((r: GameResult) => {
    setLastResult(r);
    setUser((prev) => ({
      ...prev,
      xp: prev.xp + r.xpEarned,
      coins: prev.coins + r.coinsEarned,
      level: prev.level + (prev.xp + r.xpEarned >= prev.level * 100 ? 1 : 0),
    }));
  }, []);

  const konspekts = useMemo(() => MOCK_KONSPEKTS, []);

  return (
    <div className="app-shell">
      {!launch && (
        <HomeScreen user={user} builtInKonspekts={konspekts} onLaunch={handleLaunch} />
      )}
      {launch && (
        <GameHost
          key={`${launch.gameId}-${launch.runToken}`}
          gameId={launch.gameId}
          konspekt={launch.konspekt}
          user={user}
          onExitToKonspekt={handleExit}
          onResultsPersisted={handlePersisted}
        />
      )}
      {!launch && lastResult && (
        <div className="last-result-tag" role="status">
          Прошлый раунд: {lastResult.gameId === 'brain-dash' ? 'Brain Dash' : 'Lore Quest'}
          {' '}— {lastResult.score} очков, {lastResult.questionsCorrect}/{lastResult.questionsAsked}.
        </div>
      )}
    </div>
  );
}
