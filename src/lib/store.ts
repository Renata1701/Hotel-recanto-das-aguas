/**
 * Mock "server": holds domain State in localStorage and syncs across tabs
 * (attendant tab + client tab demo side by side). Replace `commit` with API calls later.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { DomainError, expireStale, type State } from "./domain";
import { seedState } from "./seed";

const KEY = "rda-state-v1";
let state: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
  if (state) return state;
  if (typeof window === "undefined") return (state = seedState());
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as State) : seedState();
  } catch {
    state = seedState();
  }
  return state;
}

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
}

function emit() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      state = JSON.parse(e.newValue);
      emit();
    }
  });
  // periodic polling replaces push (doc: "consultar periodicamente o servidor")
  setInterval(() => {
    const next = expireStale(load());
    if (next !== state) {
      state = next;
      persist();
      emit();
    }
  }, 1000);
}

const serverSnapshot = seedState();

export function useStore<T>(selector: (s: State) => T): T {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    load,
    () => serverSnapshot,
  );
  return selector(s);
}

/** Runs a domain command; returns an error message instead of throwing. */
export function commit(fn: (s: State) => State): string | null {
  try {
    state = fn(expireStale(load()));
    persist();
    emit();
    return null;
  } catch (e) {
    if (e instanceof DomainError) return e.message;
    throw e;
  }
}

export const getState = () => load();

export function resetDemo() {
  state = seedState();
  persist();
  emit();
}

/** Ticking clock for countdowns. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}
