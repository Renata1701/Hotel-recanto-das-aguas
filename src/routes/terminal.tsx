import { createFileRoute } from "@tanstack/react-router";
import { Monitor, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, Panel, StatusPill } from "@/components/app/shared";
import { ProposalReview } from "@/components/app/ProposalReview";
import { CredentialReader } from "@/components/app/CredentialReader";
import { CredentialQrPanel } from "@/components/app/CredentialQrPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { credentialQuickPicks, DomainError, resolveCredential, resolveProposal } from "@/lib/domain";
import { clearPinFailures, getPinLock, recordPinFailure } from "@/lib/client-session";
import { isLocalDevHost } from "@/lib/guest-access-url";
import { commit, getState, useStore } from "@/lib/store";

export const Route = createFileRoute("/terminal")({
  head: () => ({
    meta: [
      { title: "Terminal de confirmação · Recanto das Águas" },
      { name: "description", content: "RF20 — confirmação com credencial e PIN, sem celular do hóspede." },
    ],
  }),
  component: TerminalPage,
});

function TerminalPage() {
  const state = useStore((s) => s);
  const guestQuickPicks = useMemo(() => credentialQuickPicks(state), [state]);
  const [credCode, setCredCode] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!qrCode && guestQuickPicks[0]) setQrCode(guestQuickPicks[0].code);
  }, [guestQuickPicks, qrCode]);

  const qrDisplayCode = credCode ?? qrCode;

  const identified = useMemo(() => {
    if (!credCode) return null;
    try {
      return resolveCredential(state, credCode);
    } catch (e) {
      return { error: (e as DomainError).message };
    }
  }, [credCode, state]);

  const pending = useMemo(() => {
    if (!identified || "error" in identified) return undefined;
    return state.proposals.find((p) => p.credentialId === identified.cred.id && p.status === "aguardando");
  }, [identified, state.proposals]);

  const reset = () => {
    setCredCode(null);
    setPin("");
  };

  const resolve = (decision: "confirmar" | "recusar") => {
    if (!pending || !identified || "error" in identified) return;
    if (!pin.trim()) {
      toast.error("Informe o PIN do hóspede.");
      return;
    }
    const lock = getPinLock(identified.cred.id);
    if (lock && lock.until > Date.now()) {
      toast.error("PIN bloqueado por 15 minutos após tentativas inválidas.");
      return;
    }
    setBusy(true);
    const err = commit((s) =>
      resolveProposal(s, {
        proposalId: pending.id,
        decision,
        via: "terminal",
        pin,
      }),
    );
    setBusy(false);
    if (err) {
      if (err.includes("PIN")) {
        recordPinFailure(identified.cred.id);
        if (getPinLock(identified.cred.id)?.failures && getPinLock(identified.cred.id)!.failures >= 5)
          toast.error("5 tentativas incorretas. Aguarde 15 minutos.");
        else toast.error(err);
      } else toast.error(err);
      return;
    }
    clearPinFailures(identified.cred.id);
    toast.success(decision === "confirmar" ? "Consumo confirmado." : "Proposta recusada.");
    setTimeout(reset, 2500);
  };

  const read = (code: string) => {
    const normalized = code.trim().toUpperCase();
    try {
      resolveCredential(getState(), normalized);
      setCredCode(normalized);
      setQrCode(normalized);
      setPin("");
      toast.message("Credencial lida. QR atualizado; informe o PIN se houver proposta.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Monitor className="size-5 text-primary" />
            <div>
              <p className="font-semibold">Terminal de confirmação</p>
              <p className="text-xs text-muted-foreground">Voltado ao hóspede — dados limpos ao concluir</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={reset}>
            <RotateCcw className="size-3.5" /> Limpar tela
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-2xl gap-4 px-4 py-6">
        {typeof window !== "undefined" && isLocalDevHost(window.location.hostname) ? (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            <strong>Para o QR abrir o PIN no celular:</strong> use o <strong>IPv4 do Wi‑Fi</strong> na barra do navegador (ex.{" "}
            <span className="font-mono">http://192.168.0.23:8080/terminal</span>) e clique{" "}
            <strong>Usar IP detectado</strong> no QR — depois escaneie.
          </p>
        ) : null}
        <Panel title="1 · Ler credencial">
          <CredentialReader onRead={read} demoCodes={guestQuickPicks} />
          {identified && "error" in identified && (
            <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{identified.error}</p>
          )}
          {identified && "cred" in identified && (
            <p className="mt-3 text-sm">
              Consumidor identificado: <b>{identified.participant.name}</b> · {identified.stay.room ? `Quarto ${identified.stay.room}` : "Day use"}
            </p>
          )}
        </Panel>

        <CredentialQrPanel
          code={qrDisplayCode}
          compact
          demoCodes={guestQuickPicks}
          onSelectDemo={(code) => {
            setQrCode(code.trim().toUpperCase());
            toast.message("QR gerado. Aponte o celular para o código.");
          }}
        />

        {identified && "cred" in identified && (
          <Panel title="3 · Conferir e confirmar com PIN (RF20)">
            {!pending ? (
              <EmptyState icon={<Monitor className="size-5" />} title="Sem proposta aguardando" hint="Peça ao atendente para enviar o pedido." />
            ) : (
              <div className="space-y-4">
                <ProposalReview
                  proposal={pending}
                  onConfirm={() => resolve("confirmar")}
                  onRefuse={() => resolve("recusar")}
                  busy={busy}
                />
                <div className="space-y-1.5 border-t pt-4">
                  <Label htmlFor="tpin">PIN do hóspede</Label>
                  <Input
                    id="tpin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="h-12 text-center text-lg tracking-widest"
                    placeholder="••••"
                  />
                  <p className="text-xs text-muted-foreground">O PIN não é exibido ao atendente (RN — identificação ≠ autorização).</p>
                </div>
              </div>
            )}
          </Panel>
        )}

        {pending && (
          <div className="text-center">
            <StatusPill status={pending.status} />
          </div>
        )}
      </main>
    </div>
  );
}
