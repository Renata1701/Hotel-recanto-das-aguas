const QR_ORIGIN_KEY = "rda-guest-qr-origin";
const LAN_IP_CACHE_KEY = "rda-lan-ip-cache";

/** Domínio público (InfinityFree) — usado no QR quando não há `VITE_PUBLIC_APP_URL`. */
export const DEFAULT_PUBLIC_APP_URL = "http://sitema-hotel.free.nf";

export function normalizeCredentialCode(code: string) {
  return code.trim().toUpperCase();
}

/** Valor do secret / .env — ignora colar a linha inteira `VITE_PUBLIC_APP_URL=...`. */
export function unwrapVitePublicAppUrl(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^VITE_PUBLIC_APP_URL\s*=\s*/i, "").trim();
  s = s.replace(/^["']|["']$/g, "");
  return s;
}

/** Host gerado quando o secret no Lovable veio errado (vira subdomínio `vitepublicappurl...`). */
export function isCorruptQrHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h.includes("vitepublicappurl")) return true;
  if (h.includes("vitepublicapp")) return true;
  if (h.endsWith(".lovable.app") && h.includes("itema-hotel")) return true;
  return false;
}

export function isTrustedQrOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    if (isCorruptQrHostname(host)) return false;
    if (originHostIsBroken(origin) || isExampleQrOrigin(origin)) return false;
    return true;
  } catch {
    return false;
  }
}

export function normalizeQrOrigin(raw: string): string | null {
  try {
    const u = new URL(unwrapVitePublicAppUrl(raw));
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const origin = `${u.protocol}//${u.host}`;
    if (!isTrustedQrOrigin(origin)) return null;
    return origin;
  } catch {
    return null;
  }
}

export function isLocalDevHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function parseIpv4(ip: string): [number, number, number, number] | null {
  const parts = ip.split(".").map((s) => Number(s));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return parts as [number, number, number, number];
}

export function isIPv4Host(hostname: string) {
  return parseIpv4(hostname) !== null;
}

/** Endereço atribuível na LAN (evita rede/broadcast tipo 192.168.0.0). */
export function isUsableLanIPv4(ip: string): boolean {
  const p = parseIpv4(ip);
  if (!p) return false;
  const [a, b, , d] = p;
  if (a === 0 || d === 0 || d === 255) return false;
  if (a === 169 && b === 254) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function pickBestLanIp(ips: Iterable<string>): string | null {
  const usable = [...ips].filter(isUsableLanIPv4);
  if (!usable.length) return null;
  usable.sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
  return usable[usable.length - 1]!;
}

export function originHostIsBroken(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return isIPv4Host(host) && !isUsableLanIPv4(host);
  } catch {
    return true;
  }
}

/** IP de exemplo na UI — nunca persistir (gerava QR que não abre no celular). */
const EXAMPLE_QR_HOSTS = new Set(["192.168.1.10", "192.168.0.1"]);

export function isExampleQrOrigin(origin: string): boolean {
  try {
    return EXAMPLE_QR_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function clearStoredQrOrigin() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QR_ORIGIN_KEY);
  window.dispatchEvent(new Event("rda-qr-origin"));
}

export function cacheLanIp(ip: string) {
  if (typeof sessionStorage === "undefined" || !isUsableLanIPv4(ip)) return;
  sessionStorage.setItem(LAN_IP_CACHE_KEY, ip);
}

export function cachedLanIp(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const ip = sessionStorage.getItem(LAN_IP_CACHE_KEY);
  return ip && isUsableLanIPv4(ip) ? ip : null;
}

function originFromCachedLan(): string | null {
  if (typeof window === "undefined") return null;
  const ip = cachedLanIp();
  if (!ip) return null;
  return qrOriginFromLanIp(ip, window.location.protocol);
}

export function currentDevPagePort(): string {
  if (typeof window === "undefined") return "";
  return window.location.port || (window.location.protocol === "https:" ? "443" : "80");
}

export function qrOriginFromLanIp(ip: string, protocol = window.location?.protocol ?? "http:"): string | null {
  if (!isUsableLanIPv4(ip) || typeof window === "undefined") return null;
  const port = window.location.port;
  const showPort =
    (protocol === "https:" && port !== "443" && port !== "") ||
    (protocol === "http:" && port !== "80" && port !== "");
  const host = showPort && port ? `${ip}:${port}` : ip;
  return normalizeQrOrigin(`${protocol}//${host}`);
}

export function qrOriginPortMismatch(origin: string): boolean {
  if (typeof window === "undefined" || !isLocalDevHost(window.location.hostname)) return false;
  try {
    const o = new URL(origin);
    const live = currentDevPagePort();
    const stored = o.port || (o.protocol === "https:" ? "443" : "80");
    return live !== stored;
  } catch {
    return false;
  }
}

export function qrOriginWithLivePort(origin: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const o = new URL(origin);
    const port = window.location.port;
    o.port = port;
    return normalizeQrOrigin(o.toString());
  } catch {
    return null;
  }
}

export function getStoredQrOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(QR_ORIGIN_KEY);
  if (!raw) return null;
  const normalized = normalizeQrOrigin(raw);
  if (!normalized) {
    localStorage.removeItem(QR_ORIGIN_KEY);
    return null;
  }
  if (!isTrustedQrOrigin(normalized)) {
    localStorage.removeItem(QR_ORIGIN_KEY);
    return null;
  }
  return normalized;
}

export function setStoredQrOrigin(origin: string) {
  const normalized = normalizeQrOrigin(origin);
  if (!normalized || typeof window === "undefined") return null;
  if (!isTrustedQrOrigin(normalized)) return null;
  localStorage.setItem(QR_ORIGIN_KEY, normalized);
  window.dispatchEvent(new Event("rda-qr-origin"));
  return normalized;
}

