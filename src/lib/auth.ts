import { redirect } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

const AUTH_KEY = "rda-staff-session-v1";

/** RF01 — perfis de acesso do funcionário. */
export type StaffRole = "atendente" | "recepcao" | "admin";

export type StaffSession = {
  id: string;
  name: string;
  role: StaffRole;
  homePath: "/atendente" | "/recepcao";
  loggedAt: number;
};

const accounts = [
  {
    id: "staff_lucas",
    login: "lucas",
    password: "1234",
    name: "Lucas (bar)",
    role: "atendente" as const,
    homePath: "/atendente" as const,
  },
  {
    id: "staff_mariana",
    login: "recepcao",
    password: "1234",
    name: "Mariana (recepção)",
    role: "recepcao" as const,
    homePath: "/recepcao" as const,
  },
  {
    id: "staff_admin",
    login: "admin",
    password: "1234",
    name: "Administrador",
    role: "admin" as const,
    homePath: "/recepcao" as const,
  },
] as const;

const routeRoles: Record<string, StaffRole[]> = {
  "/inicio": ["atendente", "recepcao", "admin"],
  "/atendente": ["atendente", "admin"],
  "/recepcao": ["recepcao", "admin"],
  "/recepcao/cadastro": ["recepcao", "admin"],
};

const authListeners = new Set<() => void>();

/** useSyncExternalStore exige referência estável quando os dados não mudaram. */
let staffCacheRaw: string | null | undefined;
let staffCacheSnapshot: StaffSession | null | undefined;

function emitAuth() {
  authListeners.forEach((l) => l());
}

function readStaffFromStorage(): StaffSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw === staffCacheRaw && staffCacheSnapshot !== undefined) {
      return staffCacheSnapshot;
    }
    staffCacheRaw = raw;
    if (!raw) {
      staffCacheSnapshot = null;
      return null;
    }
    staffCacheSnapshot = JSON.parse(raw) as StaffSession;
    return staffCacheSnapshot;
  } catch {
    staffCacheSnapshot = null;
    staffCacheRaw = null;
    return null;
  }
}

export function getStaffSession(): StaffSession | null {
  return readStaffFromStorage();
}

export function setStaffSession(session: StaffSession) {
  const raw = JSON.stringify(session);
  localStorage.setItem(AUTH_KEY, raw);
  staffCacheRaw = raw;
  staffCacheSnapshot = session;
  emitAuth();
}

export function clearStaffSession() {
  localStorage.removeItem(AUTH_KEY);
  staffCacheRaw = null;
  staffCacheSnapshot = null;
  emitAuth();
}

export function subscribeAuth(listener: () => void) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export function authenticate(login: string, password: string): StaffSession | null {
  const id = login.trim().toLowerCase();
  const hit = accounts.find((a) => a.login === id && a.password === password);
  if (!hit) return null;
  return {
    id: hit.id,
    name: hit.name,
    role: hit.role,
    homePath: hit.homePath,
    loggedAt: Date.now(),
  };
}

const safeRedirect = (path: string | undefined): string | undefined => {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return undefined;
  if (path === "/login") return undefined;
  return path;
};

export function canAccessRoute(session: StaffSession | null, pathname: string): boolean {
  if (!session) return false;
  const allowed = routeRoles[pathname];
  if (!allowed) return true;
  return allowed.includes(session.role);
}

/** RF01 — redireciona para login ou para a home do perfil se não autorizado. */
export function requireStaffAuth(pathname: string) {
  const session = getStaffSession();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: pathname } });
  }
  if (!canAccessRoute(session, pathname)) {
    throw redirect({ to: session.homePath });
  }
}

export function resolvePostLoginPath(redirectPath: string | undefined, session: StaffSession) {
  const target = safeRedirect(redirectPath);
  if (target && canAccessRoute(session, target)) return target;
  return session.homePath;
}

export function useStaffSession() {
  return useSyncExternalStore(subscribeAuth, getStaffSession, () => null);
}

export function staffNavForRole(role: StaffRole | undefined) {
  const all = [
    { to: "/inicio" as const, label: "Início", roles: ["atendente", "recepcao", "admin"] as StaffRole[] },
    { to: "/atendente" as const, label: "Atendente", roles: ["atendente", "admin"] as StaffRole[] },
    { to: "/cliente/entrar" as const, label: "Cliente", roles: ["atendente", "recepcao", "admin"] as StaffRole[] },
    { to: "/terminal" as const, label: "Terminal", roles: ["atendente", "recepcao", "admin"] as StaffRole[] },
    { to: "/recepcao" as const, label: "Recepção", roles: ["recepcao", "admin"] as StaffRole[] },
    { to: "/recepcao/cadastro" as const, label: "Check-in", roles: ["recepcao", "admin"] as StaffRole[] },
  ];
  if (!role) return [];
  return all.filter((n) => n.roles.includes(role));
}
