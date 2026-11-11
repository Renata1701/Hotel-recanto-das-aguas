import { createFileRoute } from "@tanstack/react-router";
import { requireStaffAuth } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BedDouble,
  CheckCircle2,
  CupSoda,
  Minus,
  Plus,
  Receipt,
  Search,
  Send,
  ShoppingBag,
  Sun,
  Trash2,
  UserRound,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import { StaffLayout, Countdown, EmptyState, Panel, StatusPill, fmtTime } from "@/components/app/shared";
import { CredentialReader } from "@/components/app/CredentialReader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  brl,
  cancelProposal,
  createProposal,
  credentialQuickPicks,
  DomainError,
  productsInSector,
  resolveCredential,
  type Category,
  type Sector,
} from "@/lib/domain";
import { commit, getState, resetDemo, useStore } from "@/lib/store";

export const Route = createFileRoute("/atendente")({
  beforeLoad: ({ location }) => requireStaffAuth(location.pathname),
  head: () => ({
    meta: [
      { title: "Atendente · Recanto das Águas" },
      { name: "description", content: "Catálogo, leitura de credencial e envio de propostas de consumo para confirmação." },
      { property: "og:title", content: "Atendente · Recanto das Águas" },
      { property: "og:description", content: "Monte o pedido e envie para o hóspede confirmar." },
    ],
  }),
  component: Attendant,
});

const ATTENDANT = "Lucas (bar)";
const categories: ("Todos" | Category)[] = ["Todos", "Bebidas", "Drinks", "Porções", "Pratos", "Sobremesas"];

const sectorNav: { id: Sector; label: string; short: string; icon: typeof Waves }[] = [
  { id: "Bar da Piscina", label: "Bar da Piscina", short: "Bar", icon: Waves },
  { id: "Restaurante", label: "Restaurante", short: "Rest.", icon: UtensilsCrossed },
  { id: "Lanchonete", label: "Lanchonete", short: "Lanche", icon: CupSoda },
];

type Cart = Record<string, { qty: number; note?: string | undefined }>;
const newOp = () => crypto.randomUUID();

