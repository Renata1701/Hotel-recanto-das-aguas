import { createFileRoute, Link } from "@tanstack/react-router";
import { BedDouble, ChevronLeft, ChevronRight, UserPlus, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ReceptionCheckInDialog } from "@/components/app/ReceptionCheckIn";
import { StaffLayout, EmptyState, Panel } from "@/components/app/shared";
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
  formatStayPeriod,
  registerPayment,
  reissueCredential,
  type PaymentMethod,
  type Stay,
} from "@/lib/domain";
import { commit, useStore } from "@/lib/store";

type RecepcaoSearch = { novo?: boolean | undefined };

const STAYS_PAGE_SIZE = 6;

function stayHolderName(st: Stay): string | undefined {
  return st.participants.find((p) => p.id === st.holderId)?.name;
}

function stayPlaceLabel(st: Stay): string {
  return st.room ? `Quarto ${st.room}` : "Day use";
}

export const Route = createFileRoute("/recepcao")({
  beforeLoad: ({ location }) => requireStaffAuth(location.pathname),
  validateSearch: (search: Record<string, unknown>): RecepcaoSearch => {
    const raw = search["novo"];
    return { novo: raw === true || raw === "1" || raw === 1 };
  },
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
  const { novo } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [stayPage, setStayPage] = useState(1);
  const [payStayId, setPayStayId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Pix");

  const openStays = useMemo(
    () =>
      state.stays
        .filter((s) => s.status !== "encerrada")
        .slice()
        .sort((a, b) => b.openedAt - a.openedAt),
    [state.stays],
  );
  const totalStayPages = Math.max(1, Math.ceil(openStays.length / STAYS_PAGE_SIZE));
  const safeStayPage = Math.min(stayPage, totalStayPages);

  useEffect(() => {
    setStayPage((p) => Math.min(p, totalStayPages));
  }, [totalStayPages, openStays.length]);

  useEffect(() => {
    if (novo) {
      setCheckInOpen(true);
      void navigate({ to: "/recepcao", search: {}, replace: true });
    }
  }, [novo, navigate]);

  const pagedStays = openStays.slice(
    (safeStayPage - 1) * STAYS_PAGE_SIZE,
    safeStayPage * STAYS_PAGE_SIZE,
  );

  const pay = () => {
    const cents = Math.round(parseFloat(payAmount.replace(",", ".")) * 100);
    if (!payStayId || !cents) {
      toast.error("Informe conta e valor.");
      return;
    }
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
      <main className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Recepção</h1>
            <p className="text-xs text-muted-foreground">{openStays.length} conta(s) aberta(s)</p>
          </div>
          <Button type="button" className="h-10 gap-2" onClick={() => setCheckInOpen(true)}>
            <UserPlus className="size-4" />
            Novo cliente
          </Button>
        </div>

        <Panel
          title={`Contas abertas · página ${safeStayPage} de ${totalStayPages}`}
          className="flex min-h-0 flex-1 flex-col overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1 [&>div:last-child]:flex-col"
        >
          {openStays.length === 0 ? (
            <EmptyState
              icon={<BedDouble className="size-5" />}
              title="Nenhuma conta aberta"
              hint='Toque em "Novo cliente" para abrir uma permanência.'
            />
          ) : (
            <>
              <ul className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {pagedStays.map((st) => {
                  const bals = balance(state, st.id);
                  const creds = state.credentials.filter((c) => c.stayId === st.id);
                  return (
                    <li key={st.id} className="flex min-h-0 flex-col rounded-xl border bg-secondary/20 p-2.5 text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block truncate font-semibold">{stayHolderName(st) ?? stayPlaceLabel(st)}</span>
                          {stayHolderName(st) ? (
                            <span className="text-[11px] text-muted-foreground">{stayPlaceLabel(st)}</span>
                          ) : null}
                          {formatStayPeriod(st) ? (
                            <span className="block text-[10px] text-muted-foreground">{formatStayPeriod(st)}</span>
                          ) : null}
                        </div>
                        <span className="shrink-0 tabular text-xs font-medium text-primary">{brl(bals.due)}</span>
                      </div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{st.status}</p>
                      <ul className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-hidden border-t border-border/60 pt-1.5 text-xs text-muted-foreground">
                        {creds.map((c) => (
                          <li key={c.id} className="rounded-md bg-card/80 px-2 py-1">
                            <span className="block font-mono text-[10px] text-foreground">{c.code}</span>
                            {c.status === "ativa" && (
                              <div className="mt-0.5 flex flex-wrap gap-x-2">
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
                                <Link
                                  to="/acesso"
                                  search={{ codigo: c.code }}
                                  className="text-primary hover:underline"
                                  target="_blank"
                                  rel="noreferrer"
                                >
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
                        className="mt-1.5 h-8 w-full shrink-0"
                        disabled={bals.due !== 0}
                        onClick={() => close(st.id)}
                      >
                        Encerrar conta
                      </Button>
                    </li>
                  );
                })}
              </ul>

              {openStays.length > STAYS_PAGE_SIZE && (
                <div className="mt-2 flex shrink-0 items-center justify-between gap-2 border-t border-border/80 pt-2">
                  <p className="text-xs text-muted-foreground">
                    {openStays.length} contas · {STAYS_PAGE_SIZE} por página
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 px-2"
                      disabled={safeStayPage <= 1}
                      onClick={() => setStayPage((p) => p - 1)}
                    >
                      <ChevronLeft className="size-4" /> Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 px-2"
                      disabled={safeStayPage >= totalStayPages}
                      onClick={() => setStayPage((p) => p + 1)}
                    >
                      Próxima <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>

        <Panel title="Registrar pagamento (RF24)" className="shrink-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Permanência</Label>
                <Select value={payStayId} onValueChange={setPayStayId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {openStays.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {stayHolderName(st) ? `${stayHolderName(st)} · ${stayPlaceLabel(st)}` : stayPlaceLabel(st)} (
                        {brl(balance(state, st.id).due)})
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

        <ReceptionCheckInDialog
          open={checkInOpen}
          onOpenChange={setCheckInOpen}
          actor={actor}
          onCheckInSuccess={(result) => {
            setStayPage(1);
            setPayStayId(result.stayId);
            const place = result.room ? `quarto ${result.room}` : "day use";
            const codes = result.credentialCodes.join(", ");
            toast.message(`${result.holderName} cadastrado em ${place}. Credencial: ${codes}`);
          }}
        />
      </main>
    </StaffLayout>
  );
}
