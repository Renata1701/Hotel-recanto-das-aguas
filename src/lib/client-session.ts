import { useSyncExternalStore } from "react";
import type { Credential } from "./domain";

const KEY = "rda-guest-session-v1";
const PIN_LOCK_KEY = "rda-pin-lock-v1";

export type GuestSession = {
  credentialId: string;
  code: string;
  participantName: string;
  stayLabel: string;
  loggedAt: number;
};

type PinLock = { credentialId: string; failures: number; until: number };

const listeners = new Set<() => void>();

let guestCacheRaw: string | null | undefined;
let guestCacheSnapshot: GuestSession | null | undefined;

function emit() {
  listeners.forEach((l) => l());
}

function readGuestFromStorage(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === guestCacheRaw && guestCacheSnapshot !== undefined) {
      return guestCacheSnapshot;
    }
    guestCacheRaw = raw;
    if (!raw) {
      guestCacheSnapshot = null;
      return null;
    }
    guestCacheSnapshot = JSON.parse(raw) as GuestSession;
    return guestCacheSnapshot;
  } catch {
    guestCacheSnapshot = null;
    guestCacheRaw = null;
    return null;
  }
}

export function getGuestSession(): GuestSession | null {
  return readGuestFromStorage();
}

export function setGuestSession(session: GuestSession) {
  const raw = JSON.stringify(session);
  localStorage.setItem(KEY, raw);
  guestCacheRaw = raw;
  guestCacheSnapshot = session;
  emit();
}

export function clearGuestSession() {
  localStorage.removeItem(KEY);
  guestCacheRaw = null;
  guestCacheSnapshot = null;
  emit();
}

export function subscribeGuest(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGuestSession() {
  return useSyncExternalStore(subscribeGuest, getGuestSession, () => null);
}

export function guestSessionFromCredential(cred: Credential, participantName: string, stayLabel: string): GuestSession {
  return {
    credentialId: cred.id,
    code: cred.code,
    participantName,
    stayLabel,
    loggedAt: Date.now(),
  };
}

/** RNF09 — bloqueio após 5 tentativas de PIN incorretas no terminal (15 min). */
export function getPinLock(credentialId: string): PinLock | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PIN_LOCK_KEY);
    if (!raw) return null;
    const lock = JSON.parse(raw) as PinLock;
    if (lock.credentialId !== credentialId) return null;
    if (Date.now() > lock.until) {
      localStorage.removeItem(PIN_LOCK_KEY);
      return null;
    }
    return lock;
  } catch {
    return null;
  }
}

export function recordPinFailure(credentialId: string) {
  const prev = getPinLock(credentialId);
  const failures = (prev?.credentialId === credentialId ? prev.failures : 0) + 1;
  if (failures >= 5) {
    localStorage.setItem(
      PIN_LOCK_KEY,
      JSON.stringify({ credentialId, failures, until: Date.now() + 15 * 60 * 1000 }),
    );
  } else {
    localStorage.setItem(PIN_LOCK_KEY, JSON.stringify({ credentialId, failures, until: 0 }));
  }
}

export function clearPinFailures(credentialId: string) {
  const lock = getPinLock(credentialId);
  if (lock?.credentialId === credentialId) localStorage.removeItem(PIN_LOCK_KEY);
}
