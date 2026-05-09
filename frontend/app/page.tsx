'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, setSession, clearSession, hasSession, GuestSession } from '@/lib/session';

const BIRTHDAY_NAME = process.env.NEXT_PUBLIC_BIRTHDAY_NAME || 'the Birthday Star';

export default function LandingPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [existingSession, setExistingSession] = useState<GuestSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hasSession()) {
      setExistingSession(getSession());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both your first and last name.');
      return;
    }
    setError('');
    setLoading(true);
    setSession(firstName.trim(), lastName.trim());
    router.push('/upload');
  };

  const handleContinue = () => {
    router.push('/upload');
  };

  const handleReset = () => {
    clearSession();
    setExistingSession(null);
    setFirstName('');
    setLastName('');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Decorative floating stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {['⭐', '🌟', '✨', '💫', '🎊', '🎉'].map((emoji, i) => (
          <span
            key={i}
            className="absolute text-2xl opacity-20 select-none"
            style={{
              top: `${10 + i * 15}%`,
              left: `${5 + i * 16}%`,
              animationDelay: `${i * 0.8}s`,
              animation: 'float 6s ease-in-out infinite',
            }}
          >
            {emoji}
          </span>
        ))}
        {['🎈', '🎁', '🥳', '🎂', '💝', '🌈'].map((emoji, i) => (
          <span
            key={`r-${i}`}
            className="absolute text-2xl opacity-20 select-none"
            style={{
              top: `${15 + i * 14}%`,
              right: `${5 + i * 14}%`,
              animationDelay: `${i * 0.9 + 0.5}s`,
              animation: 'float 7s ease-in-out infinite',
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      {/* Main content */}
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎂</div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 leading-tight">
            Welcome to{' '}
            <span className="gradient-text">{BIRTHDAY_NAME}&apos;s</span>
          </h1>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Birthday! 🎉
          </h2>
          <p className="text-white/70 text-base md:text-lg">
            {existingSession
              ? 'Welcome back! Ready to keep celebrating?'
              : 'Scan captured — enter your name to join the celebration'}
          </p>
        </div>

        {/* Card */}
        <div className="card animate-pulse-glow">
          {existingSession ? (
            /* Returning guest */
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="text-4xl">👋</div>
              <div>
                <p className="text-white/60 text-sm uppercase tracking-wider mb-1">Welcome back</p>
                <p className="text-2xl font-bold text-white">
                  {existingSession.firstName} {existingSession.lastName}!
                </p>
              </div>
              <button onClick={handleContinue} className="btn-primary w-full text-lg">
                Continue to the Party 🥳
              </button>
              <button
                onClick={handleReset}
                className="text-white/40 hover:text-white/70 text-sm transition-colors underline underline-offset-2"
              >
                Not you? Switch name
              </button>
            </div>
          ) : (
            /* New guest */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <h3 className="text-xl font-bold text-white text-center mb-2">
                Enter Your Name
              </h3>

              <div>
                <label className="block text-white/70 text-sm mb-1.5 font-medium">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Sarah"
                  className="input-field"
                  autoFocus
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1.5 font-medium">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Johnson"
                  className="input-field"
                  maxLength={50}
                />
              </div>

              {error && (
                <p className="text-pink-400 text-sm text-center bg-pink-500/10 rounded-lg py-2 px-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Joining...
                  </span>
                ) : (
                  'Join the Party 🎊'
                )}
              </button>

              <p className="text-white/40 text-xs text-center mt-1">
                No account needed — your name is saved locally on your device.
              </p>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-white/30 text-xs mt-6">
          Upload photos & videos, watch the slideshow, and celebrate together!
        </p>
      </div>
    </div>
  );
}
