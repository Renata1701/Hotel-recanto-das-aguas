import { guestAccessUrl, normalizeCredentialCode, publicGuestQrOrigin } from "./guest-access-url";

/** URL absoluta no QR (`/cliente/entrar?codigo=…`) — domínio público. */
export function useGuestScanUrl(code: string): string {
  const credential = normalizeCredentialCode(code);
  return guestAccessUrl(credential, publicGuestQrOrigin());
}