function Attendant() {
  const products = useStore((s) => s.products);
  const proposals = useStore((s) => s.proposals);
  const state = useStore((s) => s);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof categories)[number]>("Todos");
  const [sector, setSector] = useState<Sector>("Bar da Piscina");
  const [cart, setCart] = useState<Cart>({});
  const [credCode, setCredCode] = useState<string | null>(null);
  const [opId, setOpId] = useState(newOp);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  const guestQuickPicks = useMemo(() => credentialQuickPicks(state), [state]);

  const identified = useMemo(() => {
    if (!credCode) return null;
    try {
      return resolveCredential(state, credCode);
    } catch (e) {
      return { error: (e as DomainError).message };
    }
  }, [credCode, state]);

  const sectorProducts = useMemo(() => productsInSector(products, sector), [products, sector]);

  const categoryOptions = useMemo((): ("Todos" | Category)[] => {
    const inMenu = new Set<"Todos" | Category>(sectorProducts.map((p) => p.category));
    const list = categories.slice(1).filter((c) => inMenu.has(c));
    return ["Todos", ...list];
  }, [sectorProducts]);

  useEffect(() => {
    if (cat !== "Todos" && !categoryOptions.includes(cat)) setCat("Todos");
  }, [categoryOptions, cat]);

  const filtered = sectorProducts.filter(
    (p) => (cat === "Todos" || p.category === cat) && p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const pickSector = (next: Sector) => {
    if (next === sector) return;
    setSector(next);
    setCart({});
    setCat("Todos");
    toast.message(`Cardápio do ${next}`);
  };
  const lines = Object.entries(cart).map(([id, v]) => ({ product: products.find((p) => p.id === id)!, ...v }));
  const total = lines.reduce((a, l) => a + l.product.price * l.qty, 0);
  const tracking = proposals.find((p) => p.id === trackingId);
  const myHistory = proposals.filter((p) => p.attendant === ATTENDANT).slice(0, 8);

  const setQty = (id: string, delta: number) =>
    setCart((c) => {
      const qty = (c[id]?.qty ?? 0) + delta;
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = { ...c[id], qty };
      return next;
    });

  const read = (code: string) => {
    try {
      const r = resolveCredential(getState(), code);
      setCredCode(r.cred.code);
      toast.success(`${r.participant.name} identificado`);
    } catch (e) {
      setCredCode(null);
      toast.error((e as Error).message);
    }
  };

  const send = () => {
    if (!credCode) return;
    let id = "";
    const err = commit((s) => {
      const r = createProposal(s, {
        credentialCode: credCode,
        sector,
        attendant: ATTENDANT,
        operationId: opId,
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty, note: l.note })),
      });
      id = r.proposal.id;
      return r.state;
    });
    if (err) {
      toast.error(err);
      return;
    }
    setTrackingId(id);
    setCart({});
    setOpId(newOp());
    toast.message("Proposta enviada. Aguardando o cliente.");
  };

  return (
    <StaffLayout fillViewport subtitle={`Atendimento · ${ATTENDANT}`}>
      <main className="mx-auto grid h-full min-h-0 max-w-[100rem] flex-1 gap-3 overflow-hidden px-3 py-3 sm:px-4 lg:grid-cols-[10.5rem_minmax(0,1fr)_20rem] xl:grid-cols-[11rem_minmax(0,1fr)_21rem]">
        <aside className="flex min-h-0 flex-col lg:h-full">
          <nav
            className="flex flex-row gap-1.5 overflow-x-auto rounded-xl border border-border/80 bg-card p-1.5 shadow-soft lg:flex-col lg:gap-1 lg:overflow-hidden lg:p-2"
            aria-label="Setor de atendimento"
          >
            <p className="hidden w-full px-1.5 pb-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground lg:block">
              Setor
            </p>
            {sectorNav.map((s) => {
              const Icon = s.icon;
              const active = sector === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickSector(s.id)}
                  className={cn(
                    "flex min-w-[6.5rem] shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-all sm:text-sm lg:min-w-0 lg:w-full",
                    active
                      ? "bg-brand-gradient text-accent-foreground shadow-md"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate lg:hidden">{s.short}</span>
                  <span className="hidden truncate lg:inline">{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produto"
                className="h-10 w-full rounded-xl border-border/80 bg-card pl-9 text-sm shadow-sm"
              />
            </div>
            <div className="flex shrink-0 gap-1 overflow-x-auto">
            {categoryOptions.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm",
                  cat === c
                    ? "border-transparent bg-brand-gradient text-accent-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Search className="size-5" />}
                title={sectorProducts.length === 0 ? "Cardápio não carregado" : "Nenhum produto encontrado"}
                hint={
                  sectorProducts.length === 0
                    ? "Dados antigos no navegador. Restaure a demonstração."
                    : "Tente outra categoria ou limpe a busca."
                }
                action={
                  sectorProducts.length === 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        resetDemo();
                        toast.success("Cardápio restaurado.");
                      }}
                    >
                      Restaurar cardápio
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid h-full auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {filtered.map((p) => {
                  const inCart = cart[p.id]?.qty ?? 0;
                  return (
                    <button
                      key={p.id}
                      disabled={!p.available}
                      onClick={() => setQty(p.id, 1)}
                      className={cn(
                        "group relative flex min-h-0 flex-col justify-between rounded-xl border border-border/80 bg-card p-2.5 text-left shadow-soft transition-all",
                        p.available ? "hover:border-primary/35 hover:shadow-md" : "cursor-not-allowed opacity-55",
                        inCart > 0 && "border-primary ring-1 ring-primary/20",
                      )}
                    >
                      <div className="min-w-0">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{p.category}</span>
                        <span className="mt-0.5 line-clamp-2 text-xs font-semibold leading-tight sm:text-sm">{p.name}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <span className="tabular text-sm font-bold text-primary sm:text-base">{brl(p.price)}</span>
                        {p.available ? (
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-primary transition-all group-hover:bg-brand-gradient group-hover:text-accent-foreground">
                            <Plus className="size-3.5" />
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground">—</span>
                        )}
                      </div>
                      {inCart > 0 && (
                        <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                          {inCart}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {myHistory.length > 0 && (
            <details className="shrink-0 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs shadow-soft">
              <summary className="cursor-pointer font-medium text-muted-foreground">Operações recentes ({myHistory.length})</summary>
              <ul className="mt-2 max-h-24 divide-y overflow-y-auto">
                {myHistory.map((p) => {
                  const st = state.stays.find((s) => s.id === p.stayId);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setTrackingId(p.id)}
                        className="flex w-full items-center gap-2 py-1.5 text-left hover:text-primary"
                      >
                        <span className="font-mono text-[10px] text-muted-foreground">{fmtTime(p.createdAt).split(" ")[1]}</span>
                        <span className="min-w-0 flex-1 truncate">{st?.room ? `Q. ${st.room}` : "Day use"}</span>
                        <StatusPill status={p.status} className="scale-90" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </div>

        <aside className="flex min-h-0 flex-col gap-2 overflow-y-auto overflow-x-hidden">
          <Panel title="1 · Identificar consumidor" className="shrink-0 [&>div:last-child]:p-3.5">
            <CredentialReader onRead={read} demoCodes={guestQuickPicks} />
            {identified && "error" in identified && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{identified.error}</p>}
            {identified && "cred" in identified && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-secondary p-3">
                <span className="grid size-10 place-items-center rounded-full bg-card text-primary"><UserRound className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{identified.participant.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {identified.stay.room ? <><BedDouble className="size-3.5" /> Quarto {identified.stay.room}</> : <><Sun className="size-3.5" /> Day use, sem quarto</>}
                    {" · "}{identified.cred.medium}
                  </p>
                </div>
                <button onClick={() => setCredCode(null)} className="text-xs text-muted-foreground hover:text-foreground">Trocar</button>
              </div>
            )}
          </Panel>

          <Panel
            title="2 · Pedido"
            className="flex min-h-0 flex-1 flex-col overflow-hidden [&>div:last-child]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1 [&>div:last-child]:flex-col"
            action={lines.length > 0 && <button onClick={() => setCart({})} className="text-xs text-muted-foreground hover:text-destructive">Limpar</button>}
          >
            {lines.length === 0 ? (
              <EmptyState icon={<ShoppingBag className="size-4" />} title="Carrinho vazio" hint="Toque nos produtos." />
            ) : (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {lines.map((l) => (
                  <div key={l.product.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium">{l.product.name}</span>
                      <div className="flex items-center rounded-lg border">
                        <button onClick={() => setQty(l.product.id, -1)} className="p-1.5 hover:text-primary" aria-label="Diminuir">{l.qty === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}</button>
                        <span className="tabular w-6 text-center text-sm font-semibold">{l.qty}</span>
                        <button onClick={() => setQty(l.product.id, 1)} className="p-1.5 hover:text-primary" aria-label="Aumentar"><Plus className="size-3.5" /></button>
                      </div>
                      <span className="tabular w-20 text-right text-sm font-semibold">{brl(l.product.price * l.qty)}</span>
                    </div>
                    <input
                      value={l.note ?? ""}
                      onChange={(e) => setCart((c) => ({ ...c, [l.product.id]: { qty: l.qty, note: e.target.value } }))}
                      placeholder="Observação (opcional)"
                      className="w-full rounded-md border-0 bg-muted/60 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ))}
                <div className="flex items-baseline justify-between border-t pt-2">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="tabular font-display text-xl font-semibold">{brl(total)}</span>
                </div>
              </div>
            )}
            <Button
              onClick={send}
              disabled={!identified || "error" in identified || lines.length === 0}
              className="mt-2 h-10 shrink-0 w-full gap-2 rounded-xl text-sm font-semibold shadow-md"
            >
              <Send className="size-4" /> Enviar para confirmação
            </Button>
          </Panel>

          {tracking && (
            <Panel title="3 · Acompanhamento" className="shrink-0" action={<StatusPill status={tracking.status} />}>
              {tracking.status === "aguardando" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-warning/15 p-3 text-sm">
                    <span className="size-2.5 animate-pulse-ring rounded-full bg-warning" />
                    Aguardando o cliente conferir e confirmar…
                  </div>
                  <Countdown expiresAt={tracking.expiresAt} />
                  <Button variant="outline" className="w-full" onClick={() => { const e = commit((s) => cancelProposal(s, tracking.id, ATTENDANT)); if (e) toast.error(e); }}>Cancelar proposta</Button>
                </div>
              )}
              {tracking.status === "confirmada" && (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-success"><CheckCircle2 className="size-5" /> <span className="font-semibold">Consumo lançado na conta</span></div>
                  <div className="rounded-xl border border-dashed p-3 font-mono text-xs">
                    <p className="mb-2 flex items-center gap-1 font-sans font-semibold"><Receipt className="size-3.5" /> Comprovante digital</p>
                    {tracking.items.map((i) => <p key={i.productId} className="flex justify-between"><span>{i.qty}× {i.name}</span><span>{brl(i.unitPrice * i.qty)}</span></p>)}
                    <p className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>TOTAL</span><span>{brl(tracking.total)}</span></p>
                    <p className="mt-2 text-muted-foreground">#{tracking.id} · {fmtTime(tracking.resolvedAt!)} · via {tracking.resolvedVia}</p>
                  </div>
                </div>
              )}
              {["recusada", "expirada", "cancelada"].includes(tracking.status) && (
                <p className="text-sm text-muted-foreground">Nenhum valor foi lançado. Monte uma nova proposta se necessário.</p>
              )}
            </Panel>
          )}
        </aside>
      </main>
    </StaffLayout>
  );
}
