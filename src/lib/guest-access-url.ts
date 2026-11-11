const QR_ORIGIN_KEY = "rda-guest-qr-origin";

const envOrigin =
  typeof import.meta !== "undefined" && import.meta.env.VITE_PUBLIC_APP_URL
    ? normalizeQrOrigin(String(import.meta.env.VITE_PUBLIC_APP_URL))
    : undefined;

export function normalizeCredentialCode(code: string) {
  return code.trim().toUpperCase();
}

export function normalizeQrOrigin(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol}//${u.host}`;
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
  if (originHostIsBroken(normalized) || isExampleQrOrigin(normalized)) {
    localStorage.removeItem(QR_ORIGIN_KEY);
    return null;
  }
  return normalized;
}

export function setStoredQrOrigin(origin: string) {
  const normalized = normalizeQrOrigin(origin);
  if (!normalized || typeof window === "undefined") return null;
  if (originHostIsBroken(normalized) || isExampleQrOrigin(normalized)) return null;
  localStorage.setItem(QR_ORIGIN_KEY, normalized);
  window.dispatchEvent(new Event("rda-qr-origin"));
  return normalized;
}

/** Caminho interno (links no app / QR) — abre tela de PIN com credencial preenchida. */
export function guestAccessPath(code: string) {
  const params = new URLSearchParams({ codigo: normalizeCredentialCode(code), qr: "1" });
  return `/cliente/entrar?${params.toString()}`;
}

/** Origem síncrona: domínio público ou IP já na barra do navegador. */
export function syncGuestQrOrigin(): string | null {
  if (envOrigin) return envOrigin;
  if (typeof window === "undefined") return null;
  if (isUsableLanIPv4(window.location.hostname)) return window.location.origin;
  if (!isLocalDevHost(window.location.hostname)) return window.location.origin;
  return getStoredQrOrigin();
}

/** Tenta obter IPv4 da LAN (útil em dev com localhost no PC). */
export function discoverLanIPv4(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.RTCPeerConnection) {
      resolve(null);
      return;
    }
    const pc = new RTCPeerConnection({ iceServers: [] });
    const ips = new Set<string>();
    const finish = (ip: string | null) => {
      clearTimeout(timer);
      pc.close();
      resolve(ip);
    };
    const timer = setTimeout(() => finish(pickBestLanIp(ips)), 2500);
    pc.createDataChannel("rda");
    pc.onicecandidate = (event) => {
      const cand = event.candidate?.candidate;
      if (!cand) return;
      const match = /(\d{1,3}(?:\.\d{1,3}){3})/.exec(cand);
      if (!match) return;
      const ip = match[1]!;
      if (isUsableLanIPv4(ip)) {
        ips.add(ip);
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

/** Origem absoluta usada no QR (celular precisa alcançar este host). */
export async function resolveGuestQrOrigin(): Promise<string | null> {
  if (envOrigin) return envOrigin;

  if (typeof window === "undefined") return null;

  const { hostname, protocol } = window.location;
  if (isUsableLanIPv4(hostname)) {
    return window.location.origin;
  }

  if (!isLocalDevHost(hostname)) {
    return window.location.origin;
  }

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

  const lanIp = await discoverLanIPv4();
  if (lanIp) {
    const guessed = qrOriginFromLanIp(lanIp, protocol);
    if (guessed && setStoredQrOrigin(guessed)) {
      return guessed;
    }
  }

  return null;
}

/** URL absoluta para leitura no celular (câmera / leitor de QR). */
export function guestAccessUrl(code: string, origin: string | null | undefined) {
  const path = guestAccessPath(code);
  const base = origin ? normalizeQrOrigin(origin) : null;
  if (!base) return "";
  return `${base}${path}`;
}
