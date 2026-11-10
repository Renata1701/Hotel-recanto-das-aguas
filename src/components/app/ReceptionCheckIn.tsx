import { Link } from "@tanstack/react-router";
import { BedDouble, Plus, Sun, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CredentialCodes, Panel } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listRoomAvailability, type RoomAvailability } from "@/lib/hotel-rooms";
import { openStay, type Credential, type CredentialMedium, type GuestInput, type StayType } from "@/lib/domain";
import { commit, getState, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type CompanionRow = { id: string; name: string };

function newRow(): CompanionRow {
  return { id: crypto.randomUUID(), name: "" };
}

export function ReceptionCheckIn({ actor }: { actor: string }) {
  const state = useStore((s) => s);
  const rooms = useMemo(() => listRoomAvailability(state), [state.stays]);

  const [type, setType] = useState<StayType>("hospedagem");
  const [room, setRoom] = useState<string | null>(null);
  const [holderName, setHolderName] = useState("");
  const [holderDocument, setHolderDocument] = useState("");
  const [holderPhone, setHolderPhone] = useState("");
  const [companions, setCompanions] = useState<CompanionRow[]>([]);
  const [medium, setMedium] = useState<CredentialMedium>("celular");
  const [issuedCreds, setIssuedCreds] = useState<Credential[]>([]);

  const freeCount = rooms.filter((r) => r.status === "livre").length;

  const selectRoom = (r: RoomAvailability) => {
    if (r.status !== "livre") return;
    setRoom(r.number);
  };

  const buildGuests = (): GuestInput[] => {
    const guests: GuestInput[] = [
      {
        name: holderName,
        document: holderDocument || undefined,
        phone: holderPhone || undefined,
      },
    ];
    for (const c of companions) {
      if (c.name.trim().length >= 2) guests.push({ name: c.name.trim() });
    }
    return guests;
  };

  const submit = () => {
    if (type === "hospedagem" && !room) {
      toast.error("Selecione um quarto disponível.");
      return;
    }
    const guests = buildGuests();
    if (guests.length === 0 || guests[0]!.name.trim().length < 2) {
      toast.error("Informe o nome do responsável.");
      return;
    }

    let stayId = "";
    const err = commit((s) => {
      const { state: next, stay } = openStay(
        s,
        {
          type,
          room: type === "hospedagem" ? room ?? undefined : undefined,
          guests,
          medium,
        },
        actor,
      );
      stayId = stay.id;
      return next;
    });
    if (err) {
      toast.error(err);
      return;
    }

    const creds = getState().credentials.filter((c) => c.stayId === stayId && c.status === "ativa");
    setIssuedCreds(creds);
    toast.success("Cliente cadastrado e credenciais emitidas.");
    setHolderName("");
    setHolderDocument("");
    setHolderPhone("");
    setCompanions([]);
    setRoom(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cadastro de cliente · Check-in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha o tipo de permanência, o quarto (se hospedagem) e cadastre os hóspedes.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/recepcao">Voltar à recepção</Link>
        </Button>
      </div>

      <Panel title="1 · Tipo de permanência">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setType("hospedagem");
            }}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
              type === "hospedagem"
                ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                : "border-border/80 bg-card hover:border-primary/30",
            )}
          >
            <span className="grid size-10 place-items-center rounded-lg bg-brand-gradient text-primary-foreground">
              <BedDouble className="size-5" />
            </span>
            <span className="font-semibold">Hospedagem</span>
            <span className="text-xs text-muted-foreground">Quarto no hotel, credencial por hóspede.</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType("dayuse");
              setRoom(null);
            }}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
              type === "dayuse"
                ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                : "border-border/80 bg-card hover:border-primary/30",
            )}
          >
            <span className="grid size-10 place-items-center rounded-lg bg-brand-gradient text-primary-foreground">
              <Sun className="size-5" />
            </span>
            <span className="font-semibold">Day use</span>
            <span className="text-xs text-muted-foreground">Uso diário sem quarto; mesma comanda digital.</span>
          </button>
        </div>
      </Panel>

      {type === "hospedagem" ? (
        <Panel title={`2 · Quartos disponíveis (${freeCount} livres)`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {rooms.map((r) => {
              const selected = room === r.number;
              const busy = r.status === "ocupado";
              return (
                <button
                  key={r.number}
                  type="button"
                  disabled={busy}
                  onClick={() => selectRoom(r)}
                  className={cn(
                    "flex flex-col rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                    busy && "cursor-not-allowed border-border/60 bg-muted/40 opacity-60",
                    !busy && !selected && "border-border/80 bg-card hover:border-primary/35 hover:shadow-sm",
                    selected && "border-primary bg-primary/10 ring-2 ring-primary/25",
                  )}
                >
                  <span className="font-display text-lg font-semibold tabular-nums">{r.number}</span>
                  <span className="line-clamp-2 text-[11px] text-muted-foreground">{r.label}</span>
                  <span
                    className={cn(
                      "mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      busy ? "bg-muted text-muted-foreground" : "bg-success/15 text-success",
                    )}
                  >
                    {busy ? "Em uso" : "Livre"}
                  </span>
                </button>
              );
            })}
          </div>
          {room ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Selecionado: <span className="font-semibold text-foreground">Quarto {room}</span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Toque em um quarto livre para continuar.</p>
          )}
        </Panel>
      ) : (
        <Panel title="2 · Day use">
          <p className="text-sm text-muted-foreground">
            Não é necessário quarto. O cadastro abre uma permanência <strong>day use</strong> na comanda digital.
          </p>
        </Panel>
      )}

      <Panel title="3 · Dados do cliente">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <UserRound className="size-4" /> Responsável (titular)
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="holder-name">Nome completo *</Label>
              <Input
                id="holder-name"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Ex.: Carla Mendes"
                className="h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holder-doc">CPF (opcional)</Label>
              <Input
                id="holder-doc"
                value={holderDocument}
                onChange={(e) => setHolderDocument(e.target.value)}
                placeholder="000.000.000-00"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holder-phone">Telefone</Label>
              <Input
                id="holder-phone"
                value={holderPhone}
                onChange={(e) => setHolderPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="h-10"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-border/80 pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Acompanhantes</span>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => setCompanions((c) => [...c, newRow()])}>
                <Plus className="size-3.5" /> Adicionar
              </Button>
            </div>
            {companions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Cada pessoa recebe credencial própria (QR ou pulseira).</p>
            ) : (
              <ul className="space-y-2">
                {companions.map((row, i) => (
                  <li key={row.id} className="flex gap-2">
                    <Input
                      value={row.name}
                      onChange={(e) =>
                        setCompanions((list) => list.map((x) => (x.id === row.id ? { ...x, name: e.target.value } : x)))
                      }
                      placeholder={`Acompanhante ${i + 1}`}
                      className="h-10 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remover acompanhante"
                      onClick={() => setCompanions((list) => list.filter((x) => x.id !== row.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5 border-t border-border/80 pt-4">
            <Label>Meio da credencial (todos)</Label>
            <Select value={medium} onValueChange={(v) => setMedium(v as CredentialMedium)}>
              <SelectTrigger className="h-10 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="celular">Celular (ativação web)</SelectItem>
                <SelectItem value="pulseira">Pulseira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="button" className="h-11 w-full sm:w-auto" onClick={submit}>
            Cadastrar e emitir credenciais
          </Button>
        </div>
      </Panel>

      {issuedCreds.length > 0 && (
        <Panel title="Credenciais emitidas">
          <ul className="grid gap-3 sm:grid-cols-2">
            {issuedCreds.map((c) => {
              const p = getState()
                .stays.find((st) => st.id === c.stayId)
                ?.participants.find((x) => x.id === c.participantId);
              return (
                <li key={c.id} className="rounded-xl border bg-secondary/25 p-3">
                  <p className="text-sm font-semibold">{p?.name}</p>
                  <p className="font-mono text-xs">{c.code}</p>
                  {c.activationCode && (
                    <p className="mt-1 text-xs">
                      Código de ativação: <span className="font-mono font-semibold">{c.activationCode}</span>
                    </p>
                  )}
                  <Link
                    to="/acesso"
                    search={{ codigo: c.code }}
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Link de ativação
                  </Link>
                  <div className="mt-2 origin-top scale-90">
                    <CredentialCodes code={c.code} compact />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
