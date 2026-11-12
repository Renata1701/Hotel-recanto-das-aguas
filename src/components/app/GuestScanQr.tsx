import { QRCodeCanvas } from "qrcode.react";
import { isCorruptQrHostname } from "@/lib/guest-access-url";
import { useGuestScanUrl } from "@/lib/use-guest-scan-url";

/** QR compacto — atendente / acompanhamento (rede local em dev, domínio público em produção). */
export function GuestScanQr({ code, size = 112 }: { code: string; size?: number }) {
  const scanUrl = useGuestScanUrl(code);
  const brokenHost = (() => {
    try {
      return isCorruptQrHostname(new URL(scanUrl).hostname);
    } catch {
      return false;
    }
  })();
  const brokenPublic =
    typeof import.meta !== "undefined" &&
    import.meta.env.DEV &&
    scanUrl.includes("free.nf");

  return (
    <div className="space-y-2">
      {brokenHost ? (
        <p className="rounded-lg bg-destructive/10 px-2 py-1.5 text-[10px] leading-snug text-destructive">
          URL do QR inválida (secret Lovable). Em Secrets use só{" "}
          <span className="font-mono">http://sitema-hotel.free.nf</span>, sem o nome da variável.
        </p>
      ) : null}
      {brokenPublic ? (
        <p className="rounded-lg bg-amber-500/15 px-2 py-1.5 text-[10px] leading-snug text-amber-950">
          Este QR aponta para <span className="font-mono">free.nf</span> (redirect). Em dev use o IP da rede (ex.{" "}
          <span className="font-mono">192.168.x.x:8081</span>) ou configure em Recepção → credenciais.
        </p>
      ) : null}
      <div className="flex justify-center rounded-xl border border-border/80 bg-white p-3 shadow-inner">
        {scanUrl ? (
          <QRCodeCanvas value={scanUrl} size={size} level="H" includeMargin aria-label="QR para abrir o app no celular" />
        ) : (
          <p className="max-w-[8rem] text-center text-[10px] text-muted-foreground">Aguardando endereço do servidor…</p>
        )}
      </div>
    </div>
  );
}