/** Caminho interno (links no app / QR) — abre tela de PIN com credencial preenchida. */
export function guestAccessPath(code: string) {
  const codigo = encodeURIComponent(normalizeCredentialCode(code));
  return `/cliente/entrar?codigo=${codigo}&qr=1`;
}

function envPublicOrigin(): string | null {
  if (typeof import.meta === "undefined" || !import.meta.env["VITE_PUBLIC_APP_URL"]) return null;
  return normalizeQrOrigin(String(import.meta.env["VITE_PUBLIC_APP_URL"]));
}

function devReachableOrigin(): string | null {
  if (typeof window === "undefined") return null;
  if (isUsableLanIPv4(window.location.hostname)) return window.location.origin;
  const fromCache = originFromCachedLan();
  if (fromCache) return fromCache;
  return null;
}

function originLooksLikeInfinityRedirect(origin: string): boolean {
  try {
    return new URL(origin).hostname.endsWith(".free.nf");
  } catch {
    return false;
  }
}

function allowFreeNfQrInDev(): boolean {
  if (typeof import.meta === "undefined" || !import.meta.env.DEV) return true;
  return String(import.meta.env.VITE_QR_ALLOW_FREE_NF_IN_DEV ?? "").toLowerCase() === "true";
}

/**
 * Origem do QR no browser (síncrona): LAN salva, IP da aba, cache STUN, depois env/domínio.
 */
export function effectiveGuestQrOrigin(): string {
  const dev = typeof import.meta !== "undefined" && Boolean(import.meta.env.DEV);
  const fromEnv = envPublicOrigin();

  if (typeof window !== "undefined") {
    const synced = syncGuestQrOrigin();
    if (synced) return synced;
    const reachable = devReachableOrigin();
    if (reachable) return reachable;
  }

  if (dev && !allowFreeNfQrInDev()) {
    if (fromEnv && !originLooksLikeInfinityRedirect(fromEnv)) return fromEnv;
    const live = livePageOriginForQr();
    if (live) return live;
    return DEFAULT_PUBLIC_APP_URL;
  }

  if (fromEnv) return fromEnv;
  return DEFAULT_PUBLIC_APP_URL;
}

/**
 * Origem do QR.
 * - Produção / Lovable publicado: `VITE_PUBLIC_APP_URL` ou `sitema-hotel.free.nf`.
 * - `npm run dev`: IP da rede (não `free.nf`, que redireciona para Lovable e costuma falhar).
 */
export function publicGuestQrOrigin(): string {
  return effectiveGuestQrOrigin();
}

/** Origem síncrona legada (ajuste manual de IP em dev no terminal). */
function livePageOriginForQr(): string | null {
  if (typeof window === "undefined") return null;
  const live = window.location.origin;
  return isTrustedQrOrigin(live) ? live : null;
}

export function syncGuestQrOrigin(): string | null {
  if (typeof window === "undefined") return publicGuestQrOrigin();
  if (isUsableLanIPv4(window.location.hostname)) return window.location.origin;
  const live = livePageOriginForQr();
  if (!isLocalDevHost(window.location.hostname) && live) return live;
  const stored = getStoredQrOrigin();
  if (stored) {
    if (qrOriginPortMismatch(stored)) {
      const fixed = qrOriginWithLivePort(stored);
      if (fixed) {
        setStoredQrOrigin(fixed);
        return fixed;
      }
    }
    return stored;
  }
  return originFromCachedLan();
}

/** Tenta obter IPv4 da LAN (útil em dev com localhost no PC). */
export function discoverLanIPv4(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.RTCPeerConnection) {
      resolve(null);
      return;
    }
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    const ips = new Set<string>();
    let earlyFinishScheduled = false;
    let settled = false;
    const finish = (ip: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        pc.close();
      } catch {
        /* ignore */
      }
      if (ip) cacheLanIp(ip);
      resolve(ip);
    };
    const timer = setTimeout(() => finish(pickBestLanIp(ips)), 3500);
    pc.createDataChannel("rda");
    pc.onicecandidate = (event) => {
      const cand = event.candidate?.candidate;
      if (!cand) return;
      const match = /(\d{1,3}(?:\.\d{1,3}){3})/.exec(cand);
      if (!match) return;
      const ip = match[1]!;
      if (isUsableLanIPv4(ip)) {
        ips.add(ip);
        if (!earlyFinishScheduled) {
          earlyFinishScheduled = true;
          setTimeout(() => finish(pickBestLanIp(ips)), 400);
        }
      }
    };
    void pc
      .createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => finish(null));
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        finish(pickBestLanIp(ips));
      }
    };
  });
}

/** Origem usada no QR no celular — em dev tenta descobrir o IPv4 da LAN primeiro. */
export async function resolveGuestQrOrigin(): Promise<string> {
  const dev = typeof import.meta !== "undefined" && Boolean(import.meta.env.DEV);
  if (dev && typeof window !== "undefined") {
    const ip = await discoverLanIPv4();
    if (ip) {
      const guessed = qrOriginFromLanIp(ip);
      if (guessed) {
        setStoredQrOrigin(guessed);
        return guessed;
      }
    }
  }
  return effectiveGuestQrOrigin();
}

/** URL absoluta para leitura no celular (câmera / leitor de QR). */
export function guestAccessUrl(code: string, origin: string | null | undefined) {
  const path = guestAccessPath(code);
  const base = origin ? normalizeQrOrigin(origin) : null;
  if (!base) return "";
  return `${base}${path}`;
}
