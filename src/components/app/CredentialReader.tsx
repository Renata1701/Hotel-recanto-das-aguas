import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * USB barcode scanners behave as keyboards ending with Enter, so a focused input
 * covers both scanner and manual typing. Camera reading is a server/HTTPS concern
 * and can plug into `onRead` later.
 */
export function CredentialReader({ onRead, demoCodes }: { onRead: (code: string) => void; demoCodes?: { code: string; label: string }[] }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onRead(value);
          setValue("");
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Escaneie ou digite a credencial"
            className="h-11 pl-9 font-mono uppercase"
            aria-label="Código da credencial"
          />
          {value && (
            <button type="button" onClick={() => setValue("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button type="submit" className="h-11">Ler</Button>
      </form>
      {demoCodes ? (
        demoCodes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {demoCodes.map((d) => (
              <button
                key={d.code}
                type="button"
                onClick={() => onRead(d.code)}
                className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum hóspede com credencial ativa. Cadastre na recepção.</p>
        )
      ) : null}
    </div>
  );
}
