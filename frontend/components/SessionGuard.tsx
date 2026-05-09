'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GuestSession, getSession } from '@/lib/session';

// ─── Context ──────────────────────────────────────────────────────────────────
interface SessionContextValue {
  session: GuestSession;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): GuestSession {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionGuard>');
  }
  return ctx.session;
}

// ─── Guard ────────────────────────────────────────────────────────────────────
interface SessionGuardProps {
  children: React.ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = getSession();
    if (!stored) {
      router.replace('/');
    } else {
      setSession(stored);
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SessionContext.Provider value={{ session }}>
      {children}
    </SessionContext.Provider>
  );
}
