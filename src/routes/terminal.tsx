import { createFileRoute } from "@tanstack/react-router";
import { Monitor, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CredentialCodes, EmptyState, StatusPill } from "@/components/app/shared";
import { ProposalReview } from "@/components/app/ProposalReview";
import { CredentialReader } from "@/components/app/CredentialReader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { brl, DomainError, findParticipant, findStay, resolveCredential, resolveProposal } from "@/lib/domain";
import { clearPinFailures, getPinLock, recordPinFailure } from "@/lib/client-session";
import { commit, getState, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/terminal")({
  head: () => ({
    meta: [{ title: "Terminal de confirmação · Recanto das Águas" }],
  }),
  component: TerminalPage,
});

function TerminalPage() {
  const state = useStore((s) => s);
  const [credCode, setCredCode] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

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

  const confirmedClients = useMemo(() => {
    return state.proposals
      .filter((p) => p.status === "confirmada")
      .map((p) => {
        const stay = findStay(state, p.stayId);
        const participant = findParticipant(stay, p.participantId);
        return {
          id: p.id,
          name: participant?.name ?? "Hóspede",
          total: p.total,
          at: p.resolvedAt ?? p.createdAt,
        };
      })
      .sort((a, b) => b.at - a.at);
  }, [state.proposals, state.stays]);

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
      setPin("");
      toast.message("Credencial lida.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted/30">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/80 bg-card px-4">
        <div className="flex items-center gap-2">
          <Monitor className="size-5 text-primary" aria-hidden />
          <h1 className="text-sm font-semibold sm:text-base">Terminal de confirmação</h1>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5" onClick={reset}>
          <RotateCcw className="size-3.5" aria-hidden />
          Limpar
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-2 p-2 md:gap-3 md:p-3">
        <div className="grid min-h-0 grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <section className="shrink-0 rounded-xl border border-border/90 bg-card p-3 shadow-soft">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">1 · Credencial</h2>
            <CredentialReader onRead={read} />
            {identified && "error" in identified && (
              <p className="mt-2 rounded-lg bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{identified.error}</p>
            )}
            {identified && "cred" in identified && (
              <p className="mt-2 text-sm">
                <span className="font-semibold">{identified.participant.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {identified.stay.room ? `Quarto ${identified.stay.room}` : "Day use"}
                </span>
              </p>
            )}
          </section>

          <section
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/90 bg-card shadow-soft",
              !credCode && "justify-center p-4 text-center text-sm text-muted-foreground",
            )}
          >
            {credCode ? (
              <>
                <h2 className="shrink-0 border-b border-border/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  QR no celular
                </h2>
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
                  <CredentialCodes code={credCode} compact kiosk />
                </div>
              </>
            ) : (
              <p className="p-4">Leia a credencial para gerar o QR.</p>
            )}
          </section>
        </div>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/90 bg-card shadow-soft">
          <h2 className="shrink-0 border-b border-border/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            2 · Confirmar consumo
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {!identified || "error" in identified ? (
              <EmptyState
                icon={<Monitor className="size-5" />}
                title="Aguardando credencial"
                hint="Escaneie ou digite o código do hóspede."
              />
            ) : !pending ? (
              <EmptyState
                icon={<Monitor className="size-5" />}
                title="Sem proposta pendente"
                hint="O atendente envia o pedido antes da confirmação."
              />
            ) : (
              <div className="flex flex-col gap-3">
                <ProposalReview
                  proposal={pending}
                  onConfirm={() => resolve("confirmar")}
                  onRefuse={() => resolve("recusar")}
                  busy={busy}
                  className="space-y-3 [&_.font-display]:text-xl"
                />
                <div className="space-y-1.5 border-t border-border/80 pt-3">
                  <Label htmlFor="tpin" className="text-xs">
                    PIN do hóspede
                  </Label>
                  <Input
                    id="tpin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="h-11 text-center text-lg tracking-widest"
                    placeholder="••••"
                  />
                </div>
                <StatusPill status={pending.status} className="mx-auto" />
              </div>
            )}
          </div>
        </section>
        </div>

        <section className="flex max-h-[min(28vh,11rem)] shrink-0 flex-col overflow-hidden rounded-xl border border-border/90 bg-card shadow-soft">
          <h2 className="shrink-0 border-b border-border/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Consumos confirmados
          </h2>
          {confirmedClients.length === 0 ? (
            <p className="p-3 text-center text-sm text-muted-foreground">Nenhuma confirmação registrada ainda.</p>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-border/80 overflow-y-auto text-sm">
              {confirmedClients.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="truncate font-medium text-foreground">{row.name}</span>
                  <span className="shrink-0 tabular-nums font-semibold text-primary">{brl(row.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
