/**
 * Mock "server": holds domain State in localStorage and syncs across tabs
 * (attendant tab + client tab demo side by side). Replace `commit` with API calls later.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { FICTIONAL_DEMO_GUEST, RENATA_DEMO_GUEST } from "./demo-client";
import { DomainError, expireStale, type Product, type Sector, type State } from "./domain";
import { HOTEL_ROOMS } from "./hotel-rooms";
import { seedState } from "./seed";
import { migrateCatalog } from "./catalog-migration";

const KEY = "rda-state-v1";
let state: State | null = null;
const listeners = new Set<() => void>();

const DEFAULT_SECTOR: Sector = "Bar da Piscina";

const PINNED_DEMO_CREDENTIALS = [FICTIONAL_DEMO_GUEST.credential, RENATA_DEMO_GUEST.credential] as const;

/** Garante hóspedes fixos do demo (ex.: Renata) mesmo com localStorage antigo. */
function mergePinnedDemoGuests(parsed: State, seed: State): { state: State; changed: boolean } {
  let changed = false;
  let stays = parsed.stays;
  let credentials = parsed.credentials;
  const knownCodes = new Set(credentials.map((c) => c.code));
  const openRooms = new Set(
    stays.filter((s) => s.status !== "encerrada" && s.room).map((s) => s.room!),
  );

  for (const code of PINNED_DEMO_CREDENTIALS) {
    if (knownCodes.has(code)) continue;
    const seedCred = seed.credentials.find((c) => c.code === code);
    if (!seedCred) continue;
    const seedStay = seed.stays.find((s) => s.id === seedCred.stayId);
    if (!seedStay) continue;

    let stayToAdd = seedStay;
    if (seedStay.room && openRooms.has(seedStay.room)) {
      const free = HOTEL_ROOMS.find((r) => !openRooms.has(r.number));
      if (!free) continue;
      stayToAdd = { ...seedStay, room: free.number };
    }

    if (!stays.some((s) => s.id === stayToAdd.id)) {
      stays = [...stays, stayToAdd];
      if (stayToAdd.room) openRooms.add(stayToAdd.room);
    }
    credentials = [...credentials, seedCred];
    knownCodes.add(code);
    changed = true;
  }

  if (!changed) return { state: parsed, changed: false };
  return { state: { ...parsed, stays, credentials }, changed: true };
}

/** Corrige dados antigos no localStorage (produtos sem setor ou lista vazia). */
function normalizeLoadedState(parsed: State): { state: State; changed: boolean } {
  const seed = seedState();
  const seedById = new Map(seed.products.map((p) => [p.id, p]));

  if (!Array.isArray(parsed.products) || parsed.products.length === 0) {
    return { state: { ...parsed, products: seed.products }, changed: true };
  }

  let changed = false;
  const products = parsed.products.map((p) => {
    const withSector = p as Product & { sector?: Sector };
    if (withSector.sector) return withSector as Product;
    changed = true;
    const ref = seedById.get(p.id);
    return {
      ...p,
      sector: ref?.sector ?? DEFAULT_SECTOR,
    } as Product;
  });

  const ids = new Set(products.map((p) => p.id));
  const missingFromSeed = seed.products.filter((p) => !ids.has(p.id));
  if (missingFromSeed.length > 0) {
    changed = true;
    products.push(...missingFromSeed);
  }

  const productState = changed ? { ...parsed, products } : parsed;
  const { state: withGuests, changed: guestsChanged } = mergePinnedDemoGuests(productState, seed);
  if (!changed && !guestsChanged) return { state: parsed, changed: false };
  return { state: withGuests, changed: true };
}

function load(): State {
  if (state) return state;
  if (typeof window === "undefined") return serverSnapshot;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      state = seedState();
    } else {
      const parsed = JSON.parse(raw) as State;
      const { state: normalized, changed } = normalizeLoadedState(parsed);
      const migrated = migrateCatalog(normalized);
      state = migrated;
      if (changed || migrated !== parsed) persist();
    }
  } catch {
    state = seedState();
    persist();
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
      const saved = JSON.parse(e.newValue) as State;
      const { state: normalized, changed } = normalizeLoadedState(saved);
      const migrated = migrateCatalog(normalized);
      state = migrated;
      if (changed || migrated !== saved) persist();
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

/** Vitest: força releitura do localStorage. */
export function reloadStoreFromStorage() {
  state = null;
  return load();
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
