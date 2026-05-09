'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SessionGuard, { useSession } from '@/components/SessionGuard';

function fireConfetti() {
  import('canvas-confetti').then((confettiModule) => {
    const confetti = confettiModule.default;
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, angle: 60 }), 500);
    setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, angle: 120 }), 700);
  });
}

function SuccessContent() {
  const session = useSession();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    fireConfetti();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push('/gallery');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {['🎉', '✨', '🌟', '💫', '🎊', '🎈'].map((emoji, i) => (
          <span
            key={i}
            className="absolute text-3xl opacity-20 select-none animate-float"
            style={{
              top: `${10 + i * 14}%`,
              left: `${5 + i * 16}%`,
              animationDelay: `${i * 0.7}s`,
            }}
          >
            {emoji}
          </span>
        ))}
        {['🥳', '🎂', '💝', '🌈', '⭐', '🎁'].map((emoji, i) => (
          <span
            key={`r-${i}`}
            className="absolute text-3xl opacity-20 select-none animate-float-delay"
            style={{
              top: `${15 + i * 13}%`,
              right: `${5 + i * 15}%`,
              animationDelay: `${i * 0.9 + 0.4}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <div className="w-full max-w-md text-center relative z-10">
        {/* Big emoji */}
        <div className="text-7xl mb-6 animate-bounce">🎉</div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
          <span className="gradient-text">Your photos are live!</span>
        </h1>

        {/* Subtext */}
        <p className="text-white/70 text-lg mb-8">
          Thanks {session.firstName}! Your memories are now part of the gallery.
        </p>

        {/* Countdown */}
        <div className="card mb-6 text-center">
          <p className="text-white/60 text-sm mb-2">Auto-redirecting to gallery</p>
          <p className="text-2xl font-bold text-white">
            Taking you to the gallery in {countdown}...
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push('/gallery')}
            className="btn-primary text-lg"
          >
            Go to Gallery →
          </button>
          <Link href="/upload" className="btn-secondary text-lg text-center">
            Upload More 📸
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <SessionGuard>
      <SuccessContent />
    </SessionGuard>
  );
}
