import { QRCodeCanvas } from "qrcode.react";
import { useGuestScanUrl } from "@/lib/use-guest-scan-url";

/** QR compacto — atendente / acompanhamento (URL pública, sem IP local). */
export function GuestScanQr({ code, size = 112 }: { code: string; size?: number }) {
  const scanUrl = useGuestScanUrl(code);

  return (
    <div className="flex justify-center rounded-xl border border-border/80 bg-white p-3 shadow-inner">
      <QRCodeCanvas value={scanUrl} size={size} level="H" includeMargin aria-label="QR para abrir o app no celular" />
    </div>
  );
}
