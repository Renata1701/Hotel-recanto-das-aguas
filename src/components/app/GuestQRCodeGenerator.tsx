import { QrCode } from "lucide-react";
import { CredentialCodes } from "@/components/app/shared";
import { normalizeCredentialCode } from "@/lib/guest-access-url";

/**
 * QR do hóspede — URL dinâmica via `guestAccessUrl` (`/acesso?codigo=…`).
 * Em produção, defina `VITE_PUBLIC_APP_URL` (ex. https://recantodasaguas.com.br).
 */
export function GuestQRCodeGenerator({ credentialId }: { credentialId: string }) {
  const code = normalizeCredentialCode(credentialId);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-border/90 bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-2 font-semibold text-primary">
        <QrCode className="size-5" aria-hidden />
        <span className="font-mono text-sm text-foreground">{code}</span>
      </div>

      <CredentialCodes code={code} />

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Aponte a câmera do celular para escanear e acessar a área do hóspede.
      </p>
    </div>
  );
}
