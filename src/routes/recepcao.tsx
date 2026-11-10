import { createFileRoute, Link } from "@tanstack/react-router";
import { BedDouble, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StaffLayout, CredentialCodes, EmptyState, Panel } from "@/components/app/shared";
import { requireStaffAuth, useStaffSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  balance,
  blockCredential,
  brl,
  closeStay,
  openStay,
  registerPayment,
  reissueCredential,
  type CredentialMedium,
  type PaymentMethod,
  type StayType,
} from "@/lib/domain";
import { commit, getState, useStore } from "@/lib/store";

export const Route = createFileRoute("/recepcao")({
  beforeLoad: ({ location }) => requireStaffAuth(location.pathname),
  head: () => ({
    meta: [
      { title: "Recepção · Recanto das Águas" },
      { name: "description", content: "Permanências, credenciais, pagamentos e encerramento." },
    ],
  }),
  component: RecepcaoPage,
});

function RecepcaoPage() {
  const session = useStaffSession();
  const state = useStore((s) => s);
  const actor = session?.name ?? "Recepção";

  const [type, setType] = useState<StayType>("hospedagem");
  const [room, setRoom] = useState("");
  const [names, setNames] = useState("");
  const [medium, setMedium] = useState<CredentialMedium>("celular");
  const [payStayId, setPayStayId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Pix");
  const [issuedCreds, setIssuedCreds] = useState<typeof state.credentials>([]);

  const openStays = state.stays.filter((s) => s.status !== "encerrada");

  const open = () => {
    const list = names.split(",").map((n) => n.trim()).filter(Boolean);
    let stayId = "";
    const err = commit((s) => {
      const { state: next, stay } = openStay(
        s,
        { type, room: type === "hospedagem" ? room : undefined, names: list, medium },
        actor,
      );
      stayId = stay.id;
      return next;
    });
    if (err) return toast.error(err);
    toast.success("Permanência aberta e credenciais emitidas.");
    setNames("");
    setRoom("");
    setIssuedCreds(getState().credentials.filter((c) => c.stayId === stayId && c.status === "ativa"));
  };

  const pay = () => {
    const cents = Math.round(parseFloat(payAmount.replace(",", ".")) * 100);
    if (!payStayId || !cents) return toast.error("Informe conta e valor.");
    const err = commit((s) => registerPayment(s, { stayId: payStayId, amount: cents, method: payMethod }, actor));
    if (err) toast.error(err);
    else {
      toast.success("Pagamento registrado.");
      setPayAmount("");
    }
  };

  const close = (stayId: string) => {
    const err = commit((s) => closeStay(s, stayId, actor));
    if (err) toast.error(err);
    else toast.success("Conta encerrada; credenciais revogadas.");
  };

  return (
    <StaffLayout subtitle="Recepção / caixa">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
          <Panel title="Abrir permanência (RF03–RF06)" className="h-fit">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(v) => setType(v as StayType)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hospedagem">Hospedagem</SelectItem>
                      <SelectItem value="dayuse">Day use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Meio da credencial</Label>
                  <Select value={medium} onValueChange={(v) => setMedium(v as CredentialMedium)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celular">Celular (web)</SelectItem>
                      <SelectItem value="pulseira">Pulseira</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {type === "hospedagem" && (
                <div className="space-y-1.5">
                  <Label>Quarto</Label>
                  <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ex.: 305" className="h-10" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Participantes (vírgula)</Label>
                <Input
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  placeholder="Responsável, acompanhante…"
                  className="h-10"
                />
              </div>
              <Button type="button" className="h-10 w-full" onClick={open}>
                Abrir e emitir credenciais
              </Button>
            </div>
          </Panel>

          <Panel title={`Contas abertas (${openStays.length})`} className="min-h-0">
            {openStays.length === 0 ? (
              <EmptyState icon={<BedDouble className="size-5" />} title="Nenhuma conta aberta" hint="Abra uma permanência ao lado." />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {openStays.map((st) => {
                  const bals = balance(state, st.id);
                  const creds = state.credentials.filter((c) => c.stayId === st.id);
                  return (
                    <li key={st.id} className="flex flex-col rounded-xl border bg-secondary/20 p-3 text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold">{st.room ? `Quarto ${st.room}` : "Day use"}</span>
                        <span className="shrink-0 tabular text-xs font-medium text-primary">{brl(bals.due)}</span>
                      </div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{st.status}</p>
                      <ul className="mt-2 flex-1 space-y-1.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                        {creds.map((c) => (
                          <li key={c.id} className="rounded-md bg-card/80 px-2 py-1.5">
                            <span className="block font-mono text-[11px] text-foreground">{c.code}</span>
                            <span className="text-[10px]">{c.status}</span>
                            {c.status === "ativa" && (
                              <div className="mt-1 flex flex-wrap gap-x-2">
                                <button
                                  type="button"
                                  className="text-destructive hover:underline"
                                  onClick={() => {
                                    const err = commit((s) => blockCredential(s, c.id, actor));
                                    if (err) toast.error(err);
                                    else toast.message("Credencial bloqueada.");
                                  }}
                                >
                                  Bloquear
                                </button>
                                <button
                                  type="button"
                                  className="text-primary hover:underline"
                                  onClick={() => {
                                    const err = commit((s) => reissueCredential(s, c.id, actor).state);
                                    if (err) toast.error(err);
                                    else toast.message("Nova credencial emitida.");
                                  }}
                                >
                                  Reemitir
                                </button>
                                <Link to="/acesso" search={{ codigo: c.code }} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                                  Acesso web
                                </Link>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-8 w-full"
                        disabled={bals.due !== 0}
                        onClick={() => close(st.id)}
                      >
                        Encerrar conta
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {issuedCreds.length > 0 && (
          <Panel title="Credenciais recém-emitidas">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {issuedCreds.map((c) => {
                const p = state.stays.find((st) => st.id === c.stayId)?.participants.find((x) => x.id === c.participantId);
                return (
                  <li key={c.id} className="rounded-xl border bg-secondary/25 p-3">
                    <p className="text-sm font-semibold">{p?.name}</p>
                    <p className="font-mono text-xs">{c.code}</p>
                    {c.activationCode && (
                      <p className="mt-1 text-xs">
                        Ativação: <span className="font-mono font-semibold">{c.activationCode}</span>
                      </p>
                    )}
                    <Link to="/acesso" search={{ codigo: c.code }} className="text-xs text-primary hover:underline" target="_blank" rel="noreferrer">
                      Abrir link do hóspede
                    </Link>
                    <div className="mt-2 scale-90 origin-top">
                      <CredentialCodes code={c.code} compact />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}

        <Panel title="Registrar pagamento (RF24)">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label>Permanência</Label>
                <Select value={payStayId} onValueChange={setPayStayId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {openStays.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.room ? `Quarto ${st.room}` : "Day use"} ({brl(balance(state, st.id).due)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputMode="decimal" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Forma</Label>
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Pix", "Crédito", "Débito", "Dinheiro"] as PaymentMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="button" className="h-10 shrink-0 gap-2 lg:w-auto" onClick={pay}>
              <Wallet className="size-4" />
              Registrar
            </Button>
          </div>
        </Panel>
      </main>
    </StaffLayout>
  );
}
