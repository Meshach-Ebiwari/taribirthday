'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

const BIRTHDAY_NAME = process.env.NEXT_PUBLIC_BIRTHDAY_NAME || 'the Birthday Star';
const BIRTHDAY_DATE = process.env.NEXT_PUBLIC_BIRTHDAY_DATE || '2026-06-15';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeLeft(targetDate: string): TimeLeft {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const total = target - now;

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / 1000 / 60 / 60) % 24);
  const days = Math.floor(total / 1000 / 60 / 60 / 24);

  return { days, hours, minutes, seconds, total };
}

function FlipBox({ value, label }: { value: number; label: string }) {
  const [prev, setPrev] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== prev) {
      setFlipping(true);
      const t = setTimeout(() => {
        setPrev(value);
        setFlipping(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`
          relative w-24 h-28 md:w-32 md:h-36 rounded-2xl
          bg-gradient-to-b from-white/15 to-white/5
          border border-white/20
          flex items-center justify-center
          shadow-2xl animate-pulse-glow
          overflow-hidden
          transition-transform duration-300
          ${flipping ? 'scale-95' : 'scale-100'}
        `}
      >
        {/* Top half divider */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-black/40 z-10" />

        <span
          className={`
            text-5xl md:text-6xl font-extrabold text-white
            transition-all duration-300
            ${flipping ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}
          `}
        >
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-white/60 text-sm md:text-base font-semibold uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

export default function CountdownPage() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(BIRTHDAY_DATE));
  const [confettiFired, setConfettiFired] = useState(false);
  const prevSecondsRef = useRef(timeLeft.seconds);

  useEffect(() => {
    const tick = () => {
      const tl = getTimeLeft(BIRTHDAY_DATE);
      setTimeLeft(tl);
      prevSecondsRef.current = tl.seconds;

      if (tl.total <= 0 && !confettiFired) {
        setConfettiFired(true);
        import('canvas-confetti').then((m) => {
          const confetti = m.default;
          const fire = () => {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            confetti({ particleCount: 60, spread: 120, origin: { x: 0.1, y: 0.5 } });
            confetti({ particleCount: 60, spread: 120, origin: { x: 0.9, y: 0.5 } });
          };
          fire();
          setTimeout(fire, 600);
          setTimeout(fire, 1200);
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [confettiFired]);

  const isBirthday = timeLeft.total <= 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Floating decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {['🎈', '🎉', '🎊', '🎂', '🥳', '🌟', '✨', '💫', '🎁', '🎀'].map((emoji, i) => (
          <span
            key={i}
            className="absolute text-3xl select-none opacity-15"
            style={{
              top: `${Math.random() * 90}%`,
              left: `${Math.random() * 90}%`,
              animation: `float ${5 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      {/* Back link */}
      <div className="absolute top-6 left-6">
        <Link href="/dashboard" className="btn-secondary py-2 px-4 text-sm">
          ← Back
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {isBirthday ? (
          /* Happy birthday state */
          <div className="flex flex-col items-center gap-6">
            <div className="text-7xl animate-float">🎂</div>
            <h1 className="text-5xl md:text-7xl font-extrabold">
              <span className="gradient-text">Happy Birthday</span>
            </h1>
            <h2 className="text-4xl md:text-6xl font-extrabold text-white">
              {BIRTHDAY_NAME}! 🎉
            </h2>
            <p className="text-white/70 text-xl">Today is the big day!</p>
            <Link href="/gallery" className="btn-primary text-lg mt-4">
              See the Memories 🖼️
            </Link>
          </div>
        ) : (
          /* Countdown state */
          <div className="flex flex-col items-center gap-8">
            <div>
              <p className="text-white/50 uppercase tracking-widest text-sm mb-2">Counting down to</p>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white">
                <span className="gradient-text">{BIRTHDAY_NAME}&apos;s</span> Birthday! 🎂
              </h1>
              <p className="text-white/50 text-base mt-2">
                {new Date(BIRTHDAY_DATE).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Flip boxes */}
            <div className="flex items-end gap-4 md:gap-8 flex-wrap justify-center">
              <FlipBox value={timeLeft.days} label="Days" />
              <div className="text-4xl font-bold text-white/40 pb-10">:</div>
              <FlipBox value={timeLeft.hours} label="Hours" />
              <div className="text-4xl font-bold text-white/40 pb-10">:</div>
              <FlipBox value={timeLeft.minutes} label="Minutes" />
              <div className="text-4xl font-bold text-white/40 pb-10">:</div>
              <FlipBox value={timeLeft.seconds} label="Seconds" />
            </div>

            <p className="text-white/40 text-sm mt-2">
              The celebration is almost here — get ready to party! 🥳
            </p>

            <div className="flex gap-4 flex-wrap justify-center mt-4">
              <Link href="/upload" className="btn-primary">
                Upload a Memory 📸
              </Link>
              <Link href="/gallery" className="btn-secondary">
                View Gallery 🖼️
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
