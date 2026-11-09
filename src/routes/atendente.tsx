import { createFileRoute } from "@tanstack/react-router";
import { requireStaffAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Ban, BedDouble, CheckCircle2, Minus, Plus, Receipt, Search, Send, ShoppingBag, Sun, Trash2, UserRound } from "lucide-react";
import { AppHeader, Countdown, EmptyState, Panel, StatusPill, fmtTime } from "@/components/app/shared";
import { CredentialReader } from "@/components/app/CredentialReader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { brl, cancelProposal, createProposal, DomainError, resolveCredential, type Category, type Sector } from "@/lib/domain";
import { commit, getState, useStore } from "@/lib/store";

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
const sectors: Sector[] = ["Bar da Piscina", "Restaurante", "Lanchonete"];
const demoCodes = [
  { code: "RDA-R4F4-208A", label: "Rafael · 208 (celular)" },
  { code: "RDA-AN4S-208B", label: "Ana · 208 (pulseira)" },
  { code: "RDA-M4R1-DU01", label: "Marina · day use" },
  { code: "RDA-J04O-203A", label: "João · 203" },
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

  const identified = useMemo(() => {
    if (!credCode) return null;
    try {
      return resolveCredential(state, credCode);
    } catch (e) {
      return { error: (e as DomainError).message };
    }
  }, [credCode, state]);

  const filtered = products.filter(
    (p) => (cat === "Todos" || p.category === cat) && p.name.toLowerCase().includes(query.toLowerCase()),
  );
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
    if (err) return toast.error(err);
    setTrackingId(id);
    setCart({});
    setOpId(newOp());
    toast.message("Proposta enviada. Aguardando o cliente.");
  };

  return (
    <div className="min-h-screen">
      <AppHeader subtitle={`Atendimento · ${ATTENDANT}`} />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_400px]">
        {/* Catalog */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto" className="h-11 bg-card pl-9" />
            </div>
            <Select value={sector} onValueChange={(v) => setSector(v as Sector)}>
              <SelectTrigger className="h-11 w-full bg-card sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors", cat === c ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border")}>
                {c}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const inCart = cart[p.id]?.qty ?? 0;
              return (
                <button
                  key={p.id}
                  disabled={!p.available}
                  onClick={() => setQty(p.id, 1)}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border bg-card p-4 text-left shadow-soft transition-all",
                    p.available ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift" : "cursor-not-allowed opacity-55",
                    inCart > 0 && "border-primary ring-2 ring-primary/15",
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{p.category}</span>
                  <span className="mt-1 font-semibold">{p.name}</span>
                  <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{p.description}</span>
                  <div className="mt-4 flex items-end justify-between">
                    <span className="tabular font-display text-xl font-semibold text-primary">{brl(p.price)}</span>
                    {p.available ? (
                      <span className="grid size-8 place-items-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Plus className="size-4" /></span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground"><Ban className="size-3" /> Indisponível</span>
                    )}
                  </div>
                  {inCart > 0 && <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{inCart}</span>}
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && <EmptyState icon={<Search className="size-5" />} title="Nenhum produto encontrado" />}

          <Panel title="Minhas operações recentes">
            {myHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma proposta enviada ainda.</p>
            ) : (
              <ul className="divide-y">
                {myHistory.map((p) => {
                  const st = state.stays.find((s) => s.id === p.stayId);
                  return (
                    <li key={p.id}>
                      <button onClick={() => setTrackingId(p.id)} className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:text-primary">
                        <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{fmtTime(p.createdAt).split(" ")[1]}</span>
                        <span className="flex-1 truncate">{st?.room ? `Quarto ${st.room}` : "Day use"} · {p.items.length} itens</span>
                        <span className="tabular font-semibold">{brl(p.total)}</span>
                        <StatusPill status={p.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* Order side */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel title="1 · Identificar consumidor">
            <CredentialReader onRead={read} demoCodes={demoCodes} />
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

          <Panel title="2 · Pedido" action={lines.length > 0 && <button onClick={() => setCart({})} className="text-xs text-muted-foreground hover:text-destructive">Limpar</button>}>
            {lines.length === 0 ? (
              <EmptyState icon={<ShoppingBag className="size-5" />} title="Carrinho vazio" hint="Toque nos produtos do catálogo para adicionar." />
            ) : (
              <div className="space-y-3">
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
                <div className="flex items-baseline justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="tabular font-display text-2xl font-semibold">{brl(total)}</span>
                </div>
              </div>
            )}
            <Button onClick={send} disabled={!identified || "error" in identified || lines.length === 0} className="mt-4 h-12 w-full gap-2 text-base">
              <Send className="size-4" /> Enviar para confirmação
            </Button>
          </Panel>

          {tracking && (
            <Panel title="3 · Acompanhamento" action={<StatusPill status={tracking.status} />}>
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
    </div>
  );
}
