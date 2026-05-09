'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import RebusCard from '@/components/RebusCard';
import { getSocket } from '@/lib/socket';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RebusElement {
  label: string;
  emoji: string | null;
}

interface PublicQuestion {
  id: number;
  elements: RebusElement[];
}

interface PublicPlayer {
  socketId: string;
  firstName: string;
  lastName: string;
  score: number;
}

type ScreenPhase = 'idle' | 'lobby' | 'countdown' | 'playing' | 'reveal' | 'ended';

// ─── Timer Circle (large) ─────────────────────────────────────────────────────
function BigTimerCircle({ timeLeft, total = 30 }: { timeLeft: number; total?: number }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / total) * circumference;
  const isUrgent = timeLeft <= 10;

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <svg width="160" height="160" className="absolute -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={isUrgent ? '#f87171' : '#a78bfa'}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className={`text-5xl font-extrabold z-10 ${isUrgent ? 'text-red-400' : 'text-white'}`}>
        {timeLeft}
      </span>
    </div>
  );
}

// ─── Big Screen Component ─────────────────────────────────────────────────────
export default function GameScreenPage() {
  const [phase, setPhase] = useState<ScreenPhase>('idle');
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [countdown, setCountdown] = useState(3);
  const [revealAnswer, setRevealAnswer] = useState('');
  const [revealCorrectIds, setRevealCorrectIds] = useState<string[]>([]);
  const [revealScores, setRevealScores] = useState<PublicPlayer[]>([]);
  const [answerCount, setAnswerCount] = useState({ answered: 0, total: 0 });
  const [finalScores, setFinalScores] = useState<PublicPlayer[]>([]);
  const [origin, setOrigin] = useState('');
  const hasJoined = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const joinIfNeeded = () => {
      if (!hasJoined.current) {
        hasJoined.current = true;
        // Big screen does NOT join as a player — just listens passively
      }
    };

    socket.on('connect', joinIfNeeded);
    if (socket.connected) joinIfNeeded();

    socket.on('game:phase', ({ phase: p }: { phase: string }) => {
      if (p === 'idle') setPhase('idle');
      if (p === 'lobby') setPhase('lobby');
      if (p === 'ended') setPhase('ended');
    });

    socket.on('game:players', (list: PublicPlayer[]) => {
      setPlayers(list);
    });

    socket.on('game:countdown', ({ count }: { count: number }) => {
      setCountdown(count);
      setPhase('countdown');
    });

    socket.on('game:question', ({
      question: q,
      index,
      total,
      timeLeft: tl,
    }: {
      question: PublicQuestion;
      index: number;
      total: number;
      timeLeft: number;
    }) => {
      setQuestion(q);
      setQuestionIndex(index);
      setQuestionTotal(total);
      setTimeLeft(tl);
      setAnswerCount({ answered: 0, total: players.length });
      setPhase('playing');
    });

    socket.on('game:tick', ({ timeLeft: tl }: { timeLeft: number }) => {
      setTimeLeft(tl);
    });

    socket.on('game:answer_count', ({ answered, total }: { answered: number; total: number }) => {
      setAnswerCount({ answered, total });
    });

    socket.on('game:reveal', ({
      correctAnswer,
      correctSocketIds,
      scores,
    }: {
      correctAnswer: string;
      correctSocketIds: string[];
      scores: PublicPlayer[];
    }) => {
      setRevealAnswer(correctAnswer);
      setRevealCorrectIds(correctSocketIds);
      setRevealScores(scores);
      setPhase('reveal');
    });

    socket.on('game:end', ({ scores }: { scores: PublicPlayer[] }) => {
      setFinalScores(scores);
      setPhase('ended');
    });

    return () => {
      socket.off('connect');
      socket.off('game:phase');
      socket.off('game:players');
      socket.off('game:countdown');
      socket.off('game:question');
      socket.off('game:tick');
      socket.off('game:answer_count');
      socket.off('game:reveal');
      socket.off('game:end');
    };
  }, [players.length]);

  const medals = ['🥇', '🥈', '🥉'];
  const gameUrl = origin ? `${origin}/game` : '/game';

  // ── Idle / Lobby ──
  if (phase === 'idle' || phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 py-12 gap-10"
        style={{ background: 'linear-gradient(135deg, #0f0620 0%, #1e0a3c 40%, #2d1b69 70%, #1a0630 100%)' }}>

        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-extrabold gradient-text mb-4 leading-tight">
            Tari&apos;s Birthday
          </h1>
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-3">
            Rebus Game 🎮
          </h2>
          {phase === 'lobby' && (
            <p className="text-green-400 text-2xl font-bold animate-pulse">Game Lobby — Get Ready!</p>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-2xl">
              <QRCodeSVG value={gameUrl} size={200} />
            </div>
            <p className="text-white/70 text-xl font-semibold">Scan to join</p>
            <p className="text-white/40 text-sm font-mono">{gameUrl}</p>
          </div>

          {/* Player list */}
          <div className="flex flex-col gap-4 min-w-[280px]">
            <h3 className="text-white font-bold text-2xl">
              Players ({players.length})
            </h3>
            {players.length === 0 ? (
              <p className="text-white/40 text-lg">Waiting for players...</p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {players.map((p, i) => (
                  <li key={p.socketId} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                    <span className="text-xl font-bold text-white/50 w-6">{i + 1}.</span>
                    <div className="w-10 h-10 rounded-full bg-purple-500/50 flex items-center justify-center font-bold text-white text-lg">
                      {p.firstName[0]}
                    </div>
                    <span className="text-white text-xl font-semibold">{p.firstName} {p.lastName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="text-white/30 text-sm mt-4">
          Host: go to {origin}/game/host to start the game
        </p>
      </div>
    );
  }

  // ── Countdown ──
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f0620 0%, #1e0a3c 40%, #2d1b69 70%, #1a0630 100%)' }}>
        <p className="text-white/60 text-4xl font-semibold mb-8">Game starting!</p>
        <div
          key={countdown}
          className="text-[20rem] font-extrabold gradient-text leading-none"
        >
          {countdown}
        </div>
        <p className="text-white/40 text-2xl mt-8">Get ready to answer!</p>
      </div>
    );
  }

  // ── Playing ──
  if (phase === 'playing' && question) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 py-10 gap-10"
        style={{ background: 'linear-gradient(135deg, #0f0620 0%, #1e0a3c 40%, #2d1b69 70%, #1a0630 100%)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between w-full max-w-5xl">
          <div className="bg-white/10 rounded-2xl px-8 py-4">
            <span className="text-white text-3xl font-bold">
              Question {questionIndex + 1} of {questionTotal}
            </span>
          </div>
          <BigTimerCircle timeLeft={timeLeft} />
        </div>

        {/* Rebus Card — very large */}
        <div className="w-full max-w-5xl">
          <RebusCard elements={question.elements} size="lg" />
        </div>

        {/* Answer count */}
        <div className="bg-white/10 rounded-2xl px-8 py-4">
          <p className="text-white text-2xl font-semibold text-center">
            <span className="gradient-text font-extrabold">{answerCount.answered}</span>
            <span className="text-white/60"> / {answerCount.total} guests answered</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Reveal ──
  if (phase === 'reveal') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 py-12 gap-10"
        style={{ background: 'linear-gradient(135deg, #0f0620 0%, #1e0a3c 40%, #2d1b69 70%, #1a0630 100%)' }}>

        <p className="text-white/60 text-3xl font-semibold uppercase tracking-widest">The Answer:</p>
        <div className="text-7xl md:text-9xl font-extrabold gradient-text uppercase tracking-widest text-center">
          {revealAnswer}
        </div>

        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl">
          {/* Correct players */}
          <div className="flex-1 bg-green-500/10 border border-green-400/30 rounded-2xl p-6">
            <h3 className="text-green-300 font-bold text-2xl mb-4">Got it right! ✅</h3>
            {revealCorrectIds.length === 0 ? (
              <p className="text-white/40 text-lg">Nobody got it this time!</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {revealCorrectIds.map((sid) => {
                  const p = players.find((pl) => pl.socketId === sid);
                  return p ? (
                    <li key={sid} className="text-white text-xl font-semibold">
                      ✅ {p.firstName} {p.lastName}
                    </li>
                  ) : null;
                })}
              </ul>
            )}
          </div>

          {/* Top 5 scores */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-bold text-2xl mb-4">Top Scores</h3>
            <ul className="flex flex-col gap-2">
              {revealScores.slice(0, 5).map((p, i) => (
                <li key={p.socketId} className="flex items-center gap-3">
                  <span className="text-2xl w-10">{medals[i] || `${i + 1}.`}</span>
                  <span className="flex-1 text-white text-xl">{p.firstName} {p.lastName}</span>
                  <span className="text-white font-bold text-xl">{p.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ── Ended ──
  if (phase === 'ended') {
    const top3 = finalScores.slice(0, 3);
    const rest = finalScores.slice(3);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 py-12 gap-10"
        style={{ background: 'linear-gradient(135deg, #0f0620 0%, #1e0a3c 40%, #2d1b69 70%, #1a0630 100%)' }}>

        <div className="text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-7xl md:text-9xl font-extrabold gradient-text mb-4">Game Over!</h1>
          <p className="text-white/60 text-3xl">Thanks for playing!</p>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-6 w-full max-w-4xl">
          {/* 2nd */}
          {top3[1] && (
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="text-5xl">🥈</div>
              <div className="bg-gray-400/20 border border-gray-400/30 rounded-2xl p-6 text-center w-full h-44 flex flex-col items-center justify-center">
                <p className="text-white font-bold text-2xl">{top3[1].firstName}</p>
                <p className="text-white/60 text-xl">{top3[1].lastName}</p>
                <p className="text-white font-extrabold text-3xl mt-2">{top3[1].score} pts</p>
              </div>
            </div>
          )}

          {/* 1st */}
          {top3[0] && (
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="text-6xl">🥇</div>
              <div className="bg-yellow-400/20 border border-yellow-400/40 rounded-2xl p-6 text-center w-full h-56 flex flex-col items-center justify-center">
                <p className="text-white font-extrabold text-3xl">{top3[0].firstName}</p>
                <p className="text-white/60 text-2xl">{top3[0].lastName}</p>
                <p className="gradient-text font-extrabold text-4xl mt-2">{top3[0].score} pts</p>
              </div>
            </div>
          )}

          {/* 3rd */}
          {top3[2] && (
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="text-5xl">🥉</div>
              <div className="bg-orange-400/20 border border-orange-400/30 rounded-2xl p-6 text-center w-full h-36 flex flex-col items-center justify-center">
                <p className="text-white font-bold text-xl">{top3[2].firstName}</p>
                <p className="text-white/60 text-lg">{top3[2].lastName}</p>
                <p className="text-white font-extrabold text-2xl mt-1">{top3[2].score} pts</p>
              </div>
            </div>
          )}
        </div>

        {/* Rest of leaderboard */}
        {rest.length > 0 && (
          <ul className="flex flex-col gap-2 w-full max-w-2xl">
            {rest.map((p, i) => (
              <li key={p.socketId} className="flex items-center gap-4 bg-white/5 rounded-xl px-6 py-3">
                <span className="text-white/50 font-bold text-xl w-8">{i + 4}.</span>
                <span className="flex-1 text-white text-xl font-semibold">{p.firstName} {p.lastName}</span>
                <span className="text-white font-bold text-xl">{p.score} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
}
