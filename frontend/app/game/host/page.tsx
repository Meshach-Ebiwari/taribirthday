'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getSocket } from '@/lib/socket';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PublicPlayer {
  socketId: string;
  firstName: string;
  lastName: string;
  score: number;
}

type HostView = 'pin' | 'lobby' | 'ingame' | 'ended';
type GamePhase = 'idle' | 'lobby' | 'playing' | 'reveal' | 'ended';

export default function HostPage() {
  const [view, setView] = useState<HostView>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [answerCount, setAnswerCount] = useState({ answered: 0, total: 0 });
  const [finalScores, setFinalScores] = useState<PublicPlayer[]>([]);
  const [poolStatus, setPoolStatus] = useState<{ remaining: number; total: number }>({ remaining: 50, total: 50 });
  const [roundNumber, setRoundNumber] = useState(0);
  const [origin, setOrigin] = useState('');
  const socketConnected = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      socketConnected.current = true;
    };

    socket.on('connect', onConnect);
    if (socket.connected) socketConnected.current = true;

    socket.on('game:auth_result', ({ success }: { success: boolean }) => {
      if (success) {
        setAuthenticated(true);
        setPinError('');
        setView('lobby');
      } else {
        setPinError('Wrong PIN. Try again.');
      }
    });

    socket.on('game:players', (list: PublicPlayer[]) => {
      setPlayers(list);
    });

    socket.on('game:phase', ({ phase }: { phase: GamePhase }) => {
      setGamePhase(phase);
      if (phase === 'idle' && authenticated) setView('lobby');
      if (phase === 'ended') setView('ended');
    });

    socket.on('game:question', ({
      index,
      total,
    }: {
      question: unknown;
      index: number;
      total: number;
      timeLeft: number;
    }) => {
      setQuestionIndex(index);
      setQuestionTotal(total);
      setAnswerCount({ answered: 0, total: players.length });
      if (view !== 'ingame') setView('ingame');
    });

    socket.on('game:answer_count', ({ answered, total }: { answered: number; total: number }) => {
      setAnswerCount({ answered, total });
    });

    socket.on('game:end', ({ scores }: { scores: PublicPlayer[] }) => {
      setFinalScores(scores);
      setView('ended');
    });

    socket.on('game:pool_status', ({ remaining, total }: { remaining: number; total: number }) => {
      setPoolStatus({ remaining, total });
    });

    socket.on('game:round', ({ round }: { round: number }) => {
      setRoundNumber(round);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('game:auth_result');
      socket.off('game:players');
      socket.off('game:phase');
      socket.off('game:question');
      socket.off('game:answer_count');
      socket.off('game:end');
      socket.off('game:pool_status');
      socket.off('game:round');
    };
  }, [authenticated, view, players.length]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    const socket = getSocket();
    socket.emit('game:auth', { pin: pin.trim() });
  };

  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit('game:start', { questionCount });
    setView('ingame');
  };

  const handleReset = () => {
    const socket = getSocket();
    socket.emit('game:reset');
    setView('lobby');
  };

  const handleResetPool = () => {
    const socket = getSocket();
    socket.emit('game:reset_pool');
  };

  const medals = ['🥇', '🥈', '🥉'];

  // ── PIN ──
  if (view === 'pin') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-4xl font-extrabold text-white">Host Login</h1>
            <p className="text-white/50 mt-2">Enter your host PIN to control the game</p>
          </div>

          <div className="card">
            <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-1.5 font-medium">
                  Host PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN..."
                  className="input-field text-xl tracking-widest text-center"
                  autoFocus
                />
              </div>

              {pinError && (
                <p className="text-pink-400 text-sm text-center bg-pink-500/10 rounded-lg py-2 px-3">
                  {pinError}
                </p>
              )}

              <button type="submit" className="btn-primary w-full text-lg">
                Login →
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Lobby ──
  if (view === 'lobby') {
    return (
      <div className="min-h-screen px-4 py-12 max-w-2xl mx-auto flex flex-col gap-8">
        <div className="text-center">
          <div className="text-4xl mb-3">🎮</div>
          <h1 className="text-4xl font-extrabold text-white mb-2">Game Lobby</h1>
          <p className="text-white/50">
            {players.length} player{players.length !== 1 ? 's' : ''} joined
          </p>
        </div>

        {/* Big screen link */}
        <div className="card bg-purple-500/10 border-purple-400/30">
          <p className="text-white/70 text-sm mb-1 font-semibold">Big Screen URL:</p>
          <p className="text-purple-300 font-mono text-sm break-all">
            {origin}/game/screen
          </p>
          <p className="text-white/40 text-xs mt-1">Open this on your TV or projector</p>
        </div>

        {/* Player list */}
        <div className="card">
          <h2 className="text-white font-bold text-lg mb-4">
            Players ({players.length})
          </h2>
          {players.length === 0 ? (
            <p className="text-white/40 text-center py-4">Waiting for players to join...</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {players.map((p, i) => (
                <li key={p.socketId} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                  <span className="text-white/40 font-bold w-6">{i + 1}.</span>
                  <div className="w-8 h-8 rounded-full bg-purple-500/40 flex items-center justify-center text-sm font-bold text-white">
                    {p.firstName[0]}
                  </div>
                  <span className="text-white font-medium">{p.firstName} {p.lastName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pool status */}
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-semibold text-sm mb-0.5">Question Pool</p>
            <p className="text-white/50 text-xs">
              {poolStatus.remaining === 0
                ? 'Pool exhausted — will auto-reset on next start'
                : `${poolStatus.remaining} / ${poolStatus.total} questions remaining`}
            </p>
            {roundNumber > 0 && (
              <p className="text-purple-300 text-xs mt-0.5">Round {roundNumber} completed</p>
            )}
          </div>
          <button
            onClick={handleResetPool}
            className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white px-3 py-2 rounded-lg transition-all flex-shrink-0"
          >
            Reset Pool 🔄
          </button>
        </div>

        {/* Question count */}
        <div className="card">
          <h2 className="text-white font-bold text-lg mb-4">Number of Questions</h2>
          <div className="flex gap-3 flex-wrap">
            {[5, 10, 15, 20].map((n) => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                  questionCount === n
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStartGame}
          disabled={players.length === 0}
          className="btn-primary w-full text-2xl py-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Game 🚀
        </button>

        <p className="text-white/30 text-xs text-center">
          Make sure all players have joined before starting
        </p>
      </div>
    );
  }

  // ── In-game ──
  if (view === 'ingame') {
    return (
      <div className="min-h-screen px-4 py-12 max-w-2xl mx-auto flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white mb-2">Game In Progress</h1>
          <p className="text-white/50">
            Question {questionIndex + 1} / {questionTotal}
          </p>
        </div>

        {/* Phase badge */}
        <div className="card text-center">
          <p className="text-white/50 text-sm mb-1">Current Phase</p>
          <p className={`text-2xl font-bold capitalize ${
            gamePhase === 'playing' ? 'text-green-400' :
            gamePhase === 'reveal' ? 'text-yellow-400' : 'text-white'
          }`}>
            {gamePhase}
          </p>
        </div>

        {/* Answer count */}
        <div className="card text-center">
          <p className="text-white/50 text-sm mb-1">Answers Submitted</p>
          <p className="text-3xl font-extrabold text-white">
            <span className="gradient-text">{answerCount.answered}</span>
            <span className="text-white/40"> / {answerCount.total}</span>
          </p>
        </div>

        {/* Top 5 */}
        <div className="card">
          <h2 className="text-white font-bold text-lg mb-4">Leaderboard</h2>
          <ul className="flex flex-col gap-2">
            {players.slice(0, 5).map((p, i) => (
              <li key={p.socketId} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2">
                <span className="text-xl w-8 text-center">{medals[i] || `${i + 1}.`}</span>
                <span className="flex-1 text-white font-medium">{p.firstName} {p.lastName}</span>
                <span className="text-white font-bold">{p.score} pts</span>
              </li>
            ))}
          </ul>
        </div>

        {/* End game */}
        <button
          onClick={handleReset}
          className="bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 px-6 py-3 rounded-xl font-bold transition-all w-full"
        >
          End Game Early
        </button>
      </div>
    );
  }

  // ── Ended ──
  if (view === 'ended') {
    return (
      <div className="min-h-screen px-4 py-12 max-w-2xl mx-auto flex flex-col gap-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-4xl font-extrabold gradient-text mb-2">Game Over!</h1>
          <p className="text-white/40 text-sm">
            {poolStatus.remaining} / {poolStatus.total} questions remaining in pool
          </p>
        </div>

        <div className="card">
          <h2 className="text-white font-bold text-lg mb-4">Final Leaderboard</h2>
          <ul className="flex flex-col gap-2">
            {finalScores.map((p, i) => (
              <li key={p.socketId} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <span className="text-2xl w-8 text-center">{medals[i] || `${i + 1}.`}</span>
                <span className="flex-1 text-white font-semibold">{p.firstName} {p.lastName}</span>
                <span className="text-white font-bold">{p.score} pts</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleReset}
          className="btn-primary w-full text-xl py-4"
        >
          Play Again — Round {roundNumber + 1} 🎮
        </button>
      </div>
    );
  }

  return null;
}
