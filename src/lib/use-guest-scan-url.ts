import { useEffect, useState } from "react";
import {
  discoverLanIPv4,
  effectiveGuestQrOrigin,
  guestAccessUrl,
  normalizeCredentialCode,
  qrOriginFromLanIp,
  setStoredQrOrigin,
} from "./guest-access-url";

function buildScanUrl(credential: string) {
  return guestAccessUrl(credential, effectiveGuestQrOrigin());
}

/** URL absoluta no QR — rede local em dev; domínio público em produção. */
export function useGuestScanUrl(code: string): string {
  const credential = normalizeCredentialCode(code);
  const [url, setUrl] = useState(() =>
    typeof window === "undefined" ? buildScanUrl(credential) : buildScanUrl(credential),
  );

  useEffect(() => {
    if (typeof import.meta === "undefined" || !import.meta.env.DEV) return;

    let cancelled = false;
    const apply = () => {
      if (!cancelled) setUrl(buildScanUrl(credential));
    };

    void discoverLanIPv4().then((ip) => {
      if (cancelled || !ip) return;
      const guessed = qrOriginFromLanIp(ip);
      if (guessed) setStoredQrOrigin(guessed);
      apply();
    });

    apply();
    const poll = window.setInterval(apply, 800);
    const onOrigin = () => apply();
    window.addEventListener("rda-qr-origin", onOrigin);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("rda-qr-origin", onOrigin);
    };
  }, [credential]);

  return url;
}
