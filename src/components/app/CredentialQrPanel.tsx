import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { CredentialCodes, Panel } from "@/components/app/shared";
import { guestAccessUrl, normalizeCredentialCode, publicGuestQrOrigin, resolveGuestQrOrigin } from "@/lib/guest-access-url";

/** QR que abre `/cliente/entrar` no celular para digitar o PIN. */
export function CredentialQrPanel({
  code,
  compact,
  kiosk,
  className,
  demoCodes,
  onSelectDemo,
}: {
  code: string;
  compact?: boolean;
  kiosk?: boolean;
  className?: string;
  demoCodes?: { code: string; label: string }[];
  onSelectDemo?: (code: string) => void;
}) {
  const normalized = normalizeCredentialCode(code);
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void resolveGuestQrOrigin().then((o) => {
        if (!cancelled) setOrigin(o);
      });
    };
    load();
    window.addEventListener("rda-qr-origin", load);
    return () => {
      cancelled = true;
      window.removeEventListener("rda-qr-origin", load);
    };
  }, []);

  const url = guestAccessUrl(normalized, publicGuestQrOrigin());

  const title = kiosk ? (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <QrCode className="size-3.5 text-primary" aria-hidden />
      QR no celular
    </span>
  ) : (
    <span className="inline-flex items-center gap-2">
      <QrCode className="size-4 text-primary" aria-hidden />
      2 · Gerar QR para o celular
    </span>
  );

  return (
    <Panel className={className} title={kiosk ? undefined : title}>
      {kiosk ? <div className="px-2 pt-2">{title}</div> : null}
      {!kiosk && demoCodes && demoCodes.length > 0 && onSelectDemo ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Credencial do QR:</span>
          {demoCodes.map((d) => (
            <button
              key={d.code}
              type="button"
              onClick={() => onSelectDemo(d.code)}
              className={
                normalized === d.code.trim().toUpperCase()
                  ? "rounded-full border border-transparent bg-brand-gradient px-3 py-1 text-xs font-medium text-accent-foreground shadow-sm"
                  : "rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      ) : null}
      {!kiosk ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Escaneie com a câmera do celular para abrir o login com a credencial preenchida.
        </p>
      ) : null}
      {!kiosk ? (
        <p className="mb-3 rounded-lg bg-secondary/40 px-3 py-2 text-center font-mono text-xs text-foreground">{normalized}</p>
      ) : null}
      <CredentialCodes code={normalized} compact={compact} kiosk={kiosk} />
      {!kiosk && !url ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Defina a URL pública do app (ex. domínio free.nf) para gerar o QR.
        </p>
      ) : null}
    </Panel>
  );
}
