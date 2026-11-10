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

export function getStoredQrOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(QR_ORIGIN_KEY);
  return raw ? normalizeQrOrigin(raw) : null;
}

export function setStoredQrOrigin(origin: string) {
  const normalized = normalizeQrOrigin(origin);
  if (!normalized || typeof window === "undefined") return null;
  localStorage.setItem(QR_ORIGIN_KEY, normalized);
  window.dispatchEvent(new Event("rda-qr-origin"));
  return normalized;
}

/** Caminho interno (links no app). */
export function guestAccessPath(code: string) {
  const params = new URLSearchParams({ codigo: normalizeCredentialCode(code) });
  return `/acesso?${params.toString()}`;
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
    const timer = setTimeout(() => finish(ips.size ? [...ips][0]! : null), 2500);
    pc.createDataChannel("rda");
    pc.onicecandidate = (event) => {
      const cand = event.candidate?.candidate;
      if (!cand) return;
      const match = /(\d{1,3}(?:\.\d{1,3}){3})/.exec(cand);
      if (!match) return;
      const ip = match[1]!;
      if (
        ip.startsWith("192.168.") ||
        ip.startsWith("10.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
      ) {
        ips.add(ip);
      }
    };
    void pc
      .createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => finish(null));
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        finish(ips.size ? [...ips][0]! : null);
      }
    };
  });
}

/** Origem absoluta usada no QR (celular precisa alcançar este host). */
export async function resolveGuestQrOrigin(): Promise<string | null> {
  if (envOrigin) return envOrigin;

  if (typeof window === "undefined") return null;

  const stored = getStoredQrOrigin();
  if (stored) return stored;

  const { hostname, protocol, port } = window.location;
  if (!isLocalDevHost(hostname)) {
    return window.location.origin;
  }

  const lanIp = await discoverLanIPv4();
  if (lanIp) {
    const p = port || (protocol === "https:" ? "443" : "80");
    const showPort = (protocol === "https:" && p !== "443") || (protocol === "http:" && p !== "80");
    const host = showPort ? `${lanIp}:${p}` : lanIp;
    const guessed = normalizeQrOrigin(`${protocol}//${host}`);
    if (guessed) {
      setStoredQrOrigin(guessed);
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
