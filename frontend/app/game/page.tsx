'use client';

import { useEffect, useState, useRef } from 'react';
import SessionGuard, { useSession } from '@/components/SessionGuard';
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

type GamePhase = 'connecting' | 'lobby' | 'countdown' | 'playing' | 'locked' | 'reveal' | 'ended';

// ─── Timer Circle ─────────────────────────────────────────────────────────────
function TimerCircle({ timeLeft, total = 30 }: { timeLeft: number; total?: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / total) * circumference;
  const isUrgent = timeLeft <= 10;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" className="absolute -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="5"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={isUrgent ? '#f87171' : '#a78bfa'}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className={`text-2xl font-extrabold z-10 ${isUrgent ? 'text-red-400' : 'text-white'}`}>
        {timeLeft}
      </span>
    </div>
  );
}

// ─── Main Game Content ────────────────────────────────────────────────────────
function GameContent() {
  const session = useSession();
  const [phase, setPhase] = useState<GamePhase>('connecting');
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [countdown, setCountdown] = useState(3);
  const [answerInput, setAnswerInput] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [revealAnswer, setRevealAnswer] = useState('');
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [finalScores, setFinalScores] = useState<PublicPlayer[]>([]);
  const [answerCount, setAnswerCount] = useState({ answered: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const mySocketId = useRef<string>('');

  useEffect(() => {
    const socket = getSocket();
    mySocketId.current = socket.id || '';

    socket.on('connect', () => {
      mySocketId.current = socket.id || '';
      socket.emit('game:join', {
        sessionId: session.sessionId,
        firstName: session.firstName,
        lastName: session.lastName,
      });
    });

    // If already connected, join immediately
    if (socket.connected) {
      mySocketId.current = socket.id || '';
      socket.emit('game:join', {
        sessionId: session.sessionId,
        firstName: session.firstName,
        lastName: session.lastName,
      });
    }

    socket.on('game:phase', ({ phase: p }: { phase: string }) => {
      if (p === 'idle' || p === 'lobby') setPhase('lobby');
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
      setAnswerInput('');
      setMyAnswer('');
      setWasCorrect(null);
      setPhase('playing');
      setTimeout(() => inputRef.current?.focus(), 100);
    });

    socket.on('game:tick', ({ timeLeft: tl }: { timeLeft: number }) => {
      setTimeLeft(tl);
    });

    socket.on('game:answer_ack', ({ correct }: { correct: boolean }) => {
      setWasCorrect(correct);
      setPhase('locked');
    });

    socket.on('game:answer_count', ({ answered, total }: { answered: number; total: number }) => {
      setAnswerCount({ answered, total });
    });

    socket.on('game:reveal', ({
      correctAnswer,
      correctSocketIds,
    }: {
      correctAnswer: string;
      correctSocketIds: string[];
      scores: PublicPlayer[];
    }) => {
      setRevealAnswer(correctAnswer);
      const iWasCorrect = correctSocketIds.includes(mySocketId.current);
      setWasCorrect(iWasCorrect);
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
      socket.off('game:answer_ack');
      socket.off('game:answer_count');
      socket.off('game:reveal');
      socket.off('game:end');
    };
  }, [session]);

  const submitAnswer = () => {
    if (!answerInput.trim() || phase !== 'playing') return;
    const socket = getSocket();
    setMyAnswer(answerInput.trim());
    socket.emit('game:answer', { answer: answerInput.trim() });
  };

  const myScore = players.find((p) => p.socketId === mySocketId.current)?.score ?? 0;
  const myRank = players.findIndex((p) => p.socketId === mySocketId.current) + 1;

  // ── Connecting ──
  if (phase === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
          <p className="text-white/60">Connecting to game...</p>
        </div>
      </div>
    );
  }

  // ── Lobby ──
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 gap-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🎮</div>
          <h1 className="text-4xl font-extrabold text-white mb-2">Get Ready!</h1>
          <p className="text-white/60 text-lg">Waiting for the host to start the game...</p>
        </div>

        <div className="card w-full max-w-sm text-center py-3 px-5">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">You&apos;re in as</p>
          <p className="text-white font-bold text-lg">{session.firstName} {session.lastName}</p>
        </div>

        <div className="card w-full max-w-sm">
          <h2 className="text-white/70 text-sm uppercase tracking-wider mb-3 font-semibold">
            Players Joined ({players.length})
          </h2>
          {players.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-2">No one yet...</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {players.map((p) => (
                <li key={p.socketId} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/40 flex items-center justify-center text-sm font-bold text-white">
                    {p.firstName[0]}
                  </div>
                  <span className="text-white font-medium">{p.firstName} {p.lastName}</span>
                  {p.socketId === mySocketId.current && (
                    <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full ml-auto">You</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── Countdown ──
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
        <p className="text-white/60 text-xl font-semibold">Get ready!</p>
        <div
          key={countdown}
          className="text-[10rem] font-extrabold gradient-text leading-none"
          style={{ animation: 'pulse-glow 0.5s ease-in-out' }}
        >
          {countdown}
        </div>
        <p className="text-white/40 text-lg">Game is starting...</p>
      </div>
    );
  }

  // ── Playing ──
  if (phase === 'playing' && question) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="card py-2 px-4">
            <span className="text-white font-bold text-sm">
              Q{questionIndex + 1} / {questionTotal}
            </span>
          </div>
          <TimerCircle timeLeft={timeLeft} />
          <div className="card py-2 px-4 text-right">
            <p className="text-white/50 text-xs">Score</p>
            <p className="text-white font-bold">{myScore}</p>
          </div>
        </div>

        {/* Question label */}
        <p className="text-white/70 text-center text-sm font-medium">
          What word does this represent?
        </p>

        {/* Rebus Card */}
        <RebusCard elements={question.elements} size="sm" />

        {/* Answer input */}
        <div className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={answerInput}
            onChange={(e) => setAnswerInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
            placeholder="Type your answer..."
            className="input-field text-xl text-center uppercase tracking-widest"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            onClick={submitAnswer}
            disabled={!answerInput.trim()}
            className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lock In Answer 🔒
          </button>
        </div>

        {/* Answer count */}
        <p className="text-white/40 text-sm text-center">
          {answerCount.answered} / {answerCount.total} answered
        </p>
      </div>
    );
  }

  // ── Locked (waiting for reveal) ──
  if (phase === 'locked') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
        <div className="text-5xl">✅</div>
        <h2 className="text-3xl font-extrabold text-white">Answer locked in!</h2>
        <div className="card text-center max-w-sm w-full">
          <p className="text-white/50 text-sm mb-1">You answered:</p>
          <p className="text-2xl font-bold text-white uppercase tracking-widest">{myAnswer}</p>
        </div>
        <div className="flex items-center gap-3 opacity-50">
          <TimerCircle timeLeft={timeLeft} />
          <span className="text-white/60 text-sm">Waiting for reveal...</span>
        </div>
      </div>
    );
  }

  // ── Reveal ──
  if (phase === 'reveal') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
        <p className="text-white/60 text-sm uppercase tracking-wider font-semibold">The answer was</p>
        <div className="text-5xl font-extrabold gradient-text uppercase tracking-widest text-center px-4">
          {revealAnswer}
        </div>

        {wasCorrect === true && (
          <div className="card border-green-400/40 bg-green-500/10 text-center max-w-sm w-full">
            <div className="text-3xl mb-1">✅</div>
            <p className="text-green-300 font-bold text-xl">Correct! +100 points</p>
          </div>
        )}

        {wasCorrect === false && (
          <div className="card border-red-400/40 bg-red-500/10 text-center max-w-sm w-full">
            <div className="text-3xl mb-1">❌</div>
            <p className="text-red-300 font-bold text-xl">Wrong answer</p>
          </div>
        )}

        <div className="card text-center max-w-sm w-full">
          <p className="text-white/50 text-sm mb-1">Your score</p>
          <p className="text-3xl font-extrabold text-white">{myScore}</p>
        </div>

        <p className="text-white/40 text-sm">Next question coming up...</p>
      </div>
    );
  }

  // ── Ended ──
  if (phase === 'ended') {
    const medals = ['🥇', '🥈', '🥉'];
    const myEntry = finalScores.find((p) => p.socketId === mySocketId.current);

    return (
      <div className="min-h-screen px-4 py-12 max-w-lg mx-auto flex flex-col gap-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-4xl font-extrabold gradient-text mb-2">Game Over!</h1>
          {myEntry && (
            <p className="text-white/70">
              You finished #{myRank} with <span className="font-bold text-white">{myEntry.score} pts</span>
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="text-white font-bold text-lg mb-4">Final Leaderboard</h2>
          <ul className="flex flex-col gap-3">
            {finalScores.map((p, i) => (
              <li
                key={p.socketId}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  p.socketId === mySocketId.current
                    ? 'bg-purple-500/20 border border-purple-400/40'
                    : 'bg-white/5'
                }`}
              >
                <span className="text-2xl w-8 text-center">{medals[i] || `${i + 1}.`}</span>
                <span className="flex-1 font-semibold text-white">
                  {p.firstName} {p.lastName}
                  {p.socketId === mySocketId.current && (
                    <span className="ml-2 text-xs text-purple-300">(You)</span>
                  )}
                </span>
                <span className="font-bold text-white">{p.score} pts</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/40 text-sm text-center">Play again? Ask the host!</p>
      </div>
    );
  }

  return null;
}

export default function GamePage() {
  return (
    <SessionGuard>
      <GameContent />
    </SessionGuard>
  );
}
