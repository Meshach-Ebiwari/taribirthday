import { v4 as uuidv4 } from 'uuid';

export interface GuestSession {
  firstName: string;
  lastName: string;
  sessionId: string;
}

export const STORAGE_KEY = 'birthday_guest_session';

export function getSession(): GuestSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestSession;
    if (!parsed.firstName || !parsed.lastName || !parsed.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(firstName: string, lastName: string): GuestSession {
  const session: GuestSession = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    sessionId: uuidv4(),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function hasSession(): boolean {
  return getSession() !== null;
}
