import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { CredentialCodes, Panel } from "@/components/app/shared";
import { guestAccessUrl, normalizeCredentialCode, resolveGuestQrOrigin } from "@/lib/guest-access-url";

type DemoCode = { code: string; label: string };

/** QR que abre `/acesso?codigo=…` no celular para digitar o token. */
export function CredentialQrPanel({
  code,
  compact,
  className,
  demoCodes,
  onSelectDemo,
}: {
  code: string;
  compact?: boolean;
  className?: string;
  demoCodes?: DemoCode[];
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

  const url = guestAccessUrl(normalized, origin);

  return (
    <Panel
      className={className}
      title={
        <span className="inline-flex items-center gap-2">
          <QrCode className="size-4 text-primary" aria-hidden />
          2 · Gerar QR para o celular
        </span>
      }
    >
      {demoCodes && demoCodes.length > 0 && onSelectDemo ? (
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
      <p className="mb-3 text-sm text-muted-foreground">
        Escaneie com a câmera do celular. Abre a tela <strong className="font-medium text-foreground">Digite seu PIN</strong> com a
        credencial já preenchida.
      </p>
      <p className="mb-3 rounded-lg bg-secondary/40 px-3 py-2 font-mono text-center text-xs text-foreground">{normalized}</p>
      <CredentialCodes code={normalized} compact={compact} />
      {url ? (
        <p className="mt-2 break-all text-center font-mono text-[10px] text-muted-foreground">{url}</p>
      ) : (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Em desenvolvimento: configure o IP do PC na rede (caixa amarela acima) para o celular abrir o link.
        </p>
      )}
    </Panel>
  );
}
